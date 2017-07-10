'use strict';

const helper = require('../test-helper'),
      jwt = require('jsonwebtoken'),
      expect = helper.expect,
      sinon = helper.sinon,
      validateRequest = require('../../middleware/validate-request'),
      Auth = require('../../lib/auth'),
      User = require('../../models/user');

describe('validateRequest Middleware', () => {
  let res, sandbox, validToken, expiredToken, user, nextStub;

  beforeEach((done) => {
    sandbox = sinon.sandbox.create();
    res = {};
    res.status = () => res;
    res.json = () => res;
    sandbox.spy(res, 'json');
    sandbox.spy(res, 'status');
    nextStub = sandbox.stub();
    User.create({
      id: '2555a106-1bee-4e88-9025-199e46bebcc7',
      username: 'test-user',
      password: 'test-password'
    }).then((u) => {
      user = u;
      validToken = jwt.sign({ userId: u.id }, helper.config.secret, { expiresIn: '7 days' });
      expiredToken = jwt.sign({ userId: u.id }, helper.config.secret, { expiresIn: '0s' });
      done();
    });
  });

  afterEach(() => {
    sandbox.restore();
    return helper.cleanDatabase();
  });

  context('post', () => {
    let req;

    beforeEach((done) => {
      req = { get: () => {}, body: { access_token: null } };
      done();
    });

    it('rejects an invalid token', () => {
      sandbox.spy(Auth.prototype, 'reject');

      return validateRequest(req, res, nextStub).then(() => {
        expect(Auth.prototype.reject).to.have.been.calledWithExactly(sinon.match((value) => {
          return value.name === 'Error';
        }));
      });
    });

    it('rejects an expired token', () => {
      sandbox.spy(Auth.prototype, 'reject');
      req.body.access_token = expiredToken;

      return validateRequest(req, res, nextStub).then(() => {
        expect(Auth.prototype.reject).to.have.been.calledWithExactly(sinon.match((value) => {
          return value.name === 'TokenExpiredError';
        }), 400);
      });
    });

    it('accepts a valid token', () => {
      req.body.access_token = validToken;

      return validateRequest(req, res, nextStub).then(() => {
        expect(req.user.username).to.eq('test-user');
        expect(req.user.id).to.eq(user.id);
        expect(nextStub).to.have.beenCalled;
      });
    });
  });

  context('get', () => {
    let req;

    beforeEach((done) => {
      req = { get: () => {}, query: { access_token: null } };
      done();
    });

    it('rejects an invalid token', () => {
      sandbox.spy(Auth.prototype, 'reject');

      return validateRequest(req, res, nextStub).then(() => {
        expect(Auth.prototype.reject).to.have.been.calledWithExactly(sinon.match((value) => {
          return value.name === 'Error';
        }));
      });
    });


    it('rejects an expired token', () => {
      sandbox.spy(Auth.prototype, 'reject');
      req.query.access_token = expiredToken;

      return validateRequest(req, res, nextStub).then(() => {
        expect(Auth.prototype.reject).to.have.been.calledWithExactly(sinon.match((value) => {
          return value.name === 'TokenExpiredError';
        }), 400);
      });
    });

    it('accepts a valid token', () => {
      req.query.access_token = validToken;

      return validateRequest(req, res, nextStub).then(() => {
        expect(req.user.username).to.eq('test-user');
        expect(req.user.id).to.eq(user.id);
        expect(nextStub).to.have.beenCalled;
      });
    });
  });

  context('header', () => {
    let req;

    beforeEach((done) => {
      req = { get: () => {} };
      done();
    });

    it('rejects an invalid token', () => {
      sandbox.spy(Auth.prototype, 'reject');

      return validateRequest(req, res, nextStub).then(() => {
        expect(Auth.prototype.reject).to.have.been.calledWithExactly(sinon.match((value) => {
          return value.name === 'Error';
        }));
      });
    });

    it('rejects an expired token', () => {
      sandbox.spy(Auth.prototype, 'reject');
      req.get = () => `Bearer ${expiredToken}`;

      return validateRequest(req, res, nextStub).then(() => {
        expect(Auth.prototype.reject).to.have.been.calledWithExactly(sinon.match((value) => {
          return value.name === 'TokenExpiredError';
        }), 400);
      });
    });

    it('accepts a valid token', () => {
      req.get = () => `Bearer ${validToken}`;

      return validateRequest(req, res, nextStub).then(() => {
        expect(req.user.username).to.eq('test-user');
        expect(req.user.id).to.eq(user.id);
        expect(nextStub).to.have.beenCalled;
      });
    });
  });
});
