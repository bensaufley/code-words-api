'use strict';

const jwt = require('jsonwebtoken'),
      config = require('../config'),
      Auth = require('../lib/auth'),
      User = require('../models/user');

const getToken = (req) => {
  if (!req) return null;
  if (req.body && req.body.access_token) return req.body.access_token;
  if (req.query && req.query.access_token) return req.query.access_token;
  if (req.get('Authorization')) return req.get('Authorization').replace(/^Bearer /, '');
  return null;
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
