'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn('users', 'last_seen_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.createTable('rbac_roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.createTable('rbac_permissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.createTable('rbac_role_permissions', {
      role_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: 'rbac_roles', key: 'id' },
        onDelete: 'CASCADE',
      },
      permission_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: 'rbac_permissions', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.createTable('rbac_role_assignments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'rbac_roles', key: 'id' },
        onDelete: 'CASCADE',
      },
      team_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'teams', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex(
      'rbac_role_assignments',
      ['user_id', 'role_id', 'team_id'],
      {
        unique: true,
        name: 'rbac_assignments_scoped_unique',
      },
    );
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX rbac_assignments_global_unique ON rbac_role_assignments (user_id, role_id) WHERE team_id IS NULL',
    );

    await queryInterface.createTable('administrative_audit_logs', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      actor_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      action: { type: Sequelize.STRING(255), allowNull: false },
      target_type: { type: Sequelize.STRING(100), allowNull: false },
      target_id: { type: Sequelize.STRING(255), allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('administrative_audit_logs', ['created_at'], {
      name: 'administrative_audit_logs_created_at',
    });

    await queryInterface.bulkInsert('rbac_roles', [
      {
        key: 'platform-admin',
        name: 'Platform Admin',
        description: 'Full administrative access',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'operator',
        name: 'Operator',
        description: 'Team-scoped management access',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'viewer',
        name: 'Viewer',
        description: 'Read-only access',
        is_system: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
    await queryInterface.bulkInsert('rbac_permissions', [
      {
        key: '*',
        description: 'All permissions',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'user:read',
        description: 'Read users',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'user:write',
        description: 'Manage users',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'team:read',
        description: 'Read teams',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'team:write',
        description: 'Manage teams and memberships',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'application:read',
        description: 'Read applications and features',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'application:write',
        description: 'Manage applications and features',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'role:read',
        description: 'Read RBAC configuration',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'role:write',
        description: 'Manage RBAC configuration',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        key: 'audit:read',
        description: 'Read administrative audit logs',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    await queryInterface.sequelize.query(`
      INSERT INTO rbac_role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM rbac_roles r CROSS JOIN rbac_permissions p
      WHERE (r.key = 'platform-admin' AND p.key = '*')
         OR (r.key = 'operator' AND p.key IN ('user:read', 'team:read', 'team:write', 'application:read', 'application:write'))
         OR (r.key = 'viewer' AND p.key IN ('user:read', 'team:read', 'application:read'))
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO rbac_role_assignments (user_id, role_id, team_id, created_at, updated_at)
      SELECT m.users_id, r.id,
        CASE WHEN m.role = 1 AND m.teams_id = 1 THEN NULL ELSE m.teams_id END,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM memberships m
      JOIN rbac_roles r ON r.key = CASE WHEN m.role = 1 THEN 'platform-admin' WHEN m.role = 2 THEN 'operator' ELSE 'viewer' END
      ON CONFLICT DO NOTHING
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('administrative_audit_logs');
    await queryInterface.dropTable('rbac_role_assignments');
    await queryInterface.dropTable('rbac_role_permissions');
    await queryInterface.dropTable('rbac_permissions');
    await queryInterface.dropTable('rbac_roles');
    await queryInterface.removeColumn('users', 'last_seen_at');
    await queryInterface.removeColumn('users', 'is_active');
  },
};
