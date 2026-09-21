import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isSslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
});

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
