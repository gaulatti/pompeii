import { AuthorizationGrpcController } from './authorization-grpc.controller';

describe('AuthorizationGrpcController', () => {
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
      authorizeUser: jest.fn().mockResolvedValue({
        allowed: true,
        reason: 'ALLOW',
        permissions: ['application:read'],
        roles: ['viewer'],
      }),
    };
    const controller = new AuthorizationGrpcController(
      {
        verifyBearerToken: jest.fn().mockResolvedValue({ sub: 'subject-1' }),
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
      null,
    );
  });
});
