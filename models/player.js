'use strict';

const Sequelize = require('sequelize'),
      config = require('../config'),
      sequelizeInstance = config.sequelize,
      Game = require('./game'),
      User = require('./user');

class Player extends Sequelize.Model {
  serialize() {
    return {
      id: this.id,
      userId: this.userId,
      gameId: this.gameId,
      role: this.role,
      team: this.team
    };
  }
}

Player.init({
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  userId: {
    field: 'user_id',
    type: Sequelize.UUID,
    references: {
      model: User,
      key: 'id'
    },
    unique: 'userGameIndex',
    allowNull: false,
    validate: {
      notEmpty: { msg: 'userId cannot be blank' }
    }
  },
  gameId: {
    field: 'game_id',
    type: Sequelize.UUID,
    references: {
      model: Game,
      key: 'id'
    },
    unique: ['userGameIndex', 'gameTeamRoleIndex'],
    allowNull: false,
    validate: {
      notEmpty: { msg: 'gameId cannot be blank' }
    }
  },
  team: {
    type: Sequelize.ENUM('a', 'b'),
    unique: 'gameTeamRoleIndex',
    allowNull: true
  },
  role: {
    type: Sequelize.ENUM('transmitter', 'decoder'),
    unique: 'gameTeamRoleIndex',
    allowNull: true
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
  tableName: 'players',
  underscored: true
});

User.prototype.indexGames = function () {
  return Player.findAll({
    where: {
      userId: this.id
    },
    include: [{
      association: Player.Game,
      include: [Game.Players, Game.Users]
    }]
  })
    .then((players) => {
      return players.map((player) => {
        return {
          game: player.game.serializeFor(player),
          players: player.game.players.map((p) => p.serialize()),
          users: player.game.users.map((u) => u.serialize())
        };
      });
    });
};

User.prototype.newGame = function () {
  let game, player;

  return sequelizeInstance.transaction((transaction) => {
    return Game.create({}, { transaction })
      .then((g) => {
        game = g;
        return Player.create({
          userId: this.id,
          gameId: game.id
        }, { transaction });
      })
      .then((p) => { player = p; });
  }).then(() => {
    return {
      game: game.serializeFor(player),
      players: [player.serialize()],
      users: [this.serialize()]
    };
  });
};

Player.Game = Player.belongsTo(Game, { as: 'game' });
Player.User = Player.belongsTo(User, { as: 'user' });
Game.Players = Game.hasMany(Player, { as: 'players' });
Game.Users = Game.belongsToMany(User, { through: Player, as: 'users' });
User.Players = User.hasMany(Player, { as: 'players' });
User.Games = User.belongsToMany(Game, { through: Player, as: 'games' });
Game.ActivePlayer = Game.belongsTo(Player, { as: 'activePlayer', foreignKey: 'activePlayerId', constraints: false });

module.exports = Player;
