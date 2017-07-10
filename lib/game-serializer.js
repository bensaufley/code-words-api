const Game = require('../models/game'),
      Player = require('../models/player');

module.exports = class GameSerializer {
  static serializeGamesForUser(user) {
    return Player.findAll({
      where: {
        userId: user.id
      },
      include: [{
        association: Player.Game,
        include: [Game.Players, Game.Users]
      }]
    })
      .then((players) => {
        return Promise.all(players.map((player) => this.serializeGameForPlayer(player)));
      });
  }

  static serializeGameForPlayer(player) {
    return new Promise((resolve, reject) => {
      let hasPlayers = player.game && player.game.players && player.game.players.length > 0,
          hasUsers = player.game && player.game.users && player.game.users.length > 0;
      if (hasPlayers && hasUsers) {
        resolve(player.game);
      } else {
        Game.findOne({
          where: {
            game: player.gameId
          },
          include: [Game.Players, Game.Users]
        }).then(resolve).catch(reject);
      }
    }).then((game) => {
      return {
        game: game.serializeFor(player),
        players: game.players.map((p) => p.serialize()),
        users: game.users.map((u) => u.serialize())
      };
    });
  }
};
