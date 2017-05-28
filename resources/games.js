'use strict';

const config = require('../config'),
      sequelizeInstance = config.sequelizeInstance,
      ErrorHandler = require('../lib/error-handler'),
      Player = require('../models/player'),
      Game = require('../models/game'),
      SocketNotifier = require('../lib/socket-notifier');

const index = (req, res) => {
  let user = req.user;

  Player.findAll({ where: { userId: user.id }, include: [Player.Game] })
    .then((players) => {
      const games = players.map((player) => player.game.serializeFor(player));

      res.status(200).json({ games });
    })
    .catch(new ErrorHandler(req, res).process);
};

const create = (req, res) => {
  let game, player,
      user = req.user;

  sequelizeInstance.transaction((transaction) => {
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
    new SocketNotifier(user.id).newGame(game);
    res.status(200).json(game.serializeFor(player));
  })
  .catch(new ErrorHandler(req, res).process);
};

const show = (req, res) => {

};

const destroy = (req, res) => {

};

module.exports = {
  index,
  create,
  show,
  destroy
};
