'use strict';

const Sequelize = require('sequelize'),
      config = require('../config'),
      sequelizeInstance = config.sequelize,
      Game = require('./game'),
      User = require('./user');

class Player extends Sequelize.Model {
  serialize() {
    if (!this.user) throw new Error('No user data associated with Player object');

    return {
      id: this.id,
      gameId: this.gameId,
      role: this.role,
      team: this.team,
      user: this.user.serialize()
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

Game.Players = Game.hasMany(Player, { as: 'players', foreignKey: 'gameId' });
Player.Game = Player.belongsTo(Game, { as: 'game', foreignKey: 'gameId' });
Game.Players.User = Player.User = Player.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Game.Users = Game.belongsToMany(User, { through: Player, as: 'users' });
User.Players = User.hasMany(Player, { as: 'players', foreignKey: 'userId' });
User.Games = User.belongsToMany(Game, { through: Player, as: 'games' });
Game.ActivePlayer = Game.belongsTo(Player, { as: 'activePlayer', foreignKey: 'activePlayerId', constraints: false });

module.exports = Player;
