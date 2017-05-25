'use strict';

process.env.NODE_ENV = 'test';

const chai = require('chai'),
      sinon = require('sinon'),
      sinonChai = require('sinon-chai'),
      DatabaseCleaner = require('database-cleaner'),
      pg = require('pg'),
      config = require('../config'),
      databaseCleaner = new DatabaseCleaner('postgresql', {
        postgresql: {
          skipTables: ['migrations'],
          strategy: 'truncation'
        }
      });

const UUIDV4_REGEXP = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      JWT_REGEXP = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;

console.log(config.dbUrl);

const cleanDatabase = () => {
  return new Promise((resolve, reject) => {
    pg.connect(config.dbUrl, (err, client, done) => {
      if (err) return reject(err);
      resolve([client, done]);
    });
  }).then(([client, done]) => {
    return new Promise((resolve, reject) => {
      databaseCleaner.clean(client, (err) => {
        done();
        if (err) return reject(err);
        resolve();
      });
    });
  });
};

chai.use(sinonChai);

// Unhandled Promise Rejections are a sign of a misconfigured test
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  process.exit();
});

before(() => cleanDatabase());
after(() => cleanDatabase());

module.exports = {
  cleanDatabase: cleanDatabase,
  config: config,
  expect: chai.expect,
  sinon: sinon,
  matchers: {
    uuid: sinon.match((val) => { return UUIDV4_REGEXP.test(val); }, 'UUID'),
    jwt: sinon.match((val) => { return JWT_REGEXP.test(val); }, 'JsonWebToken')
  }
};
