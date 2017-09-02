'use strict';

const LocalStrategy = require('passport-local'),
      User = require('../../models/user'),
      { ErrorHandler } = require('../../lib/error-handler');

module.exports = new LocalStrategy({}, (username, password, done) => {
  return User.login(username, password)
    .then((user) => {
      if (!user) return done(null, false);

      return done(null, user);
    })
    .catch((err) => {
      new ErrorHandler({}).process(err);
      done(err);
    });
});
