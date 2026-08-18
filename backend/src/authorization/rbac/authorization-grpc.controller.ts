import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { TokenVerifierService } from 'src/authentication/token-verifier.service';
import { UsersService } from 'src/authentication/users/users.service';
import { RbacService } from './rbac.service';

type AuthorizeRequest = {
  bearer_token: string;
  permission: string;
  team_id?: number | string;
};

@Controller()
export class AuthorizationGrpcController {
  constructor(
    private readonly tokens: TokenVerifierService,
    private readonly users: UsersService,
    private readonly rbac: RbacService,
  ) {}

  @GrpcMethod('AuthorizationService', 'Authorize')
  async authorize(request: AuthorizeRequest) {
    if (!request.permission?.trim()) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'permission is required',
      });
    }

    let identity: {
      sub: string;
      email?: string;
      email_verified?: boolean | string;
      given_name?: string;
      family_name?: string;
      name?: string;
      identities?: { providerName?: string }[];
      pompeii_cognito_client_id: string;
    };
    try {
      identity = await this.tokens.verifyBearerToken(
        request.bearer_token ?? '',
      );
    } catch {
      return {
        authenticated: false,
        allowed: false,
        reason: 'DENY_INVALID_TOKEN',
        subject: '',
        effective_permissions: [],
        roles: [],
      };
    }

    const user = await this.users.resolveAuthorizationUser(identity);
    if (!user) {
      return {
        authenticated: true,
        allowed: false,
        reason: 'DENY_UNKNOWN_USER',
        subject: identity.sub,
        effective_permissions: [],
        roles: [],
      };
    }

    const permissionScope = await this.rbac.resolvePermissionApplicationScope(
      identity.pompeii_cognito_client_id,
      request.permission.trim(),
    );
    if (!permissionScope) {
      return {
        authenticated: true,
        allowed: false,
        reason: 'DENY_UNREGISTERED_APPLICATION_PERMISSION',
        subject: identity.sub,
        effective_permissions: [],
        roles: [],
      };
    }

    const requestedTeamId = Number(request.team_id ?? 0);
    if (requestedTeamId > 0 && requestedTeamId !== permissionScope.teamId) {
      return {
        authenticated: true,
        allowed: false,
        reason: 'DENY_APPLICATION_TEAM_MISMATCH',
        subject: identity.sub,
        effective_permissions: [],
        roles: [],
      };
    }
    const decision = await this.rbac.authorizeUser(
      user.id,
      request.permission.trim(),
      permissionScope.teamId,
    );
    return {
      authenticated: true,
      allowed: decision.allowed,
      reason: decision.reason,
      subject: identity.sub,
      effective_permissions: decision.permissions,
      roles: decision.roles,
    };
  }
}
