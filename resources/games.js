'use strict';

const { ErrorHandler } = require('../lib/error-handler'),
      { notifyPlayersAndRespond, requireGame } = require('../lib/response-helpers'),
      Game = require('../models/game'),
      Player = require('../models/player'),
      GameSerializer = require('../lib/game-serializer');

const _playTurn = (role, turnFunc) => {
  return requireGame((req, res) => {
    let { user, params: { gameId } } = req;

    if (!req.body) return new ErrorHandler(req, res).promise(new Error('No data passed'));

    return Game.findOne({ where: { id: gameId }, include: [{ association: Game.Players, include: [Player.User] }] })
      .then((game) => {
        let player = game.players.find((p) => p.userId === user.id && p.role === role);
        if (!player) throw new Error(`User is not ${role} in this game`);
        if (game.activePlayerId && player.id !== game.activePlayerId) throw new Error(`It is not ${user.username}'s turn`);
        else return game;
      })
      .then(turnFunc(req))
      .then(notifyPlayersAndRespond(res, user))
      .catch(new ErrorHandler(req, res).process);
  });
};

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
    .then((game) => GameSerializer.serializeGameForPlayer(game.players[0]))
    .then((data) => { res.status(200).json(data); })
    .catch(new ErrorHandler(req, res).process);
};

const show = requireGame((req, res) => {
  let { user, params: { gameId } } = req;

  return new GameSerializer(user)
    .serializeGame(gameId)
    .then((data) => {
      res.status(200).json(data);
    })
    .catch(new ErrorHandler(req, res).process);
});

const start = requireGame((req, res) => {
  let { user, params: { gameId } } = req;

  return Player.findOne({
    where: { gameId, userId: user.id },
    include: [{
      association: Player.Game,
      include: [{
        association: Game.Players,
        include: [Player.User]
      }]
    }]
  })
    .then((player) => player.game.start())
    .then(notifyPlayersAndRespond(res, user))
    .catch(new ErrorHandler(req, res).process);
});

const transmit = _playTurn('transmitter', (req) => {
  return (game) => {
    let { word, number } = req.body;

    return game.transmit(word, number);
  };
});

const decode = _playTurn('decoder', (req) => {
  return (game) => {
    let { tile } = req.body;

    return game.decode(tile);
  };
});

const destroy = (req, res) => {
  let user = req.user,
      gameId = req.params && req.params.gameId;

  return new Promise((resolve, reject) => {
    if (!gameId) return reject(new Error('No game id specified'));
    if (!user) return reject(new Error('No user defined'));

    return Game.findOne({
      where: { id: gameId },
      include: [Game.Players]
    }).then(resolve).catch(reject);
  })
    .then((game) => { return game.delete(); })
    .then(() => { res.status(200).json({}); })
    .catch(new ErrorHandler(req, res).process);
};

module.exports = {
  index,
  create,
  show,
  start,
  transmit,
  decode,
  destroy
};
