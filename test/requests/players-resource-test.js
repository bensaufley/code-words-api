'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      sinon = helper.sinon,
      { v4: UUIDv4 } = require('node-uuid'),
      { stubRes } = require('../support/request-helper'),
      User = require('../../models/user'),
      Game = require('../../models/game'),
      Player = require('../../models/player'),
      GameSerializer = require('../../lib/game-serializer'),
      { SocketNotifier, GAME_UPDATED, GAME_REMOVED } = require('../../lib/sockets/socket-notifier'),
      { prepareGame } = require('../support/game-helpers'),
      playersResource = require('../../resources/players');

describe('playersResource', () => {
  describe('create', () => {
    let sandbox, game, user, player, secondUser;

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      return Promise.all([
        User.create({ username: 'my-user', password: 'my-password' }),
        User.create({ username: 'second-user', password: 'my-password' }),
        Game.create()
      ])
        .then((promises) => {
          [user, secondUser, game] = promises;
          return Player.create({ userId: user.id, gameId: game.id });
        })
        .then((p) => {
          player = p;
        });
    });

    afterEach(() => {
      sandbox.restore();
      return helper.cleanDatabase();
    });

    it('rejects for unknown username', () => {
      let res = stubRes();

      return playersResource.create({ user, params: { gameId: game.id }, body: { username: 'flarg-blarp' } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(404);
          expect(res.json).to.have.been.calledWith({ error: 'NotFoundError: No user found for that username' });
        });
    });

    it('rejects for invalid game id', () => {
      let res = stubRes();

      return playersResource.create({ user, params: { gameId: UUIDv4() }, body: { username: 'second-user'} }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(404);
          expect(res.json).to.have.been.calledWith({ error: 'NotFoundError: No game found for that id' });
        });
    });

    it('rejects an unrelated user', () => {
      let res = stubRes();

      return playersResource.create({ user: secondUser, params: { gameId: game.id }, body: { username: 'my-user'} }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith({ error: 'Error: User cannot add players to this game' });
        });
    });

    it('rejects if game is full', () => {
      let res = stubRes();

      return Promise.all([
        User.create({ username: 'my-user-3', password: 'password-3' }),
        User.create({ username: 'my-user-4', password: 'password-4' }),
        User.create({ username: 'my-user-5', password: 'password-5' })
      ])
        .then((us) => {
          let [user3, user4, user5] = us;
          return Promise.all([
            Player.create({ userId: user3.id, gameId: game.id }),
            Player.create({ userId: user4.id, gameId: game.id }),
            Player.create({ userId: user5.id, gameId: game.id })
          ]);
        })
        .then(() => playersResource.create({ user, params: { gameId: game.id }, body: { username: 'second-user' } }, res))
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith({ error: 'Error: The game is full' });
        });
    });

    it('creates a new player', () => {
      let res = stubRes();

      return playersResource.create({ user, params: { gameId: game.id }, body: { username: 'second-user' } }, res)
        .then(() => game.reload({ include: [Game.Players] }))
        .then(() => {
          expect(game.players.length).to.eq(2);
          expect(game.players.map((p) => p.userId)).to.contain(secondUser.id);
        });
    });

    it('returns the serialized game', () => {
      let res = stubRes();
      sandbox.spy(GameSerializer, 'serializeGameForPlayer');

      return playersResource.create({ user, params: { gameId: game.id }, body: { username: 'second-user' } }, res)
        .then(() => {
          expect(GameSerializer.serializeGameForPlayer).to.have.been.calledWith(sinon.match.instanceOf(Player).and(sinon.match.has('id', player.id)));
          expect(res.status).to.have.been.calledWith(200);
          expect(res.json).to.have.been.calledWith(sinon.match.has('id', game.id));
        });
    });

    it('attempts to notify other players via WebSockets', () => {
      let res = stubRes(),
          eventStub = sandbox.stub(SocketNotifier.prototype, 'event');

      return playersResource.create({ user, params: { gameId: game.id }, body: { username: 'second-user' } }, res)
        .then(() => {
          expect(eventStub).to.have.callCount(1);
          expect(eventStub).to.have.been.always.calledWith(GAME_UPDATED);
        });
    });
  });

  describe('update', () => {
    let sandbox, userOne, playerOne, game;

    beforeEach(() => {
      sandbox = sinon.sandbox.create();

      return prepareGame()
        .then((results) => {
          ({ aTransmitterUser: userOne, aTransmitterPlayer: playerOne, game } = results);
        });
    });

    afterEach(() => {
      sandbox.restore();
      return helper.cleanDatabase();
    });

    it('rejects for unfound player', () => {
      let res = stubRes();

      return playersResource.update({ user: userOne, params: { gameId: game.id, playerId: UUIDv4() } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(404);
          expect(res.json).to.have.been.calledWith({ error: 'NotFoundError: No player found for that id' });
        });
    });

    it('rejects if game is started', () => {
      let res = stubRes();

      return game.start()
        .then(() => playersResource.update({ user: userOne, params: { gameId: game.id, playerId: playerOne.id } }, res))
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith({ error: 'Error: A Player cannot be edited after the game has started' });
        });
    });

    it('rejects an empty body', () => {
      let res = stubRes();

      return playersResource.update({ user: userOne, params: { gameId: game.id, playerId: playerOne.id } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith({ error: 'Error: No body present' });
        });
    });

    it('rejects unpermitted params', () => {
      let res = stubRes();

      sandbox.stub(helper.config, 'log');
      sandbox.spy(Player.prototype, 'update');

      return playersResource.update({ user: userOne, params: { gameId: game.id, playerId: playerOne.id }, body: { flarg: 'bloop' } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(200);
          expect(helper.config.log).to.have.been.calledWith('Warning: Unpermitted params', 'flarg');
          expect(Player.prototype.update).not.to.have.been.calledWith(sinon.match.has('flarg'));
        });
    });

    it('updates role and team', () => {
      let res = stubRes();

      return Player.destroy({ where: { gameId: game.id, team: 'b', role: 'decoder' } })
        .then(() => playersResource.update({ user: userOne, params: { gameId: game.id, playerId: playerOne.id }, body: { team: 'b', role: 'decoder' } }, res))
        .then(() => playerOne.reload())
        .then(() => {
          expect(res.status).to.have.been.calledWith(200);
          expect(playerOne.team).to.eq('b');
          expect(playerOne.role).to.eq('decoder');
        });
    });

    it('returns the serialized game', () => {
      let res = stubRes();
      sandbox.spy(GameSerializer, 'serializeGameForPlayer');

      return Player.destroy({ where: { gameId: game.id, team: 'b', role: 'decoder' } })
        .then(() => playersResource.update({ user: userOne, params: { gameId: game.id, playerId: playerOne.id }, body: { team: 'b', role: 'decoder' } }, res))
        .then(() => {
          expect(GameSerializer.serializeGameForPlayer).to.have.been.calledWith(sinon.match.instanceOf(Player).and(sinon.match.has('id', playerOne.id)));
          expect(res.status).to.have.been.calledWith(200);
          expect(res.json).to.have.been.calledWith(sinon.match.has('id', game.id));
        });
    });

    it('attempts to notify other players via WebSockets', () => {
      let res = stubRes(),
          eventStub = sandbox.stub(SocketNotifier.prototype, 'event');

      return Player.destroy({ where: { gameId: game.id, team: 'b', role: 'decoder' } })
        .then(() => playersResource.update({ user: userOne, params: { gameId: game.id, playerId: playerOne.id }, body: { team: 'b', role: 'decoder' } }, res))
        .then(() => {
          expect(eventStub).to.have.callCount(2);
          expect(eventStub).to.have.been.always.calledWith(GAME_UPDATED);
        });
    });
  });

  describe('destroy', () => {
    let sandbox, userOne, playerOne, playerTwo, game;

    beforeEach(() => {
      sandbox = sinon.sandbox.create();

      return prepareGame()
        .then((results) => {
          ({ aTransmitterUser: userOne, aTransmitterPlayer: playerOne, bDecoderPlayer: playerTwo, game } = results);
        });
    });

    afterEach(() => {
      sandbox.restore();
      return helper.cleanDatabase();
    });

    it('rejects for unfound player', () => {
      let res = stubRes();

      return playersResource.destroy({ user: userOne, params: { gameId: game.id, playerId: UUIDv4() } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(404);
          expect(res.json).to.have.been.calledWith({ error: 'NotFoundError: No player found for that id' });
        });
    });

    it('rejects if game is started', () => {
      let res = stubRes();

      return game.start()
        .then(() => playersResource.destroy({ user: userOne, params: { gameId: game.id, playerId: playerOne.id } }, res))
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith({ error: 'Error: A Player cannot be removed after the game has started' });
        });
    });

    it('destroys the player', () => {
      let res = stubRes();

      return playersResource.destroy({ user: userOne, params: { gameId: game.id, playerId: playerTwo.id } }, res)
        .then(() => playerTwo.reload())
        .catch((err) => { return err; })
        .then((err) => {
          expect(res.status).to.have.been.calledWith(200);
          expect(err.name).to.eq('SequelizeInstanceError');
          expect(err.message).to.eq('Instance could not be reloaded because it does not exist anymore (find call returned null)');
        });
    });

    it('returns the serialized game', () => {
      let res = stubRes();
      sandbox.spy(GameSerializer, 'serializeGameForPlayer');

      return playersResource.destroy({ user: userOne, params: { gameId: game.id, playerId: playerTwo.id } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(200);
          expect(GameSerializer.serializeGameForPlayer).to.have.been.calledWith(sinon.match.instanceOf(Player).and(sinon.match.has('id', playerOne.id)));
          expect(res.json).to.have.been.calledWith(sinon.match.has('id', game.id));
        });
    });

    it('returns GAME_REMOVED and gameId if the user has removed herself from the game', () => {
      let res = stubRes();
      sandbox.spy(GameSerializer, 'serializeGameForPlayer');

      return playersResource.destroy({ user: userOne, params: { gameId: game.id, playerId: playerOne.id } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(200);
          expect(GameSerializer.serializeGameForPlayer).not.to.have.been.calledWith(sinon.match.instanceOf(Player).and(sinon.match.has('id', playerOne.id)));
          expect(res.json).to.have.been.calledWith({ event: GAME_REMOVED, payload: { gameId: game.id } });
        });
    });

    it('attempts to notify other players via WebSockets, including the removed user', () => {
      let res = stubRes(),
          eventStub = sandbox.stub(SocketNotifier.prototype, 'event');

      return playersResource.destroy({ user: userOne, params: { gameId: game.id, playerId: playerTwo.id } }, res)
        .then(() => {
          const calls = eventStub.getCalls();

          expect(calls).to.have.lengthOf(3);

          expect(calls[0].thisValue.userId).to.eq(playerTwo.userId);
          expect(calls[0].args).to.eql([GAME_REMOVED, { gameId: game.id }]);

          expect(calls[1].args[0]).to.eq(GAME_UPDATED);
          expect(calls[2].args[0]).to.eq(GAME_UPDATED);
        });
    });
  });
});
