import type { PoolClient, QueryResult } from 'pg';

type BootstrapResult = {
  userId: number;
  alreadyAssigned: boolean;
};

type UserRow = { id: number; is_active: boolean };
type AssignmentRow = { user_id: number };
type RoleRow = { id: number };

async function rows<T extends Record<string, unknown>>(
  client: Pick<PoolClient, 'query'>,
  sql: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = (await client.query(sql, values)) as QueryResult<T>;
  return result.rows;
}

export async function bootstrapPlatformAdmin(
  client: Pick<PoolClient, 'query'>,
  userId: number,
): Promise<BootstrapResult> {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error('A positive integer user ID is required');
  }

  await client.query('BEGIN');
  try {
    const [user] = await rows<UserRow>(
      client,
      'SELECT id, is_active FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    if (!user) throw new Error(`User ${userId} does not exist`);
    if (!user.is_active) throw new Error(`User ${userId} is inactive`);

    const [existingAdmin] = await rows<AssignmentRow>(
      client,
      `
        SELECT assignment.user_id
        FROM rbac_role_assignments assignment
        JOIN rbac_roles role ON role.id = assignment.role_id
        WHERE role.key = 'platform-admin' AND assignment.team_id IS NULL
        FOR UPDATE OF assignment
      `,
    );
    if (existingAdmin) {
      if (existingAdmin.user_id !== userId) {
        throw new Error(
          'A global platform administrator already exists; use Pompeii governance to assign additional administrators',
        );
      }
      await client.query('COMMIT');
      return { userId, alreadyAssigned: true };
    }

    const [role] = await rows<RoleRow>(
      client,
      "SELECT id FROM rbac_roles WHERE key = 'platform-admin' FOR UPDATE",
    );
    if (!role) throw new Error('The platform-admin system role is missing');

    await client.query(
      `
        INSERT INTO rbac_role_assignments (
          user_id, role_id, team_id, created_at, updated_at
        ) VALUES ($1, $2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [userId, role.id],
    );
    await client.query(
      `
        INSERT INTO administrative_audit_logs (
          actor_user_id, action, target_type, target_id, metadata, created_at
        ) VALUES (
          $1, 'system.bootstrap_platform_admin', 'user', $2,
          '{"source":"github-actions"}'::jsonb, CURRENT_TIMESTAMP
        )
      `,
      [userId, String(userId)],
    );
    await client.query('COMMIT');
    return { userId, alreadyAssigned: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
