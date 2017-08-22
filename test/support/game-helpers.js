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
        game.players = responses;
        aTransmitterPlayer.user = aTransmitterUser;
        bTransmitterPlayer.user = bTransmitterUser;
        aDecoderPlayer.user = aDecoderUser;
        bDecoderPlayer.user = bDecoderUser;
        return { aTransmitterUser, aDecoderUser, bTransmitterUser, bDecoderUser, aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer, game };
      });
  },
  completeGame: (game) => {
    const turns = [],
          transmitters = game.players.filter((p) => p.role === 'transmitter').reduce((obj, p) => ({ ...obj, [p.team]: p }), {}),
          decoders = game.players.filter((p) => p.role === 'decoder').reduce((obj, p) => ({ ...obj, [p.team]: p }), {}),
          tiles = game.getDataValue('board'),
          tilesLeft = () => (
            tiles.some((t) => t.type === 'a' && !t.revealed) &&
            tiles.some((t) => t.type === 'b' && !t.revealed) &&
            tiles.some((t) => t.type === 'x' && !t.revealed)
          ),
          findTileIndex = (team) => tiles.findIndex((t) => t.type === team && !t.revealed),
          findAnyOtherTileIndex = (team) => tiles.findIndex((t) => t.type !== team && !t.revealed);

    let activePlayer,
        activeTeam = game.board.startingTeam();

    while (tilesLeft()) {
      activePlayer = transmitters[activeTeam];
      turns.push({ timestamp: new Date().getTime(), playerId: activePlayer.id, event: 'transmission' });

      for (let i = Math.floor(Math.random() * 3); i--;) {
        const tile = findTileIndex(activeTeam);
        activePlayer = decoders[activeTeam];
        tiles[tile].revealed = true;
        turns.push({ timestamp: new Date().getTime(), playerId: activePlayer.id, tile, event: 'decoding' });
        if (!tilesLeft()) break;
      }
      if (!tilesLeft()) break;

      const tile = findAnyOtherTileIndex(activeTeam);
      tiles[tile].revealed = true;
      turns.push({ timestamp: new Date().getTime(), playerId: activePlayer.id, tile, event: 'decoding' });
      activeTeam = activeTeam === 'a' ? 'b' : 'a';
    }

    const lastTurn = turns[turns.length - 1],
          wonOrLost = tiles[lastTurn.tile].type === 'x' ? 'lost' : 'won',
          otherTeam = activeTeam === 'a' ? 'b' : 'a',
          winner = wonOrLost === 'lost' ? activeTeam : otherTeam;
    turns.push({ timestamp: new Date().getTime(), event: 'end', winner });

    return game.update({ turns, board: tiles, activePlayerId: activePlayer.id });
  }
};
