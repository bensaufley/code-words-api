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
    let user, game1, game2, game3;

    beforeEach(() => {
      return User.create({ username: 'my-user', password: 'my-password' })
        .then((u) => {
          user = u;
          return Promise.all([ Game.create(), Game.create(), Game.create() ]);
        })
        .then((games) => {
          [game1, game2, game3] = games;
          return Promise.all([
            Player.create({ userId: user.id, gameId: game1.id, role: 'transmitter' }),
            Player.create({ gameId: game3.id, userId: user.id, role: 'decoder' })
          ]);
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

    it('returns the associated players and users', () => {
      let res = requestHelper.stubRes();

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0];

          expect(json.games.map((g) => g.players.map((p) => p.userId))).to.eql([[user.id], [user.id]]);
          expect(json.games.map((g) => g.users.map((p) => p.id))).to.eql([[user.id], [user.id]]);
        });
    });

    it('redacts games appropriately', () => {
      let res = requestHelper.stubRes();

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0],
              decoderGame = json.games.find((g) => g.game.id === game3.id).game,
              decoderTileTypes = [].concat(...decoderGame.board).map((t) => t.type),
              transmitterGame = json.games.find((g) => g.game.id === game1.id).game,
              transmitterTileTypes = [].concat(...transmitterGame.board).map((t) => t.type);

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
          let responseJson = res.json.getCall(0).args[0];
          expect(res.status).to.have.been.calledWith(200);
          expect(res.json).to.have.been.calledWith(sinon.match({
            game: sinon.match.object,
            players: [sinon.match.has('userId', user.id)]
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
          let thirdPlayer;
          [userPlayer, anotherUserPlayer, thirdPlayer] = players;
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

    it('returns all players and users', () => {
      let res = requestHelper.stubRes();

      return gamesResource.show({ user, query: { id: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(resJson.users.map((p) => p.id).sort()).to.eql([user.id, anotherUser.id].sort());
          expect(resJson.players.map((p) => p.id).sort()).to.eql([userPlayer.id, anotherUserPlayer.id].sort());
        })
    });

    it('returns a redacted game for a decoder', () => {
      let res = requestHelper.stubRes();

      return gamesResource.show({ user: anotherUser, query: { id: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect([].concat(...resJson.game.board).map((tile) => tile.type)).to.eql(new Array(25).fill('redacted'));
        })
    });

    it('returns an unredacted game for a transmitter', () => {
      let res = requestHelper.stubRes();

      return gamesResource.show({ user: user, query: { id: game.id } }, res)
        .then(() => {
          let resJson = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect([].concat(...resJson.game.board).map((tile) => tile.type)).to.have.members(['a', 'b', null, 'x']);
          expect([].concat(...resJson.game.board).map((tile) => tile.type)).not.to.have.members(['redacted']);
        })
    });
  });

  describe('destroy', () => {

  });
});
