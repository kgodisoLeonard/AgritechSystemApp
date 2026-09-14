-- ============================================================
-- Agri Tech Database Schema (PostgreSQL)
-- Generated from Agri_Tech_Schema ER diagram
-- v2: string (UUID) primary/foreign keys, direct supplier <-> group_orders
--     link, and order-progress tracking on group_order_items
-- ============================================================

BEGIN;

-- UUIDs are generated with gen_random_uuid(); pgcrypto provides it.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- farmers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farmers (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name        VARCHAR(150) NOT NULL,
    location    VARCHAR(150),
    contact     VARCHAR(100),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- suppliers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name        VARCHAR(150) NOT NULL,
    location    VARCHAR(150),
    contact     VARCHAR(100),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- supplier_products  (1 supplier -> * products)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_products (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    supplier_id     VARCHAR(36) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_name    VARCHAR(150) NOT NULL,
    price           DECIMAL(12,2) NOT NULL CHECK (price >= 0)
);

-- ------------------------------------------------------------
-- expenses  (1 farmer -> * expenses)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    farmer_id   VARCHAR(36) NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    item        VARCHAR(150) NOT NULL,
    category    VARCHAR(100),
    amount      DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    date        DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ------------------------------------------------------------
-- income  (1 farmer -> * income records)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS income (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    farmer_id   VARCHAR(36) NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    item        VARCHAR(150) NOT NULL,
    amount      DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    date        DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ------------------------------------------------------------
-- group_orders
-- (1 supplier_product -> * group_orders, and a DIRECT link to
--  suppliers so a supplier can see every group order on its own
--  products without going through supplier_products)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_orders (
    id                VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id        VARCHAR(36) NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
    supplier_id       VARCHAR(36) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    status            VARCHAR(50) NOT NULL DEFAULT 'open',
    target_quantity   INTEGER NOT NULL CHECK (target_quantity > 0),
    current_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    discount_rate     DECIMAL(5,2) DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- group_order_items
-- (1 group_order -> * items, 1 farmer -> * items)
-- `status` tracks each farmer's individual progress within the
-- group order (pending -> confirmed -> paid -> delivered)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_order_items (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    group_order_id  VARCHAR(36) NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    farmer_id       VARCHAR(36) NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    total_price     DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
    status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'paid', 'delivered', 'cancelled')),
    joined_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (group_order_id, farmer_id)
);

-- ------------------------------------------------------------
-- ai_recommendations (matches farmers buying similar inputs nearby)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id                          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    farmer_id                   VARCHAR(36) NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    recommended_product_id      VARCHAR(36) REFERENCES supplier_products(id) ON DELETE SET NULL,
    suggested_group_order_id    VARCHAR(36) REFERENCES group_orders(id) ON DELETE SET NULL,
    reason                      TEXT NOT NULL,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- notifications (alerts suppliers when group orders form nearby)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    supplier_id     VARCHAR(36) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    group_order_id  VARCHAR(36) REFERENCES group_orders(id) ON DELETE CASCADE,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- helper functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_expense(
    p_farmer_id VARCHAR(36),
    p_item VARCHAR,
    p_category VARCHAR,
    p_amount DECIMAL(12,2)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO expenses (farmer_id, item, category, amount, date)
    VALUES (p_farmer_id, p_item, p_category, p_amount, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_income(
    p_farmer_id VARCHAR(36),
    p_item VARCHAR,
    p_amount DECIMAL(12,2)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO income (farmer_id, item, amount, date)
    VALUES (p_farmer_id, p_item, p_amount, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION group_order_join_lock_namespace()
RETURNS INTEGER AS $$
BEGIN
    RETURN hashtext('agritech.group_order_join');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION join_group_order(
    p_group_order_id VARCHAR(36),
    p_farmer_id VARCHAR(36),
    p_quantity INTEGER,
    p_total_price DECIMAL(12,2)
)
RETURNS VOID AS $$
DECLARE
    v_current_quantity INTEGER;
    v_target_quantity INTEGER;
    v_status VARCHAR(50);
    v_discounted_unit_price NUMERIC(12,2);
    v_expected_total_price NUMERIC(12,2);
BEGIN
    PERFORM pg_advisory_xact_lock(group_order_join_lock_namespace(), hashtext(p_group_order_id));

    SELECT go.target_quantity,
           go.status,
           ROUND((sp.price * (1 - COALESCE(go.discount_rate, 0) / 100.0))::NUMERIC, 2)
    INTO v_target_quantity, v_status, v_discounted_unit_price
    FROM group_orders go
    JOIN supplier_products sp ON sp.id = go.product_id
    WHERE go.id = p_group_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group order % does not exist', p_group_order_id;
    END IF;

    IF v_status <> 'open' THEN
        RAISE EXCEPTION 'Group order % is not open for new joins', p_group_order_id;
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than 0. Got %', p_quantity;
    END IF;

    SELECT COALESCE(SUM(quantity), 0)
    INTO v_current_quantity
    FROM group_order_items
    WHERE group_order_id = p_group_order_id;

    IF v_current_quantity + p_quantity > v_target_quantity THEN
        RAISE EXCEPTION 'Group order % exceeds target quantity', p_group_order_id;
    END IF;

    v_expected_total_price := ROUND((v_discounted_unit_price * p_quantity)::NUMERIC, 2);

    IF ROUND(p_total_price::NUMERIC, 2) <> v_expected_total_price THEN
        RAISE EXCEPTION 'Total price % does not match expected discounted total % for group order %',
            p_total_price,
            v_expected_total_price,
            p_group_order_id;
    END IF;

    PERFORM 1
    FROM group_order_items
    WHERE group_order_id = p_group_order_id
      AND farmer_id = p_farmer_id
    FOR UPDATE;

    INSERT INTO group_order_items (group_order_id, farmer_id, quantity, total_price, status, joined_at)
    VALUES (p_group_order_id, p_farmer_id, p_quantity, p_total_price, 'confirmed', NOW())
    ON CONFLICT (group_order_id, farmer_id) DO UPDATE
    SET quantity = group_order_items.quantity + EXCLUDED.quantity,
        total_price = group_order_items.total_price + EXCLUDED.total_price,
        status = 'confirmed',
        joined_at = NOW();

    UPDATE group_orders
    SET current_quantity = COALESCE((
        SELECT SUM(quantity)
        FROM group_order_items
        WHERE group_order_id = p_group_order_id
    ), 0)
    WHERE id = p_group_order_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_group_order_item_status(
    p_group_order_id VARCHAR(36),
    p_farmer_id VARCHAR(36),
    p_status VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    IF p_status NOT IN ('pending', 'confirmed', 'paid', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid group order item status: %', p_status;
    END IF;

    UPDATE group_order_items
    SET status = p_status
    WHERE group_order_id = p_group_order_id
      AND farmer_id = p_farmer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No group_order_items row for group order % and farmer %', p_group_order_id, p_farmer_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_recommendation(
    p_farmer_id VARCHAR(36),
    p_recommended_product_id VARCHAR(36),
    p_suggested_group_order_id VARCHAR(36),
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_recommendations (farmer_id, recommended_product_id, suggested_group_order_id, reason, created_at)
    VALUES (p_farmer_id, p_recommended_product_id, p_suggested_group_order_id, p_reason, NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION send_notification(
    p_supplier_id VARCHAR(36),
    p_group_order_id VARCHAR(36),
    p_message TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (supplier_id, group_order_id, message, is_read, created_at)
    VALUES (p_supplier_id, p_group_order_id, p_message, FALSE, NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_monthly_profit(
    p_farmer_id VARCHAR(36),
    p_year INTEGER,
    p_month INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
    v_month_start DATE;
    v_next_month DATE;
    total_income NUMERIC;
    total_expense NUMERIC;
BEGIN
    IF p_month < 1 OR p_month > 12 THEN
        RAISE EXCEPTION 'Month must be between 1 and 12. Got %', p_month;
    END IF;

    BEGIN
        v_month_start := MAKE_DATE(p_year, p_month, 1);
    EXCEPTION
        WHEN SQLSTATE '22008' OR SQLSTATE '22007' THEN
            RAISE EXCEPTION 'Year/month input must resolve to a PostgreSQL-supported date. Got year %, month %',
                p_year,
                p_month;
    END;

    v_next_month := (v_month_start + INTERVAL '1 month')::DATE;

    SELECT COALESCE(SUM(amount), 0)
    INTO total_income
    FROM income
    WHERE farmer_id = p_farmer_id
      AND date >= v_month_start
      AND date < v_next_month;

    SELECT COALESCE(SUM(amount), 0)
    INTO total_expense
    FROM expenses
    WHERE farmer_id = p_farmer_id
      AND date >= v_month_start
      AND date < v_next_month;

    RETURN total_income - total_expense;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- procedures
-- ------------------------------------------------------------
CREATE OR REPLACE PROCEDURE add_expense_proc(
    p_farmer_id VARCHAR(36),
    p_item VARCHAR,
    p_category VARCHAR,
    p_amount DECIMAL(12,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM add_expense(p_farmer_id, p_item, p_category, p_amount);
END;
$$;

CREATE OR REPLACE PROCEDURE add_income_proc(
    p_farmer_id VARCHAR(36),
    p_item VARCHAR,
    p_amount DECIMAL(12,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM add_income(p_farmer_id, p_item, p_amount);
END;
$$;

CREATE OR REPLACE PROCEDURE join_group_order_proc(
    p_group_order_id VARCHAR(36),
    p_farmer_id VARCHAR(36),
    p_quantity INTEGER,
    p_total_price DECIMAL(12,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM join_group_order(p_group_order_id, p_farmer_id, p_quantity, p_total_price);
END;
$$;

CREATE OR REPLACE PROCEDURE update_group_order_item_status_proc(
    p_group_order_id VARCHAR(36),
    p_farmer_id VARCHAR(36),
    p_status VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM update_group_order_item_status(p_group_order_id, p_farmer_id, p_status);
END;
$$;

CREATE OR REPLACE PROCEDURE add_recommendation_proc(
    p_farmer_id VARCHAR(36),
    p_recommended_product_id VARCHAR(36),
    p_suggested_group_order_id VARCHAR(36),
    p_reason TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM add_recommendation(p_farmer_id, p_recommended_product_id, p_suggested_group_order_id, p_reason);
END;
$$;

CREATE OR REPLACE PROCEDURE send_notification_proc(
    p_supplier_id VARCHAR(36),
    p_group_order_id VARCHAR(36),
    p_message TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM send_notification(p_supplier_id, p_group_order_id, p_message);
END;
$$;

-- ------------------------------------------------------------
-- Views
-- ------------------------------------------------------------

-- Lets a supplier see every group order raised against its own
-- products, with a fill-progress percentage, in one query:
--   SELECT * FROM supplier_group_orders_view WHERE supplier_id = '<id>';
CREATE OR REPLACE VIEW supplier_group_orders_view AS
SELECT
    go.id                 AS group_order_id,
    go.supplier_id,
    s.name                AS supplier_name,
    go.product_id,
    sp.product_name,
    go.status,
    go.target_quantity,
    go.current_quantity,
    ROUND((go.current_quantity::NUMERIC / go.target_quantity) * 100, 2) AS progress_percent,
    go.discount_rate,
    go.created_at
FROM group_orders go
JOIN suppliers s        ON s.id = go.supplier_id
JOIN supplier_products sp ON sp.id = go.product_id;

-- Lets a farmer (or the app on their behalf) track the progress
-- of everything they've joined:
--   SELECT * FROM farmer_order_progress_view WHERE farmer_id = '<id>';
CREATE OR REPLACE VIEW farmer_order_progress_view AS
SELECT
    goi.farmer_id,
    goi.group_order_id,
    goi.status            AS item_status,
    goi.quantity,
    goi.total_price,
    go.status              AS group_order_status,
    go.target_quantity,
    go.current_quantity,
    ROUND((go.current_quantity::NUMERIC / go.target_quantity) * 100, 2) AS group_order_progress_percent,
    sp.product_name,
    s.id                    AS supplier_id,
    s.name                  AS supplier_name,
    goi.joined_at
FROM group_order_items goi
JOIN group_orders go        ON go.id = goi.group_order_id
JOIN supplier_products sp   ON sp.id = go.product_id
JOIN suppliers s             ON s.id = go.supplier_id;

-- ------------------------------------------------------------
-- Helpful indexes for foreign keys / common lookups
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_farmer_id            ON expenses(farmer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_farmer_date          ON expenses(farmer_id, date);
CREATE INDEX IF NOT EXISTS idx_income_farmer_id              ON income(farmer_id);
CREATE INDEX IF NOT EXISTS idx_income_farmer_date            ON income(farmer_id, date);
CREATE INDEX IF NOT EXISTS idx_group_orders_product_id       ON group_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_group_orders_supplier_id      ON group_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_group_order_items_order_id    ON group_order_items(group_order_id);
CREATE INDEX IF NOT EXISTS idx_group_order_items_farmer_id   ON group_order_items(farmer_id);
CREATE INDEX IF NOT EXISTS idx_group_order_items_status      ON group_order_items(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_farmer_id  ON ai_recommendations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_supplier        ON notifications(supplier_id);

COMMIT;
