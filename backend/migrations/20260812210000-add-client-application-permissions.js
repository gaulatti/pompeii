'use strict';

/**
 * Retained as a migration-history marker. External application catalogs are
 * registered by administrators in Pompeii and must never be hardcoded here.
 * Existing installations are cleaned by the application-owned catalog
 * migration that follows the Pompeii application bootstrap.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up() {},
  async down() {},
};
