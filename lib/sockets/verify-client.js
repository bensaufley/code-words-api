'use strict';

const passport = require('../../middleware/passport'),
      { ErrorHandler } = require('../error-handler');

module.exports = ({ req }, callback) => {
  const res = { statusCode: 401 };

  passport.authenticate('jwt', (err, user) => {
    if (err) {
      new ErrorHandler(req, null).process(err);
      return callback(false, res.statusCode, err.message);
    }
    if (!user) return callback(false, res.statusCode, 'No Matching User');

    req.user = user;
    callback(true);
  })(req, res);
};
