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

    ['generateToken', 'reject', 'signup', '_handleCreationError']
      .forEach((name) => { this[name] = this[name].bind(this); });
  }

  /**
   * @async
   * @method generateToken
   *
   * @param {Object} user - user for whom to generate a new token
   *
   * @returns {Object} - with token, expiration timestamp, and user object
   */
  generateToken() {
    return new Promise((resolve, reject) => {
      const { user } = this.req;
      if (!user) throw new Error('Not authenticated');

      jwt.sign({
        userId: user.id
      }, config.secret, {
        expiresIn: '7 days'
      }, (err, token) => {
        if (err) reject(err);
        else resolve(token);
      });
    })
      .then((token) => { this.res.status(200).json({ token, user: this.req.user.serialize() }); })
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
      config.log(error.name, error.message, error.stack);
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
      .then((user) => { this.req.user = user; })
      .then(this.generateToken)
      .catch(this._handleCreationError);
  }

  /**
   * @private
   * @method _handleCreationError
   *
   * @param {Error} err - error that came up in User creation
   */
  _handleCreationError(err) {
    let statusCode, message;
    switch (err.name) {
      case 'SequelizeValidationError':
        statusCode = 400;
        message = `Invalid User Information: ${err.errors.map((err) => `${err.path} ${err.message}`).join('; ')}`;
        break;
      case 'SequelizeDatabaseError':
      case 'SequelizeBaseError':
        statusCode = 400;
        message = 'Invalid User Information';
        break;
      default:
        statusCode = 500;
        message = err.message;
    }
    this.reject(err, statusCode, message);
  }
};
