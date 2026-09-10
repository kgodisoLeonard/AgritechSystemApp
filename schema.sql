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
BEGIN
    INSERT INTO group_order_items (group_order_id, farmer_id, quantity, total_price, joined_at)
    VALUES (p_group_order_id, p_farmer_id, p_quantity, p_total_price, NOW());

    UPDATE group_orders
    SET current_quantity = current_quantity + p_quantity
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