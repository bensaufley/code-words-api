'use strict';

const express = require('express'),
      passport = require('./middleware/passport'),
      router = express.Router();

const Auth = require('./lib/auth'),
      Games = require('./resources/games'),
      Players = require('./resources/players'),
      { ErrorHandler } = require('./lib/error-handler');

const errorFallback = (func) => (req, res) => {
  try {
    return func(req, res);
  } catch (err) {
    return new ErrorHandler(req, res).process(err);
  }
};

const login = errorFallback((req, res) => { new Auth(req, res).generateToken(); }),
      signup = errorFallback((req, res) => { new Auth(req, res).signup(); });

/* Unauthenticated routes */
router.post('/login', passport.authenticate('local', { session: false }), login);
router.post('/signup', signup);

/* Authenticated routes */
router.get('/api/v1/games', errorFallback(Games.index));
router.post('/api/v1/games', errorFallback(Games.create));
router.get('/api/v1/game/:gameId', errorFallback(Games.show));
router.post('/api/v1/game/:gameId/start', errorFallback(Games.start));
router.put('/api/v1/game/:gameId/transmit', errorFallback(Games.transmit));
router.put('/api/v1/game/:gameId/decode', errorFallback(Games.decode));
router.put('/api/v1/game/:gameId/end-turn', errorFallback(Games.endTurn));
router.post('/api/v1/game/:gameId/rematch', errorFallback(Games.rematch));
router.delete('/api/v1/game/:gameId', errorFallback(Games.destroy));

router.post('/api/v1/game/:gameId/players', errorFallback(Players.create));
router.put('/api/v1/game/:gameId/player/:playerId', errorFallback(Players.update));
router.delete('/api/v1/game/:gameId/player/:playerId', errorFallback(Players.destroy));

module.exports = router;
