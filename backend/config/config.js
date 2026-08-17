/* eslint-disable @typescript-eslint/no-require-imports */
const resolveConfig = () => {
  const useSsl = process.env.NODE_ENV === 'production';

  const base = {
    dialect: 'postgres',
    logging: false,
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : undefined,
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
