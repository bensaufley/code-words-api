'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      Game = require('../../models/game'),
      User = require('../../models/user'),
      Player = require('../../models/player');

describe('Player', () => {
  describe('validation', () => {
    let user, game;

    beforeEach(() => {
      return Promise.all([
        User.create({ username: 'my-user', password: 'my-password' }).then((u) => { user = u; }),
        Game.create().then((g) => { game = g; })
      ]);
    });

    afterEach(helper.cleanDatabase);

    describe('user association', () => {
      it('does not allow null userId', () => {
        return Player.create({ gameId: game.id })
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeValidationError');
            expect(err.message).to.contain('userId cannot be null');
          });
      });

      it('does not allow blank userId', () => {
        return Player.create({ userId: '', gameId: game.id })
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeValidationError');
            expect(err.message).to.contain('userId cannot be blank');
          });
      });

      it('does not allow invalid uuid as userId', () => {
        return Player.create({ userId: 'fart', gameId: game.id })
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeDatabaseError');
            expect(err.message).to.contain('invalid input syntax for uuid');
          });
      });

      it('does not allow invalid userId', () => {
        return Player.create({ userId: '23ecb3e7-2996-4aba-9aa1-3ab9bf32521c', gameId: game.id })
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeForeignKeyConstraintError');
            expect(err.message).to.contain('violates foreign key constraint "player_user_foreign"');
          });
      });
    });

    describe('game association', () => {
      it('requires gameId', () => {
        return Player.create({ userId: user.id })
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeValidationError');
            expect(err.message).to.contain('gameId cannot be null');
          });
      });

      it('does not allow blank userId', () => {
        return Player.create({ gameId: '', userId: user.id })
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeValidationError');
            expect(err.message).to.contain('gameId cannot be blank');
          });
      });

      it('does not allow invalid uuid as userId', () => {
        return Player.create({ gameId: 'fart', userId: user.id })
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeDatabaseError');
            expect(err.message).to.contain('invalid input syntax for uuid');
          });
      });

      it('does not allow invalid userId', () => {
        return Player.create({ gameId: '23ecb3e7-2996-4aba-9aa1-3ab9bf32521c', userId: user.id })
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeForeignKeyConstraintError');
            expect(err.message).to.contain('violates foreign key constraint "player_game_foreign"');
          });
      });
    });

    describe('uniqueness', () => {
      it('allows the same user in different games', () => {
        return Game.create()
          .then((gm) => {
            return Promise.all([
              Player.create({ userId: user.id, gameId: game.id }),
              Player.create({ userId: user.id, gameId: gm.id })
            ]);
          })
          .then(([p1, p2]) => {
            expect(p1).to.be.an.instanceOf(Player);
            expect(p2).to.be.an.instanceOf(Player);

            return Player.count();
          })
          .then((count) => {
            expect(count).to.eq(2);
          });
      });

      it('does not allow a user in a game more than once', () => {
        let params = { userId: user.id, gameId: game.id };
        return Player.create(params)
          .then(() => Player.create(params))
          .then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          })
          .catch((err) => {
            expect(err.name).to.eq('SequelizeUniqueConstraintError');
            expect(err.parent.message).to.contain('violates unique constraint "player_game_user_index"');
          });
      });

      it('does not allow users with the same team/role', () => {
        let u2;
        return User.create({ username: 'another-user', password: 'another-pass' })
          .then((u) => {
            u2 = u;
            return Promise.all([
              Player.create({ userId: user.id, gameId: game.id, team: 'a', role: 'transmitter' }),
              Player.create({ userId: u2.id, gameId: game.id, team: 'a', role: 'transmitter' })
            ]);
          }).then(() => {
            return Promise.reject(new Error('Should not have been accepted'));
          }).catch((err) => {
            expect(err.name).to.eq('SequelizeUniqueConstraintError');
            expect(err.parent.message).to.contain('violates unique constraint "player_game_team_role_index"');
          });
      });

      it('allows multiple players with same team and null role', () => {
        let u2;
        return User.create({ username: 'another-user', password: 'another-pass' })
          .then((u) => {
            u2 = u;
            return Promise.all([
              Player.create({ userId: user.id, gameId: game.id, team: 'a' }),
              Player.create({ userId: u2.id, gameId: game.id, team: 'a' })
            ]);
          }).then(([p1, p2]) => {
            expect(p1).to.be.an.instanceOf(Player);
            expect(p2).to.be.an.instanceOf(Player);
          });
      });

      it('allows multiple players with null team and same role', () => {
        let u2;
        return User.create({ username: 'another-user', password: 'another-pass' })
          .then((u) => {
            u2 = u;
            return Promise.all([
              Player.create({ userId: user.id, gameId: game.id, role: 'decoder' }),
              Player.create({ userId: u2.id, gameId: game.id, role: 'decoder' })
            ]);
          }).then(([p1, p2]) => {
            expect(p1).to.be.an.instanceOf(Player);
            expect(p2).to.be.an.instanceOf(Player);
          });
      });
    });
  });

  describe('serialize', () => {
    let game, user, player;

    beforeEach(() => {
      return Promise.all([
        User.create({ id: '005ed80c-ba18-450c-9d26-b57583292592', username: 'my-user', password: 'my-password' }),
        Game.create({ id: 'c4db5d8c-2eb8-464c-9975-be2580ed0a26' })
      ])
        .then(([u, g]) => {
          user = u;
          game = g;

          return Player.create({
            id: '0b2ca838-bdc7-4df1-9ff9-440afe999796',
            userId: user.id,
            gameId: game.id,
            role: 'transmitter',
            team: 'a'
          });
        })
        .then((p) => {
          player = p;
        });
    });

    afterEach(helper.cleanDatabase);

    it('returns an Object of the relevant information', () => {
      expect(player.serialize()).to.eql({
        id: '0b2ca838-bdc7-4df1-9ff9-440afe999796',
        userId: '005ed80c-ba18-450c-9d26-b57583292592',
        gameId: 'c4db5d8c-2eb8-464c-9975-be2580ed0a26',
        role: 'transmitter',
        team: 'a'
      });
    });
  });
});
