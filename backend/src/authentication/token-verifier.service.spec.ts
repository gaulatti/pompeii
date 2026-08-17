import { UnauthorizedException } from '@nestjs/common';
import { TokenVerifierService } from './token-verifier.service';

describe('TokenVerifierService', () => {
  it('resolves the token audience through the application database', async () => {
    const application = {
      id: 1,
      cognito_client_id: 'auburndale-client',
      cognito_user_pool_id: 'us-east-1_example',
    };
    const applications = {
      findOne: jest.fn().mockResolvedValue(application),
    } as any;
    const service = new TokenVerifierService(applications);

    await expect(
      (service as any).registeredApplication({ aud: 'auburndale-client' }),
    ).resolves.toBe(application);
    expect(applications.findOne).toHaveBeenCalledWith({
      where: { cognito_client_id: 'auburndale-client' },
    });
  });

  it('derives the trusted issuer from the registered user pool', () => {
    const service = new TokenVerifierService({} as any);
    expect((service as any).issuerForPool('us-east-1_example')).toBe(
      'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example',
    );
  });

  it('rejects invalid registered user-pool IDs', () => {
    const service = new TokenVerifierService({} as any);
    expect(() => (service as any).issuerForPool('not-a-pool')).toThrow(
      UnauthorizedException,
    );
  });
});
