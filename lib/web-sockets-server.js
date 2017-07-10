'use strict';
const config = require('../config'),
      { Server: WebSocketServer } = require('ws'),
      verifyClient = require('./sockets/verify-client'),
      MessageHandler = require('./sockets/message-handler'),
      ErrorHandler = require('./error-handler'),
      { GAMES_INDEX, SocketNotifier } = require('./sockets/socket-notifier');

module.exports.v1 = function(server) {
  const wss = new WebSocketServer({ verifyClient, server, path: '/api/v1/' });

  wss.on('connection', (ws, req) => {
    let user = req.user,
        messageHandler = new MessageHandler(ws, user);
    config.log(`${user.username} connected at`, new Date());

    user.indexGames()
      .then((games) => { new SocketNotifier(user.id).event(GAMES_INDEX, { games }); })
      .catch((err) => { new ErrorHandler(req).process(err); });

    ws.on('message', (data) => { messageHandler.handle(data).catch((err) => new ErrorHandler(req, null).process(err)); });
    ws.on('close', () => { delete config.sockets[user.id]; });

    config.sockets[user.id] = ws;
  });
};
