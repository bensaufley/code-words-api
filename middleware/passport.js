const passport = require('passport'),
      jwtStrategy = require('./strategies/jwt-strategy'),
      localStrategy = require('./strategies/local-strategy');

passport.use(jwtStrategy);
passport.use(localStrategy);

module.exports = passport;
