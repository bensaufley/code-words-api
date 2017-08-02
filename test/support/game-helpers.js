'use strict';

let User = require('../../models/user'),
    Player = require('../../models/player'),
    Game = require('../../models/game');

module.exports = {
  activePlayer: (players, game) => {
    return players.find((p) => p.id === game.activePlayerId);
  },
  prepareGame: (attrs = {}) => {
    let aTransmitterUser, aDecoderUser, bTransmitterUser, bDecoderUser, aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer, game;
    return Promise.all([
      User.create({ username: 'transmitter-a', password: 'password' }),
      User.create({ username: 'decoder-a', password: 'password' }),
      User.create({ username: 'transmitter-b', password: 'password' }),
      User.create({ username: 'decoder-b', password: 'password' })
    ])
    .then((responses) => {
      [aTransmitterUser, aDecoderUser, bTransmitterUser, bDecoderUser] = responses;
      return Game.create(attrs);
    })
    .then((g) => {
      game = g;
      return Promise.all([
        Player.create({ userId: aTransmitterUser.id, gameId: game.id, team: 'a', role: 'transmitter' }),
        Player.create({ userId: aDecoderUser.id, gameId: game.id, team: 'a', role: 'decoder' }),
        Player.create({ userId: bTransmitterUser.id, gameId: game.id, team: 'b', role: 'transmitter' }),
        Player.create({ userId: bDecoderUser.id, gameId: game.id, team: 'b', role: 'decoder' })
      ]);
    })
    .then((responses) => {
      [aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer] = responses;
      return { aTransmitterUser, aDecoderUser, bTransmitterUser, bDecoderUser, aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer, game };
    });
  }
};
