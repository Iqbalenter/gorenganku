export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS business_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL DEFAULT 'GorenganKu',
    owner_name TEXT NOT NULL DEFAULT 'Pemilik',
    location TEXT,
    note TEXT,
    photo_uri TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0,
    category TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    photo_uri TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    item_count INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );`,
  `CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    price REAL NOT NULL,
    unit_cost REAL NOT NULL DEFAULT 0,
    qty INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );`,
];
