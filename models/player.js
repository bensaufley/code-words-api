'use strict';

const Sequelize = require('sequelize'),
      config = require('../config'),
      sequelizeInstance = config.sequelize,
      Game = require('./game'),
      User = require('./user');

const Player = sequelizeInstance.define('player', {
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
    validate: {
      notEmpty: true,
      notNull: true
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
    validate: {
      notEmpty: true,
      notNull: true
    }
  },
  team: {
    type: Sequelize.ENUM('a', 'b'),
    unique: 'gameTeamRoleIndex',
    validate: {
      notNull: false
    }
  },
  role: {
    type: Sequelize.ENUM('transmitter', 'receiver'),
    unique: 'gameTeamRoleIndex',
    validate: {
      notNull: false
    }
  }
}, {
  underscored: true
});

Player.Game = Player.belongsTo(Game);
Player.User = Player.belongsTo(User);
Game.Players = Game.hasMany(Player);
User.Players = User.hasMany(Player);

module.exports = Player;
