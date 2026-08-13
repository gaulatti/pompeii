/* eslint-disable @typescript-eslint/no-require-imports */
const dotenv = require('dotenv');

dotenv.config();

const resolveConfig = () => {
  const useSsl = process.env.DB_SSL === 'true';

  const base = {
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true',
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : undefined,
  };

  if (process.env.DATABASE_URL) {
    return {
      ...base,
      use_env_variable: 'DATABASE_URL',
    };
  }

  if (process.env.USE_LOCAL_DATABASE === 'true') {
    return {
      ...base,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    };
  }

  throw new Error(
    'Sequelize CLI requires DATABASE_URL or USE_LOCAL_DATABASE=true with DB_* vars.',
  );
};

const envConfig = resolveConfig();

module.exports = {
  development: envConfig,
  test: envConfig,
  production: envConfig,
};
