import { UnauthorizedException } from '@nestjs/common';
import { AuthenticationGuard } from './authentication.guard';

describe('AuthenticationGuard', () => {
  function context(request: {
    headers: Record<string, string>;
    user?: unknown;
  }) {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as any;
  }

  it('attaches the database-validated user to authenticated REST requests', async () => {
    const reflector = { getAllAndOverride: jest.fn() } as any;
    const tokens = {
      verifyBearerToken: jest.fn().mockResolvedValue({ sub: 'subject' }),
    } as any;
    const users = { updateUser: jest.fn().mockResolvedValue({ id: 1 }) } as any;
    const request = { headers: { authorization: 'Bearer token' } };
    const guard = new AuthenticationGuard(reflector, tokens, users);

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toEqual({
      headers: { authorization: 'Bearer token' },
      user: { id: 1 },
    });
  });

  it('rejects invalid authorization headers', async () => {
    const guard = new AuthenticationGuard({} as any, {} as any, {} as any);
    await expect(
      guard.canActivate(
        context({ headers: { authorization: ['one', 'two'] } } as any),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
