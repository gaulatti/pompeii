'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('applications', 'cognito_user_pool_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('applications', 'cognito_client_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addIndex('applications', ['cognito_client_id'], {
      name: 'applications_cognito_client_id_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'applications',
      'applications_cognito_client_id_unique',
    );
    await queryInterface.removeColumn('applications', 'cognito_client_id');
    await queryInterface.removeColumn('applications', 'cognito_user_pool_id');
  },
};
