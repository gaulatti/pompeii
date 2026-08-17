import { loadApplicationSecrets } from './secrets-loader';

const ORIGINAL_ENV = process.env;

describe('loadApplicationSecrets', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.SECRET_ARN;
    delete process.env.UNIQUE_KEY;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads only supported fields while preserving local overrides', async () => {
    process.env.SECRET_ARN = 'arn:example';
    process.env.UNIQUE_KEY = 'pompeii';
    process.env.DATABASE_URL = 'environment-database';

    await loadApplicationSecrets((secretArn) => {
      expect(secretArn).toBe('arn:example');
      return Promise.resolve(
        JSON.stringify({
          pompeii: {
            DATABASE_URL: 'secret-database',
            ALLOWED_ORIGINS: 'https://pompeii.example',
            UNUSED_VALUE: 'ignored',
          },
        }),
      );
    });

    expect(process.env.DATABASE_URL).toBe('environment-database');
    expect(process.env.ALLOWED_ORIGINS).toBe('https://pompeii.example');
    expect(process.env.UNUSED_VALUE).toBeUndefined();
  });

  it('fails closed when production has no secret ARN', async () => {
    process.env.NODE_ENV = 'production';
    await expect(loadApplicationSecrets()).rejects.toThrow(
      'SECRET_ARN is required in production',
    );
  });

  it('always takes the production database URL from Secrets Manager', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SECRET_ARN = 'arn:example';
    process.env.UNIQUE_KEY = 'pompeii';
    process.env.DATABASE_URL = 'container-database';

    await loadApplicationSecrets(() =>
      Promise.resolve(
        JSON.stringify({
          pompeii: {
            DATABASE_URL: 'secret-database',
            ALLOWED_ORIGINS: 'https://pompeii.example',
          },
        }),
      ),
    );

    expect(process.env.DATABASE_URL).toBe('secret-database');
  });

  it('requires the complete production configuration', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SECRET_ARN = 'arn:example';
    process.env.UNIQUE_KEY = 'pompeii';

    await expect(
      loadApplicationSecrets(() =>
        Promise.resolve(
          JSON.stringify({
            pompeii: { DATABASE_URL: 'postgres://example' },
          }),
        ),
      ),
    ).rejects.toThrow('ALLOWED_ORIGINS');
  });
});
