import { Client } from 'pg';
import { bootstrapPlatformAdmin } from './bootstrap/bootstrap-platform-admin';
import { loadApplicationSecrets } from './config/secrets-loader';

async function run(): Promise<void> {
  const userId = Number(process.argv[2]);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error('Usage: node dist/run-bootstrap-admin <positive-user-id>');
  }

  await loadApplicationSecrets();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await bootstrapPlatformAdmin(client, userId);
    console.log(
      result.alreadyAssigned
        ? `User ${userId} is already the global platform administrator`
        : `User ${userId} is now the global platform administrator`,
    );
  } finally {
    await client.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Pompeii administrator bootstrap failed: ${message}`);
  process.exit(1);
});
