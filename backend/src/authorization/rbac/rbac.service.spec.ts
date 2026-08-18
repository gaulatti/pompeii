import { RbacService } from './rbac.service';
import { ConflictException } from '@nestjs/common';

describe('RbacService', () => {
  const makeService = (
    overrides: {
      user?: any;
      assignments?: any[];
    } = {},
  ) => {
    const users = {
      findByPk: jest
        .fn()
        .mockResolvedValue(overrides.user ?? { id: 7, is_active: true }),
    };
    const assignments = {
      findAll: jest.fn().mockResolvedValue(overrides.assignments ?? []),
    };
    const service = new RbacService(
      users as any,
      {} as any,
      {} as any,
      {} as any,
      assignments as any,
    );
    return { service, users, assignments };
  };

  it('allows an exact permission inherited through a role', async () => {
    const { service } = makeService({
      assignments: [
        {
          role: {
            key: 'operator',
            permissions: [{ key: 'application:write' }],
          },
        },
      ],
    });

    await expect(
      service.authorizeUser(7, 'application:write', 12),
    ).resolves.toEqual({
      allowed: true,
      reason: 'ALLOW',
      permissions: ['application:write'],
      roles: ['operator'],
    });
  });

  it('allows the wildcard permission', async () => {
    const { service } = makeService({
      assignments: [
        { role: { key: 'platform-admin', permissions: [{ key: '*' }] } },
      ],
    });

    const decision = await service.authorizeUser(7, 'role:write');
    expect(decision.allowed).toBe(true);
  });

  it('denies inactive users without loading assignments', async () => {
    const { service, assignments } = makeService({
      user: { id: 7, is_active: false },
    });

    await expect(service.authorizeUser(7, 'team:read')).resolves.toMatchObject({
      allowed: false,
      reason: 'DENY_INACTIVE_USER',
    });
    expect(assignments.findAll).not.toHaveBeenCalled();
  });

  it('caches a decision for the configured short TTL', async () => {
    const { service, assignments } = makeService({
      assignments: [
        { role: { key: 'viewer', permissions: [{ key: 'team:read' }] } },
      ],
    });

    await service.authorizeUser(7, 'team:read', 3);
    await service.authorizeUser(7, 'team:read', 3);
    expect(assignments.findAll).toHaveBeenCalledTimes(1);
  });

  it('evicts old decisions when the bounded cache reaches capacity', async () => {
    const { service, assignments } = makeService();
    Object.defineProperty(service, 'cacheMaxEntries', { value: 2 });

    await service.authorizeUser(7, 'permission:one');
    await service.authorizeUser(7, 'permission:two');
    await service.authorizeUser(7, 'permission:three');
    await service.authorizeUser(7, 'permission:one');

    expect(assignments.findAll).toHaveBeenCalledTimes(4);
    expect((service as any).cache.size).toBe(2);
  });

  it('removes expired decisions before storing new keys', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const { service } = makeService();
    Object.defineProperty(service, 'cacheTtlMs', { value: 5 });

    await service.authorizeUser(7, 'permission:expired');
    now.mockReturnValue(1006);
    await service.authorizeUser(7, 'permission:new');

    expect([...(service as any).cache.keys()]).toEqual(['7|permission:new|']);
    now.mockRestore();
  });

  it('returns only team scopes that grant the requested permission', async () => {
    const { service } = makeService({
      assignments: [
        { team_id: 9, role: { permissions: [{ key: 'team:read' }] } },
        { team_id: 4, role: { permissions: [{ key: '*' }] } },
        { team_id: 11, role: { permissions: [{ key: 'application:read' }] } },
        { team_id: 9, role: { permissions: [{ key: 'team:read' }] } },
      ],
    });

    await expect(
      service.listAuthorizedTeamIds(7, 'team:read'),
    ).resolves.toEqual([4, 9]);
  });

  it('rejects a role-permission mapping across applications', async () => {
    const rolePermissions = { findOrCreate: jest.fn() };
    const service = new RbacService(
      {} as any,
      { findByPk: jest.fn().mockResolvedValue({ application_id: 2 }) } as any,
      { findByPk: jest.fn().mockResolvedValue({ application_id: 3 }) } as any,
      rolePermissions as any,
      {} as any,
    );

    await expect(service.addPermissionToRole(10, 20)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(rolePermissions.findOrCreate).not.toHaveBeenCalled();
  });

  it('matches a permission through its owning application shared client', async () => {
    const permissions = {
      findOne: jest.fn().mockResolvedValue({
        id: 20,
        application_id: 3,
        application: { id: 3, team_id: 7 },
      }),
    };
    const service = new RbacService(
      {} as any,
      {} as any,
      permissions as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.resolvePermissionApplicationScope(
        'shared-client',
        'celesti:device:read',
      ),
    ).resolves.toEqual({ applicationId: 3, teamId: 7 });
    expect(permissions.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'celesti:device:read' },
        include: [
          expect.objectContaining({
            required: true,
            attributes: ['id', 'team_id'],
            where: { cognito_client_id: 'shared-client' },
          }),
        ],
      }),
    );
  });

  it('rejects a team-scoped role assignment outside its application team', async () => {
    const assignments = { findOrCreate: jest.fn() };
    const service = new RbacService(
      {} as any,
      {
        findByPk: jest.fn().mockResolvedValue({
          id: 4,
          application: { id: 3, team_id: 7 },
        }),
      } as any,
      {} as any,
      {} as any,
      assignments as any,
    );

    await expect(
      service.assignRole({ user_id: 1, role_id: 4, team_id: 9 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(assignments.findOrCreate).not.toHaveBeenCalled();
  });
});
