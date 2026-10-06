-- Preserve existing IDs and data while adding columns required by the APIs.
DO $$
DECLARE
    supplier_id_type text;
BEGIN
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS country VARCHAR(100);
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS province VARCHAR(100);
    SELECT format_type(atttypid, atttypmod) INTO supplier_id_type
    FROM pg_attribute
    WHERE attrelid = 'supplier_products'::regclass AND attname = 'supplier_id'
      AND NOT attisdropped;
    IF supplier_id_type IS NULL THEN
        RAISE EXCEPTION 'supplier_products.supplier_id is required';
    END IF;
    EXECUTE format(
        'ALTER TABLE group_orders ADD COLUMN IF NOT EXISTS supplier_id %s REFERENCES suppliers(id) ON DELETE CASCADE',
        supplier_id_type
    );
    UPDATE group_orders AS orders
    SET supplier_id = products.supplier_id
    FROM supplier_products AS products
    WHERE products.id = orders.product_id AND orders.supplier_id IS NULL;

    EXECUTE format(
        'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS supplier_id %s REFERENCES suppliers(id) ON DELETE CASCADE',
        supplier_id_type
    );
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications'
          AND column_name = 'recipient_type'
    ) THEN
        UPDATE notifications AS notices
        SET supplier_id = suppliers.id
        FROM suppliers
        WHERE lower(notices.recipient_type) = 'supplier'
          AND notices.recipient_id = suppliers.id AND notices.supplier_id IS NULL;
    END IF;
END $$;
