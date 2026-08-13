import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION = 'rbac:required-permission';

export type PermissionRequirement = {
  permission: string;
  teamIdPath?: string;
};

export const RequiresPermission = (permission: string, teamIdPath?: string) =>
  SetMetadata(REQUIRED_PERMISSION, {
    permission,
    teamIdPath,
  } satisfies PermissionRequirement);
