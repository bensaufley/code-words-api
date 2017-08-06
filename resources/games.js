'use strict';

const ErrorHandler = require('../lib/error-handler'),
      { SocketNotifier, GAME_UPDATED } = require('../lib/sockets/socket-notifier'),
      Game = require('../models/game'),
      GameSerializer = require('../lib/game-serializer');


const _notifyPlayersAndRespond = (res, user) => {
  return (game) => {
    let userPlayer = game.players.find((p) => p.userId === user.id),
        otherPlayers = game.players.filter((p) => p.userId !== user.id);
    userPlayer.game = game;

    return Promise.all([
      GameSerializer.serializeGameForPlayer(userPlayer).then((data) => res.status(200).json(data)),
      ...otherPlayers.map((player) => {
        player.game = game;
        return GameSerializer.serializeGameForPlayer(player)
          .then((data) => { new SocketNotifier(player.userId).event(GAME_UPDATED, data); });
      })
    ]);
  };
};

const _playTurn = (role, turnFunc) => {
  return _requireGame((req, res) => {
    let { user, query: { id } } = req;

    if (!req.body) return new ErrorHandler(req, res).promise(new Error('No data passed'));

    return Game.findOne({ where: { id }, include: [Game.Players] })
      .then((game) => {
        let player = game.players.find((p) => p.userId === user.id && p.role === role);
        if (!player) throw new Error(`User is not ${role} in this game`);
        if (game.activePlayerId && player.id !== game.activePlayerId) throw new Error(`It is not ${user.username}'s turn`);
        else return game;
      })
      .then(turnFunc(req))
      .then(_notifyPlayersAndRespond(res, user))
      .catch(new ErrorHandler(req, res).process);
  });
};

const _requireGame = (func) => {
  return (req, res) => {
    let user = req.user,
        gameId = req.query && req.query.id;

    if (!gameId) return Promise.reject(new Error('No game id specified')).catch(new ErrorHandler(req, res).process);
    if (!user) return Promise.reject(new Error('No user defined')).catch(new ErrorHandler(req, res).process);

    return func(req, res);
  };
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

const show = _requireGame((req, res) => {
  let { user, query: { id } } = req;

  return new GameSerializer(user)
    .serializeGame(id)
    .then((data) => {
      res.status(200).json(data);
    })
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
  transmit,
  decode,
  destroy
};
