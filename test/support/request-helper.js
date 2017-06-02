'use strict';

let helper = require('../test-helper'),
    sinon = helper.sinon;

module.exports = {
  stubRes() {
    let res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
  }
};
