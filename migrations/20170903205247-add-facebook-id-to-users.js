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
  return db.addColumn('users', 'facebook_id', { type: 'string', notNull: false })
    .then(() => db.addIndex('users', 'user_facebook_id', ['facebook_id']));
};

exports.down = function(db) {
  return db.removeIndex('users', 'user_facebook_id')
    .then(() => db.removeColumn('users', 'facebook_id'));
};

exports._meta = {
  version: 1
};
