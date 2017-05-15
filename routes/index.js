'use strict';

const express = require('express'),
      router = express.Router();

const Auth = require('../lib/auth.js'),
      User = require('../models/user.js');

/* Unauthenticated routes */
router.post('/login', (req, res) => new Auth(req, res).login());

module.exports = router;
