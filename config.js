'use strict';

import Sequelize from 'sequelize';
import databaseJson from './database.json';

let dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  let dbConfig = databaseJson[process.env.NODE_ENV];

  for (let key in dbConfig) {
    if (!dbConfig.hasOwnProperty(key) || typeof dbConfig[key] === 'string') continue;
    if (dbConfig[key].ENV) dbConfig[key] = process.env[dbConfig[key].ENV];
  }

  dbUrl = `postgres://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
}

if (process.env.DEBUG === 'true') Error.stackTraceLimit = 100;

const logger = (...messages) => {
  if (process.env.NODE_ENV === 'test' && process.env.DEBUG !== 'true') return;
  console.log(...messages);
};

let sequelize = new Sequelize(dbUrl, { logging: logger });

/**
 * @typedef Config
 *
 * @property {Function} log - wraps console.log, suppresses it for test
 * @property {String} secret - app's secret token
 * @property {Object} sequelize - instance of sequelize connected to db
 */

/**
 * @type {Config}
 */
export default {
  dbUrl: dbUrl,
  log: logger,
  secret: process.env.SECRET_TOKEN,
  sequelize,
  sockets: {}
};
