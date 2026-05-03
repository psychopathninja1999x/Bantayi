import { type SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';

import { DatabaseError } from './errors';
import { CREATE_ITEMS_TABLE_SQL, DB_NAME } from './schema';
import { migrateItemsTable } from './migrations';

let db: SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Open the database and ensure the `items` table exists. Safe to call multiple times.
 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const instance = await openDatabaseAsync(DB_NAME);
        await instance.execAsync(CREATE_ITEMS_TABLE_SQL);
        await migrateItemsTable(instance);
        db = instance;
      } catch (cause) {
        initPromise = null;
        db = null;
        throw new DatabaseError('Failed to initialize SQLite database.', { cause });
      }
    })();
  }

  await initPromise;
}

/** @internal */
export function getDb(): SQLiteDatabase {
  if (!db) {
    throw new DatabaseError('Database not initialized. Call initDatabase() before using item APIs.');
  }
  return db;
}
