'use strict';

const jwt = require('jsonwebtoken'),
      config = require('../config'),
      Auth = require('../lib/auth'),
      User = require('../models/user');

module.exports = (req, res, next) => {
  const token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'],
        auth = new Auth(req, res);

  if (!token) return auth.reject(null, 401);

  new Promise((resolve, reject) => {
    jwt.verify(token, config.secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') reject(err, 400);
        else reject(err);
      } else {
        resolve(decoded);
      }
    })
  }).then(({ userId }) => {
    return User.find(userId);
  }).then((user) => {
    req.user = user;
    next();
  }).catch(auth.reject);
};
