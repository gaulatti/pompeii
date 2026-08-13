'use strict';

const { customAlphabet } = require('nanoid');
const createSlug = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  21,
);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'slug', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('teams', 'slug', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('applications', 'slug', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });

    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM users',
    );

    const [teams] = await queryInterface.sequelize.query(
      'SELECT id FROM teams',
    );

    const [applications] = await queryInterface.sequelize.query(
      'SELECT id FROM applications',
    );

    for (const user of users) {
      const slug = createSlug();
      await queryInterface.sequelize.query(
        `UPDATE users SET slug = :slug WHERE id = :id`,
        {
          replacements: { slug, id: user.id },
        },
      );
    }

    for (const team of teams) {
      const slug = createSlug();
      await queryInterface.sequelize.query(
        `UPDATE teams SET slug = :slug WHERE id = :id`,
        {
          replacements: { slug, id: team.id },
        },
      );
    }
    for (const application of applications) {
      const slug = createSlug();
      await queryInterface.sequelize.query(
        `UPDATE applications SET slug = :slug WHERE id = :id`,
        {
          replacements: { slug, id: application.id },
        },
      );
    }

    await queryInterface.changeColumn('users', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
    await queryInterface.changeColumn('teams', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
    await queryInterface.changeColumn('applications', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });

    await queryInterface.addColumn('features', 'default_value', {
      type: Sequelize.ENUM('C', 'T1', 'T2', 'T3'),
      defaultValue: 'C',
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'slug');
    await queryInterface.removeColumn('teams', 'slug');
    await queryInterface.removeColumn('applications', 'slug');
    await queryInterface.removeColumn('features', 'default_value');
  },
};
