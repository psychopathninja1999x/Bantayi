export const DB_NAME = 'bantayi.db';

export const CREATE_ITEMS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  issue_date TEXT,
  purchase_date TEXT,
  expiry_date TEXT,
  warranty_until TEXT,
  no_expiry INTEGER NOT NULL DEFAULT 0,
  reminder_days_before INTEGER,
  photo_uri TEXT,
  logo_uri TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notification_id_expiry TEXT,
  notification_id_warranty TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
