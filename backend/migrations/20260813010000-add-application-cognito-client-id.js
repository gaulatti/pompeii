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
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('applications', 'cognito_client_id');
    await queryInterface.removeColumn('applications', 'cognito_user_pool_id');
  },
};
