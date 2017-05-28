'use strict';

const express = require('express'),
      router = express.Router();

const Auth = require('./lib/auth'),
      Games = require('./resources/games');

/* Unauthenticated routes */
router.post('/login', (req, res) => { new Auth(req, res).login(); });
router.post('/signup', (req, res) => { new Auth(req, res).signup(); });

/* Authenticated routes */
/* api/v1: none yet */
router.get('/api/v1/games', Games.index);
router.post('/api/v1/games', Games.create);
router.get('/api/v1/game/:id', Games.show);
router.delete('/api/v1/game/:id', Games.destroy);

module.exports = router;
