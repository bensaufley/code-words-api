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
  }
}, {
  underscored: true
});

Player.Game = Player.belongsTo(Game);
Player.User = Player.belongsTo(User);
Game.Players = Game.hasMany(Player);
User.Players = User.hasMany(Player);

module.exports = Player;
