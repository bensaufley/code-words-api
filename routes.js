'use strict';

const express = require('express'),
      router = express.Router();

const Auth = require('./lib/auth'),
      Games = require('./resources/games'),
      Players = require('./resources/players');

/* Unauthenticated routes */
router.post('/login', (req, res) => { new Auth(req, res).login(); });
router.post('/signup', (req, res) => { new Auth(req, res).signup(); });

/* Authenticated routes */
router.get('/api/v1/games', Games.index);
router.post('/api/v1/games', Games.create);
router.get('/api/v1/game/:gameId', Games.show);
router.post('/api/v1/game/:gameId/start', Games.start);
router.put('/api/v1/game/:gameId/transmit', Games.transmit);
router.put('/api/v1/game/:gameId/decode', Games.decode);
router.delete('/api/v1/game/:gameId', Games.destroy);

router.post('/api/v1/game/:gameId/players', Players.create);
router.put('/api/v1/game/:gameId/player/:playerId', Players.update);
router.delete('/api/v1/game/:gameId/player/:playerId', Players.destroy);

module.exports = router;
