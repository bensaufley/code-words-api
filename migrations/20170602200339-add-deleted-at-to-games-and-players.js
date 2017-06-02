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
  return Promise.all([
    db.addColumn('games', 'deleted_at', { type: 'timestamp', notNull: false }),
    db.addColumn('players', 'deleted_at', { type: 'timestamp', notNull: false })
  ])
    .then(() => {
      return Promise.all([
        db.addIndex('games', 'game_deleted_at', ['deleted_at']),
        db.addIndex('players', 'player_deleted_at', ['deleted_at'])
      ]);
    });
};

exports.down = function(db) {
  return Promise.all([
    db.removeIndex('games', 'game_deleted_at'),
    db.removeIndex('players', 'player_deleted_at')
  ])
    .then(() => {
      return Promise.all([
        db.removeColumn('games', 'deleted_at'),
        db.removeColumn('players', 'deleted_at')
      ]);
    });
};

exports._meta = {
  'version': 1
};
