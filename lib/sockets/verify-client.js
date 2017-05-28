'use strict';

const config = require('../../config'),
      url = require('url'),
      jwt = require('jsonwebtoken'),
      User = require('../../models/user');

module.exports = (info, done) => {
  config.log('Parsing authorization from query string…');
  try {
    const location = url.parse(info.req.url, true),
          token = location.query.access_token;
    if (!token) throw new Error('No Token');
    let payload = jwt.verify(token, config.secret);
    User.findOne({ where: { id: payload.userId } })
      .then((user) => {
        if (!user) return Promise.reject(new Error('No Matching User'));
        info.req.user = user;
        done(true);
      })
      .catch((err) => { done(false, 401, err.message); });
  } catch (e) {
    config.log(e.message, e.stack);
    return done(false, 403, 'Not Authorized');
  }
};
