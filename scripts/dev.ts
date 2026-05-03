import { spawn } from 'bun';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import { createServer } from 'net';
import { writeFileSync, unlinkSync } from 'fs';

// --- Dev defaults (only applied when not already set in environment) ---

const dirName = basename(process.cwd());

function readOptionValue(args: string[], index: number, option: string) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${option}`);
    process.exit(1);
  }
  return value;
}

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];

  if (arg.startsWith('DATABASE_URL=')) {
    process.env.DATABASE_URL = arg.slice('DATABASE_URL='.length);
  } else if (arg.startsWith('PORT=')) {
    process.env.PORT = arg.slice('PORT='.length);
  } else if (arg.startsWith('ADMIN_KEY=')) {
    process.env.ADMIN_KEY = arg.slice('ADMIN_KEY='.length);
  } else if (arg === '--database-url') {
    process.env.DATABASE_URL = readOptionValue(process.argv, i, arg);
    i++;
  } else if (arg.startsWith('--database-url=')) {
    process.env.DATABASE_URL = arg.slice('--database-url='.length);
  } else if (arg === '--port') {
    process.env.PORT = readOptionValue(process.argv, i, arg);
    i++;
  } else if (arg.startsWith('--port=')) {
    process.env.PORT = arg.slice('--port='.length);
  } else if (arg === '--admin-key') {
    process.env.ADMIN_KEY = readOptionValue(process.argv, i, arg);
    i++;
  } else if (arg.startsWith('--admin-key=')) {
    process.env.ADMIN_KEY = arg.slice('--admin-key='.length);
  } else {
    console.error(`Unknown option: ${arg}`);
    console.error('Usage: bun run dev [DATABASE_URL=...] [PORT=...] [ADMIN_KEY=...]');
    console.error('   or: bun run dev [--database-url ...] [--port ...] [--admin-key ...]');
    process.exit(1);
  }
}

// Stable port derived from the worktree directory name, range 10000-19999.
// Two worktrees running simultaneously will land on different ports automatically.
// Override with: bun run dev PORT=4000
if (!process.env.PORT) {
  let hash = 5381;
  for (let i = 0; i < dirName.length; i++) {
    hash = (hash * 33) ^ dirName.charCodeAt(i);
  }
  process.env.PORT = String(10000 + (Math.abs(hash) % 10000));
}

// Per-worktree SQLite file — persists across restarts, isolated per branch.
// Override with: bun run dev DATABASE_URL=postgresql://...
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `sqlite://${join(tmpdir(), `plexus-${dirName}.db`)}`;
}

// Dev-only admin key.
// Override with: bun run dev ADMIN_KEY=secret
if (!process.env.ADMIN_KEY) {
  process.env.ADMIN_KEY = 'password';
}

// --- Port availability check ---

await new Promise<void>((resolve, reject) => {
  const probe = createServer();
  probe.once('error', () =>
    reject(
      new Error(
        `Port ${process.env.PORT} is already in use. Is another worktree running? Override with: PORT=<number> bun run dev`
      )
    )
  );
  probe.once('listening', () => probe.close(resolve));
  probe.listen(parseInt(process.env.PORT!));
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});

// --- PID file ---
// Written so that clear-dev.ts can send SIGHUP to trigger a backend restart.

const PID_FILE = join(tmpdir(), `plexus-${dirName}.pid`);
writeFileSync(PID_FILE, String(process.pid));

// --- Startup ---

const BACKEND_DIR = join(process.cwd(), 'packages/backend');
const FRONTEND_DIR = join(process.cwd(), 'packages/frontend');

console.log('Starting Plexus Dev Stack...');
console.log(`  PORT:         ${process.env.PORT}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL}`);
console.log(`  ADMIN_KEY:    ${process.env.ADMIN_KEY}`);

function spawnBackend() {
  return spawn(['bun', 'run', '--watch', '--no-clear-screen', 'src/index.ts'], {
    cwd: BACKEND_DIR,
    env: { ...process.env },
    stdout: 'inherit',
    stderr: 'inherit',
  });
}

let backend = spawnBackend();

console.log('[Frontend] Starting builder (watch mode)...');
const frontend = spawn(['bun', 'run', 'dev'], {
  cwd: FRONTEND_DIR,
  stdout: 'inherit',
  stderr: 'inherit',
});

console.log(`Backend: http://localhost:${process.env.PORT}`);
console.log('Watching for changes...');

// SIGHUP — kill and respawn the backend (used by clear-dev.ts after DB wipe)
process.on('SIGHUP', () => {
  console.log('\n[dev] SIGHUP received — restarting backend...');
  backend.kill('SIGTERM');
  backend.exited.then(() => {
    backend = spawnBackend();
    console.log('[dev] Backend restarted.');
  });
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\nStopping...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  try {
    unlinkSync(PID_FILE);
  } catch {}
  await Promise.all([backend.exited, frontend.exited]);
  process.exit(0);
});
