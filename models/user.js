'use strict';

const Sequelize = require('sequelize'),
      bcrypt = require('bcrypt-nodejs'),
      config = require('../config'),
      sequelizeInstance = config.sequelize;

const setSecurePassword = (user, options) => {
  return new Promise((resolve, reject) => {
    user.username = user.username.toLowerCase().trim();
    if (!user.password) return Promise.resolve(options);
    bcrypt.genSalt(10, (err, salt) => {
      if (err) reject(err);
      else resolve(salt);
    });
  }).then((salt) => {
    return new Promise((resolve, reject) => {
      bcrypt.hash(user.get('password'), salt, null, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });
  }).then((hash) => {
    user.set('passwordDigest', hash);
    return options;
  });
};

class User extends Sequelize.Model {
  authenticate (password) {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, this.passwordDigest, (err, result) => {
        if (err) return reject(err);
        else resolve(result);
      });
    })
      .then((result) => result ? this : null);
  }

  serialize() {
    return {
      id: this.id,
      username: this.username
    };
  }

  static login(username, password) {
    if (!username) return Promise.resolve(null);
    return User.findOne({ where: { username: username } })
      .then((user) => user ? user.authenticate(password) : null);
  }
}

User.init({
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  username: {
    type: Sequelize.STRING(50),
    allowNull: false,
    validate: {
      is: ['^[a-z\\d\\-\\.]{6,24}$', 'i'],
      len: [6, 24],
      notEmpty: true
    }
  },
  passwordDigest: {
    field: 'password_digest',
    type: Sequelize.STRING,
    validate: {
      len: [6,24],
      notEmpty: true
    }
  },
  password: {
    type: Sequelize.VIRTUAL,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  }
}, {
  sequelize: sequelizeInstance,
  indexes: [
    { unique: true, fields: ['username'] }
  ],
  tableName: 'users',
  underscored: true
});

User.beforeCreate(setSecurePassword);
User.beforeUpdate(setSecurePassword);

module.exports = User;
