import { bootstrapPlatformAdmin } from './bootstrap-platform-admin';

function database(responses: unknown[][]) {
  const query = jest.fn(async (..._arguments: unknown[]) => ({
    rows: responses.shift() ?? [],
  }));
  return { query };
}

describe('bootstrapPlatformAdmin', () => {
  it('assigns the first active user and records an audit event', async () => {
    const client = database([
      [],
      [{ id: 1, is_active: true }],
      [],
      [{ id: 7 }],
    ]);

    await expect(bootstrapPlatformAdmin(client as never, 1)).resolves.toEqual({
      userId: 1,
      alreadyAssigned: false,
    });

    const statements = client.query.mock.calls.map(([sql]) => sql).join('\n');
    expect(statements).toContain('INSERT INTO rbac_role_assignments');
    expect(statements).toContain('system.bootstrap_platform_admin');
    expect(statements).toContain('COMMIT');
  });

  it('is idempotent for the existing administrator', async () => {
    const client = database([
      [],
      [{ id: 1, is_active: true }],
      [{ user_id: 1 }],
    ]);

    await expect(bootstrapPlatformAdmin(client as never, 1)).resolves.toEqual({
      userId: 1,
      alreadyAssigned: true,
    });
  });

  it('refuses to replace a different existing administrator', async () => {
    const client = database([
      [],
      [{ id: 2, is_active: true }],
      [{ user_id: 1 }],
    ]);

    await expect(bootstrapPlatformAdmin(client as never, 2)).rejects.toThrow(
      'already exists',
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
