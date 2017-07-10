'use strict';

const ErrorHandler = require('../lib/error-handler'),
      Player = require('../models/player'),
      Game = require('../models/game'),
      GameSerializer = require('../lib/game-serializer');

const index = (req, res) => {
  let user = req.user;

  return GameSerializer.serializeGamesForUser(user)
    .then((games) => { res.status(200).json({ games }); })
    .catch(new ErrorHandler(req, res).process);
};

const create = (req, res) => {
  let user = req.user;

  return new Promise((resolve, reject) => {
    if (!user) return reject(new Error('No user defined'));
    return Game.createForUser(user).then(resolve);
  })
    .then((data) => { res.status(200).json(data); })
    .catch(new ErrorHandler(req, res).process);
};

const show = (req, res) => {
  let user = req.user,
      gameId = req.query && req.query.id;

  return new Promise((resolve, reject) => {
    if (!gameId) return reject(new Error('No game id specified'));
    if (!user) return reject(new Error('No user defined'));

    Player.findOne({
      where: { userId: user.id, gameId: gameId },
      include: [{
        association: Player.Game,
        include: [Game.Players, Game.Users]
      }]
    }).then(resolve).catch(reject);
  })
    .then((player) => {
      if (!player) return Promise.reject(new Error('No player found'));

      return GameSerializer.serializeGameForPlayer(player);
    }).then((data) => {
      res.status(200).json(data);
    })
    .catch(new ErrorHandler(req, res).process);
};

const destroy = (req, res) => {
  let user = req.user,
      gameId = req.query && req.query.id;

  return new Promise((resolve, reject) => {
    if (!gameId) return reject(new Error('No game id specified'));
    if (!user) return reject(new Error('No user defined'));

    return Game.findOne({
      where: { id: gameId },
      include: [Game.Players]
    }).then(resolve).catch(reject);
  })
    .then((game) => { return game.delete(); })
    .then(() => { res.status(200); })
    .catch(new ErrorHandler(req, res).process);
};

module.exports = {
  index,
  create,
  show,
  destroy
};
