'use strict';

// const helper = require('../test-helper'),
//       expect = helper.expect,
//       Game = require('../../models/game'),
//       User = require('../../models/user'),
//       Player = require('../../models/player');

describe('Player', () => {
  describe('validation', () => {
    it('requires userId');
    it('requires gameId');
    it('does not allow a user in a game more than once');
    it('does not allow users with the same team/role');
    it('allows multiple users with same team and null role');
    it('allows multiple users with null team and same role');
  });
});
