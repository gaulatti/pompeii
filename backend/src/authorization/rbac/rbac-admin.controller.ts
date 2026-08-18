import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from 'src/authentication/users/users.service';
import { AuditService } from './audit.service';
import { RbacService } from './rbac.service';
import { RequiresPermission } from './requires-permission.decorator';

@Controller('authorization')
export class RbacAdminController {
  constructor(
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly users: UsersService,
  ) {}

  @Get('roles')
  @RequiresPermission('role:read')
  listRoles(@Query('applicationId') applicationId?: string) {
    return this.rbac.listRoles(
      applicationId ? Number(applicationId) : undefined,
    );
  }

  @Post('roles')
  @RequiresPermission('role:write')
  async createRole(
    @Req() req: any,
    @Body()
    body: {
      application_id: number;
      key: string;
      name: string;
      description?: string;
    },
  ) {
    const role = await this.rbac.createRole(body);
    await this.audit.record({
      actorUserId: req.user.id,
      action: 'role.create',
      targetType: 'role',
      targetId: String(role.id),
      metadata: body,
    });
    return role;
  }

  @Patch('roles/:id')
  @RequiresPermission('role:write')
  async updateRole(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string | null },
  ) {
    const role = await this.rbac.updateRole(id, body);
    await this.audit.record({
      actorUserId: req.user.id,
      action: 'role.update',
      targetType: 'role',
      targetId: String(id),
      metadata: body,
    });
    return role;
  }

  @Delete('roles/:id')
  @RequiresPermission('role:write')
  async deleteRole(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.rbac.deleteRole(id);
    await this.audit.record({
      actorUserId: req.user.id,
      action: 'role.delete',
      targetType: 'role',
      targetId: String(id),
    });
    return { removed: true };
  }

  @Get('rbac-permissions')
  @RequiresPermission('role:read')
  listPermissions(@Query('applicationId') applicationId?: string) {
    return this.rbac.listPermissions(
      applicationId ? Number(applicationId) : undefined,
    );
  }

  @Put('roles/:roleId/permissions/:permissionId')
  @RequiresPermission('role:write')
  async addPermission(
    @Req() req: any,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    await this.rbac.addPermissionToRole(roleId, permissionId);
    await this.audit.record({
      actorUserId: req.user.id,
      action: 'role.permission.add',
      targetType: 'role',
      targetId: String(roleId),
      metadata: { permissionId },
    });
    return { assigned: true };
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @RequiresPermission('role:write')
  async removePermission(
    @Req() req: any,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    await this.rbac.removePermissionFromRole(roleId, permissionId);
    await this.audit.record({
      actorUserId: req.user.id,
      action: 'role.permission.remove',
      targetType: 'role',
      targetId: String(roleId),
      metadata: { permissionId },
    });
    return { removed: true };
  }

  @Get('users/:userId/role-assignments')
  @RequiresPermission('role:read')
  listAssignments(@Param('userId', ParseIntPipe) userId: number) {
    return this.rbac.listAssignments(userId);
  }

  @Post('role-assignments')
  @RequiresPermission('role:write', 'body.team_id')
  async assignRole(
    @Req() req: any,
    @Body() body: { user_id: number; role_id: number; team_id?: number | null },
  ) {
    const assignment = await this.rbac.assignRole(body);
    await this.audit.record({
      actorUserId: req.user.id,
      action: 'role.assignment.create',
      targetType: 'role-assignment',
      targetId: String(assignment.id),
      metadata: body,
    });
    return assignment;
  }

  @Delete('role-assignments/:id')
  @RequiresPermission('role:write')
  async removeAssignment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.rbac.removeAssignment(id);
    await this.audit.record({
      actorUserId: req.user.id,
      action: 'role.assignment.delete',
      targetType: 'role-assignment',
      targetId: String(id),
    });
    return { removed: true };
  }

  @Patch('users/:id/active')
  @RequiresPermission('user:write')
  async setUserActive(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { is_active: boolean },
  ) {
    const user = await this.users.setActive(id, Boolean(body.is_active));
    this.rbac.clearUserCache(id);
    await this.audit.record({
      actorUserId: req.user.id,
      action: 'user.set_active',
      targetType: 'user',
      targetId: String(id),
      metadata: { is_active: body.is_active },
    });
    return user;
  }

  @Get('audit-logs')
  @RequiresPermission('audit:read')
  listAuditLogs(@Query('limit') limit?: string) {
    return this.audit.list(Number(limit) || 100);
  }
}
