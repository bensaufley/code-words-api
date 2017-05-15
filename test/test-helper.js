'use strict';

process.env.NODE_ENV = 'test';

const chai = require('chai'),
      sinon = require('sinon'),
      sinonChai = require('sinon-chai'),
      config = require('../config');

chai.use(sinonChai);

module.exports = {
  config: config,
  expect: chai.expect,
  sinon: sinon
};
