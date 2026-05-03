import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';

/** Philippine / general document subtype when main category is `document`. */

export type DocumentSubcategory =
  | 'ph_drivers_license'
  | 'nbi_clearance'
  | 'ph_passport'
  | 'postal_id'
  | 'umid'
  | 'sss_ph'
  | 'philhealth'
  | 'tin_id'
  | 'prc_license'
  | 'psa_civil_registry'
  | 'other_document';

export type DocumentIconName = ComponentProps<typeof MaterialIcons>['name'];

export interface DocumentSubcategoryInfo {
  code: DocumentSubcategory;
  label: string;
  icon: DocumentIconName;
}

/**
 * Icons are Material fallbacks except where `DOCUMENT_SUBCATEGORY_ART` bundles a PNG
 * (NBI clearance, Philippine driver's licence / LTO context).
 *
 * Seal artwork: Wikimedia Commons, PD Philippine Government (see `assets/images/document-subcats/LICENSE.txt`).
 */
export const DOCUMENT_SUBCATEGORIES: DocumentSubcategoryInfo[] = [
  { code: 'ph_drivers_license', label: "Philippine driver's license", icon: 'drive-eta' },
  { code: 'nbi_clearance', label: 'NBI clearance', icon: 'assignment-ind' },
  { code: 'ph_passport', label: 'Philippine passport', icon: 'book' },
  { code: 'postal_id', label: 'Postal ID', icon: 'mark-email-read' },
  { code: 'umid', label: 'UMID', icon: 'credit-card' },
  { code: 'sss_ph', label: 'SSS (Philippines)', icon: 'account-balance' },
  { code: 'philhealth', label: 'PhilHealth', icon: 'local-hospital' },
  { code: 'tin_id', label: 'TIN ID / BIR', icon: 'receipt-long' },
  { code: 'prc_license', label: 'PRC licence', icon: 'engineering' },
  { code: 'psa_civil_registry', label: 'PSA civil registry certificate', icon: 'description' },
  { code: 'other_document', label: 'Other document', icon: 'folder-shared' },
];

const BY_CODE = Object.fromEntries(
  DOCUMENT_SUBCATEGORIES.map((x) => [x.code, x]),
) as Record<DocumentSubcategory, DocumentSubcategoryInfo>;

const CODE_SET = new Set<DocumentSubcategory>(DOCUMENT_SUBCATEGORIES.map((c) => c.code));

/** Bundled thumbnails (Philippine gov works, Wikimedia Commons / PD‑PHGov). */
export const DOCUMENT_SUBCATEGORY_ART: Partial<Record<DocumentSubcategory, ImageSourcePropType>> = {
  nbi_clearance: require('../../assets/images/document-subcats/nbi_clearance.png'),
  ph_drivers_license: require('../../assets/images/document-subcats/ph_drivers_license.png'),
};

export function getDocumentSubcategoryInfo(code: string | null | undefined): DocumentSubcategoryInfo | null {
  if (!code || !CODE_SET.has(code as DocumentSubcategory)) return null;
  return BY_CODE[code as DocumentSubcategory];
}

export function isDocumentSubcategory(value: string | null | undefined): value is DocumentSubcategory {
  return value != null && CODE_SET.has(value as DocumentSubcategory);
}

export function parseStoredSubcategory(
  categoryCode: string,
  raw: string | null | undefined,
): DocumentSubcategory | null {
  if (categoryCode !== 'document') return null;
  if (!raw?.trim()) return null;
  return CODE_SET.has(raw as DocumentSubcategory) ? (raw as DocumentSubcategory) : null;
}
