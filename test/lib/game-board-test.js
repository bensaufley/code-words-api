'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      sinon = helper.sinon,
      GameBoard = require('../../lib/game-board');

const toTextFixture = [{revealed:false,type:null,word:'rub'},{revealed:false,type:null,word:'bit'},{revealed:false,type:null,word:'cookie'},{revealed:false,type:'a',word:'industry'},{revealed:false,type:'b',word:'hang'},{revealed:false,type:null,word:'anything'},{revealed:false,type:null,word:'degree'},{revealed:false,type:null,word:'hide'},{revealed:false,type:'a',word:'decision'},{revealed:false,type:'a',word:'slide'},{revealed:false,type:'x',word:'internet'},{revealed:false,type:'b',word:'specific'},{revealed:false,type:'a',word:'window'},{revealed:false,type:null,word:'jury'},{revealed:false,type:'a',word:'wine'},{revealed:false,type:'a',word:'ball'},{revealed:false,type:'b',word:'shoulder'},{revealed:false,type:null,word:'plenty'},{revealed:false,type:null,word:'teaching'},{revealed:false,type:'a',word:'reserve'},{revealed:false,type:'a',word:'volume'},{revealed:false,type:'b',word:'world'},{revealed:false,type:'b',word:'fishing'},{revealed:false,type:'b',word:'mom'},{revealed:false,type:'b',word:'cup'}];

