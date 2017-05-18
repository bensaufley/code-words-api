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
  return db.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: new String('uuid_generate_v4()')
    },
    username: {
      type: 'string',
      length: 50,
      notNull: true,
      unique: true
    },
    password_digest: {
      notNull: true,
      type: 'string'
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
    return db.addIndex('users', 'user_usernames_index', ['username'], true);
  }).then(() => {
    return db.runSql('CREATE TRIGGER user_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE refresh_updated_at_column();');
  });
};

exports.down = function(db) {
  return db.dropTable('users');
};

exports._meta = {
  version: 1
};
