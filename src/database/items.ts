import { CATEGORIES } from '@/src/constants/categories';
import type { DocumentSubcategory } from '@/src/constants/document-subcategories';
import { isDocumentSubcategory, parseStoredSubcategory } from '@/src/constants/document-subcategories';
import type { Item, ItemCategory, ItemStatus } from '@/src/types';

import { addCalendarDaysIso, earliestDate, localTodayISO, nowIsoTimestamp } from './date-helpers';
import { getDb } from './db';
import { DatabaseError } from './errors';
import type {
  CreateItemInput,
  GetUpcomingItemsOptions,
  ItemRow,
  UpdateItemInput,
} from './types';

const CATEGORY_SET = new Set<ItemCategory>(CATEGORIES.map((c) => c.code));

const STATUS_SET = new Set<ItemStatus>(['active', 'expired', 'renewed', 'archived']);

function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function assertNonEmptyTitle(title: string): string {
  const t = title.trim();
  if (!t) {
    throw new DatabaseError('title is required.', { code: 'VALIDATION' });
  }
  return t;
}

function assertCategory(value: string): ItemCategory {
  if (!CATEGORY_SET.has(value as ItemCategory)) {
    throw new DatabaseError(`Invalid category: ${value}`, { code: 'VALIDATION' });
  }
  return value as ItemCategory;
}

function assertStatus(value: string): ItemStatus {
  if (!STATUS_SET.has(value as ItemStatus)) {
    throw new DatabaseError(`Invalid status: ${value}`, { code: 'CORRUPT_ROW' });
  }
  return value as ItemStatus;
}

function normalizeSubcategoryWrite(
  category: ItemCategory,
  value: DocumentSubcategory | null | undefined,
): string | null {
  if (category !== 'document') return null;
  if (value == null) return null;
  if (!isDocumentSubcategory(value)) {
    throw new DatabaseError(`Invalid document subcategory: ${value}`, { code: 'VALIDATION' });
  }
  return value;
}

function rowToItem(row: ItemRow): Item {
  const category = assertCategory(row.category);
  return {
    id: row.id,
    title: row.title,
    category,
    subcategory: parseStoredSubcategory(category, row.subcategory ?? null),
    description: row.description ?? '',
    issue_date: row.issue_date,
    purchase_date: row.purchase_date,
    expiry_date: row.expiry_date,
    warranty_until: row.warranty_until,
    no_expiry: row.no_expiry === 1,
    reminder_days_before: row.reminder_days_before,
    photo_uri: row.photo_uri,
    logo_uri: row.logo_uri ?? null,
    status: assertStatus(row.status),
    notification_id_expiry: row.notification_id_expiry ?? null,
    notification_id_warranty: row.notification_id_warranty ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function wrapError(message: string, cause: unknown): DatabaseError {
  if (cause instanceof DatabaseError) return cause;
  return new DatabaseError(message, { cause });
}

async function runAfterItemWrite(itemId: string): Promise<void> {
  try {
    const m = await import('@/src/services/item-reminders');
    await m.syncRemindersAfterItemChange(itemId);
  } catch (e) {
    console.warn('[BanTayi] Reminder sync failed:', e);
  }
}

/**
 * Update stored local notification identifiers (does not touch updated_at).
 */
export async function setItemNotificationIds(
  id: string,
  ids: { notification_id_expiry: string | null; notification_id_warranty: string | null },
): Promise<void> {
  if (!id?.trim()) {
    throw new DatabaseError('id is required.', { code: 'VALIDATION' });
  }
  try {
    const database = getDb();
    await database.runAsync(
      `UPDATE items SET notification_id_expiry = ?, notification_id_warranty = ? WHERE id = ?`,
      [ids.notification_id_expiry, ids.notification_id_warranty, id],
    );
  } catch (e) {
    throw wrapError('Failed to update notification ids.', e);
  }
}

export async function clearAllItemNotificationIds(): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      `UPDATE items SET notification_id_expiry = NULL, notification_id_warranty = NULL`,
    );
  } catch (e) {
    throw wrapError('Failed to clear notification ids.', e);
  }
}

/**
 * Insert a new item. Generates `id`, `created_at`, and `updated_at` unless `id` is provided.
 */
