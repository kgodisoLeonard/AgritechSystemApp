'use strict';

const express = require('express');
const farmersRouter = require('./routes/farmers');
const suppliersRouter = require('./routes/suppliers');
const expensesRouter = require('./routes/expenses');
const salesRouter = require('./routes/sales');
const groupOrdersRouter = require('./routes/groupOrders');

/**
 * Builds the Express app wired to the given database instance. Keeping this
 * separate from server.js makes it easy to inject an in-memory database for
 * tests.
 */
function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/farmers', farmersRouter(db));
  app.use('/suppliers', suppliersRouter(db));
  app.use('/expenses', expensesRouter(db));
  app.use('/sales', salesRouter(db));
  app.use('/group-orders', groupOrdersRouter(db));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
