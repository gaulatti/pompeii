/* eslint-disable @typescript-eslint/no-require-imports */
const resolveConfig = () => {
  const base = {
    dialect: 'postgres',
    logging: false,
  };

  if (!process.env.DATABASE_URL) {
    throw new Error('Sequelize CLI requires DATABASE_URL.');
  }

  return {
    ...base,
    use_env_variable: 'DATABASE_URL',
  };
};

const envConfig = resolveConfig();

module.exports = {
  development: envConfig,
  test: envConfig,
  production: envConfig,
};
