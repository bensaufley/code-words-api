'use strict';

const { ErrorHandler, NotFoundError } = require('../lib/error-handler'),
      { notifyPlayersAndRespond, requireGame } = require('../lib/response-helpers'),
      Game = require('../models/game'),
      Player = require('../models/player'),
      GameSerializer = require('../lib/game-serializer');

const _playTurn = (role, requiredBodyParams = [], turnFunc) => {
  return requireGame((req, res) => {
    let { user, params: { gameId } } = req;

    const turnFuncParams = requiredBodyParams.reduce((obj, key) => {
            obj[key] = req.body && req.body[key];
            return obj;
          }, {}),
          missingValues = Object.keys(turnFuncParams).filter((k) => turnFuncParams[k] === undefined);

    if (missingValues.length) {
      const err = new Error(`Missing param${missingValues.length > 1 ? 's' : ''}: ${missingValues.join(', ')}`);
      return new ErrorHandler(req, res).promise(err);
    }

    return Game.findOne({ where: { id: gameId }, include: [{ association: Game.Players, include: [Player.User] }] })
      .then((game) => {
        let player = game.players.find((p) => p.userId === user.id && p.role === role);
        if (!player) throw new Error(`User is not ${role} in this game`);
        if (game.activePlayerId && player.id !== game.activePlayerId) throw new Error(`It is not ${user.username}'s turn`);
        else return game;
      })
      .then(turnFunc(turnFuncParams))
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

const transmit = _playTurn('transmitter', ['word', 'number'], ({ word, number }) => (game) => game.transmit(word, number));

const decode = _playTurn('decoder', ['tile'], ({ tile }) => (game) => game.decode(tile));

const endTurn = _playTurn('decoder', undefined, () => (game) => game.nextTurn());

const rematch = requireGame((req, res) => {
  let { user, params: { gameId } } = req;

  return Player.findOne({
    where: { gameId, userId: user.id },
    include: [{
      association: Player.Game,
      include: [Game.Players]
    }]
  })
    .then((player) => {
      if (!player || !player.game) throw new NotFoundError('No game found with that id');
      return player.game.rematch();
    })
    .then(notifyPlayersAndRespond(res, user))
    .catch(new ErrorHandler(req, res).process);
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
  endTurn,
  rematch,
  destroy
};
