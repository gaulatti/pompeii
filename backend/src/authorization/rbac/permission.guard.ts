import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PermissionRequirement,
  REQUIRED_PERMISSION,
} from './requires-permission.decorator';
import { RbacService } from './rbac.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) return true;

    const request = context.switchToHttp().getRequest();
    const userId = Number(request.user?.id);
    if (!userId)
      throw new ForbiddenException('Authenticated user is not provisioned');

    const teamId = this.resolvePath(request, requirement.teamIdPath);
    const decision = await this.rbac.authorizeUser(
      userId,
      requirement.permission,
      teamId,
    );
    if (!decision.allowed) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        permission: requirement.permission,
        reason: decision.reason,
      });
    }
    return true;
  }

  private resolvePath(request: any, path?: string): number | undefined {
    if (!path) return undefined;
    const value = path
      .split('.')
      .reduce((current, key) => current?.[key], request);
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : undefined;
  }
}
