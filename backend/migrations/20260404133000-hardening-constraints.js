'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('memberships', ['users_id', 'teams_id'], {
      unique: true,
      name: 'memberships_users_teams_unique',
    });

    await queryInterface.addIndex('permissions', ['membership_id', 'feature_id'], {
      unique: true,
      name: 'permissions_membership_feature_unique',
    });

    await queryInterface.addIndex('applications', ['team_id', 'slug'], {
      unique: true,
      name: 'applications_team_slug_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('memberships', 'memberships_users_teams_unique');
    await queryInterface.removeIndex('permissions', 'permissions_membership_feature_unique');
    await queryInterface.removeIndex('applications', 'applications_team_slug_unique');
  },
};
