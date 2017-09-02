'use strict';

const jwt = require('jsonwebtoken'),
      { v4: UUIDv4 } = require('node-uuid'),
      { cleanDatabase, config: { secret }, expect, sinon } = require('../../test-helper'),
      User = require('../../../models/user'),
      jwtStrategy = require('../../../middleware/strategies/jwt-strategy'),
      passportStrategyReq = require('../../support/passport-helper');

describe('jwtStrategy', () => {
  let sandbox, user, token;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    return User.create({ username: 'my-user', password: 'my-password' })
      .then((u) => {
        user = u;
        token = jwt.sign({ userId: user.id }, secret, { expiresIn: '1h' });
      });
  });

  afterEach(() => {
    sandbox.restore();
    return cleanDatabase();
  });

  it('returns the user for POST body authentication', () => {
    return passportStrategyReq(jwtStrategy, (req) => {
      req.body = { access_token: token };
    })
      .then(([retrievedUser]) => {
        expect(retrievedUser.username).to.eql(user.username);
      });
  });

  it('returns the user for GET query param authentication', () => {
    return passportStrategyReq(jwtStrategy, (req) => {
      req.url = `/api/v1/endpoint?access_token=${token}`;
    })
      .then(([retrievedUser]) => {
        expect(retrievedUser.username).to.eql(user.username);
      });
  });

  it('returns the user for Bearer authentication', () => {
    return passportStrategyReq(jwtStrategy, (req) => {
      req.headers.authorization = `Bearer ${token}`;
    })
      .then(([retrievedUser]) => {
        expect(retrievedUser.username).to.eql(user.username);
      });
  });

  it('rejects invalid credentials', () => {
    return passportStrategyReq(jwtStrategy, (req) => {
      req.headers.authorization = 'Bearer some-other-wrong-token';
    })
      .then(() => { throw new Error('Should not resolve'); })
      .catch((err) => {
        expect(err.message).to.eq('Authentication Failed');
      });
  });

  it('rejects token with invalid userId', () => {
    const otherToken = jwt.sign({ userId: UUIDv4() }, secret, { expiresIn: '1h' });

    return passportStrategyReq(jwtStrategy, (req) => {
      req.headers.authorization = `Bearer ${otherToken}`;
    })
      .then(() => { throw new Error('Should not resolve'); })
      .catch((err) => {
        expect(err.message).to.eq('Authentication Failed');
      });
  });

  it('rejects when error', () => {
    sandbox.stub(User, 'findOne').rejects(new Error('It borked!'));

    return passportStrategyReq(jwtStrategy, (req) => {
      req.headers.authorization = `Bearer ${token}`;
    })
      .then(() => { throw new Error('Should not resolve'); })
      .catch((err) => {
        expect(err.message).to.eq('It borked!');
      });
  });
});
