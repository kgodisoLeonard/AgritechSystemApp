BEGIN;

SELECT join_group_order(1, 1, 2, 1116.00);
SELECT join_group_order(1, 1, 1, 558.00);

DO $$
DECLARE
    v_quantity INTEGER;
    v_total_price NUMERIC(12,2);
    v_current_quantity INTEGER;
    v_profit NUMERIC;
    v_joined_at TIMESTAMP;
    v_error_message TEXT;
    v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    v_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
    v_month_start DATE := MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, 1);
    v_next_month DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;
    v_previous_month_end DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
BEGIN
    SELECT quantity, total_price
    INTO v_quantity, v_total_price
    FROM group_order_items
    WHERE group_order_id = 1
      AND farmer_id = 1;

    IF v_quantity <> 8 OR v_total_price <> 4464.00 THEN
        RAISE EXCEPTION 'join_group_order did not accumulate existing participation correctly';
    END IF;

    SELECT current_quantity
    INTO v_current_quantity
    FROM group_orders
    WHERE id = 1;

    IF v_current_quantity <> 11 THEN
        RAISE EXCEPTION 'join_group_order did not update the group order quantity correctly';
    END IF;

    SELECT joined_at
    INTO v_joined_at
    FROM group_order_items
    WHERE group_order_id = 1
      AND farmer_id = 1;

    IF v_joined_at IS NULL THEN
        RAISE EXCEPTION 'join_group_order did not preserve a joined_at timestamp';
    END IF;

    INSERT INTO income (farmer_id, item, amount, date) VALUES
    (1, 'Boundary income current month', 100.00, v_month_start),
    (1, 'Boundary income next month', 700.00, v_next_month);

    INSERT INTO expenses (farmer_id, item, category, amount, date) VALUES
    (1, 'Boundary expense previous month', 'test', 50.00, v_previous_month_end),
    (1, 'Boundary expense current month', 'test', 25.00, v_month_start);

    SELECT calculate_monthly_profit(1, v_year, v_month)
    INTO v_profit;

    IF v_profit <> 2825.00 THEN
        RAISE EXCEPTION 'calculate_monthly_profit did not return the expected current month total';
    END IF;

    SELECT calculate_monthly_profit(1, 1999, 1)
    INTO v_profit;

    IF v_profit <> 0 THEN
        RAISE EXCEPTION 'calculate_monthly_profit should return 0 when a month has no rows';
    END IF;

    BEGIN
        PERFORM join_group_order(999, 1, 1, 100.00);
        RAISE EXCEPTION 'join_group_order should fail for missing group orders';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message NOT LIKE 'Group order 999 does not exist%' THEN
                RAISE;
            END IF;
    END;

    BEGIN
        PERFORM join_group_order(1, 1, 10, 5580.00);
        RAISE EXCEPTION 'join_group_order should fail when the target quantity is exceeded';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message NOT LIKE 'Group order 1 exceeds target quantity%' THEN
                RAISE;
            END IF;
    END;

    BEGIN
        PERFORM calculate_monthly_profit(1, v_year, 13);
        RAISE EXCEPTION 'calculate_monthly_profit should fail for invalid months';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message NOT LIKE 'Month must be between 1 and 12.%' THEN
                RAISE;
            END IF;
    END;
END;
$$;

ROLLBACK;
