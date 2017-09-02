'use strict';

const User = require('../../../models/user'),
      localStrategy = require('../../../middleware/strategies/local-strategy'),
      { cleanDatabase, expect, sinon } = require('../../test-helper'),
      passportStrategyReq = require('../../support/passport-helper');

describe('localStrategy', () => {
  let sandbox, user;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    return User.create({ username: 'my-user', password: 'my-password' })
      .then((u) => user = u);
  });

  afterEach(() => {
    sandbox.restore();
    return cleanDatabase();
  });

  it('returns the user', () => {
    return passportStrategyReq(localStrategy, (req) => {
      req.body = { username: 'my-user', password: 'my-password' };
    })
      .then(([retrievedUser]) => {
        expect(retrievedUser.username).to.eql(user.username);
      });
  });

  it('rejects invalid credentials', () => {
    return passportStrategyReq(localStrategy, (req) => {
      req.body = { username: 'some-other-name', password: 'bad-password' };
    })
      .then(() => { throw new Error('Should not resolve'); })
      .catch((err) => {
        expect(err.message).to.eq('Authentication Failed');
      });
  });

  it('rejects when error', () => {
    sandbox.stub(User, 'login').rejects(new Error('It borked!'));

    return passportStrategyReq(localStrategy, (req) => {
      req.body = { username: 'my-user', password: 'my-password' };
    })
      .then(() => { throw new Error('Should not resolve'); })
      .catch((err) => {
        expect(err.message).to.eq('It borked!');
      });
  });
});
