'use strict';

const path = require('path');
const { createApp } = require('./app');
const { createDatabase } = require('./db');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'agritech.db');

const db = createDatabase(DB_FILE);
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`AgritechSystemApp listening on port ${PORT}`);
});
