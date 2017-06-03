'use strict';

import { cleanDatabase, config, expect } from '../test-helper';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import User from '../../models/user';
import { server } from '../../server';

describe('WebSockets Server', () => {
  describe('v1', () => {
    const wssPort = 3000,
          wssUrl = `ws://localhost:${wssPort}/api/v1/`;
    let user, ws;

    before(() => {
      server.listen(wssPort, () => {
        config.log(`Listening at ${wssUrl}…`);
      });
      return User.create({ username: 'test-user', password: 'test-password' })
        .then((u) => { user = u; });
    });

    after(() => {
      server.close();
      return cleanDatabase();
    });

    afterEach(() => {
      if (ws.readyState === 1) ws.close();
    });

    describe('authentication', () => {
      it('rejects missing access_token', () => {
        return new Promise((resolve, reject) => {
          ws = new WebSocket(wssUrl);
          ws.on('open', reject);
          ws.on('error', resolve);
        }).then((err) => {
          expect(err.message).to.eq('unexpected server response (403)');
        });
      });

      it('rejects invalid access_token', () => {
        return new Promise((resolve, reject) => {
          ws = new WebSocket(`${wssUrl}?access_token=this-is-obviously-invalid`);
          ws.on('open', reject);
          ws.on('error', resolve);
        }).then((err) => {
          expect(err.message).to.eq('unexpected server response (403)');
        });
      });

      it('rejects access_token for null UserId', () => {
        return new Promise((resolve, reject) => {
          let token = jwt.sign({ userId: null }, config.secret);
          ws = new WebSocket(`${wssUrl}?access_token=${token}`);
          ws.on('open', reject);
          ws.on('error', resolve);
        }).then((err) => {
          expect(err.message).to.eq('unexpected server response (401)');
        });
      });

      it('rejects access_token for invalid User', () => {
        return new Promise((resolve, reject) => {
          let token = jwt.sign({ userId: 'not-valid' }, config.secret);
          ws = new WebSocket(`${wssUrl}?access_token=${token}`);
          ws.on('open', reject);
          ws.on('error', resolve);
        }).then((err) => {
          expect(err.message).to.eq('unexpected server response (401)');
        });
      });

      it('accepts access_token for valid User', () => {
        return new Promise((resolve, reject) => {
          let token = jwt.sign({ userId: user.id }, config.secret);
          ws = new WebSocket(`${wssUrl}?access_token=${token}`);
          ws.on('error', reject);

          ws.on('open', resolve);
        });
      });

      it('adds and removes the ws connection to config.sockets', () => {
        return new Promise((resolve, reject) => {
          let token = jwt.sign({ userId: user.id }, config.secret);
          ws = new WebSocket(`${wssUrl}?access_token=${token}`);
          ws.on('error', reject);
          ws.on('open', resolve);
        }).then(() => {
          expect(config.sockets[user.id]).to.be.an.instanceOf(WebSocket);

          ws.close();
          return new Promise((resolve) => { setTimeout(resolve, 5); });
        }).then(() => {
          expect(config.sockets[user.id]).to.be.undefined;
        });
      });
    });

    describe('message', () => {
      beforeEach(() => {
        let token = jwt.sign({ userId: user.id }, config.secret);
        ws = new WebSocket(`${wssUrl}?access_token=${token}`);
        return new Promise((resolve, reject) => {
          ws.on('error', reject);
          ws.on('open', resolve);
        });
      });

      // it('accepts a message', () => {
      //   ws.send(JSON.stringify({
      //     some: 'test data',
      //     that: 'might get buffered?',
      //     but: {
      //       I: 'can\'t say for sure',
      //       so: ['will', 'it?']
      //     }
      //   }));

      //   expect(true).to.be.true;
      // });
    });
  });
});
