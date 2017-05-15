'use strict';

const express = require('express'),
      router = express.Router();

const Auth = require('../lib/auth.js'),
      User = require('../models/user.js');

/* Unauthenticated routes */
router.post('/login', (req, res) => new Auth(req, res).login());
router.post('/signup', (req, res) => {
  const auth = new Auth(req, res);
  User.create({ username: req.body.username, password: req.body.password })
    .then(auth.login)
    .catch(auth.reject);
})

/* Authenticated routes */
/* api/v1: none yet */

module.exports = router;