describe('GameBoard', () => {
  describe('constructor', () => {
    it('generates a new set of tiles if not passed one', () => {
      let board = new GameBoard(),
          randomCell = board.tiles[Math.floor(Math.random() * 25)];

      expect(board.tiles.length).to.eq(25);
      expect(randomCell.revealed).to.be.false;
      expect(randomCell.type).to.be.oneOf(['a', 'b', null, 'x']);
      expect(randomCell.word).to.be.a('string').with.length.above(2);
    });

    it('accepts an existing grid', () => {
      let board1 = new GameBoard(),
          board2 = new GameBoard(board1.tiles);

      expect(board2.tiles).to.deep.eq(board1.tiles);
    });

    it('doesn\'t always generate the same grid', () => {
      let board1 = new GameBoard(),
          board2 = new GameBoard();

      expect(board2.tiles).not.to.deep.eq(board1.tiles);
    });
  });

  describe('generateGrid', () => {
    it('creates a 25-member array', () => {
      let board = new GameBoard();

      expect(board.tiles).to.be.an('array');
      expect(board.tiles.length).to.eq(25);
    });

    it('returns tiles with revealed, type, and word attributes', () => {
      let board = new GameBoard();

      board.tiles.forEach((cell) => {
        expect(cell).to.have.property('revealed', false);
        expect(cell.type).to.be.oneOf(['a', 'b', null, 'x']);
        expect(cell.word).to.be.a('string').with.length.above(2);
      });
    });

    it('does not include repeated words', () => {
      let board = new GameBoard(),
          words = board.tiles.map((tile) => tile.word),
          uniqueWords = [...new Set(words)];

      expect(uniqueWords).to.have.length(25);
    });

    it('defines a startingTeam', () => {
      let board = new GameBoard();

      expect(board._startingTeam).to.be.oneOf(['a', 'b']);
    });

    it('includes 8 tiles for the starting team', () => {
      let board = new GameBoard(),
          startingTeam = board._startingTeam,
          startingTeamTiles = board.tiles.filter((tile) => tile.type === startingTeam);

      expect(startingTeamTiles).to.have.length(8);
    });

    it('includes 7 tiles for the non-starting team', () => {
      let board = new GameBoard(),
          team = board._startingTeam === 'a' ? 'b' : 'a',
          teamTiles = board.tiles.filter((tile) => tile.type === team);

      expect(teamTiles).to.have.length(7);
    });

    it('includes 9 null tiles', () => {
      let board = new GameBoard(),
          nullTiles = board.tiles.filter((tile) => tile.type === null);

      expect(nullTiles).to.have.length(9);
    });

    it('includes 1 x tile', () => {
      let board = new GameBoard(),
          xTile = board.tiles.filter((tile) => tile.type === 'x');

      expect(xTile).to.have.length(1);
    });
  });

  describe('serialize', () => {
    it('returns the full grid when redacted is false', () => {
      let board = new GameBoard();

      expect(board.serialize(false)).to.eql(board.tiles);
    });

    it('returns a redacted grid when redacted is true', () => {
      let board = new GameBoard(),
          types = board.serialize().map((tile) => tile.type);

      expect(types).to.eql(new Array(25).fill('redacted'));
    });
  });

  describe('toText', () => {
    it('outputs the board in a predictable ASCII format', () => {
      let board = new GameBoard(toTextFixture),
          expectedOutput = `
[   rub    ][   bit    ][  cookie  ][ industry ][   hang   ]
[ anything ][  degree  ][   hide   ][ decision ][  slide   ]
[ internet ][ specific ][  window  ][   jury   ][   wine   ]
[   ball   ][ shoulder ][  plenty  ][ teaching ][ reserve  ]
[  volume  ][  world   ][ fishing  ][   mom    ][   cup    ]
`.trim();

      expect(board.toText()).to.eq(expectedOutput);
    });

    it('outputs the board without revealed words', () => {
      let modifiedFixture = toTextFixture.map((t) => Object.assign({}, t)),
          expectedOutput = `
[   rub    ][   bit    ][  cookie  ][ industry ][   hang   ]
[ anything ][          ][   hide   ][ decision ][  slide   ]
[ internet ][ specific ][  window  ][          ][   wine   ]
[   ball   ][ shoulder ][          ][ teaching ][ reserve  ]
[  volume  ][  world   ][ fishing  ][   mom    ][   cup    ]
`.trim();
      modifiedFixture[6].revealed = true;
      modifiedFixture[13].revealed = true;
      modifiedFixture[17].revealed = true;

      let board = new GameBoard(modifiedFixture);

      expect(board.toText()).to.eq(expectedOutput);
    });

    it('outputs the board with revealed words if prompted', () => {
      let modifiedFixture = toTextFixture.map((t) => Object.assign({}, t)),
          expectedOutput = `
[   rub    ][   bit    ][  cookie  ][ industry ][   hang   ]
[ anything ][  degree  ][   hide   ][ decision ][  slide   ]
[ internet ][ specific ][  window  ][   jury   ][   wine   ]
[   ball   ][ shoulder ][  plenty  ][ teaching ][ reserve  ]
[  volume  ][  world   ][ fishing  ][   mom    ][   cup    ]
`.trim();
      modifiedFixture[6].revealed = true;
      modifiedFixture[13].revealed = true;
      modifiedFixture[17].revealed = true;

      let board = new GameBoard(modifiedFixture);

      expect(board.toText(false)).to.eq(expectedOutput);
    });
  });

  describe('words', () => {
    it('returns an array of the 25 words', () => {
      let board = new GameBoard();

      expect(board.words()).to.be.an('array').with.lengthOf(25);
      expect([...new Set(board.words())]).to.have.lengthOf(25);
    });

    it('filters out revealed words', () => {
      let board = new GameBoard();

      let z, revealed;
      z = revealed = Math.floor(Math.random() * 25);
      while (z) {
        let i = Math.floor(Math.random() * 25);
        if (board.tiles[i].revealed === false) z--;
        board.tiles[i].revealed = true;
      }

      expect(board.words()).to.have.lengthOf(25 - revealed);
    });

    it('includes revealed words if prompted', () => {
      let board = new GameBoard();

      let z = Math.floor(Math.random() * 25);
      while (z) {
        let i = Math.floor(Math.random() * 25);
        if (board.tiles[i].revealed === false) z--;
        board.tiles[i].revealed = true;
      }

      expect(board.words(false)).to.have.lengthOf(25);
    });
  });

  describe('startingTeam', () => {
    it('gives the starting team from memory if it has it', () => {
      let board = new GameBoard(),
          startingTeam = board._startingTeam;
      let concatSpy = sinon.spy(Array.prototype, 'concat');

      expect(board.startingTeam()).to.eq(startingTeam);
      expect(concatSpy).not.to.have.been.called;

      concatSpy.restore();
    });

    it('calculates the starting team if it doesn\'t have it', () => {
      let board = new GameBoard(),
          startingTeam = board._startingTeam,
          newBoard = new GameBoard(board.tiles);
      let mapSpy = sinon.spy(Array.prototype, 'map');

      expect(newBoard.startingTeam()).to.eq(startingTeam);
      expect(mapSpy).to.have.been.calledOn(sinon.match(board.tiles));

      mapSpy.restore();
    });
  });

  describe('teamTiles', () => {
    it('gives the appropriate sets of tiles', () => {
      let board = new GameBoard(),
          startingTeam = board._startingTeam,
          otherTeam = startingTeam === 'a' ? 'b' : 'a',
          tileGroups = board.teamTiles();

      expect(tileGroups[startingTeam]).to.have.lengthOf(8).and;
      expect(tileGroups[otherTeam]).to.have.lengthOf(7);
      expect(tileGroups[startingTeam].map((t) => t.type)).to.eql(new Array(8).fill(startingTeam));
      expect(tileGroups[otherTeam].map((t) => t.type)).to.eql(new Array(7).fill(otherTeam));
    });
  });

  describe('won', () => {
    it('returns false for a new game', () => {
      let board = new GameBoard();

      expect(board.won()).to.be.false;
    });

    it('returns false for a game in progress', () => {
      let board = new GameBoard();

      for (let x = Math.round(Math.random() * 15) + 5; x--;) {
        let i = Math.floor(Math.random() * 25);
        board.tiles[i].revealed = true;
      }
      board.tiles.find((t) => t.type === 'a').revealed = false;
      board.tiles.find((t) => t.type === 'b').revealed = false;

      helper.config.log(board.toText());

      expect(board.won()).to.be.false;
    });

    it('returns true for a completed game', () => {
      let board = new GameBoard(),
          winner = Math.round(Math.random()) === 1 ? 'a' : 'b',
          loser = winner === 'a' ? 'b' : 'a';

      for (let x = Math.round(Math.random() * 15) + 5; x--;) {
        let i = Math.floor(Math.random() * 25);
        board.tiles[i].revealed = true;
      }
      board.tiles.forEach((t) => { if (t.type === winner) t.revealed = true; });
      board.tiles.find((t) => t.type === loser).revealed = false;

      helper.config.log(board.toText());

      expect(board.won()).to.be.true;
    });
  });
});
