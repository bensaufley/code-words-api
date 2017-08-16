const Game = require('../models/game'),
      Player = require('../models/player');

module.exports = class GameSerializer {
  constructor(user) {
    this.user = user;

    ['serializeGame', 'serializeGames'].forEach((k) => {
      this[k] = this[k].bind(this);
    });
  }

  serializeGame(gameId) {
    return this.serializeGames(gameId)
      .then((data) => {
        if (data[0]) return data[0];
        else throw new Error('No player found');
      });
  }

  serializeGames(gameId = null) {
    let where = { userId: this.user.id };
    if (gameId !== null) where.gameId = gameId;
    return Player.findAll({
      where,
      include: [
        {
          association: Player.Game,
          include: [{
            association: Game.Players,
            include: [Player.User]
          }]
        }
      ]
    })
      .then((players) => Promise.all(players.map((player) => GameSerializer.serializeGameForPlayer(player))));
  }

  static serializeGameForPlayer(player) {
    return GameSerializer.findGameWithAssociations(player).then((game) => {
      return {
        game: game.serializeFor(player),
        players: game.players.map((p) => p.serialize())
      };
    });
  }

  static findGameWithAssociations(player) {
    return new Promise((resolve, reject) => {
      let hasPlayers = player.game && player.game.players && player.game.players.length > 0,
          hasUsers = hasPlayers && player.game.players.map((p) => p.user).filter(Boolean).length === player.game.players.length;

      if (hasPlayers && hasUsers) {
        resolve(player.game);
      } else {
        Game.findOne({
          where: { id: player.gameId },
          include: [
            {
              association: Game.Players,
              include: [Player.User]
            }
          ]
        }).then(resolve).catch(reject);
      }
    });
  }
};
