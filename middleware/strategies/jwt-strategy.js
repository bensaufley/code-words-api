'use strict';

const {
        Strategy: JwtStrategy,
        ExtractJwt: { fromBodyField, fromUrlQueryParameter, fromAuthHeaderAsBearerToken, fromExtractors }
      } = require('passport-jwt'),
      { secret } = require('../../config'),
      { ErrorHandler } = require('../../lib/error-handler'),
      User = require('../../models/user');

const jwtOptions = {
  jwtFromRequest: fromExtractors([
    fromBodyField('access_token'),
    fromUrlQueryParameter('access_token'),
    fromAuthHeaderAsBearerToken()
  ]),
  secretOrKey: secret
};

module.exports = new JwtStrategy(jwtOptions, ({ userId }, done) => {
  return User.findOne({ where: { id: userId } })
    .then((user) => {
      if (!user) return done(null, false);

      return done(null, user);
    })
    .catch((err) => {
      new ErrorHandler({}).process(err);
      done(err);
    });
});
