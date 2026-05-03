import type { DocumentSubcategory } from '@/src/constants/document-subcategories';

import type { Item, ItemCategory, ItemStatus } from '@/src/types';

/** Row shape returned by SQLite (snake_case columns). */
export interface ItemRow {
  id: string;
  title: string;
  category: string;
  subcategory?: string | null;
  description: string | null;
  issue_date: string | null;
  purchase_date: string | null;
  expiry_date: string | null;
  warranty_until: string | null;
  no_expiry: number | null;
  reminder_days_before: number | null;
  photo_uri: string | null;
  logo_uri: string | null;
  status: string;
  notification_id_expiry: string | null;
  notification_id_warranty: string | null;
  created_at: string;
  updated_at: string;
}

/** Input for creating an item; id and timestamps are optional (auto-generated). */
export type CreateItemInput = {
  title: string;
  category: ItemCategory;
  /** Only when category is `document`; stored as nullable otherwise. */
  subcategory?: DocumentSubcategory | null;
  description?: string | null;
  issue_date?: string | null;
  purchase_date?: string | null;
  expiry_date?: string | null;
  warranty_until?: string | null;
  no_expiry?: boolean;
  reminder_days_before?: number | null;
  photo_uri?: string | null;
  logo_uri?: string | null;
  status?: ItemStatus;
  id?: string;
};

/** Partial update; does not allow changing id or created_at. */
export type UpdateItemInput = Partial<
  Omit<Item, 'id' | 'created_at' | 'updated_at'>
> & {
  id?: never;
  created_at?: never;
};

export type GetUpcomingItemsOptions = {
  /** Include deadlines from today through today + withinDays (default 90). */
  withinDays?: number;
  /** If true, also include items whose nearest deadline is before today. */
  includeOverdue?: boolean;
};

export type { Item, ItemCategory, ItemStatus };
