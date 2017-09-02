'use strict';

const jwt = require('jsonwebtoken'),
      helper = require('../test-helper'),
      Auth = require('../../lib/auth'),
      User = require('../../models/user'),
      { stubRes } = require('../support/request-helper'),
      expect = helper.expect,
      sinon = helper.sinon;

describe('Auth', () => {
  let res, sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    res = stubRes();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('returns an instance of Auth', () => {
      let auth = new Auth();

      expect(auth).to.be.an.instanceOf(Auth);
    });
  });

  describe('generateToken', () => {
    let user;

    beforeEach(() => {
      return User.create({ username: 'my-user', password: 'my-password' })
        .then((u) => { user = u; });
    });

    afterEach(helper.cleanDatabase);

    it('rejects 401 if no user', () => {
      sandbox.stub(User, 'findOne');
      let auth = new Auth({}, res);

      return auth.generateToken().then(() => {
        expect(User.findOne).to.have.beenCalled;
        expect(res.status).to.have.been.calledWith(401);
      });
    });

    it('rejects 401 if jwt.sign fails', () => {
      sandbox.spy(User.prototype, 'authenticate');
      sandbox.stub(jwt, 'sign').callsArgWith(3, new Error('It broke!'));
      let auth = new Auth({ user }, res);

      return auth.generateToken().then(() => {
        expect(res.status).to.have.been.calledWith(401);
      });
    });

    it('returns a token for a valid logged-in user', () => {
      let auth = new Auth({ user }, res);

      return auth.generateToken(user).then(() => {
        const json = res.json.getCall(0).args[0],
              decoded = jwt.verify(json.token, helper.config.secret);

        expect(res.status).to.have.been.calledWith(200);
        expect(decoded.userId).to.eq(user.id);
      });
    });

    it('sets the token\'s expiration for 7 days out', () => {
      let auth = new Auth({ user }, res);

      return auth.generateToken().then(() => {
        const json = res.json.getCall(0).args[0],
              decoded = jwt.verify(json.token, helper.config.secret),
              nextWeek = Math.floor((new Date().getTime() + 7 * 60 * 60 * 24 * 1000) / 1000);

        expect(res.status).to.have.been.calledWith(200);
        expect(decoded.exp).to.be.within(nextWeek - 1, nextWeek + 1);
      });
    });
  });

  describe('reject', () => {
    let auth;

    beforeEach(() => {
      auth = new Auth({}, res);
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

  describe('signup', () => {
    afterEach(helper.cleanDatabase);

    it('rejects 400 Invalid User Information if User creation fails validation', () => {
      const res1 = stubRes(),
            res2 = stubRes(),
            auth = new Auth({ body: { username: 'as', password: 'a' } }, res1);

      return auth.signup()
        .then(() => {
          expect(res1.status).to.have.been.calledWith(400);
          expect(res1.json).to.have.been.calledWith({
            status: 400,
            message: 'Invalid User Information: username must be six to twenty-four characters in length; password must be seven to fifty characters in length'
          });

          return new Auth({ body: { username: 'my user', password: 'asdfasdf' } }, res2).signup();
        })
        .then(() => {
          expect(res2.status).to.have.been.calledWith(400);
          expect(res2.json).to.have.been.calledWith({
            status: 400,
            message: 'Invalid User Information: username must be composed of letters, numbers, dashes, and periods, begin with a letter, and end with a letter or number'
          });
        });
    });

    it('rejects 500 for other errors', () => {
      let auth = new Auth({ body: { username: 'my-user', password: 'my-password' } }, res);
      sandbox.stub(User, 'create').callsFake(() => {
        const err = new Error('Something else broke');
        return Promise.reject(err);
      });

      return auth.signup().then(() => {
        expect(res.status).to.have.been.calledWith(500);
        expect(res.json).to.have.been.calledWith({ status: 500, message: 'Something else broke' });
      });
    });

    it('creates a new User if valid', () => {
      let auth = new Auth({ body: { username: 'my-user', password: 'valid-password' } }, res);

      return auth.signup().then(() => {
        expect(res.status).to.have.been.calledWith(200);
        expect(res.json).to.have.been.calledWith(
          sinon.match({
            token: helper.matchers.jwt,
            user: {
              id: helper.matchers.uuid,
              username: 'my-user'
            }
          })
        );
      });
    });
  });
});
