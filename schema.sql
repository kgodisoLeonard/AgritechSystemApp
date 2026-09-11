-- ============================================================
-- Agri Tech Database Schema (PostgreSQL)
-- Generated from Agri_Tech_Schema ER diagram
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- farmers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farmers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    location    VARCHAR(150),
    contact     VARCHAR(100),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- suppliers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    location    VARCHAR(150),
    contact     VARCHAR(100)
);

-- ------------------------------------------------------------
-- supplier_products  (1 supplier -> * products)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplier_products (
    id              SERIAL PRIMARY KEY,
    supplier_id     INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_name    VARCHAR(150) NOT NULL,
    price           DECIMAL(12,2) NOT NULL CHECK (price >= 0)
);

-- ------------------------------------------------------------
-- expenses  (1 farmer -> * expenses)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id          SERIAL PRIMARY KEY,
    farmer_id   INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    item        VARCHAR(150) NOT NULL,
    category    VARCHAR(100),
    amount      DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    date        DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ------------------------------------------------------------
-- income  (1 farmer -> * income records)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS income (
    id          SERIAL PRIMARY KEY,
    farmer_id   INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    item        VARCHAR(150) NOT NULL,
    amount      DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    date        DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ------------------------------------------------------------
-- group_orders  (1 supplier_product -> * group_orders)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_orders (
    id                SERIAL PRIMARY KEY,
    product_id        INTEGER NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
    status            VARCHAR(50) NOT NULL DEFAULT 'open',
    target_quantity   INTEGER NOT NULL CHECK (target_quantity > 0),
    current_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    discount_rate     DECIMAL(5,2) DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- group_order_items  (1 group_order -> * items, 1 farmer -> * items)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_order_items (
    id              SERIAL PRIMARY KEY,
    group_order_id  INTEGER NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    farmer_id       INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    total_price     DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
    joined_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (group_order_id, farmer_id)
);

-- ------------------------------------------------------------
-- ai_recommendations  (1 farmer -> * recommendations)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id                    SERIAL PRIMARY KEY,
    farmer_id             INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    recommendation_text   TEXT NOT NULL,
    category              VARCHAR(50) CHECK (category IN ('spending', 'group_order', 'pricing')),
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- notifications  (recipient can be a farmer or a supplier)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    recipient_type  VARCHAR(20) NOT NULL CHECK (recipient_type IN ('farmer', 'supplier')),
    recipient_id    INTEGER NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- helper functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_expense(
    p_farmer_id INTEGER,
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
    p_farmer_id INTEGER,
    p_item VARCHAR,
    p_amount DECIMAL(12,2)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO income (farmer_id, item, amount, date)
    VALUES (p_farmer_id, p_item, p_amount, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION join_group_order(
    p_group_order_id INTEGER,
    p_farmer_id INTEGER,
    p_quantity INTEGER,
    p_total_price DECIMAL(12,2)
)
RETURNS VOID AS $$
DECLARE
    v_current_quantity INTEGER;
    v_target_quantity INTEGER;
BEGIN
    SELECT current_quantity, target_quantity
    INTO v_current_quantity, v_target_quantity
    FROM group_orders
    WHERE id = p_group_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group order % does not exist', p_group_order_id;
    END IF;

    IF v_current_quantity + p_quantity > v_target_quantity THEN
        RAISE EXCEPTION 'Group order % exceeds target quantity', p_group_order_id;
    END IF;

    INSERT INTO group_order_items (group_order_id, farmer_id, quantity, total_price, joined_at)
    VALUES (p_group_order_id, p_farmer_id, p_quantity, p_total_price, NOW())
    ON CONFLICT (group_order_id, farmer_id) DO UPDATE
    SET quantity = group_order_items.quantity + EXCLUDED.quantity,
        total_price = group_order_items.total_price + EXCLUDED.total_price,
        joined_at = NOW();

    UPDATE group_orders
    SET current_quantity = v_current_quantity + p_quantity
    WHERE id = p_group_order_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_recommendation(
    p_farmer_id INTEGER,
    p_text TEXT,
    p_category VARCHAR
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_recommendations (farmer_id, recommendation_text, category, created_at)
    VALUES (p_farmer_id, p_text, p_category, NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION send_notification(
    p_recipient_type VARCHAR,
    p_recipient_id INTEGER,
    p_message TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (recipient_type, recipient_id, message, is_read, created_at)
    VALUES (p_recipient_type, p_recipient_id, p_message, FALSE, NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_monthly_profit(
    p_farmer_id INTEGER,
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

    v_month_start := MAKE_DATE(p_year, p_month, 1);
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
-- Helpful indexes for foreign keys / common lookups
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_farmer_id            ON expenses(farmer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_farmer_date          ON expenses(farmer_id, date);
CREATE INDEX IF NOT EXISTS idx_income_farmer_id              ON income(farmer_id);
CREATE INDEX IF NOT EXISTS idx_income_farmer_date            ON income(farmer_id, date);
CREATE INDEX IF NOT EXISTS idx_group_orders_product_id       ON group_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_group_order_items_order_id    ON group_order_items(group_order_id);
CREATE INDEX IF NOT EXISTS idx_group_order_items_farmer_id   ON group_order_items(farmer_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_farmer_id  ON ai_recommendations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient       ON notifications(recipient_type, recipient_id);

COMMIT;
