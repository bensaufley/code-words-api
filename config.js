const Sequelize = require('sequelize'),
      databaseJson = require('./database.json'),
      pg = require('pg');

let dbUrl = process.env.DATABASE_URL;

/* db config will only ever do one of if/else so coverage will
 * always be reported for one or the other. Best to ignore. */
/* istanbul ignore next */
if (!dbUrl) {
  let dbConfig = databaseJson[process.env.NODE_ENV];

  for (let key in dbConfig) {
    if (!dbConfig.hasOwnProperty(key) || typeof dbConfig[key] === 'string') continue;
    if (dbConfig[key].ENV) dbConfig[key] = process.env[dbConfig[key].ENV];
  }

  dbUrl = `postgres://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
}

/* istanbul ignore next */
if (process.env.DEBUG === 'true') Error.stackTraceLimit = 100;

const logger = (...messages) => {
  /* istanbul ignore else */
  if (process.env.NODE_ENV === 'test' && process.env.DEBUG !== 'true') return;
  else console.log(...messages);
};

pg.types.setTypeParser(1114, (stringValue) => new Date(stringValue + ` +0000`));

let sequelize = new Sequelize(dbUrl, { logging: logger, timezone: `-0${new Date().getTimezoneOffset() / 60}:00` });

const CORS_DOMAINS = {
  development: null,
  test: ['code-words-web.herokuapp.com'],
  production: ['code-words-web.herokuapp.com']
};

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
module.exports = {
  corsDomains: CORS_DOMAINS[process.env.NODE_ENV],
  dbUrl: dbUrl,
  log: logger,
  secret: process.env.SECRET_TOKEN,
  sequelize,
  sockets: {}
};
