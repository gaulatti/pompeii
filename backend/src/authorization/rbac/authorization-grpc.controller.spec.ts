import { AuthorizationGrpcController } from './authorization-grpc.controller';

describe('AuthorizationGrpcController', () => {
  it('authenticates and provisions an active identity without evaluating RBAC', async () => {
    const identity = {
      sub: 'poll-owner',
      email: 'poll-owner@example.com',
      email_verified: true,
    };
    const users = {
      resolveAuthorizationUser: jest.fn().mockResolvedValue({
        id: 61,
        is_active: true,
      }),
    };
    const rbac = {
      resolvePermissionApplicationScope: jest.fn(),
      authorizeUser: jest.fn(),
    };
    const controller = new AuthorizationGrpcController(
      { verifyBearerToken: jest.fn().mockResolvedValue(identity) } as any,
      users as any,
      rbac as any,
    );

    await expect(
      controller.authenticate({ bearer_token: 'token' }),
    ).resolves.toEqual({
      authenticated: true,
      active: true,
      reason: 'ALLOW',
      subject: 'poll-owner',
    });
    expect(users.resolveAuthorizationUser).toHaveBeenCalledWith(identity);
    expect(rbac.authorizeUser).not.toHaveBeenCalled();
  });

  it('distinguishes invalid tokens and inactive identities', async () => {
    const invalid = new AuthorizationGrpcController(
      {
        verifyBearerToken: jest.fn().mockRejectedValue(new Error('invalid')),
      } as any,
      {} as any,
      {} as any,
    );
    await expect(
      invalid.authenticate({ bearer_token: 'bad' }),
    ).resolves.toMatchObject({
      authenticated: false,
      active: false,
      reason: 'DENY_INVALID_TOKEN',
      subject: '',
    });

    const inactive = new AuthorizationGrpcController(
      {
        verifyBearerToken: jest.fn().mockResolvedValue({
          sub: 'inactive-subject',
          email: 'inactive@example.com',
        }),
      } as any,
      {
        resolveAuthorizationUser: jest.fn().mockResolvedValue({
          id: 62,
          is_active: false,
        }),
      } as any,
      {} as any,
    );
    await expect(
      inactive.authenticate({ bearer_token: 'token' }),
    ).resolves.toMatchObject({
      authenticated: true,
      active: false,
      reason: 'DENY_INACTIVE_USER',
      subject: 'inactive-subject',
    });
  });

  it('returns a non-throwing denial for an invalid end-user token', async () => {
    const controller = new AuthorizationGrpcController(
      {
        verifyBearerToken: jest.fn().mockRejectedValue(new Error('invalid')),
      } as any,
      {} as any,
      {} as any,
    );

    await expect(
      controller.authorize({ bearer_token: 'bad', permission: 'team:read' }),
    ).resolves.toMatchObject({
      authenticated: false,
      allowed: false,
      reason: 'DENY_INVALID_TOKEN',
    });
  });

  it('evaluates global and requested team scope for a provisioned user', async () => {
    const rbac = {
      resolvePermissionApplicationScope: jest
        .fn()
        .mockResolvedValue({ applicationId: 4, teamId: 9 }),
      authorizeUser: jest.fn().mockResolvedValue({
        allowed: true,
        reason: 'ALLOW',
        permissions: ['application:read'],
        roles: ['viewer'],
      }),
    };
    const controller = new AuthorizationGrpcController(
      {
        verifyBearerToken: jest.fn().mockResolvedValue({
          sub: 'subject-1',
          pompeii_cognito_client_id: 'shared-client',
        }),
      } as any,
      {
        resolveAuthorizationUser: jest.fn().mockResolvedValue({ id: 42 }),
      } as any,
      rbac as any,
    );

    await expect(
      controller.authorize({
        bearer_token: 'token',
        permission: 'application:read',
        team_id: '9',
      }),
    ).resolves.toMatchObject({
      authenticated: true,
      allowed: true,
      subject: 'subject-1',
    });
    expect(rbac.authorizeUser).toHaveBeenCalledWith(42, 'application:read', 9);
  });

  it('provisions a verified first-use identity without bypassing RBAC', async () => {
    const users = {
      resolveAuthorizationUser: jest.fn().mockResolvedValue({ id: 51 }),
    };
    const rbac = {
      resolvePermissionApplicationScope: jest
        .fn()
        .mockResolvedValue({ applicationId: 8, teamId: 12 }),
      authorizeUser: jest.fn().mockResolvedValue({
        allowed: false,
        reason: 'DENY_NO_PERMISSION',
        permissions: [],
        roles: [],
      }),
    };
    const identity = {
      sub: 'first-use-subject',
      email: 'first-use@example.com',
      email_verified: true,
      given_name: 'First',
      family_name: 'Use',
      pompeii_cognito_client_id: 'shared-client',
    };
    const controller = new AuthorizationGrpcController(
      { verifyBearerToken: jest.fn().mockResolvedValue(identity) } as any,
      users as any,
      rbac as any,
    );

    await expect(
      controller.authorize({
        bearer_token: 'token',
        permission: 'angelina:poll:read',
      }),
    ).resolves.toMatchObject({
      authenticated: true,
      allowed: false,
      reason: 'DENY_NO_PERMISSION',
      subject: 'first-use-subject',
    });
    expect(users.resolveAuthorizationUser).toHaveBeenCalledWith(identity);
    expect(rbac.authorizeUser).toHaveBeenCalledWith(
      51,
      'angelina:poll:read',
      12,
    );
  });

  it('rejects a requested team that does not own the permission application', async () => {
    const rbac = {
      resolvePermissionApplicationScope: jest
        .fn()
        .mockResolvedValue({ applicationId: 8, teamId: 12 }),
      authorizeUser: jest.fn(),
    };
    const controller = new AuthorizationGrpcController(
      {
        verifyBearerToken: jest.fn().mockResolvedValue({
          sub: 'subject-1',
          pompeii_cognito_client_id: 'shared-client',
        }),
      } as any,
      {
        resolveAuthorizationUser: jest.fn().mockResolvedValue({ id: 42 }),
      } as any,
      rbac as any,
    );

    await expect(
      controller.authorize({
        bearer_token: 'token',
        permission: 'angelina:poll:read',
        team_id: 99,
      }),
    ).resolves.toMatchObject({
      authenticated: true,
      allowed: false,
      reason: 'DENY_APPLICATION_TEAM_MISMATCH',
    });
    expect(rbac.authorizeUser).not.toHaveBeenCalled();
  });

  it('denies a permission that is not registered to the token application', async () => {
    const rbac = {
      resolvePermissionApplicationScope: jest.fn().mockResolvedValue(null),
      authorizeUser: jest.fn(),
    };
    const controller = new AuthorizationGrpcController(
      {
        verifyBearerToken: jest.fn().mockResolvedValue({
          sub: 'subject-1',
          pompeii_cognito_client_id: 'shared-client',
        }),
      } as any,
      {
        resolveAuthorizationUser: jest.fn().mockResolvedValue({ id: 42 }),
      } as any,
      rbac as any,
    );

    await expect(
      controller.authorize({
        bearer_token: 'token',
        permission: 'another-app:admin',
      }),
    ).resolves.toMatchObject({
      authenticated: true,
      allowed: false,
      reason: 'DENY_UNREGISTERED_APPLICATION_PERMISSION',
    });
    expect(rbac.resolvePermissionApplicationScope).toHaveBeenCalledWith(
      'shared-client',
      'another-app:admin',
    );
    expect(rbac.authorizeUser).not.toHaveBeenCalled();
  });
});
