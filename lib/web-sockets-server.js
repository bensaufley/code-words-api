'use strict';
const config = require('../config'),
      { Server: WebSocketServer } = require('ws'),
      verifyClient = require('./sockets/verify-client'),
      { ErrorHandler } = require('./error-handler'),
      GameSerializer = require('./game-serializer'),
      { GAMES_INDEXED, SocketNotifier } = require('./sockets/socket-notifier');

module.exports.v1 = function(server) {
  const wss = new WebSocketServer({ verifyClient, server, path: '/api/v1/' });

  wss.on('connection', (ws, req) => {
    let user = req.user;
    config.log(`${user.username} connected at`, new Date());

    new GameSerializer(user).serializeGames()
      .then((games) => { new SocketNotifier(user.id).event(GAMES_INDEXED, { games }); })
      .catch((err) => { new ErrorHandler(req).process(err); });

    ws.on('message', config.log);
    ws.on('close', () => { delete config.sockets[user.id]; });

    config.sockets[user.id] = ws;
  });
};
