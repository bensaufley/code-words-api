'use strict';

const config = require('../../config'),
      Game = require('../../models/game');

const EVENTS = ['transmit', 'decode'];

module.exports = class MessageHandler {
  constructor(ws, user) {
    this.ws = ws;
    this.user = user;
  }

  handle(data) {
    try { data = JSON.parse(data); } catch (e) { return Promise.reject(e); }
    if (EVENTS.indexOf(data.event) < 0) return Promise.reject(new Error('Event not present or invalid'));

    let game;

    return Game.findOne({ where: { id: data.gameId }, include: [Game.Players] })
      .then((g) => {
        try {
          if (!g) throw new Error('Game does not exist');
          game = g;

          switch (data.event) {
            case 'transmit': return this.transmit(game, data.clue);
            case 'decode': return this.decode(game, data.tile);
          }
        } catch (e) {
          return Promise.reject(e);
        }
      }).then(() => {
        game.players.forEach((player) => {
          let ws = config.sockets[player.userId];
          if (ws) ws.send(JSON.stringify({ game: game.serializeFor(player) }));
        });
      });
  }

  decode(game, { x, y }) {
    this._checkForPlayer(game, 'decoder');
    return game.makeGuess(x, y);
  }

  transmit(game, { word, number }) {
    this._checkForPlayer(game, 'transmitter');
    return game.giveClue(word, number);
  }

  _checkForPlayer(game, role) {
    let player = game.players.find((p) => p.userId === this.user.id && p.role === role);
    if (!player) throw new Error(`User is not ${role} in this game`);
    else console.log(player.id, player.role);
  }
};
