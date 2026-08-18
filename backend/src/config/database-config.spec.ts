const ORIGINAL_ENV = process.env;

describe('Sequelize CLI database configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://pompeii:secret@database:5432/pompeii',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('does not force SSL for production database URLs', () => {
    const config = require('../../config/config');

    expect(config.production).toMatchObject({
      dialect: 'postgres',
      logging: false,
      use_env_variable: 'DATABASE_URL',
    });
    expect(config.production.dialectOptions).toBeUndefined();
  });
});
