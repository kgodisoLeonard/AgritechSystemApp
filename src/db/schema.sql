-- Farmers: the demand side of the marketplace
CREATE TABLE IF NOT EXISTS farmers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Suppliers: manually onboarded local agri-stores / co-ops
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Products/inputs a supplier can sell (simple listing)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  bulk_min_quantity REAL,
  bulk_price REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Farmer expenses (e.g. buying an input) - farmers can buy from anywhere
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  category TEXT,
  amount REAL NOT NULL,
  quantity REAL,
  latitude REAL,
  longitude REAL,
  supplier_id INTEGER REFERENCES suppliers(id),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Farmer sales
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  amount REAL NOT NULL,
  quantity REAL,
  latitude REAL,
  longitude REAL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Group orders formed when nearby farmers are matched buying the same input
CREATE TABLE IF NOT EXISTS group_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item TEXT NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  status TEXT NOT NULL DEFAULT 'forming', -- forming | matched | closed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_order_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_order_id INTEGER NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  quantity REAL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_order_id, farmer_id)
);

-- Notifications sent to suppliers when a group order forms in their area
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  group_order_id INTEGER NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
