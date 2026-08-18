import { spawnSync } from 'node:child_process';
import { loadApplicationSecrets } from './config/secrets-loader';

async function run(): Promise<void> {
  await loadApplicationSecrets();

  const migration = spawnSync(
    process.execPath,
    ['node_modules/sequelize-cli/lib/sequelize', 'db:migrate'],
    { env: process.env, stdio: 'inherit' },
  );
  if (migration.status !== 0) {
    throw new Error(
      `Database migration failed with status ${migration.status}`,
    );
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Pompeii migration failed: ${message}`);
  process.exit(1);
});
