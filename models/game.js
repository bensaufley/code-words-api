'use strict';

const Sequelize = require('sequelize'),
      config = require('../config'),
      sequelizeInstance = config.sequelize,
      GameBoard = require('../lib/game-board');

class Game extends Sequelize.Model {
  completed() {
    let lastTurn = this.turns[this.turns.length - 1];
    if (!lastTurn) return false;
    return lastTurn.event === 'end';
  }

  end(turn, activePlayer) {
    let finalTurn = { event: 'end' };
    if (turn.correct) {
      finalTurn.winner = activePlayer.team;
    } else {
      finalTurn.winner = activePlayer.team === 'a' ? 'b' : 'a';
    }
    return this.update({ turns: [].concat(this.turns, finalTurn) });
  }

  giveClue(word, number) {
    if (!this.activePlayerId) return Promise.reject(new Error('Game has not begun'));
    if (!word || /\s+/.test(word)) return Promise.reject(new Error('Clue must be one single word'));
    if (isNaN(number) || Math.round(number) !== number || number < 1 || number > 8) return Promise.reject(new Error('Number must be whole number greater than zero'));

    return this.getActivePlayer()
      .then((activePlayer) => {
        this.activePlayer = activePlayer;
        const turn = {
          event: 'clue',
          playerId: activePlayer.id,
          clue: {
            number: number,
            word: word
          }
        };
        return this.update({ turns: [].concat(this.turns, turn) });
      })
      .then(() => this.nextTurn());
  }

  makeGuess(x, y) {
    if (x < 0 || x > 24 || y < 0 || y > 24) return Promise.reject(new Error('No such tile'));
    let turn,
        board = this.getDataValue('board'),
        tile = board[y][x];
    if (tile.revealed) return Promise.reject(new Error('Tile already revealed'));

    return this.getActivePlayer()
      .then((activePlayer) => {
        if (!activePlayer || activePlayer.role !== 'decoder') return Promise.reject(new Error('Active Player cannot make guesses'));

        this.activePlayer = activePlayer;

        turn = { event: 'guess', playerId: activePlayer.id, tile: { x, y }, correct: tile.type === activePlayer.team };
        let turns = [].concat(this.turns, turn);

        tile.revealed = true;

        return this.update({ board, turns });
      }).then(() => {
        if (tile.type === 'x' || this.board.won()) {
          return this.end(turn, this.activePlayer);
        } else if (!turn.correct) {
          return this.nextTurn();
        }
      });
  }

  nextTurn() {
    if (!this.activePlayerId) return Promise.reject(new Error('Game is not started'));
    return (this.activePlayer ? Promise.resolve(this.activePlayer) : this.getActivePlayer())
      .then((activePlayer) => {
        let isTransmitting = activePlayer.role === 'transmitter',
            otherTeam = activePlayer.team === 'a' ? 'b' : 'a',
            nextTeam = isTransmitting ? activePlayer.team : otherTeam;

        return this.getPlayers({
          where: {
            team: nextTeam,
            role: isTransmitting ? 'decoder' : 'transmitter'
          },
          limit: 1
        });
      }).then(([player]) => {
        return this.update({ activePlayerId: player.id });
      });
  }

  serializeFor(player) {
    return {
      id: this.id,
      activePlayerId: this.activePlayerId,
      board: this.board.serialize(player.role !== 'transmitter')
    };
  }

  start() {
    return this.getPlayers()
      .then((players) => {
        if (players.length < 4) return Promise.reject(new Error('Not enough players'));

        let activePlayer = players.find((player) => {
          return player.team === this.board.startingTeam() &&
            player.role === 'transmitter';
        });
        return this.update({ activePlayerId: activePlayer.id });
      });
  }
}

Game.init({
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  board: {
    type: Sequelize.JSONB,
    defaultValue: () => new GameBoard().grid,
    get() {
      return new GameBoard(this.getDataValue('board'));
    }
  },
  turns: {
    type: Sequelize.JSONB,
    defaultValue: []
  },
  activePlayerId: {
    field: 'active_player_id',
    type: Sequelize.UUID,
    notNull: false
  }
}, {
  sequelize: sequelizeInstance,
  tableName: 'games',
  underscored: true
});

module.exports = Game;
