'use strict';

const jwt = require('jsonwebtoken'),
      User = require('../models/user'),
      config = require('../config');

const STATUSES = {
  400: 'Token Expired',
  401: 'Invalid Credentials',
  403: 'Not Authorized',
  500: 'Server Error'
};

/**
 * @class Auth
 *
 * Authentication class for server middleware
 *
 * @constructor
 * @param {Object} req - Request object from Express
 * @param {Object} res - Response object from Express
 */
module.exports = class Auth {
  constructor(req, res) {
    this.req = req;
    this.res = res;

    ['login', 'reject', 'signup']
      .forEach((name) => { this[name] = this[name].bind(this); });
  }

  /**
   * @async
   * @method login
   *
   * Main authentication method. Retrieves username/password from request,
   * tries lookup, returns token or error
   *
   * @param {User} [user] - user to log in
   */
  login(user) {
    let username, password;
    if (!user) ({ username, password } = this.req.body);

    let loggedInUser = user;

    return (user ? Promise.resolve(user) : User.login(username, password))
      .then((u) => loggedInUser = u)
      .then(this._generateToken)
      .then((token) => { this.res.status(200).json({ token, user: loggedInUser.serialize() }); })
      .catch(this.reject);
  }

  /**
   * @method reject
   *
   * Rejects request as unauthorized. Logs error.
   *
   * @param {Error} error - The error that caused the rejection
   * @param {Number} code - error code to return
   */
  reject(error, code = 401, message) {
    try {
      if (!STATUSES[code]) throw new Error(`Invalid Status: ${code}`);
      error = error || new Error();
      config.log(error.message, error.stack);
      this.res.status(code).json({ status: code, message: message || STATUSES[code] });
    } catch (e) {
      this.reject(e, 500);
    }
  }

  /**
   * @method signup
   *
   * Create new user and log him or her in. Username/Password inferred
   * from request.body
   */

  signup() {
    return User.create({ username: this.req.body.username, password: this.req.body.password })
      .then(this.login)
      .catch((err) => {
        switch (err.name) {
          case 'SequelizeValidationError': this.reject(err, 400, 'Invalid User Information'); break;
          default: this.reject(err, 500);
        }
      });
  }

  /**
   * @private
   * @method _generateToken
   *
   * @param {Object} user - user for whom to generate a new token
   *
   * @returns {Object} - with token, expiration timestamp, and user object
   */
  _generateToken(user) {
    return new Promise((resolve, reject) => {
      jwt.sign({
        userId: user.id
      }, config.secret, {
        expiresIn: '7 days'
      }, (err, token) => {
        if (err) return reject(err);
        resolve(token);
      });
    });
  }
};
