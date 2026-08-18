'use strict';

const PLATFORM_ROLE_KEYS = ['platform-admin', 'operator', 'viewer'];
const PLATFORM_PERMISSION_KEYS = [
  '*',
  'user:read',
  'user:write',
  'team:read',
  'team:write',
  'application:read',
  'application:write',
  'role:read',
  'role:write',
  'audit:read',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'rbac_permissions',
        'application_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'applications', key: 'id' },
          onDelete: 'CASCADE',
        },
        { transaction },
      );
      await queryInterface.addColumn(
        'rbac_roles',
        'application_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'applications', key: 'id' },
          onDelete: 'CASCADE',
        },
        { transaction },
      );

      const [assignedNonPlatformSystemRoles] =
        await queryInterface.sequelize.query(
          `
          SELECT r.key
          FROM rbac_role_assignments a
          JOIN rbac_roles r ON r.id = a.role_id
          WHERE r.is_system = TRUE
            AND r.key NOT IN (:platformRoleKeys)
          LIMIT 1
        `,
          {
            replacements: { platformRoleKeys: PLATFORM_ROLE_KEYS },
            transaction,
          },
        );
      if (assignedNonPlatformSystemRoles.length > 0) {
        throw new Error(
          'Non-platform system roles still have assignments; replace them with administrator-created roles before migrating',
        );
      }

      await queryInterface.sequelize.query(
        `
          DELETE FROM rbac_roles
          WHERE is_system = TRUE
            AND key NOT IN (:platformRoleKeys)
        `,
        {
          replacements: { platformRoleKeys: PLATFORM_ROLE_KEYS },
          transaction,
        },
      );

      const [mappedNonPlatformPermissions] =
        await queryInterface.sequelize.query(
          `
          SELECT p.key
          FROM rbac_role_permissions rp
          JOIN rbac_permissions p ON p.id = rp.permission_id
          WHERE p.key NOT IN (:platformPermissionKeys)
          LIMIT 1
        `,
          {
            replacements: { platformPermissionKeys: PLATFORM_PERMISSION_KEYS },
            transaction,
          },
        );
      if (mappedNonPlatformPermissions.length > 0) {
        throw new Error(
          'Non-platform permissions are mapped to administrator-created roles; register application ownership before migrating',
        );
      }

      await queryInterface.sequelize.query(
        'DELETE FROM rbac_permissions WHERE key NOT IN (:platformPermissionKeys)',
        {
          replacements: { platformPermissionKeys: PLATFORM_PERMISSION_KEYS },
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `
          UPDATE rbac_permissions
          SET application_id = (
            SELECT id FROM applications WHERE slug = 'pompeii'
          )
          WHERE application_id IS NULL
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          UPDATE rbac_roles
          SET application_id = (
            SELECT id FROM applications WHERE slug = 'pompeii'
          )
          WHERE application_id IS NULL
        `,
        { transaction },
      );

      const [unowned] = await queryInterface.sequelize.query(
        `
          SELECT id FROM rbac_permissions WHERE application_id IS NULL
          UNION ALL
          SELECT id FROM rbac_roles WHERE application_id IS NULL
          LIMIT 1
        `,
        { transaction },
      );
      if (unowned.length > 0) {
        throw new Error(
          'Pompeii application is required to own platform roles and permissions',
        );
      }

      await queryInterface.changeColumn(
        'rbac_permissions',
        'application_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction },
      );
      await queryInterface.addIndex('rbac_permissions', ['application_id'], {
        name: 'rbac_permissions_application_id',
        transaction,
      });
      await queryInterface.changeColumn(
        'rbac_roles',
        'application_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE rbac_roles DROP CONSTRAINT IF EXISTS rbac_roles_key_key',
        { transaction },
      );
      await queryInterface.addIndex('rbac_roles', ['application_id', 'key'], {
        unique: true,
        name: 'rbac_roles_application_key_unique',
        transaction,
      });

      await queryInterface.sequelize.query(
        `
          CREATE OR REPLACE FUNCTION enforce_application_role_permission()
          RETURNS trigger AS $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM rbac_roles r
              JOIN rbac_permissions p
                ON p.id = NEW.permission_id
               AND p.application_id = r.application_id
              WHERE r.id = NEW.role_id
            ) THEN
              RAISE EXCEPTION 'Role and permission must belong to the same application';
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          CREATE TRIGGER rbac_role_permissions_same_application
          BEFORE INSERT OR UPDATE ON rbac_role_permissions
          FOR EACH ROW EXECUTE FUNCTION enforce_application_role_permission();
        `,
        { transaction },
      );

      const applicationColumns = await queryInterface.describeTable(
        'applications',
        { transaction },
      );
      if (applicationColumns.login_redirect_schemes) {
        await queryInterface.removeColumn(
          'applications',
          'login_redirect_schemes',
          { transaction },
        );
      }
      if (applicationColumns.login_redirect_origins) {
        await queryInterface.removeColumn(
          'applications',
          'login_redirect_origins',
          { transaction },
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `
        DROP TRIGGER IF EXISTS rbac_role_permissions_same_application ON rbac_role_permissions;
        DROP FUNCTION IF EXISTS enforce_application_role_permission();
      `,
    );
    await queryInterface.removeIndex(
      'rbac_roles',
      'rbac_roles_application_key_unique',
    );
    await queryInterface.addConstraint('rbac_roles', {
      fields: ['key'],
      type: 'unique',
      name: 'rbac_roles_key_key',
    });
    await queryInterface.removeColumn('rbac_roles', 'application_id');
    await queryInterface.removeIndex(
      'rbac_permissions',
      'rbac_permissions_application_id',
    );
    await queryInterface.removeColumn('rbac_permissions', 'application_id');
  },
};
