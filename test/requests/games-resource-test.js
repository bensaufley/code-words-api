'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      sinon = helper.sinon,
      requestHelper = require('../support/request-helper'),
      User = require('../../models/user'),
      Game = require('../../models/game'),
      Player = require('../../models/player'),
      gamesResource = require('../../resources/games');

describe('Games Resource', () => {
  describe('index', () => {
    let user, game1, game3, player1, player2;

    beforeEach(() => {
      return User.create({ username: 'my-user', password: 'my-password' })
        .then((u) => {
          user = u;
          return Promise.all([ Game.create(), Game.create(), Game.create() ]);
        })
        .then((games) => {
          game1 = games[0];
          game3 = games[2];
          return Promise.all([
            Player.create({ userId: user.id, gameId: game1.id, role: 'transmitter' }),
            Player.create({ gameId: game3.id, userId: user.id, role: 'decoder' })
          ]);
        })
        .then((players) => {
          [player1, player2] = players;
        });
    });

    afterEach(helper.cleanDatabase);

    it('returns only the user\'s games', () => {
      let res = requestHelper.stubRes();

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(json.games.map((g) => g.game.id).sort()).to.eql([game1.id, game3.id].sort());
        });
    });

    it('returns the associated players and their associated users', () => {
      let res = requestHelper.stubRes();

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0];

          expect(json.games.map((g) => g.players.map((p) => p.id)).sort()).to.eql([[player1.id], [player2.id]].sort());
          expect(json.games.map((g) => g.players.map((p) => p.user).map((u) => u.username))).to.eql([[user.username], [user.username]]);
        });
    });

    it('redacts games appropriately', () => {
      let res = requestHelper.stubRes();

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0],
              decoderGame = json.games.find((g) => g.game.id === game3.id).game,
              decoderTileTypes = decoderGame.board.map((t) => t.type),
              transmitterGame = json.games.find((g) => g.game.id === game1.id).game,
              transmitterTileTypes = transmitterGame.board.map((t) => t.type);

          expect(decoderTileTypes).to.eql(new Array(25).fill('redacted'));
          expect(transmitterTileTypes).to.have.members(['a', 'b', null, 'x']);
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
      let res = requestHelper.stubRes();

      return gamesResource.create({}, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No user defined' }));
        });
    });

    it('creates a new game', () => {
      let res = requestHelper.stubRes();

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
            Player.create({ userId: user.id, gameId: game.id, role: 'transmitter' }),
            Player.create({ userId: anotherUser.id, gameId: game.id, role: 'decoder' }),
            Player.create({ userId: user.id, gameId: game2.id, role: 'transmitter' })
          ]);
        }).then((players) => {
          [userPlayer, anotherUserPlayer] = players;
        });
    });

    afterEach(() => helper.cleanDatabase());

    it('rejects if no game ID', () => {
      let res = requestHelper.stubRes();

      return gamesResource.show({ user }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No game id specified' }));
        });
    });

    it('rejects if no user', () => {
      let res = requestHelper.stubRes();

      return gamesResource.show({ query: { id: game.id } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No user defined' }));
        });
    });

    it('rejects if no player', () => {
      let res = requestHelper.stubRes();

      return Player.destroy({ where: { userId: user.id, gameId: game.id } })
        .then(() => {
          return gamesResource.show({ user, query: { id: game.id } }, res)
            .then(() => {
              expect(res.status).to.have.been.calledWith(500);
              expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No player found' }));
            });
        });
    });

    it('returns all players with relevant users', () => {
      let res = requestHelper.stubRes();

      return gamesResource.show({ user, query: { id: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(resJson.players.map((p) => p.id).sort()).to.eql([userPlayer.id, anotherUserPlayer.id].sort());
          expect(resJson.players.map((p) => p.user).map((u) => u.id).sort()).to.eql([user.id, anotherUser.id].sort());
        });
    });

    it('returns a redacted game for a decoder', () => {
      let res = requestHelper.stubRes();

      return gamesResource.show({ user: anotherUser, query: { id: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(resJson.game.board.map((tile) => tile.type)).to.eql(new Array(25).fill('redacted'));
        });
    });

    it('returns an unredacted game for a transmitter', () => {
      let res = requestHelper.stubRes();

      return gamesResource.show({ user: user, query: { id: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(resJson.game.board.map((tile) => tile.type)).to.have.members(['a', 'b', null, 'x']);
          expect(resJson.game.board.map((tile) => tile.type)).not.to.have.members(['redacted']);
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
      let res = requestHelper.stubRes();

      return gamesResource.destroy({ query: { id: game.id } }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No user defined' }));
        });
    });

    it('rejects if no game ID', () => {
      let res = requestHelper.stubRes();

      return gamesResource.destroy({ user }, res)
        .then(() => {
          expect(res.status).to.have.been.calledWith(500);
          expect(res.json).to.have.been.calledWith(sinon.match({ error: 'Error: No game id specified' }));
        });
    });

    it('marks the game as deleted', () => {
      let res = requestHelper.stubRes();

      return gamesResource.destroy({ user, query: { id: game.id } }, res)
        .then(() => {
          return Game.unscoped().findOne({ where: { id: game.id } });
        })
        .then((g) => {
          expect(res.status).to.have.been.calledWith(200);
          expect(g.deletedAt).not.to.be.null;
        });
    });

    it('marks the players as deleted', () => {
      let res = requestHelper.stubRes();

      return gamesResource.destroy({ user, query: { id: game.id } }, res)
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
