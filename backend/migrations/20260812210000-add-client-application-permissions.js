'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const now = new Date();
      const permissions = [
        ['auburndale:content:read', 'Read Auburndale content'],
        ['auburndale:content:write', 'Manage Auburndale content'],
        ['auburndale:media:read', 'Read Auburndale media'],
        ['auburndale:media:write', 'Manage Auburndale media'],
        ['auburndale:settings:read', 'Read Auburndale settings'],
        ['auburndale:settings:write', 'Manage Auburndale settings'],
        ['auburndale:translations:read', 'Read Auburndale translations'],
        ['auburndale:translations:write', 'Manage Auburndale translations'],
        ['auburndale:operations:read', 'Read Auburndale operational state'],
        ['auburndale:operations:write', 'Run Auburndale operations'],
        ['auburndale:authors:read', 'Read Auburndale author profiles'],
        ['angelina:poll:read', 'Read owned Angelina polls'],
        ['angelina:poll:create', 'Create Angelina polls'],
        ['celesti:channel:read', 'Read owned Celesti channels'],
        ['celesti:channel:manage', 'Manage owned Celesti channels'],
        ['celesti:group:read', 'Read owned Celesti channel groups'],
        ['celesti:group:manage', 'Manage owned Celesti channel groups'],
        ['celesti:playlist:read', 'Read owned Celesti playlist sources'],
        ['celesti:playlist:manage', 'Manage owned Celesti playlist sources'],
        ['celesti:device:read', 'Read owned Celesti devices'],
        ['celesti:device:manage', 'Manage owned Celesti devices'],
        ['celesti:device:operate', 'Operate owned Celesti devices'],
        ['alcantara:access', 'Access Alcantara'],
        ['alcantara:program:read', 'Read Alcantara programs'],
        ['alcantara:program:manage', 'Manage Alcantara programs'],
        ['alcantara:program:operate', 'Operate Alcantara programs'],
        ['alcantara:flight:read', 'Read Alcantara flights'],
        ['alcantara:flight:manage', 'Manage Alcantara flights'],
        ['alcantara:flight:operate', 'Operate Alcantara flights'],
        ['alcantara:scene:read', 'Read Alcantara scenes'],
        ['alcantara:scene:manage', 'Manage Alcantara scenes'],
        ['alcantara:scene:operate', 'Operate Alcantara scenes'],
        ['alcantara:layout:read', 'Read Alcantara layouts'],
        ['alcantara:layout:manage', 'Manage Alcantara layouts'],
        ['alcantara:media:read', 'Read Alcantara media and media groups'],
        ['alcantara:media:manage', 'Manage Alcantara media and media groups'],
        ['alcantara:song:read', 'Read Alcantara songs'],
        ['alcantara:song:manage', 'Manage Alcantara songs'],
        ['alcantara:instant:read', 'Read Alcantara instants'],
        ['alcantara:instant:manage', 'Manage Alcantara instants'],
        ['alcantara:instant:operate', 'Operate Alcantara instants'],
        ['alcantara:stinger:read', 'Read Alcantara stingers'],
        ['alcantara:stinger:manage', 'Manage Alcantara stingers'],
        ['alcantara:radio:read', 'Read Alcantara radio state'],
        ['alcantara:radio:manage', 'Manage Alcantara radio configuration'],
        ['alcantara:radio:operate', 'Operate Alcantara radio'],
        ['alcantara:webrtc:read', 'Read Alcantara WebRTC state'],
        ['alcantara:webrtc:operate', 'Operate Alcantara WebRTC sessions'],
        ['alcantara:upload:create', 'Create Alcantara uploads'],
      ];

      await queryInterface.bulkInsert(
        'rbac_permissions',
        permissions.map(([key, description]) => ({
          key,
          description,
          created_at: now,
          updated_at: now,
        })),
        { transaction },
      );

      await queryInterface.bulkInsert(
        'rbac_roles',
        [
          {
            key: 'auburndale-viewer',
            name: 'Auburndale Viewer',
            description: 'Read-only Auburndale access',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'auburndale-editor',
            name: 'Auburndale Editor',
            description: 'Editorial Auburndale access',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'auburndale-admin',
            name: 'Auburndale Administrator',
            description: 'Full Auburndale administration',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'angelina-user',
            name: 'Angelina Poll Creator',
            description: 'Create and review owned Angelina polls',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'celesti-viewer',
            name: 'Celesti Viewer',
            description: 'Read-only Celesti access',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'celesti-operator',
            name: 'Celesti Operator',
            description: 'Operate Celesti devices and manage content',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'celesti-admin',
            name: 'Celesti Administrator',
            description: 'Full Celesti administration',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'alcantara-viewer',
            name: 'Alcantara Viewer',
            description: 'Read-only Alcantara access',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'alcantara-operator',
            name: 'Alcantara Operator',
            description:
              'Operate Alcantara broadcasts without configuration access',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
          {
            key: 'alcantara-admin',
            name: 'Alcantara Administrator',
            description: 'Full Alcantara administration',
            is_system: true,
            created_at: now,
            updated_at: now,
          },
        ],
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
      INSERT INTO rbac_role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM rbac_roles r CROSS JOIN rbac_permissions p
      WHERE (r.key = 'auburndale-admin' AND p.key LIKE 'auburndale:%')
         OR (r.key = 'auburndale-viewer' AND p.key IN (
           'auburndale:content:read', 'auburndale:media:read',
           'auburndale:settings:read', 'auburndale:translations:read',
           'auburndale:operations:read', 'auburndale:authors:read'
         ))
         OR (r.key = 'auburndale-editor' AND (
           p.key IN (
             'auburndale:content:read', 'auburndale:content:write',
             'auburndale:media:read', 'auburndale:media:write',
             'auburndale:translations:read', 'auburndale:translations:write',
             'auburndale:settings:read', 'auburndale:operations:read',
             'auburndale:authors:read'
           )
         ))
         OR (r.key = 'angelina-user' AND p.key LIKE 'angelina:%')
         OR (r.key = 'celesti-admin' AND p.key LIKE 'celesti:%')
         OR (r.key = 'celesti-viewer' AND p.key IN (
           'celesti:channel:read', 'celesti:group:read',
           'celesti:playlist:read', 'celesti:device:read'
         ))
         OR (r.key = 'celesti-operator' AND p.key IN (
           'celesti:channel:read', 'celesti:channel:manage',
           'celesti:group:read', 'celesti:group:manage',
           'celesti:playlist:read', 'celesti:playlist:manage',
           'celesti:device:read', 'celesti:device:operate'
         ))
         OR (r.key = 'alcantara-admin' AND p.key LIKE 'alcantara:%')
         OR (r.key = 'alcantara-viewer' AND (
           p.key = 'alcantara:access' OR p.key LIKE 'alcantara:%:read'
         ))
         OR (r.key = 'alcantara-operator' AND (
           p.key = 'alcantara:access'
           OR p.key = 'alcantara:upload:create'
           OR p.key LIKE 'alcantara:%:read'
           OR p.key LIKE 'alcantara:%:operate'
         ))
      ON CONFLICT DO NOTHING
      `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
      DELETE FROM rbac_roles
      WHERE key IN (
        'auburndale-viewer', 'auburndale-editor', 'auburndale-admin',
        'angelina-user',
        'celesti-viewer', 'celesti-operator', 'celesti-admin',
        'alcantara-viewer', 'alcantara-operator', 'alcantara-admin'
      )
      `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
      DELETE FROM rbac_permissions
      WHERE key LIKE 'auburndale:%'
         OR key LIKE 'angelina:%'
         OR key LIKE 'celesti:%'
         OR key LIKE 'alcantara:%'
      `,
        { transaction },
      );
    });
  },
};
