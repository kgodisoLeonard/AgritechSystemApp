import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isSslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

export const pool = new Pool({
  ...connectionConfig,
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
