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
  return db.createTable('games', {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: new String('uuid_generate_v4()')
    },
    board: {
      type: 'jsonb',
      notNull: true
    },
    turns: {
      type: 'jsonb',
      notNull: true,
      defaultValue: new String('\'[]\'::jsonb')
    },
    active_player_id: {
      type: 'uuid'
    },
    created_at: {
      type: 'timestamp',
      defaultValue: new String('current_timestamp'),
      notNull: true
    },
    updated_at: {
      type: 'timestamp',
      defaultValue: new String('current_timestamp'),
      notNull: true
    }
  }).then(() => {
    return db.runSql('CREATE TRIGGER game_updated BEFORE UPDATE ON games FOR EACH ROW EXECUTE PROCEDURE refresh_updated_at_column();');
  });
};

exports.down = function(db) {
  return db.dropTable('games');
};

exports._meta = {
  'version': 1
};
