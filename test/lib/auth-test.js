'use strict';

const helper = require('../test-helper'),
      Auth = require('../../lib/auth'),
      expect = helper.expect,
      sinon = helper.sinon;

describe('Auth', () => {
  describe('constructor', () => {
    it('returns an instance of Auth', () => {
      let auth = new Auth();

      expect(auth).to.be.an.instanceOf(Auth);
    })
  });

  describe('getUser', () => {
    it('throws an Error for missing username');
    it('throws an Error for missing password');
    it('returns a Promise');
    it('resolves with User');
    it('rejects with Error');
  });

  describe('login', () => {
    it('rejects 401 if no username provided');
    it('rejects 401 if no password provided');
    it('returns 401 if username and password are not valid');
    it('returns a token for a valid logged-in user');
    it('sets the token\'s expiration for 7 days out');
  });

  describe('reject', () => {
    let auth, res, sandbox;

    beforeEach((done) => {
      sandbox = sinon.sandbox.create();
      res = { status: () => {}, json: () => {} };
      auth = new Auth({}, res);
      sinon.stub(res, 'status').returns(res);
      sinon.stub(res, 'json');
      done();
    });

    afterEach((done) => {
      sandbox.restore();
      done();
    });

    it('sets JSON for 400', () => {
      auth.reject(null, 400);

      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ status: 400, message: 'Token Expired' });
    });

    it('sets JSON for 401', () => {
      auth.reject(null, 401);

      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ status: 401, message: 'Invalid Credentials' });
    });

    it('sets JSON for 403', () => {
      auth.reject(null, 403);

      expect(res.status).to.have.been.calledWith(403);
      expect(res.json).to.have.been.calledWith({ status: 403, message: 'Not Authorized' });
    });

    it('sets JSON for 500', () => {
      auth.reject(null, 500);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ status: 500, message: 'Server Error' });
    });

    it('returns 500 for invalid code', () => {
      auth.reject(null, 200);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ status: 500, message: 'Server Error' });
    });
  });
});
