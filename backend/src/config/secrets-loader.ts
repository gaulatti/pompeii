import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

type SecretFetcher = (secretArn: string) => Promise<string | undefined>;

const APPLICATION_SECRET_KEYS = ['ALLOWED_ORIGINS', 'DATABASE_URL'] as const;
const LOADED_MARKER = 'POMPEII_APPLICATION_SECRET_LOADED';

function parseSecretObject(
  secretString: string,
  uniqueKey: string,
): Record<string, string> {
  const parsed = JSON.parse(secretString) as Record<string, unknown>;
  let applicationSecret = parsed[uniqueKey];
  if (typeof applicationSecret === 'string') {
    applicationSecret = JSON.parse(applicationSecret) as unknown;
  }
  if (
    !applicationSecret ||
    typeof applicationSecret !== 'object' ||
    Array.isArray(applicationSecret)
  ) {
    throw new Error(`Secret payload is missing object key "${uniqueKey}"`);
  }

  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(applicationSecret)) {
    if (typeof value === 'string') values[key] = value;
    else if (typeof value === 'number' || typeof value === 'boolean') {
      values[key] = String(value);
    }
  }

  return values;
}

async function fetchSecretString(
  secretArn: string,
): Promise<string | undefined> {
  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
  });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  return response.SecretString;
}

export async function loadApplicationSecrets(
  fetchSecret: SecretFetcher = fetchSecretString,
): Promise<void> {
  if (process.env[LOADED_MARKER] === 'true') return;

  const secretArn = process.env.SECRET_ARN;
  const uniqueKey = process.env.UNIQUE_KEY;
  if (!secretArn) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECRET_ARN is required in production');
    }
    process.env[LOADED_MARKER] = 'true';
    return;
  }
  if (!uniqueKey) {
    throw new Error('UNIQUE_KEY is required when SECRET_ARN is set');
  }
  const secretString = await fetchSecret(secretArn);
  if (!secretString) throw new Error(`Secret ${secretArn} has no SecretString`);

  const secretValues = parseSecretObject(secretString, uniqueKey);
  for (const key of APPLICATION_SECRET_KEYS) {
    if (
      secretValues[key] &&
      (process.env.NODE_ENV === 'production' || !process.env[key])
    ) {
      process.env[key] = secretValues[key];
    } else if (process.env.NODE_ENV === 'production' && !secretValues[key]) {
      delete process.env[key];
    }
  }

  if (process.env.NODE_ENV === 'production') {
    const missing = APPLICATION_SECRET_KEYS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Application secret is missing required configuration: ${missing.join(', ')}`,
      );
    }
  }

  process.env[LOADED_MARKER] = 'true';
}
