'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      sinon = helper.sinon,
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
      let res = {};
      res.json = sinon.stub().returns(res);
      res.status = sinon.stub().returns(res);

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0];

          expect(res.status).to.have.been.calledWith(200);
          expect(json.games.map((g) => g.id).sort()).to.eql([game1.id, game3.id].sort());
        });
    });

    it('returns the associated players', () => {
      let res = {};
      res.json = sinon.stub().returns(res);
      res.status = sinon.stub().returns(res);

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0];

          expect(json.players.map((p) => p.userId)).to.eql([user.id, user.id]);
        });
    });

    it('redacts games appropriately', () => {
      let res = {};
      res.json = sinon.stub().returns(res);
      res.status = sinon.stub().returns(res);

      return gamesResource.index({ user }, res)
        .then(() => {
          let json = res.json.getCall(0).args[0],
              decoderGame = json.games.find((g) => g.id === game3.id),
              decoderTileTypes = [].concat(...decoderGame.board).map((t) => t.type),
              transmitterGame = json.games.find((g) => g.id === game1.id),
              transmitterTileTypes = [].concat(...transmitterGame.board).map((t) => t.type);

          expect(decoderTileTypes).to.eql(new Array(25).fill('redacted'));
          expect(transmitterTileTypes).to.have.members(['a', 'b', null, 'x']);
        });
    });
  });

  describe('create', () => {

  });

  describe('show', () => {

  });

  describe('destroy', () => {

  });
});
