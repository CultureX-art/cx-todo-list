import { Sequelize } from 'sequelize';
import databaseConfig from './database';

const sequelize = new Sequelize(databaseConfig.uri, databaseConfig.options);

export default sequelize;