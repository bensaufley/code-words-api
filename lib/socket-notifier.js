'use strict';

let config = require('../config');

module.exports = class SocketNotifier {
  constructor(userId) {
    if (!userId) throw new Error('No User ID passed');

    this.userId = userId;
  }

  event(genericEvent) {
    let ws = config.sockets[this.userId];
    if (!ws) return;

    ws.send(genericEvent);
  }
};
