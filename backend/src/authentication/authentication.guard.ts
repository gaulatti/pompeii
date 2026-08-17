import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { TokenVerifierService } from './token-verifier.service';
import { UsersService } from './users/users.service';

@Injectable()
export class AuthenticationGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenVerifierService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
    }>();
    const authHeader = request.headers['authorization'];

    if (authHeader) {
      if (Array.isArray(authHeader)) {
        throw new UnauthorizedException('Invalid authorization header');
      }
      const identity = await this.tokens.verifyBearerToken(authHeader);
      request.user = await this.users.updateUser(identity);
      return true;
    }

    return !!this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
