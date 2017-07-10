const Game = require('../models/game'),
      Player = require('../models/player');

module.exports = class GameSerializer {
  constructor(user) {
    this.user = user;

    ['serializeGame', 'serializeGameForPlayer', 'serializeGames', '_findGameWithAssociations'].forEach((k) => {
      this[k] = this[k].bind(this);
    });
  }

  serializeGame(gameId) {
    return this.serializeGames(gameId)
      .then((data) => {
        if (data[0]) return data[0];
        else throw new Error('No player found')
      });
  }

  serializeGameForPlayer(player) {
    return this._findGameWithAssociations(player).then((game) => {
      return {
        game: game.serializeFor(player),
        players: game.players.map((p) => p.serialize()),
        users: game.users.map((u) => u.serialize())
      };
    });
  }

  serializeGames(gameId = null) {
    let where = { userId: this.user.id };
    if (gameId !== null) where.gameId = gameId;
    return Player.findAll({
      where,
      include: [{
        association: Player.Game,
        include: [Game.Players, Game.Users]
      }]
    })
      .then((players) => {
        return Promise.all(players.map((player) => this.serializeGameForPlayer(player)));
      });
  }

  _findGameWithAssociations(player) {
    return new Promise((resolve, reject) => {
      let hasPlayers = player.game && player.game.players && player.game.players.length > 0,
          hasUsers = player.game && player.game.users && player.game.users.length > 0;
      if (hasPlayers && hasUsers) {
        resolve(player.game);
      } else {
        Game.findOne({
          where: { id: player.gameId },
          include: [Game.Players, Game.Users]
        }).then(resolve).catch(reject);
      }
    });
  }
};
