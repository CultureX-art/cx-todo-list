import { Options } from 'sequelize';
import logger from './logger';

interface DatabaseConfig {
  uri: string;
  options: Options;
}

interface Config {
  development: DatabaseConfig;
  production: DatabaseConfig;
  test: DatabaseConfig;
}

const config: Config = {
  development: {
    uri: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/cx_todo_list_dev',
    options: {
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? (msg: string) => logger.debug(msg) : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  },
  production: {
    uri: process.env.DATABASE_URL!,
    options: {
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  },
  test: {
    uri: process.env.TEST_DATABASE_URL || 'mysql://root:password@localhost:3306/cx_todo_list_test',
    options: {
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  }
};

const environment = (process.env.NODE_ENV as keyof Config) || 'development';
logger.info(`Database configuration loaded for environment: ${environment}`);

export default config[environment];