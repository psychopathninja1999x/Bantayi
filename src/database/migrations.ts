import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Add missing columns for existing installs (idempotent via PRAGMA check).
 */
export async function migrateItemsTable(instance: SQLiteDatabase): Promise<void> {
  const columns = await instance.getAllAsync<{ name: string }>('PRAGMA table_info(items)');
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('notification_id_expiry')) {
    await instance.execAsync('ALTER TABLE items ADD COLUMN notification_id_expiry TEXT');
  }
  if (!names.has('notification_id_warranty')) {
    await instance.execAsync('ALTER TABLE items ADD COLUMN notification_id_warranty TEXT');
  }
  if (!names.has('subcategory')) {
    await instance.execAsync('ALTER TABLE items ADD COLUMN subcategory TEXT');
  }
  if (!names.has('logo_uri')) {
    await instance.execAsync('ALTER TABLE items ADD COLUMN logo_uri TEXT');
  }
  if (!names.has('no_expiry')) {
    await instance.execAsync('ALTER TABLE items ADD COLUMN no_expiry INTEGER NOT NULL DEFAULT 0');
  }
}
