'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      WebSocket = require('ws'),
      jwt = require('jsonwebtoken'),
      User = require('../../models/user'),
      { server } = require('../../server');

describe('WebSockets Server', () => {
  let user, ws;

  before(() => {
    server.listen(3000, () => {
      helper.config.log('Listening on port 3000…');
    });
    return User.create({ username: 'test-user', password: 'test-password' })
      .then((u) => { user = u; });
  });

  after(() => {
    server.close();
    return helper.cleanDatabase();
  });

  afterEach(() => {
    ws.close();
  });

  it('rejects missing access_token', () => {
    return new Promise((resolve, reject) => {
      ws = new WebSocket('ws://localhost:3000');
      ws.on('open', reject);
      ws.on('error', resolve);
    }).then((err) => {
      expect(err.message).to.eq('unexpected server response (403)');
    });
  });

  it('rejects invalid access_token', () => {
    return new Promise((resolve, reject) => {
      ws = new WebSocket('ws://localhost:3000/?access_token=this-is-obviously-invalid');
      ws.on('open', reject);
      ws.on('error', resolve);
    }).then((err) => {
      expect(err.message).to.eq('unexpected server response (403)');
    });
  });

  it('rejects access_token for null UserId', () => {
    return new Promise((resolve, reject) => {
      let token = jwt.sign({ userId: null }, helper.config.secret);
      ws = new WebSocket(`ws://localhost:3000/?access_token=${token}`);
      ws.on('open', reject);
      ws.on('error', resolve);
    }).then((err) => {
      expect(err.message).to.eq('unexpected server response (401)');
    });
  });

  it('rejects access_token for invalid User', () => {
    return new Promise((resolve, reject) => {
      let token = jwt.sign({ userId: 'not-valid' }, helper.config.secret);
      ws = new WebSocket(`ws://localhost:3000/?access_token=${token}`);
      ws.on('open', reject);
      ws.on('error', resolve);
    }).then((err) => {
      expect(err.message).to.eq('unexpected server response (401)');
    });
  });

  it('accepts access_token for valid User', () => {
    return new Promise((resolve, reject) => {
      let token = jwt.sign({ userId: user.id }, helper.config.secret);
      ws = new WebSocket(`ws://localhost:3000/?access_token=${token}`);
      ws.on('error', reject);
      ws.on('open', resolve);
    }).then(() => {
      expect(true).to.be.true;
    });
  });
});
