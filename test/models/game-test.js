'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      Game = require('../../models/game'),
      GameBoard = require('../../lib/game-board');

describe('Game', () => {
  let game;

  beforeEach(() => {
    return Game.create().then((g) => { game = g; });
  });

  afterEach(helper.cleanDatabase);

  describe('initialization', () => {
    it('creates a new game board', () => {
      let board = game.getDataValue('board');

      expect(board).to.have.lengthOf(5);
      expect([].concat(...board)).to.have.lengthOf(25);
      [].concat(...board).forEach((tile) => {
        expect(tile.revealed).to.be.false;
        expect(tile.type).to.be.oneOf(['a', 'b', null, 'x']);
        expect(tile.word).to.be.a('string').with.length.above(2);
      });
    });
  });

  it('returns a GameBoard object for its board property', () => {
    expect(game.board).to.be.instanceOf(GameBoard);
    expect(game.board.grid).to.eq(game.getDataValue('board'));
  });
});
