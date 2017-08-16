'use strict';

const jwt = require('jsonwebtoken'),
      config = require('../config'),
      Auth = require('../lib/auth'),
      User = require('../models/user');

const getToken = (req) => {
  // istanbul ignore if
  if (!req) return null;

  return (req.body && req.body.access_token) ||
    (req.query && req.query.access_token) ||
    (req.get('Authorization') && req.get('Authorization').replace(/^Bearer /, '')) ||
    null;
};

module.exports = (req, res, next) => {
  const token = getToken(req),
        auth = new Auth(req, res);

  return new Promise((resolve, reject) => {
    if (!token) return reject(new Error('No Token'));
    resolve(jwt.verify(token, config.secret));
  }).then(({ userId }) => {
    return User.findById(userId);
  }).then((user) => {
    req.user = user;
    next();
  }).catch((err) => {
    let rejection;
    switch (err.name) {
      case 'TokenExpiredError': rejection = [err, 400]; break;
      default: rejection = [err];
    }
    auth.reject(...rejection);
  });
};
