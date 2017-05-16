'use strict';

const Sequelize = require('sequelize'),
      bcrypt = require('bcrypt'),
      config = require('../config'),
      sequelizeInstance = config.sequelize;

const setSecurePassword = (user, options, callback) => {
  user.username = user.username.toLowerCase().trim();
  if (!user.password) return callback(null, options);
  bcrypt.hash(user.get('password'), 10)
    .then((hash) => {
      user.set('passwordDigest', hash);
      callback(null, options);
    })
    .catch((err) => { callback(err); });
};

const User = sequelizeInstance.define('user', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  username: {
    type: Sequelize.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  passwordDigest: {
    field: 'password_digest',
		type: Sequelize.STRING,
		validate: {
			notEmpty: true
		}
	},
	password: {
		type: Sequelize.VIRTUAL,
		allowNull: false,
		validate: {
			notEmpty: true
		}
	},
}, {
  hooks: {
    beforeCreate: setSecurePassword,
    beforeUpdate: setSecurePassword
  },
  indexes: [
    { unique: true, fields: ['username'] }
  ],
  classMethods: {
    login: function(username, password) {
      if (!username) return Promise.resolve(null);
      return User.findOne({ where: { username: username } })
        .then((user) => user ? user.authenticate(password) : null);
    }
  },
  instanceMethods: {
    authenticate: function (password) {
      return bcrypt.compare(password, this.passwordDigest)
        .then((result) => result ? this : null);
    },
    serialize: function() {
      return {
        id: this.id,
        username: this.username
      };
    }
  },
  underscored: true
});

module.exports = User;