export async function createItem(input: CreateItemInput): Promise<Item> {
  try {
    const database = getDb();
    const title = assertNonEmptyTitle(input.title);
    const category = assertCategory(input.category);
    const id = input.id?.trim() || newId();
    const status: ItemStatus = input.status ?? 'active';
    if (!STATUS_SET.has(status)) {
      throw new DatabaseError(`Invalid status: ${status}`, { code: 'VALIDATION' });
    }

    const ts = nowIsoTimestamp();
    const description = input.description ?? null;
    const issue_date = input.issue_date ?? null;
    const purchase_date = input.purchase_date ?? null;
    const expiry_date = input.expiry_date ?? null;
    const warranty_until = input.warranty_until ?? null;
    const no_expiry = input.no_expiry === true ? 1 : 0;
    const reminder_days_before =
      input.reminder_days_before === undefined || input.reminder_days_before === null
        ? null
        : input.reminder_days_before;
    const photo_uri = input.photo_uri ?? null;
    const logo_uri = input.logo_uri ?? null;
    const subcategory = normalizeSubcategoryWrite(category, input.subcategory ?? null);

    await database.runAsync(
      `INSERT INTO items (
        id, title, category, subcategory, description, issue_date, purchase_date,
        expiry_date, warranty_until, no_expiry, reminder_days_before, photo_uri, logo_uri,
        status, notification_id_expiry, notification_id_warranty,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        category,
        subcategory,
        description,
        issue_date,
        purchase_date,
        expiry_date,
        warranty_until,
        no_expiry,
        reminder_days_before,
        photo_uri,
        logo_uri,
        status,
        null,
        null,
        ts,
        ts,
      ],
    );

    const created = await getItemById(id);
    if (!created) {
      throw new DatabaseError('Item was inserted but could not be read back.', { code: 'INTERNAL' });
    }
    await runAfterItemWrite(id);
    const reloaded = await getItemById(id);
    return reloaded ?? created;
  } catch (e) {
    throw wrapError('Failed to create item.', e);
  }
}

/**
 * All items, most recently updated first.
 */
export async function getAllItems(): Promise<Item[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<ItemRow>(
      `SELECT * FROM items ORDER BY updated_at DESC`,
    );
    return rows.map(rowToItem);
  } catch (e) {
    throw wrapError('Failed to load items.', e);
  }
}

export async function getItemById(id: string): Promise<Item | null> {
  if (!id?.trim()) {
    return null;
  }
  try {
    const database = getDb();
    const row = await database.getFirstAsync<ItemRow>(`SELECT * FROM items WHERE id = ?`, [id]);
    return row ? rowToItem(row) : null;
  } catch (e) {
    throw wrapError('Failed to load item.', e);
  }
}

const UPDATE_FIELDS: (keyof UpdateItemInput)[] = [
  'title',
  'category',
  'subcategory',
  'description',
  'issue_date',
  'purchase_date',
  'expiry_date',
  'warranty_until',
  'no_expiry',
  'reminder_days_before',
  'photo_uri',
  'logo_uri',
  'status',
];

export async function updateItem(id: string, changes: UpdateItemInput): Promise<Item> {
  if (!id?.trim()) {
    throw new DatabaseError('id is required.', { code: 'VALIDATION' });
  }

  try {
    const database = getDb();
    const existing = await getItemById(id);
    if (!existing) {
      throw new DatabaseError(`No item found with id: ${id}`, { code: 'NOT_FOUND' });
    }

    let projectedCategory: ItemCategory = existing.category;
    if (typeof changes.category === 'string') {
      projectedCategory = assertCategory(changes.category);
    }

    const assignments: string[] = [];
    const values: (string | number | null)[] = [];

    for (const key of UPDATE_FIELDS) {
      if (!(key in changes) || changes[key] === undefined) continue;
      const value = changes[key];
      if (key === 'title' && typeof value === 'string') {
        assignments.push('title = ?');
        values.push(assertNonEmptyTitle(value));
        continue;
      }
      if (key === 'category' && typeof value === 'string') {
        const nextCat = assertCategory(value);
        assignments.push('category = ?');
        values.push(nextCat);
        projectedCategory = nextCat;
        if (nextCat !== 'document') {
          assignments.push('subcategory = ?');
          values.push(null);
        }
        continue;
      }
      if (key === 'subcategory') {
        if (projectedCategory !== 'document') continue;
        assignments.push('subcategory = ?');
        values.push(normalizeSubcategoryWrite(projectedCategory, value as DocumentSubcategory | null));
        continue;
      }
      if (key === 'status' && typeof value === 'string') {
        if (!STATUS_SET.has(value as ItemStatus)) {
          throw new DatabaseError(`Invalid status: ${value}`, { code: 'VALIDATION' });
        }
        assignments.push('status = ?');
        values.push(value);
        continue;
      }
      if (key === 'reminder_days_before') {
        assignments.push('reminder_days_before = ?');
        values.push(value === null ? null : (value as number));
        continue;
      }
      if (key === 'no_expiry') {
        assignments.push('no_expiry = ?');
        values.push(value === true ? 1 : 0);
        continue;
      }
      if (key === 'description') {
        assignments.push('description = ?');
        values.push(value === '' || value === undefined ? null : (value as string | null));
        continue;
      }
      const col = key as string;
      assignments.push(`${col} = ?`);
      if (
        key === 'issue_date' ||
        key === 'purchase_date' ||
        key === 'expiry_date' ||
        key === 'warranty_until' ||
        key === 'photo_uri' ||
        key === 'logo_uri'
      ) {
        values.push((value as string | null) ?? null);
      }
    }

    if (assignments.length === 0) {
      const existing = await getItemById(id);
      if (!existing) {
        throw new DatabaseError(`No item found with id: ${id}`, { code: 'NOT_FOUND' });
      }
      return existing;
    }

    const updatedAt = nowIsoTimestamp();
    assignments.push('updated_at = ?');
    values.push(updatedAt, id);

    const sql = `UPDATE items SET ${assignments.join(', ')} WHERE id = ?`;
    const result = await database.runAsync(sql, values);
    if (result.changes === 0) {
      throw new DatabaseError(`No item found with id: ${id}`, { code: 'NOT_FOUND' });
    }

    const updated = await getItemById(id);
    if (!updated) {
      throw new DatabaseError('Item updated but could not be reloaded.', { code: 'INTERNAL' });
    }
    await runAfterItemWrite(id);
    const final = await getItemById(id);
    return final ?? updated;
  } catch (e) {
    throw wrapError('Failed to update item.', e);
  }
}

export async function deleteItem(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new DatabaseError('id is required.', { code: 'VALIDATION' });
  }
  try {
    const database = getDb();
    const existing = await getItemById(id);
    if (existing) {
      const m = await import('@/src/services/item-reminders');
      await m.cancelNotificationsForItem(existing);
    }
    const result = await database.runAsync(`DELETE FROM items WHERE id = ?`, [id]);
    if (result.changes === 0) {
      throw new DatabaseError(`No item found with id: ${id}`, { code: 'NOT_FOUND' });
    }
  } catch (e) {
    throw wrapError('Failed to delete item.', e);
  }
}

export async function replaceAllItems(items: Item[]): Promise<void> {
  try {
    const database = getDb();
    await database.withTransactionAsync(async () => {
      await database.runAsync(`DELETE FROM items`);
      for (const item of items) {
        const category = assertCategory(item.category);
        const status = assertStatus(item.status);
        const subcategory = normalizeSubcategoryWrite(category, item.subcategory ?? null);
        await database.runAsync(
          `INSERT INTO items (
            id, title, category, subcategory, description, issue_date, purchase_date,
            expiry_date, warranty_until, no_expiry, reminder_days_before, photo_uri, logo_uri,
            status, notification_id_expiry, notification_id_warranty,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id?.trim() || newId(),
            assertNonEmptyTitle(item.title),
            category,
            subcategory,
            item.description?.trim() ? item.description : null,
            item.issue_date ?? null,
            item.purchase_date ?? null,
            item.expiry_date ?? null,
            item.warranty_until ?? null,
            item.no_expiry ? 1 : 0,
            item.reminder_days_before ?? null,
            item.photo_uri ?? null,
            item.logo_uri ?? null,
            status,
            null,
            null,
            item.created_at || nowIsoTimestamp(),
            item.updated_at || nowIsoTimestamp(),
          ],
        );
      }
    });
  } catch (e) {
    throw wrapError('Failed to replace vault items.', e);
  }
}

