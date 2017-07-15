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
  constructor(tiles) {
    this.tiles = tiles;
    if (!this.tiles) {
      this._startingTeam = ['a', 'b'][Math.floor(Math.random() * 2)];
      this.generateGrid();
    }
  }

  generateGrid() {
    this.tiles = [];
    let words = shuffle(WORDS).slice(0, 25),
        types = shuffle([...(new Array(7).fill('a')), ...(new Array(7).fill('b')), ...(new Array(9).fill(null)), this._startingTeam, 'x']);

    this.tiles = words.map((word, i) => {
      return { revealed: false, type: types[i], word: word };
    });
  }

  serialize(redacted = true) {
    if (!redacted) return this.tiles;

    return this.tiles.map((tile) => {
      return {
        revealed: tile.revealed,
        type: tile.revealed ? tile.type : 'redacted',
        word: tile.word
      };
    });
  }

  startingTeam() {
    if (this._startingTeam) return this._startingTeam;
    let tiles = this.tiles.map((tile) => tile.type);
    return this._startingTeam = tiles.filter((t) => t === 'a').length === 8 ? 'a' : 'b';
  }

  teamTiles() {
    return this.tiles.reduce((obj, tile) => {
      if (['a', 'b'].indexOf(tile.type) >= 0) obj[tile.type].push(tile);
      return obj;
    }, { a: [], b: [] });
  }

  toText(hideRevealed = true) {
    let maxLength = this.words(hideRevealed).reduce(((max, word) => word.length > max ? word.length : max), 0);
    return this.tiles.map((tile, i) => {
      if (hideRevealed && tile.revealed) return `[ ${new Array(maxLength).fill(' ').join('')} ]`;
      let padding = new Array(maxLength - tile.word.length).fill(' ').join(''),
          lp = padding.substr(0, padding.length / 2),
          rp = padding.substr(lp.length, padding.length - lp.length);
      return `[ ${lp}${tile.word}${rp} ]${i % 5 === 4 && i !== 24 ? '\n' : ''}`;
    }).join('');
  }

  won() {
    let { a, b } = this.teamTiles();
    return a.every((tile) => tile.revealed) || b.every((tile) => tile.revealed);
  }

  words(hideRevealed = true) {
    return this.tiles
      .filter((tile) => hideRevealed ? !tile.revealed : true)
      .map((tile) => tile.word);
  }
};
