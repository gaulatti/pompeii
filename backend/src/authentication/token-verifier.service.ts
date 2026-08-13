import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, verify } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class TokenVerifierService {
  private readonly issuer: string;
  private readonly audience: [string, ...string[]];
  private readonly jwks: JwksClient;

  constructor(config: ConfigService) {
    const region = config.get<string>('AWS_REGION');
    const poolId = config.get<string>('COGNITO_USER_POOL_ID');
    const primaryAudience = config.get<string>('COGNITO_CLIENT_ID');
    if (!region || !poolId || !primaryAudience)
      throw new Error('Missing Cognito configuration');

    const additionalAudiences = (
      config.get<string>('COGNITO_ALLOWED_CLIENT_IDS') ?? ''
    )
      .split(',')
      .map((item) => item.trim())
      .filter(
        (item, index, values) =>
          item && item !== primaryAudience && values.indexOf(item) === index,
      );
    this.audience = [primaryAudience, ...additionalAudiences];

    this.issuer = `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
    this.jwks = new JwksClient({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `${this.issuer}/.well-known/jwks.json`,
    });
  }

  verifyBearerToken(
    bearerToken: string,
  ): Promise<JwtPayload & { sub: string }> {
    const token = bearerToken.toLowerCase().startsWith('bearer ')
      ? bearerToken.slice(7).trim()
      : bearerToken.trim();
    if (!token) throw new UnauthorizedException('Missing bearer token');

    return new Promise((resolve, reject) => {
      verify(
        token,
        (header, callback) => {
          if (!header.kid) return callback(new Error('JWT missing kid'));
          this.jwks
            .getSigningKey(header.kid)
            .then((key) => callback(null, key.getPublicKey()))
            .catch((error: Error) => callback(error));
        },
        { algorithms: ['RS256'], issuer: this.issuer, audience: this.audience },
        (error, decoded) => {
          if (
            error ||
            !decoded ||
            typeof decoded === 'string' ||
            !decoded.sub
          ) {
            reject(new UnauthorizedException('Invalid bearer token'));
            return;
          }
          if (decoded.token_use !== 'id') {
            reject(
              new UnauthorizedException('Invalid token_use; expected id token'),
            );
            return;
          }
          resolve(decoded as JwtPayload & { sub: string });
        },
      );
    });
  }
}
