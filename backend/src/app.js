import express from 'express';
import cors from 'cors';
import { query } from './db.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', details: error.message });
  }
});

app.get('/api/farmers', async (_req, res) => {
  try {
    const result = await query('SELECT id, name, location, contact, created_at FROM farmers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/farmers/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, location, contact, created_at FROM farmers WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/farmers/:id/expenses', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, item, category, amount, date FROM expenses WHERE farmer_id = $1 ORDER BY date DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/farmers/:id/expenses', async (req, res) => {
  const { item, category, amount } = req.body;

  if (!item || !category || amount === undefined || Number(amount) < 0) {
    return res.status(400).json({ message: 'Valid item, category and non-negative amount are required' });
  }

  try {
    const result = await query(
      'INSERT INTO expenses (farmer_id, item, category, amount, date) VALUES ($1, $2, $3, $4, CURRENT_DATE) RETURNING *',
      [req.params.id, item, category, amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/farmers/:id/income', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, item, amount, date FROM income WHERE farmer_id = $1 ORDER BY date DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/farmers/:id/income', async (req, res) => {
  const { item, amount } = req.body;

  if (!item || amount === undefined || Number(amount) < 0) {
    return res.status(400).json({ message: 'Valid item and non-negative amount are required' });
  }

  try {
    const result = await query(
      'INSERT INTO income (farmer_id, item, amount, date) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING *',
      [req.params.id, item, amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/suppliers', async (_req, res) => {
  try {
    const result = await query('SELECT id, name, location, contact FROM suppliers ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    const result = await query(`
      SELECT sp.id, sp.product_name, sp.price, s.name AS supplier_name, s.location AS supplier_location
      FROM supplier_products sp
      JOIN suppliers s ON s.id = sp.supplier_id
      ORDER BY sp.product_name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/group-orders', async (_req, res) => {
  try {
    const result = await query(`
      SELECT go.id, go.status, go.target_quantity, go.current_quantity, go.discount_rate,
             sp.product_name,
             s.name AS supplier_name
      FROM group_orders go
      JOIN supplier_products sp ON sp.id = go.product_id
      JOIN suppliers s ON s.id = go.supplier_id
      ORDER BY go.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/group-orders/:id/join', async (req, res) => {
  const { farmerId, quantity, totalPrice } = req.body;

  if (!farmerId || !quantity || Number(quantity) <= 0 || totalPrice === undefined) {
    return res.status(400).json({ message: 'farmerId, positive quantity and totalPrice are required' });
  }

  try {
    await query(
      'SELECT join_group_order($1, $2, $3, $4)',
      [req.params.id, farmerId, Number(quantity), Number(totalPrice)]
    );

    res.status(200).json({ message: 'Joined group order successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/farmers/:id/recommendations', async (req, res) => {
  try {
    const result = await query(
      `SELECT ar.id, ar.reason, ar.created_at,
              sp.product_name,
              go.status AS group_order_status
       FROM ai_recommendations ar
       LEFT JOIN supplier_products sp ON sp.id = ar.recommended_product_id
       LEFT JOIN group_orders go ON go.id = ar.suggested_group_order_id
       WHERE ar.farmer_id = $1
       ORDER BY ar.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/notifications', async (_req, res) => {
  try {
    const result = await query(`
      SELECT n.id, n.message, n.is_read, n.created_at, s.name AS supplier_name
      FROM notifications n
      JOIN suppliers s ON s.id = n.supplier_id
      ORDER BY n.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
