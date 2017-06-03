'use strict';

import { cleanDatabase, config, expect, sinon } from '../../test-helper';
import WebSocket from 'ws';
import MessageHandler from '../../../lib/sockets/message-handler';
import User from '../../../models/user';
import Game from '../../../models/game';
import gameHelpers from '../../support/game-helpers';

describe('MessageHandler', () => {
  let aTransmitterUser, aDecoderUser, game;

  beforeEach(() => {
    return gameHelpers.prepareGame()
      .then((response) => {
        ({ aTransmitterUser, aDecoderUser, game } = response);
      });
  });

  afterEach(() => cleanDatabase());

  describe('handle', () => {
    it('rejects invalid JSON', () => {
      let messageHandler = new MessageHandler(null, aTransmitterUser);

      return messageHandler.handle('asdf')
        .then(() => Promise.reject(new Error('Should not have resolved')))
        .catch((err) => {
          expect(err).to.be.an.instanceOf(SyntaxError);
          expect(err.message).to.contain('Unexpected token');
        });
    });

    it('rejects empty event', () => {
      let messageHandler = new MessageHandler(null, aTransmitterUser);

      return messageHandler.handle('{"event":""}')
        .then(() => Promise.reject(new Error('Should not have resolved')))
        .catch((err) => {
          expect(err.message).to.eq('Event not present or invalid');
        });
    });

    it('rejects invalid event', () => {
      let messageHandler = new MessageHandler(null, aTransmitterUser);

      return messageHandler.handle('{"event":"werty"}')
        .then(() => Promise.reject(new Error('Should not have resolved')))
        .catch((err) => {
          expect(err.message).to.eq('Event not present or invalid');
        });
    });

    it('calls transmit', () => {
      let messageHandler = new MessageHandler(null, aTransmitterUser);
      sinon.stub(messageHandler, 'transmit');
      let payload = JSON.stringify({ event: 'transmit', gameId: game.id, transmission: { word: 'blah', number: 1 } });

      return messageHandler.handle(payload)
        .then(() => {
          expect(messageHandler.transmit).to.have.been.calledWith(sinon.match.instanceOf(Game).and(sinon.match.has('id', game.id)), sinon.match({ word: 'blah', number: 1 }));
        });
    });

    it('rejects transmit for decoder', () => {
      let messageHandler = new MessageHandler(null, aDecoderUser),
          payload = JSON.stringify({ event: 'transmit', gameId: game.id, transmission: { word: 'blah', number: 1 } });
      sinon.spy(game, 'transmit');

      return messageHandler.handle(payload)
        .then(() => Promise.reject(new Error('Should not have succeeded')))
        .catch((err) => {
          expect(err.message).to.eq('User is not transmitter in this game');
          expect(game.transmit).not.to.have.been.called;
        });
    });

    it('calls decode', () => {
      let messageHandler = new MessageHandler(null, aDecoderUser);
      sinon.stub(messageHandler, 'decode');
      let payload = JSON.stringify({ event: 'decode', gameId: game.id, tile: { x: 3, y: 2 } });

      return messageHandler.handle(payload)
        .then(() => {
          expect(messageHandler.decode).to.have.been.calledWith(sinon.match.instanceOf(Game).and(sinon.match.has('id', game.id)), sinon.match({x: 3, y: 2 }));
        });
    });

    it('rejects decode for transmitter', () => {
      let messageHandler = new MessageHandler(null, aTransmitterUser),
          payload = JSON.stringify({ event: 'decode', gameId: game.id, tile: { x: 3, y: 2 } });
      sinon.spy(game, 'decode');

      return messageHandler.handle(payload)
        .then(() => Promise.reject(new Error('Should not have succeeded')))
        .catch((err) => {
          expect(err.message).to.eq('User is not decoder in this game');
          expect(game.decode).not.to.have.been.called;
        });
    });

    it('notifies connected players', () => {
      config.sockets = {
        [aTransmitterUser.id]: { send: sinon.stub() },
        [aDecoderUser.id]: { send: sinon.stub() }
      };
      let messageHandler = new MessageHandler(null, aDecoderUser);
      sinon.stub(messageHandler, 'decode');
      let payload = JSON.stringify({ event: 'decode', gameId: game.id, tile: { x: 3, y: 2 } });

      return messageHandler.handle(payload)
        .then(() => {
          expect(config.sockets[aTransmitterUser.id].send).to.have.been.called;
          expect(config.sockets[aDecoderUser.id].send).to.have.been.called;

          config.sockets = [];
        });
    });
  });
});
