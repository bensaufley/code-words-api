'use strict';

const WORDS = require('./data/words.json');

const shuffle = (array) => {
  let i,
      arr = Array.from(array),
      m = arr.length;
  while (m) {
    i = Math.floor(Math.random() * m--);
    [arr[m], arr[i]] = [arr[i], arr[m]];
  }
  return arr;
};

module.exports = class GameBoard {
  constructor(grid) {
    this.grid = grid;
    if (!this.grid) {
      this._startingTeam = ['a', 'b'][Math.floor(Math.random() * 2)];
      this.generateGrid();
    }
  }

  generateGrid() {
    this.grid = [];
    let words = shuffle(WORDS).slice(0, 25),
        types = shuffle([...(new Array(7).fill('a')), ...(new Array(7).fill('b')), ...(new Array(9).fill(null)), this._startingTeam, 'x']);

    for (let y = 5; y--;) {
      this.grid[y] = [];
      for (let x = 5; x--;) {
        this.grid[y][x] = { revealed: false, type: types[y * 5 + x], word: words[y * 5 + x] };
      }
    }
  }

  serialize(redacted = true) {
    if (!redacted) return this.grid;

    return this.grid.map((row) => {
      return row.map((tile) => {
        return {
          revealed: tile.revealed,
          type: tile.revealed ? tile.type : 'redacted',
          word: tile.word
        };
      });
    });
  }

  startingTeam() {
    if (this._startingTeam) return this._startingTeam;
    let tiles = [].concat(...this.grid).map((tile) => tile.type);
    return this._startingTeam = tiles.filter((t) => t === 'a').length === 8 ? 'a' : 'b';
  }

  teamTiles() {
    return [].concat(...this.grid).reduce((obj, tile) => {
      if (['a', 'b'].indexOf(tile.type) >= 0) obj[tile.type].push(tile);
      return obj;
    }, { a: [], b: [] });
  }

  toText(hideRevealed = true) {
    let maxLength = this.words(hideRevealed).reduce(((max, word) => word.length > max ? word.length : max), 0);
    return this.grid.map((row) => {
      return row.map((square) => {
        if (hideRevealed && square.revealed) return `[ ${new Array(maxLength).fill(' ').join('')} ]`;
        let padding = new Array(maxLength - square.word.length).fill(' ').join(''),
            lp = padding.substr(0, padding.length / 2),
            rp = padding.substr(lp.length, padding.length - lp.length);
        return `[ ${lp}${square.word}${rp} ]`;
      }).join('');
    }).join('\n');
  }

  won() {
    let teamTiles = this.teamTiles();
    return teamTiles.a.every((tile) => tile.revealed) ||
      teamTiles.b.every((tile) => tile.revealed);
  }

  words(hideRevealed = true) {
    return [].concat(...this.grid)
      .filter((tile) => hideRevealed ? !tile.revealed : true)
      .map((tile) => tile.word);
  }
};
