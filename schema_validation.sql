BEGIN;

DO $$
DECLARE
    v_farmer_id INTEGER;
    v_supplier_id INTEGER;
    v_product_id INTEGER;
    v_group_order_id INTEGER;
    v_quantity INTEGER;
    v_total_price NUMERIC(12,2);
    v_current_quantity INTEGER;
    v_profit NUMERIC;
    v_joined_at TIMESTAMP;
    v_error_message TEXT;
    v_year INTEGER := 2026;
    v_month INTEGER := 5;
    v_month_start DATE := DATE '2026-05-01';
    v_month_end DATE := DATE '2026-05-31';
    v_next_month DATE := DATE '2026-06-01';
    v_previous_month_end DATE := DATE '2026-04-30';
BEGIN
    INSERT INTO farmers (name, location, contact)
    VALUES ('Validation Farmer', 'Validation Farm', '000 000 0000')
    RETURNING id INTO v_farmer_id;

    INSERT INTO suppliers (name, location, contact)
    VALUES ('Validation Supplier', 'Validation Town', '000 000 0001')
    RETURNING id INTO v_supplier_id;

    INSERT INTO supplier_products (supplier_id, product_name, price)
    VALUES (v_supplier_id, 'Validation Product', 620.00)
    RETURNING id INTO v_product_id;

    INSERT INTO group_orders (product_id, status, target_quantity, current_quantity, discount_rate)
    VALUES (v_product_id, 'open', 20, 5, 10.00)
    RETURNING id INTO v_group_order_id;

    INSERT INTO group_order_items (group_order_id, farmer_id, quantity, total_price, joined_at)
    VALUES (v_group_order_id, v_farmer_id, 5, 2790.00, NOW() - INTERVAL '1 day');

    PERFORM join_group_order(v_group_order_id, v_farmer_id, 2, 1116.00);
    PERFORM join_group_order(v_group_order_id, v_farmer_id, 1, 558.00);

    SELECT quantity, total_price, joined_at
    INTO v_quantity, v_total_price, v_joined_at
    FROM group_order_items
    WHERE group_order_id = v_group_order_id
      AND farmer_id = v_farmer_id;

    IF v_quantity <> 8 OR v_total_price <> 4464.00 THEN
        RAISE EXCEPTION 'join_group_order did not accumulate existing participation correctly';
    END IF;

    IF v_joined_at IS NULL THEN
        RAISE EXCEPTION 'join_group_order did not preserve a joined_at timestamp';
    END IF;

    SELECT current_quantity
    INTO v_current_quantity
    FROM group_orders
    WHERE id = v_group_order_id;

    IF v_current_quantity <> 8 THEN
        RAISE EXCEPTION 'join_group_order did not update the group order quantity correctly';
    END IF;

    INSERT INTO income (farmer_id, item, amount, date) VALUES
    (v_farmer_id, 'Boundary income current month', 100.00, v_month_start),
    (v_farmer_id, 'Boundary income month end', 60.00, v_month_end),
    (v_farmer_id, 'Boundary income next month', 700.00, v_next_month);

    INSERT INTO expenses (farmer_id, item, category, amount, date) VALUES
    (v_farmer_id, 'Boundary expense previous month', 'test', 50.00, v_previous_month_end),
    (v_farmer_id, 'Boundary expense current month', 'test', 25.00, v_month_start);

    SELECT calculate_monthly_profit(v_farmer_id, v_year, v_month)
    INTO v_profit;

    IF v_profit <> 135.00 THEN
        RAISE EXCEPTION 'calculate_monthly_profit did not include target-month boundary rows and exclude next-month rows correctly';
    END IF;

    SELECT calculate_monthly_profit(v_farmer_id, 1999, 1)
    INTO v_profit;

    IF v_profit <> 0 THEN
        RAISE EXCEPTION 'calculate_monthly_profit should return 0 when a month has no rows';
    END IF;

    BEGIN
        PERFORM join_group_order(-1, v_farmer_id, 1, 100.00);
        RAISE EXCEPTION 'join_group_order should fail for missing group orders';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message NOT LIKE 'Group order -1 does not exist%' THEN
                RAISE;
            END IF;
    END;

    BEGIN
        PERFORM join_group_order(v_group_order_id, v_farmer_id, 20, 11160.00);
        RAISE EXCEPTION 'join_group_order should fail when the target quantity is exceeded';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message NOT LIKE 'Group order % exceeds target quantity%' THEN
                RAISE;
            END IF;
    END;

    BEGIN
        PERFORM join_group_order(v_group_order_id, v_farmer_id, 1, 100.00);
        RAISE EXCEPTION 'join_group_order should fail when the total price does not match the discounted product total';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message NOT LIKE 'Total price % does not match expected discounted total % for group order %' THEN
                RAISE;
            END IF;
    END;

    BEGIN
        PERFORM calculate_monthly_profit(v_farmer_id, v_year, 13);
        RAISE EXCEPTION 'calculate_monthly_profit should fail for invalid months';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message NOT LIKE 'Month must be between 1 and 12.%' THEN
                RAISE;
            END IF;
    END;

    BEGIN
        PERFORM calculate_monthly_profit(v_farmer_id, 6000000, 1);
        RAISE EXCEPTION 'calculate_monthly_profit should fail for invalid years';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message NOT LIKE 'Year must be supported by PostgreSQL date values.%' THEN
                RAISE;
            END IF;
    END;
END;
$$;

ROLLBACK;
