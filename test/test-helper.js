'use strict';

process.env.NODE_ENV = 'test';

const chai = require('chai'),
      sinon = require('sinon'),
      sinonChai = require('sinon-chai'),
      config = require('../config'),
      User = require('../models/user');

const UUIDV4_REGEXP = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      JWT_REGEXP = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;

chai.use(sinonChai);

before(() => User.truncate());
after(() => User.truncate());

module.exports = {
  config: config,
  expect: chai.expect,
  sinon: sinon,
  matchers: {
    uuid: sinon.match((val) => { return UUIDV4_REGEXP.test(val); }, 'UUID'),
    jwt: sinon.match((val) => { return JWT_REGEXP.test(val); }, 'JsonWebToken')
  }
};
