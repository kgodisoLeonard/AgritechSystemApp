# Agri Tech Database

PostgreSQL schema for the Agri Tech platform: farmers, suppliers, supplier
products, income/expense tracking, and group buying orders.

## Files

| File               | Purpose                                              |
|--------------------|-------------------------------------------------------|
| `schema.sql`       | Creates all tables, constraints, views, and indexes    |
| `seed.sql`         | Optional sample data for local testing                 |
| `schema_validation.sql` | Transactional smoke checks for schema helper functions |
| `docker-compose.yml` | Builds/runs the database, Node API, and Spring AI service containers |
| `Dockerfile` | Packages PostgreSQL with the schema and seed data       |
| `backend/` | Express API exposed on port `3000` |
| `spring-ai-service/` | Spring Boot AI service exposed on port `8080` |
| `docs/ERD.md`, `docs/erd.mmd` | Entity relationship diagram (Mermaid source)  |
| `.github/workflows/publish-database-image.yml` | Builds/publishes and deploys the full container stack to a VPS |
| `.github/workflows/ci.yml` | Applies schema/seed/validation against Postgres on every push/PR |

The schema also provides procedures for write operations. Use `CALL` with
`add_expense_proc`, `add_income_proc`, `join_group_order_proc`,
`update_group_order_item_status_proc`, `add_recommendation_proc`, and
`send_notification_proc`.

All primary/foreign keys are `VARCHAR(36)` string UUIDs (via
`gen_random_uuid()`), not `SERIAL` integers.

## Tables

- **farmers** — registered farmers
- **suppliers** — input/product suppliers
- **supplier_products** — products each supplier offers (1 supplier → many products)
- **expenses** — farmer expense records (1 farmer → many expenses)
- **income** — farmer income records (1 farmer → many income entries)
- **group_orders** — bulk/group buying orders on a supplier product, linked
  directly to both the product **and** the supplier
- **group_order_items** — each farmer's share of a group order, with a
  `status` column tracking that farmer's order progress
  (`pending → confirmed → paid → delivered`, or `cancelled`)
- **ai_recommendations** — matches/suggestions for a farmer (product or group order) with a reason
- **notifications** — alerts to a supplier, optionally tied to a group order

## Views

- **`supplier_group_orders_view`** — every group order raised on a
  supplier's products, with a `progress_percent` column. A supplier sees
  its group orders with:
  ```sql
  SELECT * FROM supplier_group_orders_view WHERE supplier_id = '<supplier-uuid>';
  ```
- **`farmer_order_progress_view`** — everything a farmer has joined, with
  their own item `status` plus the overall group order's fill percentage:
  ```sql
  SELECT * FROM farmer_order_progress_view WHERE farmer_id = '<farmer-uuid>';
  ```

## Entity Relationship Diagram

See [`docs/ERD.md`](./docs/ERD.md) for the current diagram — farmers and
suppliers are the two central hub entities, every id is a string (UUID),
and each relationship is drawn as its own separate line.


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

This builds the container stack and starts:

- PostgreSQL on `localhost:5433`
- Node API on `localhost:3000`
- Spring AI service on `localhost:8080`

The schema and seed data are loaded on the first startup of a new database
volume.

The GitHub Actions deployment workflow publishes these images to GitHub
Container Registry and deploys them to the VPS:

- `ghcr.io/kgodisoleonard/agritech-db`
- `ghcr.io/kgodisoleonard/agritech-api`
- `ghcr.io/kgodisoleonard/agritech-ai-service`

Before the VPS deployment can run, add these repository secrets in GitHub under
Settings -> Secrets and variables -> Actions:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `POSTGRES_PASSWORD`

Optional AI service secrets:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`

Then run GitHub -> Actions -> Deploy API stack to VPS -> Run workflow -> main. Check that
the `deploy` job says success. If the VPS secrets are missing, the workflow will
still publish the image, but the `deploy` job will be skipped.

The VPS deployment clones/updates this repo in `~/AgritechSystemApp`, writes
the production `.env`, pulls the latest GHCR images, and starts the full stack
with Docker Compose. The schema and seed data are loaded on the first startup
of a new PostgreSQL volume.

- Database: `agritech`
- User: `agritech_user`
- Password: supplied by the `POSTGRES_PASSWORD` secret

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

## Validate helper functions

After loading `schema.sql`, you can run:

```bash
psql -h <host> -U <user> -d <database> -f schema_validation.sql
```

Run `schema.sql` first in its own clean session so its final `COMMIT;` completes
before starting `schema_validation.sql`.

The script creates its own temporary validation records, checks repeated
group-order joins and monthly profit boundaries, then rolls everything back.

## Notes

- All foreign keys use `ON DELETE CASCADE` (except `ai_recommendations`'
  optional links, which use `ON DELETE SET NULL`) so deleting a
  farmer/supplier/group order cleans up its dependent records automatically.
- Change the default password in `docker-compose.yml` before deploying
  anywhere outside your own machine.

## 5. Continuous integration

`.github/workflows/ci.yml` runs on every push/PR that touches `schema.sql`,
`seed.sql`, or `schema_validation.sql`. It spins up Postgres 16 as a service
container and applies all three files in order, so a broken migration or
test never merges silently.

## 6. Automatic deployment to your VPS

`.github/workflows/publish-database-image.yml` publishes the database, Node
API, and Spring AI service images, then deploys the full Docker Compose stack
to a VPS over SSH whenever `main` changes.

1. On the VPS, make sure Docker, Docker Compose, and `git` are installed and
   the deploy user can run `docker`.
2. In the GitHub repo, go to **Settings → Secrets and variables → Actions**
   and add:
   - `VPS_HOST` — the server's public IP (e.g. `92.4.134.156`)
   - `VPS_USER` — the SSH username (e.g. `ubuntu`)
   - `VPS_SSH_KEY` — the **private** key matching a public key already
     authorized on the server (`~/.ssh/authorized_keys`). Never reuse a key
     that has ever been pasted into chat, an issue, or a PR.
3. Push to `main` (or run the workflow manually from the **Actions** tab).
   The workflow publishes images, updates the repo on the server, pulls the
   images, and runs `docker compose up -d --no-build`.
4. Keep PostgreSQL closed to the public internet; this compose file binds it to
   `127.0.0.1:5433`. Use an SSH tunnel when you need to connect from your own
   machine.

