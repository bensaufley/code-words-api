const Sequelize = require('sequelize'),
      database = process.env.DATABASE_URL || require('./database.json')[process.env.NODE_ENV];

const logger = (...messages) => {
  if (process.env.NODE_ENV === 'test' && process.env.DEBUG !== 'true') return;
  console.log(...messages);
};

let sequelize;
if (typeof database === 'string') {
  sequelize = new Sequelize(database, { logging: logger });
} else {
  sequelize = new Sequelize({
    database: database.database,
    dialect: 'postgres',
    username: process.env[database.user.ENV],
    password: process.env[database.password.ENV],
    port: database.port,
    logging: logger
  });
}

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
  sequelize
};
