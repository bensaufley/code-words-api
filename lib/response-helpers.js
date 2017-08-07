'use strict';

const config = require('../config'),
      { SocketNotifier, GAME_UPDATED } = require('./sockets/socket-notifier'),
      GameSerializer = require('./game-serializer'),
      { ErrorHandler } = require('./error-handler');

const notifyPlayersAndRespond = (res, user) => {
  return (game) => {
    let userPlayer = game.players.find((p) => p.userId === user.id),
        otherPlayers = game.players.filter((p) => p.userId !== user.id);
    if (userPlayer) userPlayer.game = game;

    return Promise.all([
      userPlayer ? GameSerializer.serializeGameForPlayer(userPlayer).then((data) => res.status(200).json(data)) : Promise.resolve(res.status(200)),
      ...otherPlayers.map((player) => {
        player.game = game;
        return GameSerializer.serializeGameForPlayer(player)
          .then((data) => { new SocketNotifier(player.userId).event(GAME_UPDATED, data); });
      })
    ]);
  };
};

const requireGame = (func) => {
  return (req, res) => {
    let user = req.user,
        gameId = req.params && req.params.gameId;

    if (!gameId) return new ErrorHandler(req, res).promise(new Error('No game id specified'));
    if (!user) return new ErrorHandler(req, res).promise(new Error('No user defined'));

    return func(req, res);
  };
};

const strongParams = (obj, ...keys) => {
  let response = {},
      unpermittedParams = Object.keys(obj).filter((k) => keys.indexOf(k) < 0);
  if (unpermittedParams.length) config.log('Warning: Unpermitted params', ...unpermittedParams, new Error().stack);
  keys.forEach((key) => {
    if (obj[key]) response[key] = obj[key];
  });
  return response;
};

module.exports = {
  notifyPlayersAndRespond,
  requireGame,
  strongParams
};
