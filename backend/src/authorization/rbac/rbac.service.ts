import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { RbacPermission } from 'src/models/rbac-permission.model';
import { Application } from 'src/models/application.model';
import { RbacRole } from 'src/models/rbac-role.model';
import { RoleAssignment } from 'src/models/role-assignment.model';
import { RolePermission } from 'src/models/role-permission.model';
import { User } from 'src/models/user.model';
import { AuthorizationDecision } from './rbac.types';
import { TEST_AUTH_EMAIL, testAuthEnabled } from 'src/authentication/test-auth';

@Injectable()
export class RbacService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; decision: AuthorizationDecision }
  >();
  private readonly cacheTtlMs = 5000;
  private readonly cacheMaxEntries = 10000;

  constructor(
    @InjectModel(User) private readonly users: typeof User,
    @InjectModel(RbacRole) private readonly roles: typeof RbacRole,
    @InjectModel(RbacPermission)
    private readonly permissions: typeof RbacPermission,
    @InjectModel(RolePermission)
    private readonly rolePermissions: typeof RolePermission,
    @InjectModel(RoleAssignment)
    private readonly assignments: typeof RoleAssignment,
  ) {}

  async authorizeUser(
    userId: number,
    permission: string,
    teamId?: number | null,
  ): Promise<AuthorizationDecision> {
    const cacheKey = `${userId}|${permission}|${teamId ?? ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.decision;
    }
    if (cached) this.cache.delete(cacheKey);

    const user = await this.users.findByPk(userId);
    if (!user) {
      return this.store(cacheKey, {
        allowed: false,
        reason: 'DENY_UNKNOWN_USER',
        permissions: [],
        roles: [],
      });
    }
    if (!user.is_active) {
      return this.store(cacheKey, {
        allowed: false,
        reason: 'DENY_INACTIVE_USER',
        permissions: [],
        roles: [],
      });
    }

    if (testAuthEnabled() && user.email === TEST_AUTH_EMAIL) {
      return this.store(cacheKey, {
        allowed: true,
        reason: 'ALLOW',
        permissions: ['*'],
        roles: ['local-browser-agent'],
      });
    }

    const scope = teamId
      ? { [Op.or]: [{ team_id: null }, { team_id: teamId }] }
      : { team_id: null };
    const assignments = await this.assignments.findAll({
      where: { user_id: userId, ...scope },
      include: [{ model: RbacRole, include: [RbacPermission] }],
    });

    const permissionKeys = new Set<string>();
    const roleKeys = new Set<string>();
    for (const assignment of assignments) {
      if (!assignment.role) continue;
      roleKeys.add(assignment.role.key);
      for (const item of assignment.role.permissions ?? [])
        permissionKeys.add(item.key);
    }

    const effectivePermissions = [...permissionKeys].sort();
    const allowed = permissionKeys.has('*') || permissionKeys.has(permission);
    return this.store(cacheKey, {
      allowed,
      reason: allowed ? 'ALLOW' : 'DENY_NO_PERMISSION',
      permissions: effectivePermissions,
      roles: [...roleKeys].sort(),
    });
  }

  clearUserCache(userId: number): void {
    for (const key of this.cache.keys())
      if (key.startsWith(`${userId}|`)) this.cache.delete(key);
  }

  clearCache(): void {
    this.cache.clear();
  }

  async assertUserPermission(
    userId: number,
    permission: string,
    teamId?: number | null,
  ): Promise<void> {
    const decision = await this.authorizeUser(userId, permission, teamId);
    if (!decision.allowed) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        permission,
        reason: decision.reason,
      });
    }
  }

  listRoles(applicationId?: number) {
    return this.roles.findAll({
      where: applicationId ? { application_id: applicationId } : undefined,
      include: [RbacPermission, Application],
      order: [['name', 'ASC']],
    });
  }

  createRole(input: {
    application_id: number;
    key: string;
    name: string;
    description?: string;
  }) {
    return this.roles.create({ ...input, is_system: false });
  }

  async updateRole(
    id: number,
    input: { name?: string; description?: string | null },
  ) {
    const role = await this.roles.findByPk(id);
    if (!role) throw new NotFoundException('Role not found');
    await role.update(input);
    this.clearCache();
    return role;
  }

  async deleteRole(id: number): Promise<void> {
    const role = await this.roles.findByPk(id);
    if (!role) throw new NotFoundException('Role not found');
    if (role.is_system)
      throw new ConflictException('System roles cannot be deleted');
    await role.destroy();
    this.clearCache();
  }

  listPermissions(applicationId?: number) {
    return this.permissions.findAll({
      where: applicationId ? { application_id: applicationId } : undefined,
      include: [Application],
      order: [['key', 'ASC']],
    });
  }

  createPermission(input: {
    application_id: number;
    key: string;
    description?: string;
  }) {
    return this.permissions.create(input);
  }

  async bulkCreatePermissions(
    applicationId: number,
    permissions: Array<{ key: string; description?: string }>,
  ) {
    const keys = permissions.map((permission) => permission.key);
    const existing = await this.permissions.findOne({
      where: { key: { [Op.in]: keys } },
    });
    if (existing) {
      throw new ConflictException(
        `Permission key already exists: ${existing.key}`,
      );
    }
    const created = await this.permissions.bulkCreate(
      permissions.map((permission) => ({
        ...permission,
        application_id: applicationId,
      })),
      { validate: true },
    );
    this.clearCache();
    return created;
  }

  async removeApplicationPermission(
    applicationId: number,
    permissionId: number,
  ): Promise<void> {
    const permission = await this.permissions.findOne({
      where: { id: permissionId, application_id: applicationId },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    await permission.destroy();
    this.clearCache();
  }

  async permissionBelongsToClientApplication(
    cognitoClientId: string,
    key: string,
  ): Promise<boolean> {
    return Boolean(
      await this.permissions.findOne({
        attributes: ['id'],
        where: { key },
        include: [
          {
            model: Application,
            required: true,
            where: { cognito_client_id: cognitoClientId },
          },
        ],
      }),
    );
  }

  async addPermissionToRole(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
    const [role, permission] = await Promise.all([
      this.roles.findByPk(roleId),
      this.permissions.findByPk(permissionId),
    ]);
    if (!role) throw new NotFoundException('Role not found');
    if (!permission) throw new NotFoundException('Permission not found');
    if (role.application_id !== permission.application_id) {
      throw new ConflictException(
        'Role and permission must belong to the same application',
      );
    }
    await this.rolePermissions.findOrCreate({
      where: { role_id: roleId, permission_id: permissionId },
    });
    this.clearCache();
  }

  async removePermissionFromRole(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
    await this.rolePermissions.destroy({
      where: { role_id: roleId, permission_id: permissionId },
    });
    this.clearCache();
  }

  listAssignments(userId: number) {
    return this.assignments.findAll({
      where: { user_id: userId },
      include: [RbacRole],
      order: [['id', 'ASC']],
    });
  }

  /** Returns the team scopes where a user holds the requested permission. */
  async listAuthorizedTeamIds(
    userId: number,
    permission: string,
  ): Promise<number[]> {
    const user = await this.users.findByPk(userId);
    if (!user?.is_active) return [];

    const assignments = await this.assignments.findAll({
      where: { user_id: userId, team_id: { [Op.ne]: null } },
      include: [{ model: RbacRole, include: [RbacPermission] }],
    });

    return [
      ...new Set(
        assignments
          .filter((assignment) =>
            assignment.role?.permissions?.some(
              (item) => item.key === '*' || item.key === permission,
            ),
          )
          .map((assignment) => assignment.team_id)
          .filter((teamId): teamId is number => Number.isInteger(teamId)),
      ),
    ].sort((a, b) => a - b);
  }

  async assignRole(input: {
    user_id: number;
    role_id: number;
    team_id?: number | null;
  }) {
    const [assignment] = await this.assignments.findOrCreate({
      where: {
        user_id: input.user_id,
        role_id: input.role_id,
        team_id: input.team_id ?? null,
      },
      defaults: input,
    });
    this.clearUserCache(input.user_id);
    return assignment;
  }

  async removeAssignment(id: number): Promise<void> {
    const assignment = await this.assignments.findByPk(id);
    if (!assignment) throw new NotFoundException('Role assignment not found');
    const userId = assignment.user_id;
    await assignment.destroy();
    this.clearUserCache(userId);
  }

  private store(
    key: string,
    decision: AuthorizationDecision,
  ): AuthorizationDecision {
    const now = Date.now();
    for (const [cachedKey, cached] of this.cache) {
      if (cached.expiresAt <= now) this.cache.delete(cachedKey);
    }

    // Map preserves insertion order, so removing the first key bounds memory
    // while retaining the most recently calculated decisions.
    if (!this.cache.has(key) && this.cache.size >= this.cacheMaxEntries) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.delete(key);
    this.cache.set(key, { expiresAt: now + this.cacheTtlMs, decision });
    return decision;
  }
}
