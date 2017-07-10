'use strict';

let config = require('../../config'),
    WebSocket = require('ws');

const GAMES_INDEX = 'GAMES_INDEX',
      GAME_UPDATE = 'GAME_UPDATE';

class SocketNotifier {
  constructor(userId) {
    if (!userId) throw new Error('No User ID passed');

    this.userId = userId;
  }

  event(event, payload) {
    let ws = config.sockets[this.userId];
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({ event, payload }));
  }
}

module.exports = {
  GAMES_INDEX,
  GAME_UPDATE,
  SocketNotifier
};
