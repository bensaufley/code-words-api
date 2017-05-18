'use strict';

const express = require('express'),
      router = express.Router();

const Auth = require('./lib/auth.js');
      //User = require('./models/user.js');

/* Unauthenticated routes */
router.post('/login', (req, res) => { new Auth(req, res).login(); });
router.post('/signup', (req, res) => { new Auth(req, res).signup(); });

/* Authenticated routes */
/* api/v1: none yet */

module.exports = router;