/**
 * Case-insensitive search on title and description. Empty / whitespace query returns no rows.
 * Query is bound as a literal substring (not a LIKE pattern), so `%` / `_` are not wildcards.
 */
export async function searchItems(query: string): Promise<Item[]> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  try {
    const database = getDb();
    const rows = await database.getAllAsync<ItemRow>(
      `SELECT * FROM items
       WHERE LOWER(title) LIKE '%' || ? || '%'
          OR LOWER(COALESCE(description, '')) LIKE '%' || ? || '%'
          OR LOWER(COALESCE(subcategory, '')) LIKE '%' || ? || '%'
       ORDER BY updated_at DESC`,
      [q, q, q],
    );
    return rows.map(rowToItem);
  } catch (e) {
    throw wrapError('Failed to search items.', e);
  }
}

/**
 * Items with a nearest deadline (`expiry_date` / `warranty_until`) in range. Omits rows with no dates.
 * Excludes `archived` by default — archived rows never appear here.
 */
export async function getUpcomingItems(options: GetUpcomingItemsOptions = {}): Promise<Item[]> {
  const withinDays = options.withinDays ?? 90;
  const includeOverdue = options.includeOverdue ?? false;
  if (withinDays < 0) {
    throw new DatabaseError('withinDays must be >= 0.', { code: 'VALIDATION' });
  }

  try {
    const all = await getAllItems();
    const today = localTodayISO();
    const end = addCalendarDaysIso(today, withinDays);

    const filtered = all.filter((item) => {
      if (item.status === 'archived') return false;
      const deadline = earliestDate([item.expiry_date, item.warranty_until]);
      if (deadline === null) return false;
      if (includeOverdue && deadline < today) return true;
      if (!includeOverdue && deadline < today) return false;
      return deadline >= today && deadline <= end;
    });

    filtered.sort((a, b) => {
      const da = earliestDate([a.expiry_date, a.warranty_until]) ?? '';
      const db_ = earliestDate([b.expiry_date, b.warranty_until]) ?? '';
      return da.localeCompare(db_);
    });

    return filtered;
  } catch (e) {
    throw wrapError('Failed to load upcoming items.', e);
  }
}

/**
 * Sets `status` to `renewed` and updates `updated_at`.
 */
export async function markAsRenewed(id: string): Promise<Item> {
  return updateItem(id, { status: 'renewed' });
}
