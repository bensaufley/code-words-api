'use strict';

const helper = require('../test-helper'),
      sinon = helper.sinon,
      expect = helper.expect,
      User = require('../../models/user'),
      request = require('supertest'),
      app = require('../../server');

describe('Auth Routes', () => {
  beforeEach((done) => {
    User.truncate().then(done);
  });

  afterEach((done) => {
    User.truncate().then(done);
  });

  describe('/signup', () => {
    it('rejects invalid user signup info', () => {
      return request(app)
        .post('/signup')
        .send({ username: 'blah', password: '' })
        .then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body).to.deep.equal({ status: 400, message: 'Invalid User Information' });
        });
    });

    it('returns token with valid signup info', () => {
      return request(app)
        .post('/signup')
        .send({ username: 'my-user', password: 'my-password' })
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.token).to.satisfy(helper.matchers.jwt.test);
          expect(response.body.user.username).to.eq('my-user');
          expect(response.body.user.id).to.satisfy(helper.matchers.uuid.test);
        });
    });
  });

  describe('/login', () => {
    let user;

    beforeEach((done) => {
      User.create({
        username: 'my-user',
        password: 'my-password'
      }).then((u) => {
        user = u;
        done();
      });
    });

    it('rejects missing username', () => {
      return request(app)
        .post('/login')
        .send({ username: '', password: 'my-password' })
        .then((response) => {
          expect(response.status).to.eq(401);
        });
    });

    it('rejects missing password', () => {
      return request(app)
        .post('/login')
        .send({ username: 'my-user', password: '' })
        .then((response) => {
          expect(response.status).to.eq(401);
        });
    });

    it('rejects invalid password', () => {
      return request(app)
        .post('/login')
        .send({ username: 'my-user', password: 'awerouwpe' })
        .then((response) => {
          expect(response.status).to.eq(401);
        });
    });

    it('returns token and user object', () => {
      return request(app)
        .post('/login')
        .send({ username: 'my-user', password: 'my-password' })
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.keys('token', 'user');
        });
    });
  });
});
