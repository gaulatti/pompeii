import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { decode, JwtPayload, verify } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { Application } from 'src/models/application.model';
import { tokenAudience } from './token-audience';
import {
  TEST_AUTH_ISSUER,
  testAuthEnabled,
  testAuthSecret,
} from './test-auth';

@Injectable()
export class TokenVerifierService {
  private readonly jwksClients = new Map<string, JwksClient>();

  constructor(
    @InjectModel(Application)
    private readonly applications: typeof Application,
  ) {}

  async verifyBearerToken(
    bearerToken: string,
  ): Promise<JwtPayload & { sub: string; email: string }> {
    const token = bearerToken.toLowerCase().startsWith('bearer ')
      ? bearerToken.slice(7).trim()
      : bearerToken.trim();
    if (!token) throw new UnauthorizedException('Missing bearer token');

    if (testAuthEnabled()) {
      try {
        const payload = verify(token, testAuthSecret(), {
          algorithms: ['HS256'],
          audience: 'local-browser-tests',
          issuer: TEST_AUTH_ISSUER,
        });
        if (
          typeof payload !== 'string' &&
          payload.sub &&
          typeof payload.email === 'string' &&
          payload.email
        ) {
          return payload as JwtPayload & { sub: string; email: string };
        }
      } catch {
        // A test-mode server still accepts normal Cognito tokens below.
      }
    }

    const unverified = decode(token);
    if (!unverified || typeof unverified === 'string') {
      throw new UnauthorizedException('Invalid bearer token');
    }
    const audience = tokenAudience(unverified);
    if (!audience) throw new UnauthorizedException('Token audience is missing');

    const application = await this.registeredApplication(unverified);
    if (!application?.cognito_user_pool_id) {
      throw new UnauthorizedException(
        'Token audience is not a registered Cognito application',
      );
    }

    const issuer = this.issuerForPool(application.cognito_user_pool_id);
    const jwks = this.jwksForIssuer(issuer);
    return new Promise((resolve, reject) => {
      verify(
        token,
        (header, callback) => {
          if (!header.kid) return callback(new Error('JWT missing kid'));
          jwks
            .getSigningKey(header.kid)
            .then((key) => callback(null, key.getPublicKey()))
            .catch((error: Error) => callback(error));
        },
        { algorithms: ['RS256'], issuer, audience },
        (error, decodedPayload) => {
          if (
            error ||
            !decodedPayload ||
            typeof decodedPayload === 'string' ||
            !decodedPayload.sub ||
            typeof decodedPayload.email !== 'string' ||
            !decodedPayload.email
          ) {
            reject(new UnauthorizedException('Invalid bearer token'));
            return;
          }
          if (decodedPayload.token_use !== 'id') {
            reject(
              new UnauthorizedException('Invalid token_use; expected id token'),
            );
            return;
          }
          resolve(
            decodedPayload as JwtPayload & {
              sub: string;
              email: string;
            },
          );
        },
      );
    });
  }

  private async registeredApplication(
    payload: JwtPayload,
  ): Promise<Application | null> {
    const audience = tokenAudience(payload);
    if (!audience) return null;
    return this.applications.findOne({
      where: { cognito_client_id: audience },
    });
  }

  private issuerForPool(poolId: string): string {
    const separator = poolId.indexOf('_');
    const region = separator > 0 ? poolId.slice(0, separator) : '';
    if (!region || !/^[a-z]{2}(?:-gov)?-[a-z]+-\d+$/.test(region)) {
      throw new UnauthorizedException(
        'Registered application has an invalid Cognito user-pool ID',
      );
    }
    return `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
  }

  private jwksForIssuer(issuer: string): JwksClient {
    let client = this.jwksClients.get(issuer);
    if (!client) {
      client = new JwksClient({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/.well-known/jwks.json`,
      });
      this.jwksClients.set(issuer, client);
    }
    return client;
  }
}
