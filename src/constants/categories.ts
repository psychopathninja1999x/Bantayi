import type { ItemCategory } from '@/src/types';

export interface CategoryInfo {
  code: ItemCategory;
  label: string;
}

/**
 * Vault categories — English labels.
 */
export const CATEGORIES: CategoryInfo[] = [
  { code: 'item', label: 'Item' },
  { code: 'bill_due', label: 'Bill due date' },
  { code: 'card_expiry', label: 'Card expiry' },
  { code: 'document', label: 'Document' },
  { code: 'receipt_warranty', label: 'Receipt / warranty' },
  { code: 'medicine', label: 'Medicine' },
  { code: 'vehicle', label: 'Vehicle' },
  { code: 'subscription', label: 'Subscription' },
  { code: 'insurance', label: 'Insurance' },
  { code: 'appliance', label: 'Appliance' },
  { code: 'gadget', label: 'Gadget' },
  { code: 'other', label: 'Other' },
];

const byCode = Object.fromEntries(CATEGORIES.map((c) => [c.code, c])) as Record<ItemCategory, CategoryInfo>;

export function getCategoryInfo(code: ItemCategory): CategoryInfo {
  return byCode[code];
}
