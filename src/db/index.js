'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Creates (or opens) a SQLite database and ensures the schema is applied.
 * Pass ':memory:' (used by the test suite) to get an isolated in-memory DB.
 */
function createDatabase(filename) {
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

module.exports = { createDatabase };
