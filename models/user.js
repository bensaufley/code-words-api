'use strict';

const Sequelize = require('sequelize'),
      bcrypt = require('bcrypt-nodejs'),
      config = require('../config'),
      sequelizeInstance = config.sequelize;

const setSecurePassword = (user, options) => {
  if (!user.password) return Promise.resolve(options);

  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      // istanbul ignore if
      if (err) reject(err);
      else resolve(salt);
    });
  }).then((salt) => {
    return new Promise((resolve, reject) => {
      bcrypt.hash(user.get('password'), salt, null, (err, hash) => {
        // istanbul ignore if
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
        // istanbul ignore if
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
  facebookId: {
    field: 'facebook_id',
    type: Sequelize.STRING,
    defaultValue: null,
    allowNull: true
  },
  username: {
    type: Sequelize.STRING(24),
    allowNull: false,
    set: function (val) {
      this.setDataValue('username', val.toLowerCase().trim());
    },
    validate: {
      is: {
        args: [/^[a-z][a-z\d\-.]*[a-z\d]$/i],
        msg: 'must be composed of letters, numbers, dashes, and periods, begin with a letter, and end with a letter or number'
      },
      len: {
        args: [6, 24],
        msg: 'must be six to twenty-four characters in length'
      },
      notEmpty: { msg: 'is required' }
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
    allowNull: true,
    validate: {
      len: {
        args: [7, 50],
        msg: 'must be seven to fifty characters in length'
      }
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
