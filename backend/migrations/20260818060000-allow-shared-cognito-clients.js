'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS applications_cognito_client_id_unique',
    );
  },

  async down(queryInterface) {
    const [duplicates] = await queryInterface.sequelize.query(`
      SELECT cognito_client_id
      FROM applications
      WHERE cognito_client_id IS NOT NULL
      GROUP BY cognito_client_id
      HAVING COUNT(*) > 1
      LIMIT 1
    `);
    if (duplicates.length > 0) {
      throw new Error(
        'Cannot restore Cognito client uniqueness while applications share a client ID',
      );
    }
    await queryInterface.addIndex('applications', ['cognito_client_id'], {
      name: 'applications_cognito_client_id_unique',
      unique: true,
    });
  },
};
