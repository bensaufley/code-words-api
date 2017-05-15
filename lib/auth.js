'use strict';

const jwt = require('jsonwebtoken'),
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
  }

  /**
   * @async
   * @method getUser
   *
   * Look up user by username/password
   *
   * @param {String} username
   * @param {String} password
   */
  getUser(username, password) {
    if (username === '' || password === '') return Promise.reject(new Error('Username or Password cannot be empty'));
    return Promise.new((resolve, reject) => {
      return {
        name: 'ben',
        username: 'bnsfly',
        email: 'contact@bensaufley.com'
      };
    });
  }

  /**
   * @async
   * @method login
   *
   * Main authentication method. Retrieves username/password from request,
   * tries lookup, returns token or error
   */
  login() {
    const username = req.body.username || '',
          password = req.body.password || '';

    return this.getUser(username, password)
      .then((user) => { this.res.status(200).json(this._generateToken(user)); })
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
  reject(error, code = 401) {
    try {
      if (!STATUSES[code]) throw new Error('Invalid Status');
      error = error || new Error();
      config.log(error.message, error.stack);
      this.res.status(code).json({ status: code, message: STATUSES[code] });
    } catch (e) {
      this.reject(e, 500);
    }
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
    var token = jwt.sign({
      exp: expires,
      userId: user.id
    }, config.secret, {
      expiresIn: '7 days'
    });

    return {
      token: token,
      user: user
    };
  }
};
