'use strict';

const { cleanDatabase, expect, sinon } = require('../../test-helper'),
      User = require('../../../models/user'),
      facebookTokenStrategy = require('../../../middleware/strategies/facebook-token-strategy'),
      facebookUserJson = require('../../fixtures/facebook-user.json'),
      passportStrategyReq = require('../../support/passport-helper');

describe('facebookTokenStrategy', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
    return cleanDatabase();
  });

  context('signup', () => {
    it('creates a new user', () => {
      sandbox.stub(facebookTokenStrategy._oauth2, 'get')
        .callsFake((url, accessToken, next) => {
          next(null, JSON.stringify(facebookUserJson), null);
        });

      return expect(() => passportStrategyReq(facebookTokenStrategy, (req) => { req.body = { facebook_token: 'blah' }; }))
        .to.alter(
          () => User.count(),
          {
            from: 0,
            to: 1
          }
        );
    });

    it('gets the token from facebook_token', () => {
      const fakeToken = 'my-fake-token';
      let passedToken;

      sandbox.stub(facebookTokenStrategy._oauth2, 'get')
        .callsFake((url, accessToken, next) => {
          passedToken = accessToken;
          next(null, JSON.stringify(facebookUserJson), null);
        });

      return passportStrategyReq(facebookTokenStrategy, (req) => {
        req.body = {
          facebook_token: fakeToken
        };
      })
        .then(() => {
          expect(passedToken).to.eq(fakeToken);
        });
    });
  });

  context('login', () => {
    let user;

    beforeEach(() => {
      return User.create({ username: 'my-user', password: 'my-password', facebookId: facebookUserJson.id })
        .then((u) => {
          user = u;
        });
    });

    it('does not create a user', () => {
      sandbox.stub(facebookTokenStrategy._oauth2, 'get')
        .callsFake((url, accessToken, next) => {
          next(null, JSON.stringify(facebookUserJson), null);
        });

      return expect(() => passportStrategyReq(facebookTokenStrategy, (req) => { req.body = { facebook_token: 'blah' }; }))
        .not.to.alter(() => User.count());
    });

    it('returns the retrieved user', () => {
      sandbox.stub(facebookTokenStrategy._oauth2, 'get')
        .callsFake((url, accessToken, next) => {
          next(null, JSON.stringify(facebookUserJson), null);
        });

      return passportStrategyReq(facebookTokenStrategy, (req) => { req.body = { facebook_token: 'blah' }; })
        .then(([returnedUser]) => {
          expect(returnedUser.serialize()).to.eql(user.serialize());
        });
    });
  });

  context('connect user', () => {
    let user;

    beforeEach(() => {
      return User.create({ username: 'my-user', password: 'my-password' })
        .then((u) => { user = u; });
    });

    it('updates existing user with facebook id', () => {
      sandbox.stub(facebookTokenStrategy._oauth2, 'get')
        .callsFake((url, accessToken, next) => {
          next(null, JSON.stringify(facebookUserJson), null);
        });

      return expect(() => passportStrategyReq(facebookTokenStrategy, (req) => {
        req.user = user;
        req.body = { facebook_token: 'blah' };
      }))
        .to.alter(
          () => user.reload().then(() => user.facebookId),
          {
            from: null,
            to: facebookUserJson.id
          }
        );
    });
  });
});
