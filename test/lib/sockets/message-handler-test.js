'use strict';

const helper = require('../../test-helper'),
      config = helper.config,
      expect = helper.expect,
      sinon = helper.sinon,
      WebSocket = require('ws'),
      MessageHandler = require('../../../lib/sockets/message-handler'),
      User = require('../../../models/user'),
      Game = require('../../../models/game'),
      gameHelpers = require('../../support/game-helpers');

describe('MessageHandler', () => {
  let aTransmitterUser, aDecoderUser, game;

  beforeEach(() => {
    return gameHelpers.prepareGame()
      .then((response) => {
        ({ aTransmitterUser, aDecoderUser, game } = response);
      });
  });

  afterEach(() => helper.cleanDatabase());

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
      let payload = JSON.stringify({ event: 'transmit', gameId: game.id, clue: { word: 'blah', number: 1 } });

      return messageHandler.handle(payload)
        .then(() => {
          expect(messageHandler.transmit).to.have.been.calledWith(sinon.match.instanceOf(Game).and(sinon.match.has('id', game.id)), sinon.match({ word: 'blah', number: 1 }));
        });
    });

    it('rejects transmit for decoder', () => {
      let messageHandler = new MessageHandler(null, aDecoderUser),
          payload = JSON.stringify({ event: 'transmit', gameId: game.id, clue: { word: 'blah', number: 1 } });
      sinon.spy(game, 'giveClue');

      return messageHandler.handle(payload)
        .then(() => Promise.reject(new Error('Should not have succeeded')))
        .catch((err) => {
          expect(err.message).to.eq('User is not transmitter in this game');
          expect(game.giveClue).not.to.have.been.called;
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
      sinon.spy(game, 'makeGuess');

      return messageHandler.handle(payload)
        .then(() => Promise.reject(new Error('Should not have succeeded')))
        .catch((err) => {
          expect(err.message).to.eq('User is not decoder in this game');
          expect(game.makeGuess).not.to.have.been.called;
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
