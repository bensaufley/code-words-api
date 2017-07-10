'use strict';

const ErrorHandler = require('../lib/error-handler'),
      Player = require('../models/player'),
      Game = require('../models/game'),
      GameSerializer = require('../lib/game-serializer');

const index = (req, res) => {
  let user = req.user;

  return new GameSerializer(user).serializeGames()
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

    new GameSerializer(user).serializeGame(gameId).then(resolve).catch(reject);
  }).then((data) => {
    res.status(200).json(data);
  }).catch(new ErrorHandler(req, res).process);
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
