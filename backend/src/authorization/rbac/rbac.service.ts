import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { RbacPermission } from 'src/models/rbac-permission.model';
import { RbacRole } from 'src/models/rbac-role.model';
import { RoleAssignment } from 'src/models/role-assignment.model';
import { RolePermission } from 'src/models/role-permission.model';
import { User } from 'src/models/user.model';
import { AuthorizationDecision } from './rbac.types';

@Injectable()
export class RbacService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; decision: AuthorizationDecision }
  >();
  private readonly cacheTtlMs: number;
  private readonly cacheMaxEntries: number;

  constructor(
    @InjectModel(User) private readonly users: typeof User,
    @InjectModel(RbacRole) private readonly roles: typeof RbacRole,
    @InjectModel(RbacPermission)
    private readonly permissions: typeof RbacPermission,
    @InjectModel(RolePermission)
    private readonly rolePermissions: typeof RolePermission,
    @InjectModel(RoleAssignment)
    private readonly assignments: typeof RoleAssignment,
    config: ConfigService,
  ) {
    this.cacheTtlMs = this.positiveInteger(
      config.get('AUTHZ_DECISION_CACHE_TTL_MS'),
      5000,
    );
    this.cacheMaxEntries = this.positiveInteger(
      config.get('AUTHZ_DECISION_CACHE_MAX_ENTRIES'),
      10000,
    );
  }

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

  listRoles() {
    return this.roles.findAll({
      include: [RbacPermission],
      order: [['name', 'ASC']],
    });
  }

  createRole(input: { key: string; name: string; description?: string }) {
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

  listPermissions() {
    return this.permissions.findAll({ order: [['key', 'ASC']] });
  }

  createPermission(input: { key: string; description?: string }) {
    return this.permissions.create(input);
  }

  async addPermissionToRole(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
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

  private positiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
