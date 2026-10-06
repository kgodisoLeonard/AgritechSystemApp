import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';

test('farmer ID migration preserves legacy records, relations, routines, and permits UUID registration', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = `farmer_id_test_${randomUUID().replaceAll('-', '')}`;
  const migration = readFileSync(new URL('../../scripts/migrate-farmer-text-ids.sql', import.meta.url), 'utf8');
  try {
    await db.connect();
    await db.query('BEGIN');
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`SET LOCAL search_path TO ${schema}, public`);
    await db.query(`
      CREATE TABLE farmers (id SERIAL PRIMARY KEY, name TEXT, contact TEXT);
      CREATE TABLE expenses (id SERIAL PRIMARY KEY, farmer_id INTEGER REFERENCES farmers(id) ON DELETE CASCADE, item TEXT, category TEXT, amount NUMERIC, date DATE);
      CREATE TABLE income (id SERIAL PRIMARY KEY, farmer_id INTEGER REFERENCES farmers(id) ON DELETE CASCADE, item TEXT, amount NUMERIC, date DATE);
      CREATE TABLE group_order_items (id SERIAL PRIMARY KEY, farmer_id INTEGER REFERENCES farmers(id) ON DELETE CASCADE);
      CREATE TABLE ai_recommendations (id SERIAL PRIMARY KEY, farmer_id INTEGER REFERENCES farmers(id) ON DELETE CASCADE);
      INSERT INTO farmers(id,name,contact) VALUES(7,'Legacy farmer','legacy');
      INSERT INTO expenses(farmer_id,item,amount,date) VALUES(7,'Legacy expense',5,CURRENT_DATE);
      INSERT INTO income(farmer_id,item,amount,date) VALUES(7,'Legacy income',20,CURRENT_DATE);
      INSERT INTO group_order_items(farmer_id) VALUES(7);
      INSERT INTO ai_recommendations(farmer_id) VALUES(7);
      CREATE FUNCTION calculate_monthly_profit(p_farmer_id INTEGER, p_year INTEGER, p_month INTEGER)
      RETURNS NUMERIC LANGUAGE plpgsql AS $body$
      BEGIN
        RETURN (SELECT COALESCE(SUM(amount),0) FROM income WHERE farmer_id=p_farmer_id)
          - (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE farmer_id=p_farmer_id);
      END $body$;
    `);
    const snapshot = async () => {
      const rows = {};
      for (const table of ['farmers', 'expenses', 'income', 'group_order_items', 'ai_recommendations']) {
        const fields = table === 'farmers' ? '' : ", 'farmer_id', farmer_id::text";
        rows[table] = (await db.query(`SELECT to_jsonb(t)||jsonb_build_object('id',id::text${fields}) AS record FROM ${table} AS t ORDER BY id`)).rows;
      }
      return rows;
    };
    const before = await snapshot();
    await db.query(migration);
    await db.query(migration);
    assert.deepEqual(await snapshot(), before);
    const keys = (await db.query("SELECT convalidated FROM pg_constraint WHERE contype='f' AND confrelid='farmers'::regclass")).rows;
    assert.equal(keys.length, 4);
    assert.ok(keys.every((key) => key.convalidated));
    const farmerId = (await db.query("INSERT INTO farmers(name) VALUES('New farmer') RETURNING id")).rows[0].id;
    assert.match(farmerId, /^[0-9a-f-]{36}$/);
    await db.query("INSERT INTO expenses(farmer_id,item,amount) VALUES($1,'UUID expense',5)", [farmerId]);
    await db.query("INSERT INTO income(farmer_id,item,amount) VALUES($1,'UUID income',20)", [farmerId]);
    const uuidProfit = (await db.query('SELECT calculate_monthly_profit($1::varchar,2026,10) AS value', [farmerId])).rows[0].value;
    assert.equal(Number(uuidProfit), 15);
    const legacyProfit = (await db.query('SELECT calculate_monthly_profit(7::integer,2026,10) AS value')).rows[0].value;
    assert.equal(Number(legacyProfit), 15);
    await assert.rejects(db.query("INSERT INTO expenses(farmer_id) VALUES('nonexistent')"), /foreign key constraint/);
  } finally {
    await db.query('ROLLBACK');
    await db.end();
  }
});
