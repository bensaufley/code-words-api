'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      sinon = helper.sinon,
      Game = require('../../models/game'),
      Player = require('../../models/player'),
      User = require('../../models/user'),
      GameBoard = require('../../lib/game-board'),
      gameHelpers = require('../support/game-helpers');

describe('Game', () => {
  let game;

  beforeEach(() => {
    return Game.create().then((g) => { game = g; });
  });

  afterEach(helper.cleanDatabase);

  describe('initialization', () => {
    it('creates a new game board', () => {
      let board = game.getDataValue('board');

      expect(board).to.have.lengthOf(5);
      expect([].concat(...board)).to.have.lengthOf(25);
      [].concat(...board).forEach((tile) => {
        expect(tile.revealed).to.be.false;
        expect(tile.type).to.be.oneOf(['a', 'b', null, 'x']);
        expect(tile.word).to.be.a('string').with.length.above(2);
      });
    });
  });

  it('returns a GameBoard object for its board property', () => {
    expect(game.board).to.be.instanceOf(GameBoard);
    expect(game.board.grid).to.eq(game.getDataValue('board'));
  });

  describe('serializeFor', () => {
    let transmitter, decoder, game;

    beforeEach(() => {
      return gameHelpers.prepareGame()
        .then((response) => {
          ({ aTransmitterPlayer: transmitter, aDecoderPlayer: decoder, game } = response);
        });
    });

    it('includes the full grid for transmitter players', () => {
      let serialized = game.serializeFor(transmitter);

      expect(serialized.board).to.eq(game.getDataValue('board'));
    });

    it('includes a redacted grid for decoder players', () => {
      let serialized = game.serializeFor(decoder);

      expect(serialized.board).not.to.eq(game.getDataValue('board'));
      expect([].concat(...serialized.board).map((t) => t.type)).to.eql(new Array(25).fill('redacted'));
    });
  });

  context('gameplay', () => {
    let aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer, game;

    beforeEach(() => {
      return gameHelpers.prepareGame()
        .then((response) => {
          ({ aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer, game } = response);
        });
    });

    describe('start', () => {
      context('not enough players', () => {
        beforeEach(() => {
          return Promise.all([
            aTransmitterPlayer.destroy(),
            bDecoderPlayer.destroy()
          ]);
        });

        it('rejects when not enough players', () => {
          return game.start()
            .then(() => { return Promise.reject(new Error('Should not have been successful')); })
            .catch((err) => {
              expect(err.message).to.eq('Not enough players');
              expect(game.activePlayerId).to.be.null;
            });
        });
      });

      context('ready to start', () => {
        it('sets the active player to the starting team\'s transmitter', () => {
          return game.start()
            .then(() => {
              let startingTeam = game.board.startingTeam(),
                  startingPlayer = eval(`${startingTeam}TransmitterPlayer`);
              if (!startingTeam || !startingPlayer) return Promise.reject(new Error('Could not determine starting player'));

              expect(game.activePlayerId).to.eq(startingPlayer.id);
            });
        });
      });
    });

    describe('transmit', () => {
      context('invalid', () => {
        it('rejects if game not started', () => {
          return game.transmit('word', 2)
            .then(() => Promise.reject(new Error('Should not have accepted transmission')))
            .catch((err) => {
              expect(err.message).to.eq('Game has not begun');
            });
        });

        context('started game', () => {
          beforeEach(() => game.start());

          it('rejects if transmission includes spaces', () => {
            return game.transmit('not valid', 2)
              .then(() => Promise.reject(new Error('Should not have accepted transmission')))
              .catch((err) => {
                expect(err.message).to.eq('Transmission must be one single word');
              });
          });

          it('rejects if transmission is empty', () => {
            return game.transmit('', 2)
              .then(() => Promise.reject(new Error('Should not have accepted transmission')))
              .catch((err) => {
                expect(err.message).to.eq('Transmission must be one single word');
              });
          });

          it('rejects number zero', () => {
            return game.transmit('valid-enough', 0)
              .then(() => Promise.reject(new Error('Should not have accepted transmission')))
              .catch((err) => {
                expect(err.message).to.eq('Number must be whole number greater than zero');
              });
          });

          it('rejects non-whole numbers', () => {
            return game.transmit('valid-enough', 1.45)
              .then(() => Promise.reject(new Error('Should not have accepted transmission')))
              .catch((err) => {
                expect(err.message).to.eq('Number must be whole number greater than zero');
              });
          });

          it('rejects if transmission is more than remaining words for team', () => {
            let gameBoard = game.getDataValue('board'),
                startingTeam = game.board.startingTeam(),
                board = gameBoard.map((row) => row.map((tile) => Object.assign({}, tile, { revealed: tile.type === startingTeam })));

            return game.update({ board })
              .then((g) => {
                return g.transmit('valid', 3);
              })
              .then(() => Promise.reject(new Error('Should not have accepted transmission')))
              .catch((err) => {
                expect(err.message).to.eq('Number exceeds remaining tiles for team.');
              });
          });
        });
      });

      context('valid', () => {
        beforeEach(() => game.start());

        it('creates Turn with transmission', () => {
          return game.transmit('transmission', 2)
            .then(() => {
              expect(game.turns).to.have.lengthOf(1);
            });
        });

        it('adds to turns and triggers nextTurn', () => {
          let activePlayer = [aTransmitterPlayer, bTransmitterPlayer].find((p) => p.id === game.activePlayerId);
          sinon.stub(game, 'nextTurn');

          return game.transmit('transmission', 2)
            .then(() => {
              let turn = game.turns[0];

              expect(game.turns).to.have.lengthOf(1);
              expect(turn.event).to.eq('transmission');
              expect(turn.playerId).to.eq(activePlayer.id);
              expect(turn.transmission).to.eql({ number: 2, word: 'transmission' });
              expect(game.nextTurn).to.have.been.called;

              game.nextTurn.restore();
            });
        });
      });
    });

    describe('decode', () => {
      beforeEach(() => game.start());

      context('invalid', () => {
        it('rejects invalid tile coordinates', () => {
          return game.decode(-1, 15)
            .then(() => Promise.reject(new Error('Coordinates should not have been accepted')))
            .catch((err) => {
              expect(err.message).to.eq('No such tile');
            });
        });

        it('rejects already-revealed tiles', () => {
          let [x, y] = [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)],
              board = game.getDataValue('board');
          board[y][x].revealed = true;
          return game.update({ board })
            .then(() => {
              return game.decode(x, y);
            })
            .then(() => Promise.reject(new Error('Submission should not have been accepted')))
            .catch((err) => {
              expect(err.message).to.eq('Tile already revealed');
            });
        });

        it('rejects for non-decoder players', () => {
          let [x, y] = [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)];
          return game.update({ activePlayerId: aTransmitterPlayer.id })
            .then(() => game.decode(x, y))
            .then(() => Promise.reject('Player should not have been allowed to decoding'))
            .catch((err) => {
              expect(err.message).to.eq('Active Player cannot make guesses');
            });
        });
      });

      context('valid', () => {
        beforeEach(() => {
          let index = Math.round(Math.random());
          return game.update({ activePlayerId: [aDecoderPlayer, bDecoderPlayer][index].id });
        });

        it('changes active player if tile is not of same team', () => {
          let board = game.getDataValue('board'),
              activePlayer = gameHelpers.activePlayer([aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer], game),
              index = [].concat(...board).findIndex((tile) => tile.type !== activePlayer.team && tile.type !== 'x'),
              [x, y] = [index % 5, Math.floor(index / 5)];

          return game.decode(x, y)
            .then(() => {
              expect(game.activePlayerId).not.to.eq(activePlayer.id);
            });
        });

        it('does not change active player if decoding is correct', () => {
          let board = game.getDataValue('board'),
              activePlayer = gameHelpers.activePlayer([aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer], game),
              index = [].concat(...board).findIndex((tile) => tile.type === activePlayer.team),
              [x, y] = [index % 5, Math.floor(index / 5)];

          return game.decode(x, y)
            .then(() => {
              expect(game.activePlayerId).to.eq(activePlayer.id);
            });
        });

        it('creates a turn for incorrect guesses', () => {
          let board = game.getDataValue('board'),
              activePlayer = gameHelpers.activePlayer([aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer], game),
              index = [].concat(...board).findIndex((tile) => tile.type !== activePlayer.team && tile.type !== 'x'),
              [x, y] = [index % 5, Math.floor(index / 5)];

          return game.decode(x, y)
            .then(() => {
              let turn = game.turns[game.turns.length - 1];

              expect(turn).to.have.property('event', 'decoding');
              expect(turn).to.have.property('playerId', activePlayer.id);
              expect(turn.tile).to.eql({ x, y });
            });
        });

        it('creates a turn for correct guesses', () => {
          let board = game.getDataValue('board'),
              activePlayer = gameHelpers.activePlayer([aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer], game),
              index = [].concat(...board).findIndex((tile) => tile.type === activePlayer.team),
              [x, y] = [index % 5, Math.floor(index / 5)];

          return game.decode(x, y)
            .then(() => {
              let turn = game.turns[game.turns.length - 1];

              expect(turn).to.have.property('event', 'decoding');
              expect(turn).to.have.property('playerId', activePlayer.id);
              expect(turn.tile).to.eql({ x, y });
            });
        });

        context('victory', () => {
          it('triggers end if tile is x type', () => {
            let board = game.getDataValue('board'),
                activePlayer = gameHelpers.activePlayer([aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer], game),
                index = [].concat(...board).findIndex((tile) => tile.type === 'x'),
                [x, y] = [index % 5, Math.floor(index / 5)];
            sinon.spy(game, 'end');

            return game.decode(x, y)
              .then(() => {
                expect(game.end).to.have.been.calledWith(sinon.match({
                  event: 'decoding',
                  playerId: activePlayer.id,
                  tile: { x, y },
                  correct: false
                }), sinon.match.instanceOf(Player).and(sinon.match.has('id', activePlayer.id)));
                game.end.restore();
              });
          });

          it('triggers end if tile is last for other team', () => {
            let board = game.getDataValue('board'),
                activePlayer = gameHelpers.activePlayer([aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer], game),
                otherTeam = activePlayer.team === 'a' ? 'b' : 'a',
                index = [].concat(...board).findIndex((tile) => tile.type === otherTeam),
                [x, y] = [index % 5, Math.floor(index / 5)];
            sinon.spy(game, 'end');

            board.forEach((row, iy) => {
              row.forEach((tile, ix) => {
                if (ix === x && iy === y) return;
                if (tile.type === otherTeam) tile.revealed = true;
              });
            });

            return game.update({ board })
              .then(() => game.decode(x, y))
              .then(() => {
                expect(game.end).to.have.been.calledWith(sinon.match({
                  event: 'decoding',
                  playerId: activePlayer.id,
                  tile: { x, y },
                  correct: false
                }), sinon.match.instanceOf(Player).and(sinon.match.has('id', activePlayer.id)));
                game.end.restore();
              });
          });

          it('triggers end if tile is last for active player\'s team', () => {
            let board = game.getDataValue('board'),
                activePlayer = gameHelpers.activePlayer([aTransmitterPlayer, aDecoderPlayer, bTransmitterPlayer, bDecoderPlayer], game),
                index = [].concat(...board).findIndex((tile) => tile.type === activePlayer.team),
                [x, y] = [index % 5, Math.floor(index / 5)];
            sinon.spy(game, 'end');

            board.forEach((row, iy) => {
              row.forEach((tile, ix) => {
                if (ix === x && iy === y) return;
                if (tile.type === activePlayer.team) tile.revealed = true;
              });
            });

            return game.update({ board })
              .then(() => game.decode(x, y))
              .then(() => {
                expect(game.end).to.have.been.calledWith(sinon.match({
                  event: 'decoding',
                  playerId: activePlayer.id,
                  tile: { x, y },
                  correct: true
                }), sinon.match.instanceOf(Player).and(sinon.match.has('id', activePlayer.id)));
                game.end.restore();
              });
          });
        });
      });
    });

    describe('nextTurn', () => {
      context('game not started', () => {
        it('is rejected', () => {
          game.nextTurn()
            .then(() => Promise.reject(new Error('Should not have been accepted')))
            .catch((err) => {
              expect(err.message).to.eq('Game is not started');
            });
        });
      });

      context('game started', () => {
        beforeEach(() => game.start());

        context('from team a', () => {
          it('switches from transmitter to decoder on a', () => {
            return game.update({ activePlayerId: aTransmitterPlayer.id })
              .then(() => game.nextTurn())
              .then(() => {
                expect(game.activePlayerId).to.eq(aDecoderPlayer.id);
              });
          });

          it('switches from decoder to transmitter on b', () => {
            return game.update({ activePlayerId: aDecoderPlayer.id })
              .then(() => game.nextTurn())
              .then(() => {
                expect(game.activePlayerId).to.eq(bTransmitterPlayer.id);
              });
          });
        });

        context('from team b', () => {
          it('switches from transmitter to decoder on b', () => {
            return game.update({ activePlayerId: bTransmitterPlayer.id })
              .then(() => game.nextTurn())
              .then(() => {
                expect(game.activePlayerId).to.eq(bDecoderPlayer.id);
              });
          });

          it('switches from decoder to transmitter on a', () => {
            return game.update({ activePlayerId: bDecoderPlayer.id })
              .then(() => game.nextTurn())
              .then(() => {
                expect(game.activePlayerId).to.eq(aTransmitterPlayer.id);
              });
          });
        });
      });
    });

    describe('end', () => {
      it('creates an end event', () => {
        return game.end({ event: 'turn', playerId: bDecoderPlayer.id, correct: false }, bDecoderPlayer)
          .then(() => {
            let endTurn = game.turns[game.turns.length - 1];
            expect(endTurn).to.have.property('event', 'end');
          });
      });

      it('sets the winner to the active player if the last decoding was correct', () => {
        return game.end({ event: 'turn', playerId: aDecoderPlayer.id, correct: true }, aDecoderPlayer)
          .then(() => {
            let endTurn = game.turns[game.turns.length - 1];
            expect(endTurn).to.have.property('winner', 'a');
          });
      });

      it('sets the winner to the other team if the last decoding was not correct', () => {
        return game.end({ event: 'turn', playerId: aDecoderPlayer.id, correct: false }, aDecoderPlayer)
          .then(() => {
            let endTurn = game.turns[game.turns.length - 1];
            expect(endTurn).to.have.property('winner', 'b');
          });
      });
    });

    describe('completed', () => {
      it('returns false for non-started games', () => {
        expect(game.completed()).to.be.false;
      });

      it('returns false for games in progress', () => {
        return game.update({ turns: [
          { event: 'transmission', playerId: aTransmitterPlayer.id, transmission: { number: 2, word: 'transmission' } },
          { event: 'decoding', playerId: aDecoderPlayer.id, tile: { x: 2, y: 1 }, correct: false },
          { event: 'transmission', playerId: bTransmitterPlayer.id, transmission: { number: 2, word: 'flarb' } }
        ], activePlayerId: bDecoderPlayer.id }).then(() => {
          expect(game.completed()).to.be.false;
        });
      });

      it('returns true for finished games', () => {
        return game.update({ turns: [
          { event: 'end', winner: 'a' }
        ]}).then(() => {
          expect(game.completed()).to.be.true;
        });
      });
    });
  });

  describe('delete', () => {
    context('deleting', () => {
      let game, user, player;

      beforeEach(() => {
        return Promise.all([
          Game.create(),
          User.create({ username: 'my-user', password: 'my-password' })
        ])
          .then(([g, u]) => {
            game = g;
            user = u;
            return Player.create({ userId: user.id, gameId: game.id });
          })
          .then((p) => { player = p; });
      });

      afterEach(() => helper.cleanDatabase());

      it('marks the record as deleted without destroying it', () => {
        return game.delete()
          .then(() => {
            return Game.unscoped().findAll({ where: { id: game.id } });
          })
          .then((g) => {
            expect(g).not.to.be.null;
            expect(g.deleted_at).not.to.be.null;
          });
      });

      it('marks associated players as deleted', () => {
        return game.delete()
          .then(() => {
            return Player.unscoped().findAll({ where: { gameId: game.id } });
          })
          .then((players) => {
            expect(players.length).to.eq(1);
            expect(players[0].id).to.eq(player.id);
            expect(players[0].deletedAt).not.to.be.null;
          });
      });
    });

    context('deleted behavior', () => {
      let game1, game2, game3;

      beforeEach(() => {
        return Promise.all([
          Game.create(),
          Game.create(),
          Game.create()
        ])
          .then((games) => {
            [game1, game2, game3] = games;

            return game2.delete();
          });
      });

      afterEach(() => helper.cleanDatabase());

      it('does not return deleted games', () => {
        return Game.findAll()
          .then((games) => {
            let gameIds = games.map((g) => g.id);
            expect(gameIds).not.to.include(game2.id);
            expect(gameIds).to.have.members([game.id, game1.id, game3.id]);
          });
      });

      it('is available through deleted scope', () => {
        return Game.scope('deleted').findAll()
          .then((games) => {
            expect(games[0].id).to.eq(game2.id);
          });
      });
    });
  });
});
