import * as ImagePicker from 'expo-image-picker';
import { copyAsync, documentDirectory } from 'expo-file-system/legacy';
import Constants from 'expo-constants';

import type { DocumentSubcategory } from '@/src/constants/document-subcategories';
import type { ItemCategory } from '@/src/types';

type CaptureSource = 'camera' | 'library';

export interface VisualProofScan {
  photoUri: string;
  ocrAvailable: boolean;
  ocrText: string | null;
  detected: DetectedVisualProof;
}

export interface DetectedVisualProof {
  issueDate: string | null;
  expiryDate: string | null;
  warrantyUntil: string | null;
  purchaseDate: string | null;
  category: ItemCategory | null;
  documentSubcategory: DocumentSubcategory | null;
  documentKind: string | null;
  candidateDates: string[];
}

function extFromMime(mime: string | undefined): string {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

async function copyAssetToAppDirectory(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const base = documentDirectory;
  if (!base) {
    throw new Error('This device could not create a permanent app folder.');
  }
  const ext = extFromMime(asset.mimeType ?? undefined);
  const dest = `${base}bantayi_${Date.now()}.${ext}`;
  await copyAsync({ from: asset.uri, to: dest });
  return dest;
}

async function pickImage(source: CaptureSource): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      throw new Error('Allow camera access to scan a visual proof.');
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    return result.canceled ? null : result.assets?.[0] ?? null;
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Allow photo library access to attach an image.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  return result.canceled ? null : result.assets?.[0] ?? null;
}

async function recognizeTextFromImage(
  photoUri: string,
): Promise<{ available: boolean; text: string | null }> {
  if (Constants.appOwnership === 'expo') {
    return { available: false, text: null };
  }

  let recognizeText: (uri: string) => Promise<{ text: string }>;
  try {
    ({ recognizeText } = await import('@infinitered/react-native-mlkit-text-recognition'));
  } catch {
    return { available: false, text: null };
  }

  try {
    const result = await recognizeText(photoUri);
    return { available: true, text: result.text.trim() || null };
  } catch {
    return { available: true, text: null };
  }
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900 &&
    year <= 2100
  );
}

function toISO(year: number, month: number, day: number): string | null {
  if (!isValidDate(year, month, day)) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function parseDatesFromLine(line: string): string[] {
  const dates = new Set<string>();
  const numeric =
    /\b(?:(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4}))\b/g;
  let match: RegExpExecArray | null;

  while ((match = numeric.exec(line))) {
    if (match[1] && match[2] && match[3]) {
      const iso = toISO(Number(match[1]), Number(match[2]), Number(match[3]));
      if (iso) dates.add(iso);
      continue;
    }

    const first = Number(match[4]);
    const second = Number(match[5]);
    let year = Number(match[6]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;

    const dayFirst = toISO(year, second, first);
    const monthFirst = toISO(year, first, second);
    if (dayFirst) dates.add(dayFirst);
    else if (monthFirst) dates.add(monthFirst);
  }

  const monthName =
    /\b(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{2,4})\b|\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{2,4})\b/g;
  while ((match = monthName.exec(line))) {
    if (match[1] && match[2] && match[3]) {
      let year = Number(match[3]);
      if (year < 100) year += year >= 50 ? 1900 : 2000;
      const iso = toISO(year, MONTHS[match[2].toLowerCase()], Number(match[1]));
      if (iso) dates.add(iso);
      continue;
    }

    if (match[4] && match[5] && match[6]) {
      let year = Number(match[6]);
      if (year < 100) year += year >= 50 ? 1900 : 2000;
      const iso = toISO(year, MONTHS[match[4].toLowerCase()], Number(match[5]));
      if (iso) dates.add(iso);
    }
  }

  return [...dates];
}

function lineHasAny(line: string, words: string[]): boolean {
  const lower = line.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function inferCategory(text: string): Pick<
  DetectedVisualProof,
  'category' | 'documentSubcategory' | 'documentKind'
> {
  const lower = text.toLowerCase();

  if (lower.includes('driver') || lower.includes('license') || lower.includes('licence')) {
    return {
      category: 'document',
      documentSubcategory: 'ph_drivers_license',
      documentKind: "Driver's license",
    };
  }
  if (lower.includes('passport')) {
    return { category: 'document', documentSubcategory: 'ph_passport', documentKind: 'Passport' };
  }
  if (lower.includes('nbi')) {
    return {
      category: 'document',
      documentSubcategory: 'nbi_clearance',
      documentKind: 'NBI clearance',
    };
  }
  if (lower.includes('postal id')) {
    return { category: 'document', documentSubcategory: 'postal_id', documentKind: 'Postal ID' };
  }
  if (lower.includes('umid')) {
    return { category: 'document', documentSubcategory: 'umid', documentKind: 'UMID' };
  }
  if (lower.includes('philhealth')) {
    return { category: 'document', documentSubcategory: 'philhealth', documentKind: 'PhilHealth' };
  }
  if (lower.includes('warranty') || lower.includes('receipt') || lower.includes('invoice')) {
    return { category: 'receipt_warranty', documentSubcategory: null, documentKind: 'Receipt or warranty' };
  }
  if (lower.includes('id no') || lower.includes('date of birth') || lower.includes('nationality')) {
    return { category: 'document', documentSubcategory: 'other_document', documentKind: 'ID document' };
  }

  return { category: null, documentSubcategory: null, documentKind: null };
}

export function detectVisualProofDetails(text: string | null): DetectedVisualProof {
  const lines = text?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  const detected: DetectedVisualProof = {
    issueDate: null,
    expiryDate: null,
    warrantyUntil: null,
    purchaseDate: null,
    category: null,
    documentSubcategory: null,
    documentKind: null,
    candidateDates: [],
  };

  const allDates = new Set<string>();
  for (const line of lines) {
    const dates = parseDatesFromLine(line);
    dates.forEach((date) => allDates.add(date));
    if (!dates.length) continue;

    if (lineHasAny(line, ['expiry', 'expires', 'expiration', 'valid until', 'valid thru', 'valid to'])) {
      detected.expiryDate ??= dates[0];
    } else if (lineHasAny(line, ['warranty'])) {
      detected.warrantyUntil ??= dates[0];
    } else if (lineHasAny(line, ['issued', 'issue date', 'date issued'])) {
      detected.issueDate ??= dates[0];
    } else if (lineHasAny(line, ['purchase', 'bought', 'invoice date', 'receipt date'])) {
      detected.purchaseDate ??= dates[0];
    }
  }

  detected.candidateDates = [...allDates].sort();
  if (!detected.expiryDate && detected.candidateDates.length > 0) {
    detected.expiryDate = detected.candidateDates[detected.candidateDates.length - 1];
  }

  Object.assign(detected, inferCategory(text ?? ''));
  return detected;
}

export async function scanVisualProof(source: CaptureSource): Promise<VisualProofScan | null> {
  const asset = await pickImage(source);
  if (!asset) return null;

  const photoUri = await copyAssetToAppDirectory(asset);
  const ocr = await recognizeTextFromImage(photoUri);
  return {
    photoUri,
    ocrAvailable: ocr.available,
    ocrText: ocr.text,
    detected: detectVisualProofDetails(ocr.text),
  };
}
