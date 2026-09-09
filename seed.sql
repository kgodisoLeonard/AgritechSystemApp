-- ============================================================
-- Sample seed data (optional) — run after schema.sql
-- ============================================================

INSERT INTO farmers (name, location, contact) VALUES
('Thabo Mokoena', 'Polokwane', '082 111 2233'),
('Nomvula Dlamini', 'Tzaneen', '083 444 5566');

INSERT INTO suppliers (name, location, contact) VALUES
('Limpopo Agri Supplies', 'Polokwane', '015 123 4567'),
('GreenGro Fertilizers', 'Nelspruit', '013 987 6543');

INSERT INTO supplier_products (supplier_id, product_name, price) VALUES
(1, 'Maize Seed 10kg', 450.00),
(1, 'NPK Fertilizer 50kg', 620.00),
(2, 'Organic Compost 25kg', 210.00);

INSERT INTO expenses (farmer_id, item, category, amount, date) VALUES
(1, 'Maize Seed 10kg', 'seeds', 450.00, CURRENT_DATE),
(2, 'Organic Compost 25kg', 'fertilizer', 210.00, CURRENT_DATE);

INSERT INTO income (farmer_id, item, amount, date) VALUES
(1, 'Maize sale - local market', 3200.00, CURRENT_DATE),
(2, 'Vegetable sale', 1500.00, CURRENT_DATE);

INSERT INTO group_orders (product_id, status, target_quantity, current_quantity, discount_rate) VALUES
(2, 'open', 20, 8, 10.00);

INSERT INTO group_order_items (group_order_id, farmer_id, quantity, total_price, joined_at) VALUES
(1, 1, 5, 2790.00, NOW()),
(1, 2, 3, 1674.00, NOW());
