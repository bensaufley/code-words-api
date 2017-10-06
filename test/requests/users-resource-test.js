'use strict';

const request = require('supertest'),
      jwt = require('jsonwebtoken'),
      { cleanDatabase, config: { secret }, expect, sinon } = require('../test-helper'),
      User = require('../../models/user'),
      facebookTokenStrategy = require('../../middleware/strategies/facebook-token-strategy'),
      facebookUserJson = require('../fixtures/facebook-user.json'),
      { app } = require('../../server');

describe('User paths', () => {
  let sandbox, token, user;

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

  it('updates user', () => {
    sandbox.stub(facebookTokenStrategy._oauth2, 'get')
      .callsFake((url, accessToken, next) => {
        next(null, JSON.stringify(facebookUserJson), null);
      });

    return expect(() => {
      return request(app)
        .post('/api/v1/user/facebook')
        .send({ access_token: token, facebook_token: 'my-facebook-token' });
    }).to.alter(
      () => user.reload().then((u) => u.facebookId),
      {
        from: null,
        to: facebookUserJson.id
      }
    );
  });

  it('returns 200 and empty JSON', () => {
    sandbox.stub(facebookTokenStrategy._oauth2, 'get')
      .callsFake((url, accessToken, next) => {
        next(null, JSON.stringify(facebookUserJson), null);
      });

    return request(app)
      .post('/api/v1/user/facebook')
      .send({ access_token: token, facebook_token: 'my-facebook-token' })
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.eql({});
      });
  });

  // TODO: Failure tests
});
