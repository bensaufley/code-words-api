'use strict';

const FacebookTokenStrategy = require('passport-facebook-token'),
      { v4: UUIDv4 } = require('node-uuid'),
      User = require('../../models/user');

module.exports = new FacebookTokenStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  passReqToCallback: true,
  accessTokenField: 'facebook_token'
}, (req, accessToken, refreshToken, profile, done) => {
  return (
    req.user
      ? req.user.update({ facebookId: profile.id })
      : User.findOrCreate({
        where: {
          facebookId: profile.id
        },
        defaults: {
          username: `fbu.${profile.id}`,
          password: UUIDv4()
        }
      }).then(([u]) => u)
  )
    .then((user) => { done(null, user); })
    .catch(done);
});
