const Sequelize = require('sequelize'),
      databaseUri = process.env.DATABASE_URL || require('./database.json')[process.env.NODE_ENV];

const logger = (...messages) => {
  if (process.env.NODE_ENV === 'test' && process.env.DEBUG !== 'true') return;
  console.log(...messages);
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
  log: logger,
  secret: process.env.SECRET_TOKEN,
  sequelize: new Sequelize(databaseUri, { logging: logger })
};
