# Agri Tech Database

PostgreSQL schema for the Agri Tech platform: farmers, suppliers, supplier
products, income/expense tracking, and group buying orders.

## Files

| File               | Purpose                                              |
|--------------------|-------------------------------------------------------|
| `schema.sql`       | Creates all tables, constraints, and indexes           |
| `seed.sql`         | Optional sample data for local testing                 |
| `schema_validation.sql` | Transactional smoke checks for schema helper functions |
| `docker-compose.yml` | Spins up a ready-to-use Postgres instance in Docker  |

## Tables

- **farmers** — registered farmers
- **suppliers** — input/product suppliers
- **supplier_products** — products each supplier offers (1 supplier → many products)
- **expenses** — farmer expense records (1 farmer → many expenses)
- **income** — farmer income records (1 farmer → many income entries)
- **group_orders** — bulk/group buying orders on a supplier product
- **group_order_items** — each farmer's share of a group order
- **ai_recommendations** — matches/suggestions for a farmer (product or group order) with a reason
- **notifications** — alerts to a supplier, optionally tied to a group order

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial Agri Tech PostgreSQL schema"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 2. Run locally with Docker (recommended — no local Postgres install needed)

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` and automatically loads
`schema.sql` and `seed.sql` on first run.

- Database: `agritech`
- User: `agritech_user`
- Password: `change_me` (change this in `docker-compose.yml` before deploying anywhere public)

Connect with:

```bash
psql postgresql://agritech_user:change_me@localhost:5432/agritech
```

## 3. Run against an existing PostgreSQL instance

```bash
psql -h <host> -U <user> -d <database> -f schema.sql
psql -h <host> -U <user> -d <database> -f seed.sql   # optional
```

## 4. Deploying to a hosted Postgres (Render, Railway, Supabase, Neon, etc.)

1. Create a free Postgres instance on your provider of choice.
2. Copy the connection string they give you.
3. Run:
   ```bash
   psql "<connection-string>" -f schema.sql
   ```
4. Update your app's environment variables (`DATABASE_URL`) to point to
   that connection string.

## 5. Validate helper functions

After loading `schema.sql` and `seed.sql`, you can run:

```bash
psql -h <host> -U <user> -d <database> -f schema_validation.sql
```

The script runs transactional smoke checks for repeated group-order joins and
monthly profit boundaries, then rolls everything back.

## Notes

- All foreign keys use `ON DELETE CASCADE` so deleting a farmer/supplier
  cleans up its dependent records automatically — adjust if you want
  soft deletes instead.
- Change the default password in `docker-compose.yml` before deploying
  anywhere outside your own machine.
