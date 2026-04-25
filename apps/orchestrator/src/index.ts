import { OrchestratorConsumer } from './consumer.js';
import type { OrchestratorConfig } from './types.js';

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function buildConfig(): OrchestratorConfig {
  return {
    serviceBusConnectionString: requireEnv('AZURE_SERVICE_BUS_CONNECTION_STRING'),
    queueName: process.env['AZURE_SERVICE_BUS_QUEUE_NAME'] ?? 'pr-events',
    dbConnectionString: requireEnv('DATABASE_URL'),
    github: {
      appId: Number(requireEnv('GITHUB_APP_ID')),
      privateKey: requireEnv('GITHUB_PRIVATE_KEY').replace(/\\n/g, '\n'),
    },
    vercel: {
      apiToken: requireEnv('VERCEL_API_TOKEN'),
      ...(process.env['VERCEL_TEAM_ID'] !== undefined
        ? { teamId: process.env['VERCEL_TEAM_ID'] }
        : {}),
    },
  };
}

function main(): void {
  const config = buildConfig();
  const consumer = new OrchestratorConsumer(config);
  consumer.start();

  const shutdown = (): void => {
    console.log('Shutting down...');
    consumer.stop().then(() => process.exit(0)).catch((err: unknown) => {
      console.error('Error during shutdown:', err);
      process.exit(1);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

try {
  main();
} catch (err: unknown) {
  console.error('Fatal error:', err);
  process.exit(1);
}
