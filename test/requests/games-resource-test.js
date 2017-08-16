'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      sinon = helper.sinon,
      { stubRes } = require('../support/request-helper'),
      { prepareGame } = require('../support/game-helpers'),
      User = require('../../models/user'),
      Game = require('../../models/game'),
      Player = require('../../models/player'),
      GameSerializer = require('../../lib/game-serializer'),
      { SocketNotifier, GAME_UPDATED } = require('../../lib/sockets/socket-notifier'),
      gamesResource = require('../../resources/games');

describe('Games Resource', () => {
  describe('index', () => {
    let user, game1, game3, player1, player2, player3, player4, player5;

    beforeEach(() => {
      return User.create({ username: 'my-user', password: 'my-password' })
        .then((u) => {
          user = u;
          return Promise.all([Game.create(), Game.create(), Game.create()]);
        })
        .then(([g1, , g3]) => {
          [game1, game3] = [g1, g3];
          return Promise.all([
            Player.create({ gameId: game1.id, userId: user.id, role: 'transmitter', team: 'b' }),
            Player.create({ gameId: game3.id, userId: user.id, role: 'decoder' }),
            User.create({ username: 'my-user-2', password: 'password2' }).then((u) => Player.create({ gameId: game1.id, userId: u.id, role: 'decoder', team: 'b' })),
            User.create({ username: 'my-user-3', password: 'password3' }).then((u) => Player.create({ gameId: game1.id, userId: u.id, role: 'transmitter', team: 'a' })),
            User.create({ username: 'my-user-4', password: 'password4' }).then((u) => Player.create({ gameId: game1.id, userId: u.id, role: 'decoder', team: 'a' }))
          ]);
        })
        .then((players) => {
          [player1, player2, player3, player4, player5] = players;
        });
    });

    afterEach(helper.cleanDatabase);

    it('returns only the user\'s games', () => {
      let res = stubRes();

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(json.games.map((g) => g.game.id).sort()).to.eql([game1.id, game3.id].sort());
        });
    });

    it('returns the associated players and their associated users', () => {
      let res = stubRes();

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0],
              game1json = json.games.find((g) => g.game.id === game1.id),
              game3json = json.games.find((g) => g.game.id === game3.id);

          expect(game1json.players.map((p) => p.id).sort()).to.eql([player1.id, player3.id, player4.id, player5.id].sort());
          expect(game3json.players.map((p) => p.id)).to.eql([player2.id]);
          expect(game1json.players.map((p) => p.username).sort()).to.eql([player1.username, player3.username, player4.username, player5.username].sort());
          expect(game3json.players.map((p) => p.username)).to.eql([player2.username]);
        });
    });

    it('redacts games appropriately', () => {
      let res = stubRes();

      return game1.start()
        .then(() => gamesResource.index({ user }, res))
        .then(() => {
          let json = res.json.getCall(0).args[0],
              decoderGame = json.games.find((g) => g.game.id === game3.id).game,
              decoderTileTypes = decoderGame.board.map((t) => t.type),
              transmitterGame = json.games.find((g) => g.game.id === game1.id).game,
              transmitterBoard = transmitterGame.board;

          expect(decoderTileTypes).to.eql(new Array(25).fill('redacted'));
          expect(transmitterBoard).to.eql(game1.getDataValue('board'));
        });
    });
  });

  describe('create', () => {
    let user;

    beforeEach(() => {
      return User.create({ username: 'my-user', password: 'my-password' })
        .then((u) => { user = u; });
    });

    afterEach(() => helper.cleanDatabase());

    it('rejects if no user', () => {
      let res = stubRes();

      return gamesResource.create({}, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No user defined' }));
        });
    });

    it('creates a new game', () => {
      let res = stubRes();

      return gamesResource.create({ user }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(200);
          expect(res.json).to.have.been.calledWith(sinon.match({
            game: sinon.match.object,
            players: [sinon.match.has('user', sinon.match(user.serialize()))]
          }));
        });
    });
  });

  describe('show', () => {
    let user, anotherUser, userPlayer, anotherUserPlayer, game, game2;

    beforeEach(() => {
      return Promise.all([
        User.create({ username: 'my-user', password: 'my-password' }),
        User.create({ username: 'another-user', password: 'another-pass' })
      ])
        .then((users) => {
          [user, anotherUser] = users;
          return Promise.all([Game.create(), Game.create()]);
        })
        .then((games) => {
          [game, game2] = games;
          return Promise.all([
            Player.create({ userId: user.id, gameId: game.id, role: 'transmitter', team: 'a' }),
            Player.create({ userId: anotherUser.id, gameId: game.id, role: 'decoder', team: 'b' }),
            Player.create({ userId: user.id, gameId: game2.id, role: 'transmitter', team: 'b' })
          ]);
        }).then((players) => {
          [userPlayer, anotherUserPlayer] = players;
        });
    });

    afterEach(() => helper.cleanDatabase());

    it('rejects if no game ID', () => {
      let res = stubRes();

      return gamesResource.show({ user }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No game id specified' }));
        });
    });

    it('rejects if no user', () => {
      let res = stubRes();

      return gamesResource.show({ params: { gameId: game.id } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No user defined' }));
        });
    });

    it('rejects if no player', () => {
      let res = stubRes();

      return Player.destroy({ where: { userId: user.id, gameId: game.id } })
        .then(() => {
          return gamesResource.show({ user, params: { gameId: game.id } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No player found' }));
            });
        });
    });

    it('returns all players with relevant users', () => {
      let res = stubRes();

      return gamesResource.show({ user, params: { gameId: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(resJson.players.map((p) => p.id).sort()).to.eql([userPlayer.id, anotherUserPlayer.id].sort());
          expect(resJson.players.map((p) => p.user).map((u) => u.id).sort()).to.eql([user.id, anotherUser.id].sort());
        });
    });

    it('returns a redacted game for a decoder', () => {
      let res = stubRes();

      return gamesResource.show({ user: anotherUser, params: { gameId: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(resJson.game.board.map((tile) => tile.type)).to.eql(new Array(25).fill('redacted'));
        });
    });

    it('returns a redacted game for a transmitter before the game has started', () => {
      let res = stubRes();

      return gamesResource.show({ user: user, params: { gameId: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(resJson.game.board.map((tile) => tile.type)).to.eql(new Array(25).fill('redacted'));
        });
    });

    it('returns an unredacted game for a transmitter', () => {
      let res = stubRes();

      return Promise.all([
        User.create({ username: 'my-user-7', password: 'password7' }).then((u) => Player.create({ gameId: game.id, userId: u.id, role: 'decoder', team: 'a' })),
        User.create({ username: 'my-user-8', password: 'password8' }).then((u) => Player.create({ gameId: game.id, userId: u.id, role: 'transmitter', team: 'b' }))
      ]).then(() => game.start())
        .then(() => gamesResource.show({ user: user, params: { gameId: game.id } }, res))
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(resJson.game.board.map((tile) => tile.type)).to.have.members(['a', 'b', null, 'x']);
          expect(resJson.game.board.map((tile) => tile.type)).not.to.have.members(['redacted']);
        });
    });
  });

  describe('start', () => {
    let sandbox, aTransmitterUser, aTransmitterPlayer, bDecoderPlayer, game;

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      return prepareGame()
        .then((response) => {
          ({ aTransmitterUser, aTransmitterPlayer, bDecoderPlayer, game } = response);
        });
    });

    afterEach(() => {
      sandbox.restore();
      return helper.cleanDatabase();
    });

    it('rejects a game without enough players', () => {
      let res = stubRes();
      return bDecoderPlayer.destroy()
        .then(() => gamesResource.start({ user: aTransmitterUser, params: { gameId: game.id } }, res))
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith({ error: 'Error: Not enough players' });
        });
    });

    it('rejects a game without proper teams and roles', () => {
      let res = stubRes();
      return bDecoderPlayer.update({ role: null })
        .then(() => gamesResource.start({ user: aTransmitterUser, params: { gameId: game.id } }, res))
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith({ error: 'Error: All players must have roles and teams' });
        });
    });

    it('rejects a game that is already started', () => {
      let res = stubRes();

      return game.start()
        .then(() => gamesResource.start({ user: aTransmitterUser, params: { gameId: game.id } }, res))
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith({ error: 'Error: Game has already been started' });
        });
    });

    it('assigns activePlayerId', () => {
      let res = stubRes();
      return gamesResource.start({ user: aTransmitterUser, params: { gameId: game.id } }, res)
        .then(() => game.reload())
        .then(() => {
          expect(res.status).to.have.been.calledWith(200);
          expect(game.activePlayerId).not.to.be.null;
        });
    });

    it('returns the serialized game', () => {
      let res = stubRes();
      sandbox.spy(GameSerializer, 'serializeGameForPlayer');

      return gamesResource.start({ user: aTransmitterUser, params: { gameId: game.id } }, res)
        .then(() => {
          expect(GameSerializer.serializeGameForPlayer).to.have.been.calledWith(sinon.match.instanceOf(Player).and(sinon.match.has('id', aTransmitterPlayer.id)));
          expect(res.status).to.have.been.calledWith(200);
          expect(res.json).to.have.been.calledWith(sinon.match.has('game', sinon.match.has('id', game.id)));
        });
    });

    it('attempts to notify other players via WebSockets', () => {
      let res = stubRes(),
          eventStub = sandbox.stub(SocketNotifier.prototype, 'event');

      return gamesResource.start({ user: aTransmitterUser, params: { gameId: game.id } }, res)
        .then(() => {
          expect(eventStub).to.have.callCount(3);
          expect(eventStub).to.have.been.always.calledWith(GAME_UPDATED);
        });
    });
  });

  describe('turns', () => {
    let sandbox, game, aTransmitterUser, aTransmitterPlayer, aDecoderUser, aDecoderPlayer, bTransmitterUser, bDecoderUser, bDecoderPlayer;

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      return Promise.all([
        Game.create(),
        User.create({ username: 'my-user-1', password: 'password-1' }),
        User.create({ username: 'my-user-2', password: 'password-2' }),
        User.create({ username: 'my-user-3', password: 'password-3' }),
        User.create({ username: 'my-user-4', password: 'password-4' })
      ])
        .then((results) => {
          [game, aTransmitterUser, aDecoderUser, bTransmitterUser, bDecoderUser] = results;
          return Promise.all([
            Player.create({ userId: aTransmitterUser.id, gameId: game.id, team: 'a', role: 'transmitter' }),
            Player.create({ userId: aDecoderUser.id, gameId: game.id, team: 'a', role: 'decoder' }),
            Player.create({ userId: bTransmitterUser.id, gameId: game.id, team: 'b', role: 'transmitter' }),
            Player.create({ userId: bDecoderUser.id, gameId: game.id, team: 'b', role: 'decoder' })
          ]);
        })
        .then((ps) => {
          [aTransmitterPlayer, aDecoderPlayer, , bDecoderPlayer] = ps;
        });
    });

    afterEach(() => {
      sandbox.restore();
      return helper.cleanDatabase();
    });

    describe('transmit', () => {
      context('invalid', () => {
        it('rejects an empty body', () => {
          let res = stubRes();

          return gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: Missing params: word, number' }));
            });
        });

        it('rejects a missing param', () => {
          let res = stubRes();

          return gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id }, body: { number: 2 } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: Missing param: word' }));
            });
        });

        it('rejects an un-started Game', () => {
          let res = stubRes();

          return gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id }, body: { word: 'transmission', number: 3 } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: Game has not begun' }));
            });
        });

        it('rejects an invalid body', () => {
          let res = stubRes();

          return game.update({ activePlayerId: aTransmitterPlayer.id })
            .then(() => gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id }, body: { word: 'two words', number: 4 } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: Transmission must be one single word' }));
            });
        });

        it('rejects a decoder', () => {
          let res = stubRes();

          return game.update({ activePlayerId: aDecoderPlayer.id })
            .then(() => gamesResource.transmit({ user: aDecoderUser, params: { gameId: game.id }, body: { word: 'two words', number: 4 } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: User is not transmitter in this game' }));
            });
        });

        it('rejects when not User\'s turn', () => {
          let res = stubRes();

          return game.update({ activePlayerId: bDecoderPlayer.id })
            .then(() => gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id }, body: { word: 'transmission', number: 5 } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: `Error: It is not ${aTransmitterUser.username}'s turn` }));
            });
        });
      });

      context('valid', () => {
        beforeEach(() => {
          return game.update({ activePlayerId: aTransmitterPlayer.id });
        });

        it('adds the turn to the game', () => {
          let res = stubRes();

          return gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id }, body: { word: 'erudition', number: 5 } }, res)
            .then(() => game.reload())
            .then(() => {
              expect(game.turns[game.turns.length - 1]).to.eql({
                event: 'transmission',
                number: 5,
                playerId: aTransmitterPlayer.id,
                word: 'erudition'
              });
            });
        });

        it('advances activePlayerId', () => {
          let res = stubRes();

          return gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id }, body: { word: 'transmission', number: 5 } }, res)
            .then(() => game.reload())
            .then(() => {
              expect(game.activePlayerId).to.eq(aDecoderPlayer.id);
            });
        });

        it('returns the serialized game', () => {
          let res = stubRes();
          sandbox.spy(GameSerializer, 'serializeGameForPlayer');

          return gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id }, body: { word: 'transmission', number: 5 } }, res)
            .then(() => {
              expect(GameSerializer.serializeGameForPlayer).to.have.been.calledWith(sinon.match.instanceOf(Player).and(sinon.match.has('id', aTransmitterPlayer.id)));
              expect(res.status).to.have.been.calledWith(200);
              expect(res.json).to.have.been.calledWith(sinon.match.has('game', sinon.match.has('id', game.id)));
            });
        });

        it('attempts to notify other players via WebSockets', () => {
          let res = stubRes(),
              eventStub = sandbox.stub(SocketNotifier.prototype, 'event');

          return gamesResource.transmit({ user: aTransmitterUser, params: { gameId: game.id }, body: { word: 'transmission', number: 5 } }, res)
            .then(() => {
              expect(eventStub).to.have.callCount(3);
              expect(eventStub).to.have.been.always.calledWith(GAME_UPDATED);
            });
        });
      });
    });

    describe('decode', () => {
      context('invalid', () => {
        it('rejects an empty body', () => {
          let res = stubRes();

          return gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: Missing param: tile' }));
            });
        });

        it('rejects a missing param', () => {
          let res = stubRes();

          return gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: Missing param: tile' }));
            });
        });

        it('rejects an un-started Game', () => {
          let res = stubRes();

          return gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { tile: 12 } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: Game has not begun' }));
            });
        });

        it('rejects an invalid body', () => {
          let res = stubRes();

          return game.update({ activePlayerId: bDecoderPlayer.id })
            .then(() => gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { tile: 28 } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No such tile' }));
            });
        });

        it('rejects when not User\'s turn', () => {
          let res = stubRes();

          return game.update({ activePlayerId: aTransmitterPlayer.id })
            .then(() => gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { tile: 13 } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: `Error: It is not ${bDecoderUser.username}'s turn` }));
            });
        });

        it('rejects a transmitter', () => {
          let res = stubRes();

          return game.update({ activePlayerId: aTransmitterPlayer.id })
            .then(() => gamesResource.decode({ user: aTransmitterUser, params: { gameId: game.id }, body: { tile: 13 } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: User is not decoder in this game' }));
            });
        });
      });

      context('valid', () => {
        let safeTile;

        beforeEach(() => {
          safeTile = game.getDataValue('board').findIndex((t) => t.type === 'b');
          return game.update({ activePlayerId: bDecoderPlayer.id });
        });

        it('adds the turn to the game', () => {
          let res = stubRes();

          return gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { tile: safeTile } }, res)
            .then(() => game.reload())
            .then(() => {
              expect(game.turns[game.turns.length - 1]).to.eql({
                correct: true,
                event: 'decoding',
                playerId: bDecoderPlayer.id,
                tile: safeTile
              });
            });
        });

        it('reveals tile', () => {
          let res = stubRes();

          return gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { tile: safeTile } }, res)
            .then(() => game.reload())
            .then(() => {
              expect(game.getDataValue('board')[safeTile].revealed).to.be.true;
            });
        });

        it('returns the serialized game', () => {
          let res = stubRes();
          sandbox.spy(GameSerializer, 'serializeGameForPlayer');

          return gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { tile: safeTile } }, res)
            .then(() => {
              expect(GameSerializer.serializeGameForPlayer).to.have.been.calledWith(sinon.match.instanceOf(Player).and(sinon.match.has('id', bDecoderPlayer.id)));
              expect(res.status).to.have.been.calledWith(200);
              expect(res.json).to.have.been.calledWith(sinon.match.has('game', sinon.match.has('id', game.id)));
            });
        });

        it('advances turn when guess is wrong', () => {
          let res = stubRes(),
              wrongTile = game.getDataValue('board').findIndex((t) => t.type === 'a');
          sandbox.spy(GameSerializer, 'serializeGameForPlayer');

          return gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { tile: wrongTile } }, res)
            .then(() => game.reload())
            .then(() => {
              expect(game.activePlayerId).to.eq(aTransmitterPlayer.id);
            });
        });

        it('attempts to notify other players via WebSockets', () => {
          let res = stubRes(),
              eventStub = sandbox.stub(SocketNotifier.prototype, 'event');

          return gamesResource.decode({ user: bDecoderUser, params: { gameId: game.id }, body: { tile: safeTile } }, res)
            .then(() => {
              expect(eventStub).to.have.callCount(3);
              expect(eventStub).to.have.been.always.calledWith(GAME_UPDATED);
            });
        });
      });
    });

    describe('endTurn', () => {
      context('invalid', () => {
        it('rejects an unstarted game', () => {
          let res = stubRes();

          return gamesResource.endTurn({ user: bDecoderUser, params: { gameId: game.id } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith({ error: 'Error: Game is not started' });
            });
        });

        it('rejects a transmitter', () => {
          let res = stubRes();

          return game.update({ activePlayerId: aTransmitterPlayer.id })
            .then(() => gamesResource.endTurn({ user: aTransmitterUser, params: { gameId: game.id } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith({ error: 'Error: User is not decoder in this game' });
            });
        });
        it('rejects a decoder whose turn it is not', () => {
          let res = stubRes();

          return game.update({ activePlayerId: aDecoderPlayer.id })
            .then(() => gamesResource.endTurn({ user: bDecoderUser, params: { gameId: game.id } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith({ error: 'Error: It is not my-user-4\'s turn' });
            });
        });

        it('rejects a finished game', () => {
          let res = stubRes();

          return game.update({ activePlayerId: bDecoderPlayer.id, turns: [{ event: 'end' }] })
            .then(() => gamesResource.endTurn({ user: bDecoderUser, params: { gameId: game.id } }, res))
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith({ error: 'Error: Game is over' });
            });
        });
      });

      context('valid', () => {
        beforeEach(() => {
          return game.update({ activePlayerId: bDecoderPlayer.id });
        });

        it('changes the activePlayerId', () => {
          let res = stubRes();

          return gamesResource.endTurn({ user: bDecoderUser, params: { gameId: game.id } }, res)
            .then(() => game.reload())
            .then(() => {
              expect(game.activePlayerId).to.eq(aTransmitterPlayer.id);
            });
        });

        it('returns the serialized game', () => {
          let res = stubRes();
          sandbox.spy(GameSerializer, 'serializeGameForPlayer');

          return gamesResource.endTurn({ user: bDecoderUser, params: { gameId: game.id } }, res)
            .then(() => {
              expect(GameSerializer.serializeGameForPlayer).to.have.been.calledWith(sinon.match.instanceOf(Player).and(sinon.match.has('id', bDecoderPlayer.id)));
              expect(res.status).to.have.been.calledWith(200);
              expect(res.json).to.have.been.calledWith(sinon.match.has('game', sinon.match.has('id', game.id)));
            });
        });

        it('attempts to notify other players via WebSockets', () => {
          let res = stubRes(),
              eventStub = sandbox.stub(SocketNotifier.prototype, 'event');

          return gamesResource.endTurn({ user: bDecoderUser, params: { gameId: game.id } }, res)
            .then(() => {
              expect(eventStub).to.have.callCount(3);
              expect(eventStub).to.have.been.always.calledWith(GAME_UPDATED);
            });
        });
      });
    });
  });


  describe('destroy', () => {
    let user, player, game;

    beforeEach(() => {
      return Promise.all([
        User.create({ username: 'my-user', password: 'my-password' }),
        Game.create()
      ])
        .then((response) => {
          [user, game] = response;

          return Player.create({ gameId: game.id, userId: user.id });
        })
        .then((p) => { player = p; });
    });

    afterEach(() => helper.cleanDatabase());

    it('rejects if no user', () => {
      let res = stubRes();

      return gamesResource.destroy({ params: { gameId: game.id } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No user defined' }));
        });
    });

    it('rejects if no game ID', () => {
      let res = stubRes();

      return gamesResource.destroy({ user }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No game id specified' }));
        });
    });

    it('marks the game as deleted', () => {
      let res = stubRes();

      return gamesResource.destroy({ user, params: { gameId: game.id } }, res)
        .then(() => {
          return Game.unscoped().findOne({ where: { id: game.id } });
        })
        .then((g) => {
          expect(res.status).to.have.been.calledWith(200);
          expect(g.deletedAt).not.to.be.null;
        });
    });

    it('marks the players as deleted', () => {
      let res = stubRes();

      return gamesResource.destroy({ user, params: { gameId: game.id } }, res)
        .then(() => {
          return Player.unscoped().findOne({ where: { id: player.id } });
        })
        .then((p) => {
          expect(res.status).to.have.been.calledWith(200);
          expect(p.deletedAt).not.to.be.null;
        });
    });
  });
});
