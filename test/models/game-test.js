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

  describe('serializeFor', () => {
    it('returns the full grid for transmitter players');
    it('returns a redacted grid for decoder players');
  });

  context('gameplay', () => {
    describe('start', () => {
      it('rejects when not enough players');
      it('sets the active player to the starting team\'s transmitter');
    });

    describe('giveClue', () => {
      context('invalid', () => {
        it('rejects if game not started');
        it('rejects if clue includes spaces');
        it('rejects if clue is empty');
        it('rejects number zero');
        it('rejects non-whole numbers');
        // TODO: reject if clue is more than remaining words
      });

      context('valid', () => {
        it('creates Turn with clue');
        it('changes activePlayer');
      });
    });

    describe('makeGuess', () => {
      it('rejects invalid tile coordinates');
      it('rejects already-revealed tiles');
      it('changes turn if tile is not of same team');
      it('does not change turn if guess is correct');
      it('creates a turn for incorrect guesses');
      it('creates a turn for correct guesses');
      it('triggers endGame if tile is x type');
      it('triggers endGame if tile is last for active player\'s team');
      it('triggers endGame if tile is last for other team');
    });

    describe('nextTurn', () => {
      context('from team a', () => {
        it('switches from transmitter to decoder on a');
        it('switches from decoder to transmitter on b');
      });

      context('from team b', () => {
        it('switches from transmitter to decoder on b');
        it('switches from decoder to transmitter on a');
      });
    });

    describe('endGame', () => {
      it('creates an end event');
      it('sets the winner to the active player if the last guess was correct');
      it('sets the winner to the other team if the last guess was not correct');
    });

    describe('completed', () => {
      it('returns false for non-started games');
      it('returns false for games in progress');
      it('returns true for finished games');
    });
  });
});
