'use strict';

import config from '../config';
import WebSocket from 'ws';
import verifyClient from './sockets/verify-client';
import MessageHandler from './sockets/message-handler';
import ErrorHandler from './error-handler';

export const v1 = function(server) {
  const wss = new WebSocket.Server({ verifyClient, server, path: '/api/v1/' });

  wss.on('connection', (ws, req) => {
    let user = req.user,
        messageHandler = new MessageHandler(ws, user);
    config.log(`${user.username} connected at`, new Date());

    ws.on('message', (data) => { messageHandler.handle(data).catch((err) => new ErrorHandler(req, null).process(err)); });
    ws.on('close', () => { delete config.sockets[user.id]; });

    config.sockets[user.id] = ws;
  });
};
