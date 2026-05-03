/**
 * Item model for BanTayi (SQLite will mirror these fields in a later step).
 */
import type { DocumentSubcategory } from '@/src/constants/document-subcategories';

export type ItemCategory =
  | 'item'
  | 'bill_due'
  | 'card_expiry'
  | 'document'
  | 'receipt_warranty'
  | 'medicine'
  | 'vehicle'
  | 'subscription'
  | 'insurance'
  | 'appliance'
  | 'gadget'
  | 'other';

export type ItemStatus = 'active' | 'expired' | 'renewed' | 'archived';

export interface Item {
  id: string;
  title: string;
  category: ItemCategory;
  /** Document subtype(s) — only used when `category === 'document'`. */
  subcategory: DocumentSubcategory | null;
  description: string;
  issue_date: string | null;
  purchase_date: string | null;
  expiry_date: string | null;
  warranty_until: string | null;
  no_expiry: boolean;
  reminder_days_before: number | null;
  photo_uri: string | null;
  logo_uri: string | null;
  status: ItemStatus;
  notification_id_expiry: string | null;
  notification_id_warranty: string | null;
  created_at: string;
  updated_at: string;
}
