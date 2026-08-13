import { TokenVerifierService } from './token-verifier.service';

describe('TokenVerifierService', () => {
  it('accepts only the configured Cognito app-client audiences', () => {
    const values: Record<string, string> = {
      AWS_REGION: 'us-east-1',
      COGNITO_USER_POOL_ID: 'us-east-1_example',
      COGNITO_CLIENT_ID: 'pompeii-client',
      COGNITO_ALLOWED_CLIENT_IDS:
        'auburndale-client, angelina-client, alcantara-client, celesti-client, pompeii-client',
    };
    const service = new TokenVerifierService({
      get: jest.fn((key: string) => values[key]),
    } as any);

    expect((service as any).audience).toEqual([
      'pompeii-client',
      'auburndale-client',
      'angelina-client',
      'alcantara-client',
      'celesti-client',
    ]);
  });
});
