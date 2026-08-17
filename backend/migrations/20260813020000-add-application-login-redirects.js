'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('applications', 'login_redirect_origins', {
      type: Sequelize.ARRAY(Sequelize.TEXT),
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn('applications', 'login_redirect_schemes', {
      type: Sequelize.ARRAY(Sequelize.TEXT),
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      'applications',
      'login_redirect_schemes',
    );
    await queryInterface.removeColumn(
      'applications',
      'login_redirect_origins',
    );
  },
};
