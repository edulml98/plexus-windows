#!/usr/bin/env bun

import { chmod } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
const noFail = args.has('--no-fail');
const quiet = args.has('--quiet');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const preCommitHook = resolve(repoRoot, '.githooks', 'pre-commit');

function log(message: string) {
  if (!quiet) {
    console.log(message);
  }
}

function warn(message: string) {
  if (!quiet) {
    console.warn(message);
  }
}

async function runGit(args: string[], options: { silent?: boolean } = {}) {
  try {
    const proc = Bun.spawn(['git', '-C', repoRoot, ...args], {
      stdout: options.silent ? 'ignore' : 'inherit',
      stderr: options.silent ? 'ignore' : 'inherit',
    });
    return await proc.exited;
  } catch (error) {
    if (!options.silent) {
      warn(error instanceof Error ? error.message : String(error));
    }
    return 127;
  }
}

function finish(code: number) {
  process.exit(noFail ? 0 : code);
}

const isGitRepo = (await runGit(['rev-parse', '--git-dir'], { silent: true })) === 0;
if (!isGitRepo) {
  log('Not inside a git repository; skipping git hooks setup.');
  process.exit(0);
}

const configExit = await runGit(['config', 'core.hooksPath', '.githooks']);
if (configExit !== 0) {
  finish(configExit);
}

try {
  await chmod(preCommitHook, 0o755);
} catch (error) {
  warn(
    `Could not mark pre-commit hook as executable: ${error instanceof Error ? error.message : String(error)}`
  );
  finish(1);
}

log('Configured git hooks path to .githooks');
log(`Pre-commit hook is ready: ${preCommitHook}`);
