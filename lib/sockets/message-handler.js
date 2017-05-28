'use strict';

const config = require('../../config');

module.exports = class MessageHandler {
  constructor(ws, user) {
    this.ws = ws;
    this.user = user;
  }

  handle(data) {
    data = JSON.parse(data);

    switch (data.event) {
      case 'transmit':
        break;
      case 'decode':
        break;
      default:
    }
  }
};
