'use strict';

const helper = require('../test-helper'),
      expect = helper.expect,
      GameBoard = require('../../lib/game-board');

const toTextFixture = [[{revealed:false,type:null,word:'rub'},{revealed:false,type:null,word:'bit'},{revealed:false,type:null,word:'cookie'},{revealed:false,type:'a',word:'industry'},{revealed:false,type:'b',word:'hang'}],[{revealed:false,type:null,word:'anything'},{revealed:false,type:null,word:'degree'},{revealed:false,type:null,word:'hide'},{revealed:false,type:'a',word:'decision'},{revealed:false,type:'a',word:'slide'}],[{revealed:false,type:'x',word:'internet'},{revealed:false,type:'b',word:'specific'},{revealed:false,type:'a',word:'window'},{revealed:false,type:null,word:'jury'},{revealed:false,type:'a',word:'wine'}],[{revealed:false,type:'a',word:'ball'},{revealed:false,type:'b',word:'shoulder'},{revealed:false,type:null,word:'plenty'},{revealed:false,type:null,word:'teaching'},{revealed:false,type:'a',word:'reserve'}],[{revealed:false,type:'a',word:'volume'},{revealed:false,type:'b',word:'world'},{revealed:false,type:'b',word:'fishing'},{revealed:false,type:'b',word:'mom'},{revealed:false,type:'b',word:'cup'}]];

describe('GameBoard', () => {
  describe('constructor', () => {
    it('generates a new grid if not passed one', () => {
      let board = new GameBoard(),
          randomCell = board.grid[Math.floor(Math.random() * 5)][Math.floor(Math.random() * 5)];

      expect(board.grid.length).to.eq(5);
      expect(randomCell.revealed).to.be.false;
      expect(randomCell.type).to.be.oneOf(['a', 'b', null, 'x']);
      expect(randomCell.word).to.be.a('string').with.length.above(2);
    });

    it('accepts an existing grid', () => {
      let board1 = new GameBoard(),
          board2 = new GameBoard(board1.grid);

      expect(board2.grid).to.deep.eq(board1.grid);
    });

    it('doesn\'t always generate the same grid', () => {
      let board1 = new GameBoard(),
          board2 = new GameBoard();

      expect(board2.grid).not.to.deep.eq(board1.grid);
    });
  });

  describe('generateGrid', () => {
    it('creates a five-by-five multidimensional array as grid', () => {
      let board = new GameBoard();

      expect(board.grid).to.be.an('array');
      expect(board.grid.length).to.eq(5);
      expect(board.grid.map((row) => row.length)).to.eql([5, 5, 5, 5, 5]);
    });

    it('returns tiles with revealed, type, and word attributes', () => {
      let board = new GameBoard();

      [].concat.apply([], board.grid).forEach((cell) => {
        expect(cell).to.have.property('revealed', false);
        expect(cell.type).to.be.oneOf(['a', 'b', null, 'x']);
        expect(cell.word).to.be.a('string').with.length.above(2);
      });
    });

    it('does not include repeated words', () => {
      let board = new GameBoard(),
          words = [].concat.apply([], board.grid).map((tile) => tile.word),
          uniqueWords = [...new Set(words)];

      expect(uniqueWords).to.have.length(25);
    });

    it('defines a startingTeam', () => {
      let board = new GameBoard();

      expect(board.startingTeam).to.be.oneOf(['a', 'b']);
    });

    it('includes 8 tiles for the starting team', () => {
      let board = new GameBoard(),
          startingTeam = board.startingTeam,
          startingTeamTiles = [].concat.apply([], board.grid).filter((tile) => tile.type === startingTeam);

      expect(startingTeamTiles).to.have.length(8);
    });

    it('includes 7 tiles for the non-starting team', () => {
      let board = new GameBoard(),
          team = board.startingTeam === 'a' ? 'b' : 'a',
          teamTiles = [].concat.apply([], board.grid).filter((tile) => tile.type === team);

      expect(teamTiles).to.have.length(7);
    });

    it('includes 9 null tiles', () => {
      let board = new GameBoard(),
          nullTiles = [].concat.apply([], board.grid).filter((tile) => tile.type === null);

      expect(nullTiles).to.have.length(9);
    });

    it('includes 1 x tile', () => {
      let board = new GameBoard(),
          xTile = [].concat.apply([], board.grid).filter((tile) => tile.type === 'x');

      expect(xTile).to.have.length(1);
    });
  });

  describe('serialize', () => {
    it('returns the full grid when redacted is false', () => {
      let board = new GameBoard();

      expect(board.serialize(false)).to.eql(board.grid);
    });

    it('returns a redacted grid when redacted is true', () => {
      let board = new GameBoard(),
          types = [].concat(...board.serialize(true)).map((tile) => tile.type);

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
      let modifiedFixture = toTextFixture.map((r) => r.map((t) => Object.assign({}, t))),
          expectedOutput = `
[   rub    ][   bit    ][  cookie  ][ industry ][   hang   ]
[ anything ][          ][   hide   ][ decision ][  slide   ]
[ internet ][ specific ][  window  ][          ][   wine   ]
[   ball   ][ shoulder ][          ][ teaching ][ reserve  ]
[  volume  ][  world   ][ fishing  ][   mom    ][   cup    ]
`.trim();
      modifiedFixture[1][1].revealed = true;
      modifiedFixture[2][3].revealed = true;
      modifiedFixture[3][2].revealed = true;

      let board = new GameBoard(modifiedFixture);

      expect(board.toText()).to.eq(expectedOutput);
    });

    it('outputs the board with revealed words if prompted', () => {
      let modifiedFixture = toTextFixture.map((r) => r.map((t) => Object.assign({}, t))),
          expectedOutput = `
[   rub    ][   bit    ][  cookie  ][ industry ][   hang   ]
[ anything ][  degree  ][   hide   ][ decision ][  slide   ]
[ internet ][ specific ][  window  ][   jury   ][   wine   ]
[   ball   ][ shoulder ][  plenty  ][ teaching ][ reserve  ]
[  volume  ][  world   ][ fishing  ][   mom    ][   cup    ]
`.trim();
      modifiedFixture[1][1].revealed = true;
      modifiedFixture[2][3].revealed = true;
      modifiedFixture[3][2].revealed = true;

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
        let [x, y] = [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)];
        if (board.grid[x][y].revealed === false) z--;
        board.grid[x][y].revealed = true;
      }

      expect(board.words()).to.have.lengthOf(25 - revealed);
    });

    it('includes revealed words if prompted', () => {
      let board = new GameBoard();

      let z = Math.floor(Math.random() * 25);
      while (z) {
        let [x, y] = [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)];
        if (board.grid[x][y].revealed === false) z--;
        board.grid[x][y].revealed = true;
      }

      expect(board.words(false)).to.have.lengthOf(25);
    });
  });
});
