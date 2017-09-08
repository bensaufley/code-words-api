const passport = require('passport'),
      jwtStrategy = require('./strategies/jwt-strategy'),
      localStrategy = require('./strategies/local-strategy'),
      facebookTokenStrategy = require('./strategies/facebook-token-strategy');

passport.use(jwtStrategy);
passport.use(localStrategy);
passport.use(facebookTokenStrategy);

module.exports = passport;
