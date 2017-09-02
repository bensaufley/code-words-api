'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      User = require('../../models/user'),
      Auth = require('../../lib/auth'),
      request = require('supertest'),
      { app } = require('../../server');

describe('Root Paths', () => {
  afterEach(() => {
    return helper.cleanDatabase();
  });

  describe('OPTIONS /login', () => {
    it('returns 200 with Headers', () => {
      return request(app)
        .options('/login')
        .set('Origin', 'code-words-web.herokuapp.com')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.header['access-control-allow-origin']).to.eq('code-words-web.herokuapp.com');
          expect(response.header['access-control-allow-methods']).to.eq('GET,PUT,POST,DELETE,OPTIONS');
          expect(response.header['access-control-allow-headers']).to.eq('Content-type,Accept,Authorization');
          expect(response.header.accept).to.eq('application/json');
        });
    });

    it('returns empty CORS for non-whitelisted domains', () => {
      return request(app)
        .options('/login')
        .set('Origin', 'google.com')
        .then((response) => {
          expect(response.header['access-control-allow-origin']).to.be.undefined;
        });
    });
  });

  describe('404', () => {
    it('returns 404 for unspecified routes', () => {
      return request(app)
        .get('/blarg-and-flargle')
        .then((response) => {
          expect(response.status).to.eq(404);
          expect(response.body).to.eql({ error: 'NotFoundError: No route matches path /blarg-and-flargle' });
        });
    });
  });

  describe('uncaught exception', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = helper.sinon.sandbox.create();
      return User.create({ username: 'my-user', password: 'my-password' });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('returns JSON with the error', () => {
      sandbox.stub(Auth.prototype, 'generateToken').throws(new Error('Somethin broke!'));
      return request(app)
        .post('/login')
        .send({ username: 'my-user', password: 'my-password' })
        .then((response) => {
          expect(response.status).to.eq(500);
          expect(response.body).to.eql({ error: 'Error: Somethin broke!' });
        });
    });
  });

  describe('/signup', () => {
    it('rejects missing user signup info', () => {
      return request(app)
        .post('/signup')
        .send({ username: 'blah-user' })
        .then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body).to.deep.equal({ status: 400, message: 'Invalid User Information' });
        });
    });

    it('rejects invalid password', () => {
      return request(app)
        .post('/signup')
        .send({ username: 'blah-user', password: 'asdf' })
        .then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body).to.deep.equal({ status: 400, message: 'Invalid User Information: password must be seven to fifty characters in length' });
        });
    });

    it('rejects invalid username', () => {
      return request(app)
        .post('/signup')
        .send({ username: 'fff', password: 'asdfawerouer' })
        .then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body).to.deep.equal({ status: 400, message: 'Invalid User Information: username must be six to twenty-four characters in length' });
        })
        .then(() => {
          return request(app)
            .post('/signup')
            .send({ username: 'f a s d!', password: 'asdfawerouer' });
        })
        .then((response) => {
          expect(response.status).to.eq(400);
          expect(response.body).to.deep.equal({ status: 400, message: 'Invalid User Information: username must be composed of letters, numbers, dashes, and periods, begin with a letter, and end with a letter or number' });
        });
    });

    it('strips whitespace in username', () => {
      return request(app)
        .post('/signup')
        .send({ username: ' name-with-spaces  ', password: 'asdf-bsdf' })
        .then((response) => {
          expect(response.body.user.username).to.eq('name-with-spaces');

          return User.findOne({ where: { username: 'name-with-spaces' } });
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
    beforeEach(() => {
      return User.create({
        username: 'my-user',
        password: 'my-password'
      });
    });

    it('rejects missing username', () => {
      return request(app)
        .post('/login')
        .send({ username: '', password: 'my-password' })
        .then((response) => {
          expect(response.status).to.eq(400);
        });
    });

    it('rejects missing password', () => {
      return request(app)
        .post('/login')
        .send({ username: 'my-user', password: '' })
        .then((response) => {
          expect(response.status).to.eq(400);
        });
    });

    it('rejects nonexistent username', () => {
      return request(app)
        .post('/login')
        .send({ username: 'flarger', password: 'awerouwpe' })
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
