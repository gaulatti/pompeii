'use strict';

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to seed Pompeii`);
  return value;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const userPoolId = requiredEnvironment('POMPEII_COGNITO_USER_POOL_ID');
    const clientId = requiredEnvironment('POMPEII_COGNITO_CLIENT_ID');

    await queryInterface.sequelize.transaction(async (transaction) => {
      const [teams] = await queryInterface.sequelize.query(
        `
          INSERT INTO teams (name, slug, created_at, updated_at)
          VALUES ('Pompeii', 'pompeii', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `,
        { transaction },
      );
      const teamId = teams[0].id;

      await queryInterface.sequelize.query(
        `
          INSERT INTO applications (
            team_id, name, slug, description, cognito_user_pool_id,
            cognito_client_id, created_at, updated_at
          ) VALUES (
            :teamId, 'Pompeii', 'pompeii',
            'Pompeii authorization control center', :userPoolId, :clientId,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (slug) DO UPDATE SET
            team_id = EXCLUDED.team_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            cognito_user_pool_id = EXCLUDED.cognito_user_pool_id,
            cognito_client_id = EXCLUDED.cognito_client_id,
            updated_at = CURRENT_TIMESTAMP
        `,
        {
          replacements: { teamId, userPoolId, clientId },
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DELETE FROM applications WHERE slug = 'pompeii'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          DELETE FROM teams
          WHERE slug = 'pompeii'
            AND NOT EXISTS (
              SELECT 1 FROM applications WHERE team_id = teams.id
            )
        `,
        { transaction },
      );
    });
  },
};
