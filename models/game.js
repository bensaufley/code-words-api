'use strict';

const Sequelize = require('sequelize'),
      config = require('../config'),
      sequelizeInstance = config.sequelize,
      GameBoard = require('../lib/game-board');

const Game = sequelizeInstance.define('game', {
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
    notNull: false,
    references: {
      model: 'Player',
      key: 'id'
    }
  }
}, {
  instanceMethods: {
    endGame: function(turn, activePlayer) {
      let finalTurn = { event: 'end' };
      if (turn.correct) {
        finalTurn.winner = activePlayer.team;
      } else {
        finalTurn.winner = activePlayer.team === 'a' ? 'b' : 'a';
      }
      return this.update({ turns: [].concat(this.turns, finalTurn) });
    },
    giveClue: function(word, number) {
      if (!this.activePlayerId) return Promise.reject(new Error('Game has not begun'));
      if (/\s*/.test(word)) return Promise.reject(new Error('Clue may only be one word'));
      if (isNaN(number) || Math.round(number) !== number || number < 1) return Promise.reject(new Error('Number must be whole number greater than zero'));

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
    },
    makeGuess: function(x, y) {
      if (x < 0 || x > 24 || y < 0 || y > 24) return Promise.reject(new Error('No such tile'));
      let board = this.getDataValue('board'),
          tile = board[y][x];
      if (tile.revealed) return Promise.reject(new Error('Tile already revealed'));

      return this.getActivePlayer()
        .then((activePlayer) => {
          this.activePlayer = activePlayer;
          let turn = { event: 'guess', playerId: activePlayer.id, tile: { x, y }, correct: false };
          if (tile.type === activePlayer.team) {
            turn.correct = true;
            if (this.board.won()) return this.endGame(turn, activePlayer);
          } else if (tile.type === 'x') {
            return this.endGame(turn, activePlayer);
          } else {
            return this.nextTurn();
          }
        });
    },
    nextTurn: function() {
      return (this.activePlayer ? Promise.resolve(activePlayer) : this.getActivePlayer())
        .then((activePlayer) => {
          let nextPlayer = this.getPlayers({
            where: {
              team: activePlayer.team === 'a' ? 'b' : 'a',
              role: activePlayer.role === 'transmitter' ? 'decoder' : 'transmitter'
            }
          });
        }).then(([player]) => {
          return this.update({ activePlayerId: player.id });
        });
    },
    serializeFor: function(player) {
      return {
        id: this.id,
        activePlayerId: this.activePlayerId,
        board: this.board.serialize(player.role !== 'transmitter')
      };
    },
    start: function() {
      return this.getPlayers()
        .then((players) => {
          if (players.length < 4) return Promise.reject(new Error('Not enough players'));

          let activePlayer = players.find((player) => {
            return player.team === this.game.startingTeam() &&
              player.role === 'transmitter';
          });
          return this.update({ activePlayerId: activePlayer.id });
        });
    },
    completed: function() {
      let lastTurn = this.turns[this.turns.length - 1];
      if (!lastTurn) return false;
      return lastTurn.type === 'completed';
    }
  },
  underscored: true
});

module.exports = Game;
