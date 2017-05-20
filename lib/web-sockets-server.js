'use strict';
const config = require('../config'),
      WebSocket = require('ws'),
      jwt = require('jsonwebtoken'),
      User = require('../models/user'),
      url = require('url');

const verifyClient = (info, done) => {
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

module.exports = function(server) {
  const wss = new WebSocket.Server({ verifyClient, server });

  wss.on('connection', (ws, req) => {
    let user = req.user;
    config.log(`${user.username} connected at`, new Date());
  });
};
