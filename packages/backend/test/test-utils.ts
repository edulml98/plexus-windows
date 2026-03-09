import { PlexusConfig } from '../src/config';

export function createTestConfig(overrides: Partial<PlexusConfig> = {}): PlexusConfig {
  return {
    providers: {},
    models: {
      'gpt-4': {
        priority: 'selector',
        targets: [{ provider: 'openai', model: 'gpt-4' }],
      },
      'embeddings-small': {
        priority: 'selector',
        targets: [{ provider: 'openai', model: 'text-embedding-3-small' }],
      },
    },
    keys: {
      'test-key-1': { secret: 'sk-valid-key', comment: 'Test Key' },
    },
    adminKey: 'admin-secret',
    failover: {
      enabled: false,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT'],
    },
    quotas: [],
    ...overrides,
  } as PlexusConfig;
}
