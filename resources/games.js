'use strict';

const config = require('../config'),
      sequelizeInstance = config.sequelize,
      ErrorHandler = require('../lib/error-handler'),
      Player = require('../models/player'),
      Game = require('../models/game'),
      SocketNotifier = require('../lib/socket-notifier');

const index = (req, res) => {
  let user = req.user;

  return Player.findAll({
    where: {
      userId: user.id
    },
    include: [{
      association: Player.Game,
      include: [Game.Players, Game.Users]
    }]
  })
    .then((players) => {
      const games = players.map((player) => {
        return {
          game: player.game.serializeFor(player),
          players: player.game.players.map((p) => p.serialize()),
          users: player.game.users.map((u) => u.serialize())
        };
      });

      res.status(200).json({ games });
    })
    .catch(new ErrorHandler(req, res).process);
};

const create = (req, res) => {
  let game, player,
      user = req.user;

  return sequelizeInstance.transaction((transaction) => {
    if (!user) return Promise.reject(new Error('No user defined'));
    return Game.create({}, { transaction })
      .then((g) => {
        game = g;
        return Player.create({
          userId: user.id,
          gameId: game.id
        }, { transaction });
      })
      .then((p) => { player = p; });
  }).then(() => {
    res.status(200).json({
      game: game.serializeFor(player),
      players: [player.serialize()],
      users: [user.serialize()]
    });
  })
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
      if (!player.game) return Promise.reject(new Error('No game found'));

      res.status(200).json({
        game: player.game.serializeFor(player),
        players: player.game.players.map((p) => p.serialize()),
        users: player.game.users.map((u) => u.serialize())
      });
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
    .then((game) => {
      return game.delete();
    })
    .then((game) => {
      res.status(200);
    });
};

module.exports = {
  index,
  create,
  show,
  destroy
};
