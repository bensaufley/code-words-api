'use strict';

const { ErrorHandler, NotFoundError } = require('../lib/error-handler'),
      { notifyPlayersAndRespond, requireGame, strongParams} = require('../lib/response-helpers'),
      Game = require('../models/game'),
      User = require('../models/user'),
      Player = require('../models/player');

const _requirePlayer = (func) => {
  return requireGame((req, res) => {
    if (!req.params.playerId) return Promise.reject(new NotFoundError('No playerId provided'));

    return func(req, res);
  });
};

const create = requireGame((req, res) => {
  let game, newPlayerUser,
      { user, params: { gameId }, post: { username} } = req;

  return Promise.all([
    Game.findOne({ where: { id: gameId }, include: [Game.Players] }),
    User.findOne({ where: { username } })
  ])
    .then((records) => {
      [game, newPlayerUser] = records;
      if (!game) return Promise.reject(new NotFoundError('No game found for that id'));
      if (!game.players.find((p) => p.userId === user.id)) return Promise.reject(new Error('User cannot add players to this game'));
      if (!newPlayerUser) return Promise.reject(new NotFoundError('No user found for that username'));
      if (game.players.length === 4) return Promise.reject(new Error('The game is full'));

      return Player.create({ userId: newPlayerUser.id, gameId });
    })
    .then((player) => game.players.push(player))
    .then(() => notifyPlayersAndRespond(res, user)(game))
    .catch(new ErrorHandler(req, res).process);
});

const update = _requirePlayer((req, res) => {
  let game,
      { user, params: { gameId, playerId } } = req;

  return Player.findOne({ where: { id: playerId, gameId }, include: [{ association: Player.Game, include: [Game.Players] }] })
    .then((player) => {
      if (!player) throw new NotFoundError('No player found for that id');
      game = player.game;
      if (game.activePlayerId) throw new Error('A Player cannot be edited after the game has started');
      if (!req.body) throw new Error('No body present');

      const updates = strongParams(req.body, 'role', 'team');

      return player.update(updates);
    })
    .then(() => game.reload({ include: [Game.Players] }))
    .then(() => notifyPlayersAndRespond(res, user)(game))
    .catch(new ErrorHandler(req, res).process);
});

const destroy = _requirePlayer((req, res) => {
  let game,
      { user, params: { gameId, playerId } } = req;

  return Player.findOne({ where: { id: playerId, gameId }, include: [Player.Game] })
    .then((player) => {
      if (!player) throw new NotFoundError('No player found for that id');
      game = player.game;
      if (game.activePlayerId) throw new Error('A Player cannot be removed after the game has started');

      return player.destroy();
    })
    .then(() => game.reload({ include: [Game.Players] }))
    .then(() => notifyPlayersAndRespond(res, user)(game))
    .catch(new ErrorHandler(req, res).process);

});

module.exports = {
  create,
  update,
  destroy
};
