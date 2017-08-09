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

  decode(i) {
    if (i < 0 || i > 24) return Promise.reject(new Error('No such tile'));
    let turn,
        board = this.getDataValue('board');
    if (board[i].revealed) return Promise.reject(new Error('Tile already revealed'));

    if (!this.activePlayerId) return Promise.reject(new Error('Game has not begun'));

    return this.getActivePlayer()
      .then((activePlayer) => {
        if (activePlayer.role !== 'decoder') throw new Error('Active Player cannot make guesses');

        this.activePlayer = activePlayer;

        turn = {
          event: 'decoding',
          playerId: activePlayer.id,
          tile: i,
          correct: board[i].type === activePlayer.team
        };

        let turns = [...this.turns, turn];

        board[i].revealed = true;

        return this.update({ board, turns });
      }).then(() => {
        if (board[i].type === 'x' || this.board.won()) return this.end(turn, this.activePlayer);
        else if (!turn.correct) return this.nextTurn();
        return this;
      });
  }

  delete() {
    return sequelizeInstance.transaction((transaction) => {
      let deletedAt = new Date();
      return this.getPlayers()
        .then((players) => {
          return Promise.all([
            players.map((player) => player.update({ deletedAt }, { transaction })),
            this.update({ deletedAt }, { transaction })
          ]);
        });
    });
  }

  end(turn, activePlayer) {
    let finalTurn = { event: 'end' };
    if (turn.correct) {
      finalTurn.winner = activePlayer.team;
    } else {
      finalTurn.winner = activePlayer.team === 'a' ? 'b' : 'a';
    }
    return this.update({ turns: [...this.turns, finalTurn] });
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
      board: this.board.serialize(!this.activePlayerId || player.role !== 'transmitter'),
      completed: this.completed(),
      started: !!this.activePlayerId,
      turns: this.turns
    };
  }

  start() {
    if (this.activePlayerId) return Promise.reject(new Error('Game has already been started'));
    return this.getPlayers()
      .then((players) => {
        if (players.length < 4) return Promise.reject(new Error('Not enough players'));
        if (players.some((p) => !p.role || !p.team)) return Promise.reject(new Error('All players must have roles and teams'));

        let activePlayer = players.find((player) => {
          return player.team === this.board.startingTeam() &&
            player.role === 'transmitter';
        });
        return this.update({ activePlayerId: activePlayer.id });
      });
  }

  transmit(word, number) {
    return new Promise((resolve, reject) => {
      if (!this.activePlayerId) reject(new Error('Game has not begun'));
      else if (!word || /\s+/.test(word)) reject(new Error('Transmission must be one single word'));
      else if (isNaN(number) || Math.round(number) !== number || number < 1 || number > 8) reject(new Error('Number must be whole number greater than zero'));
      else if (number > this.board.teamTiles()[this.board.startingTeam()].filter((t) => !t.revealed).length) reject(new Error('Number exceeds remaining tiles for team.'));
      else resolve();
    })
      .then(() => this.getActivePlayer())
      .then((activePlayer) => {
        this.activePlayer = activePlayer;
        const turn = {
          event: 'transmission',
          number: number,
          playerId: activePlayer.id,
          word: word
        };
        return this.update({ turns: [...this.turns, turn] });
      })
      .then(() => this.nextTurn());
  }

  static createForUser(user) {
    let game;

    return sequelizeInstance.transaction((transaction) => {
      return this.create({}, { transaction })
        .then((g) => {
          game = g;
          return game.createPlayer({ gameId: game.id, userId: user.id }, { transaction });
        })
        .then((p) => {
          p.user = user;
          game.players = [p];
          return game;
        });
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
    defaultValue: () => new GameBoard().tiles,
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
  },
  deletedAt: {
    field: 'deleted_at',
    type: Sequelize.DATE,
    notNull: false
  }
}, {
  defaultScope: {
    where: { deletedAt: null }
  },
  sequelize: sequelizeInstance,
  scopes: {
    deleted: {
      where: {
        $not: { deletedAt: null }
      }
    }
  },
  tableName: 'games',
  underscored: true
});

module.exports = Game;
