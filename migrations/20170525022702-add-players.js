'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.runSql(`
  CREATE TYPE team AS ENUM ('a', 'b');
  CREATE TYPE role AS ENUM ('transmitter', 'decoder');`
  ).then(() => {
    return db.createTable('players', {
      id: {
        type: 'uuid',
        primaryKey: true,
        defaultValue: new String('uuid_generate_v4()')
      },
      user_id: {
        type: 'uuid',
        notNull: true
      },
      game_id: {
        type: 'uuid',
        notNull: true
      },
      team: {
        type: 'team',
        notNull: false
      },
      role: {
        type: 'role',
        notNull: false
      }
    });
  }).then(() => {
    return Promise.all([
      db.addForeignKey('players', 'users', 'player_user_foreign', { user_id: 'id' }, { onDelete: 'CASCADE', onUpdate: 'RESTRICT' }),
      db.addForeignKey('players', 'games', 'player_game_foreign', { game_id: 'id' }, { onDelete: 'CASCADE', onUpdate: 'RESTRICT' }),
      db.addForeignKey('games', 'players', 'game_player_foreign', { active_player_id: 'id' }, { onDelete: 'CASCADE', onUpdate: 'RESTRICT' }),
      db.addIndex('players', 'player_game_index', ['game_id'], false),
      db.addIndex('players', 'player_user_index', ['user_id'], false),
      db.addIndex('players', 'player_game_user_index', ['game_id', 'user_id'], true),
      db.addIndex('players', 'player_game_team_role_index', ['game_id', 'team', 'role'], true)
    ]);
  });
};

exports.down = function(db) {
  return db.dropTable('players');
};

exports._meta = {
  'version': 1
};
