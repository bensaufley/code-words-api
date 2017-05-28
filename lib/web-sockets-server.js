'use strict';
const config = require('../config'),
      WebSocket = require('ws'),
      jwt = require('jsonwebtoken'),
      url = require('url'),
      User = require('../models/user'),
      verifyClient = require('./sockets/verify-client'),
      MessageHandler = require('./sockets/message-handler');

module.exports.v1 = function(server) {
  const wss = new WebSocket.Server({ verifyClient, server, path: '/api/v1/' });

  wss.on('connection', (ws, req) => {
    let user = req.user,
        messageHandler = new MessageHandler(ws, user);
    config.log(`${user.username} connected at`, new Date());

    ws.on('message', messageHandler.handle);
    ws.on('close', () => { delete config.sockets[user.id]; });

    config.sockets[user.id] = ws;
  });
};
