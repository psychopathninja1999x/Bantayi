import * as DocumentPicker from 'expo-document-picker';
import {
  cacheDirectory,
  documentDirectory,
  EncodingType,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
  StorageAccessFramework,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { getAllItems, replaceAllItems } from '@/src/database';
import type { Item } from '@/src/types';

import { getAppLockEnabled, isPinConfigured, setAppLockEnabled } from './pin-lock';
import {
  getRemindersEnabled,
  onRemindersGloballyDisabled,
  onRemindersGloballyEnabled,
  setRemindersEnabled,
} from './item-reminders';
import { getProfile, saveProfile, type UserProfile } from './profile';

const BACKUP_MAGIC = 'BanTayiBackup';
const BACKUP_VERSION = 1;
const BACKUP_EXT = 'bantayi';
const BACKUP_MIME = 'application/vnd.bantayi.backup';
const KDF_ROUNDS = 1200;

interface BackupAsset {
  key: string;
  filename: string;
  base64: string;
}

interface BackupItem extends Omit<Item, 'photo_uri' | 'logo_uri'> {
  photo_asset_key: string | null;
  logo_asset_key: string | null;
}

interface BackupPayload {
  app: 'BanTayi';
  schemaVersion: 1;
  createdAt: string;
  profile: UserProfile | null;
  settings: {
    appLockEnabled: boolean;
    remindersEnabled: boolean;
  };
  items: BackupItem[];
  assets: BackupAsset[];
}

interface BackupEnvelope {
  magic: typeof BACKUP_MAGIC;
  version: typeof BACKUP_VERSION;
  kdf: 'sha256-chain-v1';
  rounds: number;
  saltHex: string;
  nonceHex: string;
  payloadHex: string;
  macHex: string;
}

export interface BackupResult {
  uri: string;
  filename: string;
  itemCount: number;
  assetCount: number;
  shared: boolean;
  savedToFileManager: boolean;
}

export interface RestoreResult {
  itemCount: number;
  assetCount: number;
}

function requirePassphrase(passphrase: string): string {
  const clean = passphrase.trim();
  if (clean.length < 8) {
    throw new Error('Backup passphrase must be at least 8 characters.');
  }
  return clean;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[\da-f]*$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Backup file is damaged.');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function utf8Encode(value: string): Uint8Array {
  const encoded = encodeURIComponent(value);
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i += 1) {
    if (encoded[i] === '%') {
      bytes.push(Number.parseInt(encoded.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(encoded.charCodeAt(i));
    }
  }
  return new Uint8Array(bytes);
}

function utf8Decode(bytes: Uint8Array): string {
  let encoded = '';
  for (const b of bytes) {
    encoded += `%${b.toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(encoded);
}

async function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

async function deriveKey(passphrase: string, saltHex: string, rounds: number): Promise<string> {
  let key = await sha256(`bantayi-backup|${saltHex}|${passphrase}`);
  for (let i = 0; i < rounds; i += 1) {
    key = await sha256(`${key}|${i}|${passphrase}|${saltHex}`);
  }
  return key;
}

async function xorWithKeyStream(bytes: Uint8Array, key: string, nonceHex: string): Promise<Uint8Array> {
  const out = new Uint8Array(bytes.length);
  let offset = 0;
  let counter = 0;
  while (offset < bytes.length) {
    const block = hexToBytes(await sha256(`${key}|${nonceHex}|${counter}`));
    for (let i = 0; i < block.length && offset < bytes.length; i += 1) {
      out[offset] = bytes[offset] ^ block[i];
      offset += 1;
    }
    counter += 1;
  }
  return out;
}

async function macFor(macKey: string, saltHex: string, nonceHex: string, payloadHex: string): Promise<string> {
  return sha256(`bantayi-backup-mac|${macKey}|${saltHex}|${nonceHex}|${payloadHex}`);
}

async function encryptPayload(payload: BackupPayload, passphrase: string): Promise<BackupEnvelope> {
  const saltHex = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const nonceHex = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const rootKey = await deriveKey(passphrase, saltHex, KDF_ROUNDS);
  const encKey = await sha256(`enc|${rootKey}`);
  const macKey = await sha256(`mac|${rootKey}`);
  const plaintext = utf8Encode(JSON.stringify(payload));
  const encrypted = await xorWithKeyStream(plaintext, encKey, nonceHex);
  const payloadHex = bytesToHex(encrypted);
  const macHex = await macFor(macKey, saltHex, nonceHex, payloadHex);
  return {
    magic: BACKUP_MAGIC,
    version: BACKUP_VERSION,
    kdf: 'sha256-chain-v1',
    rounds: KDF_ROUNDS,
    saltHex,
    nonceHex,
    payloadHex,
    macHex,
  };
}

async function decryptPayload(envelope: BackupEnvelope, passphrase: string): Promise<BackupPayload> {
  if (envelope.magic !== BACKUP_MAGIC || envelope.version !== BACKUP_VERSION) {
    throw new Error('This is not a supported BanTayi backup.');
  }
  const rootKey = await deriveKey(passphrase, envelope.saltHex, envelope.rounds);
  const encKey = await sha256(`enc|${rootKey}`);
  const macKey = await sha256(`mac|${rootKey}`);
  const expectedMac = await macFor(macKey, envelope.saltHex, envelope.nonceHex, envelope.payloadHex);
  if (expectedMac !== envelope.macHex) {
    throw new Error('Wrong passphrase or damaged backup file.');
  }
  const decrypted = await xorWithKeyStream(hexToBytes(envelope.payloadHex), encKey, envelope.nonceHex);
  return JSON.parse(utf8Decode(decrypted)) as BackupPayload;
}

function fileNameFromUri(uri: string, fallback: string): string {
  const clean = uri.split('?')[0];
  const raw = clean.slice(clean.lastIndexOf('/') + 1);
  return raw || fallback;
}

async function addAsset(uri: string | null, assets: BackupAsset[], keyPrefix: string): Promise<string | null> {
  if (!uri || !uri.startsWith('file://')) return null;
  const info = await getInfoAsync(uri);
  if (!info.exists) return null;
  const key = `${keyPrefix}_${assets.length + 1}`;
  assets.push({
    key,
    filename: fileNameFromUri(uri, `${key}.jpg`),
    base64: await readAsStringAsync(uri, { encoding: EncodingType.Base64 }),
  });
  return key;
}

async function buildPayload(): Promise<BackupPayload> {
  const [items, profile, appLockEnabled, remindersEnabled] = await Promise.all([
    getAllItems(),
    getProfile(),
    getAppLockEnabled(),
    getRemindersEnabled(),
  ]);
  const assets: BackupAsset[] = [];
  const backupItems: BackupItem[] = [];

  for (const item of items) {
    const photoAsset = await addAsset(item.photo_uri, assets, `${item.id}_photo`);
    const logoAsset = await addAsset(item.logo_uri, assets, `${item.id}_logo`);
    const { photo_uri: _photo, logo_uri: _logo, ...rest } = item;
    backupItems.push({
      ...rest,
      notification_id_expiry: null,
      notification_id_warranty: null,
      photo_asset_key: photoAsset,
      logo_asset_key: logoAsset,
    });
  }

  return {
    app: 'BanTayi',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    profile,
    settings: { appLockEnabled, remindersEnabled },
    items: backupItems,
    assets,
  };
}

async function ensureBackupDirectory(): Promise<string> {
  const base = documentDirectory;
  if (!base) throw new Error('This device could not open the app document folder.');
  const dir = `${base}backups/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

async function ensureRestoreAssetDirectory(): Promise<string> {
  const base = documentDirectory;
  if (!base) throw new Error('This device could not open the app document folder.');
  const dir = `${base}restored-assets/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

function backupFilenameForToday(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `BanTayiBackup-${stamp}.${BACKUP_EXT}`;
}

async function saveBackupWithAndroidFileManager(
  filename: string,
  contents: string,
): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) return null;

  const baseName = filename.replace(new RegExp(`\\.${BACKUP_EXT}$`), '');
  const fileUri = await StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    baseName,
    BACKUP_MIME,
  );
  await StorageAccessFramework.writeAsStringAsync(fileUri, contents, {
    encoding: EncodingType.UTF8,
  });
  return fileUri;
}

export async function createEncryptedBackup(passphraseInput: string): Promise<BackupResult> {
  const passphrase = requirePassphrase(passphraseInput);
  const payload = await buildPayload();
  const envelope = await encryptPayload(payload, passphrase);
  const contents = JSON.stringify(envelope);
  const filename = backupFilenameForToday();

  const savedUri = await saveBackupWithAndroidFileManager(filename, contents);
  if (savedUri) {
    return {
      uri: savedUri,
      filename,
      itemCount: payload.items.length,
      assetCount: payload.assets.length,
      shared: false,
      savedToFileManager: true,
    };
  }

  const dir = cacheDirectory ?? (await ensureBackupDirectory());
  const uri = `${dir}${filename}`;
  await writeAsStringAsync(uri, contents, { encoding: EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: BACKUP_MIME,
      UTI: 'com.bantayi.backup',
      dialogTitle: 'Save BanTayi backup',
    });
  }

  return {
    uri,
    filename,
    itemCount: payload.items.length,
    assetCount: payload.assets.length,
    shared: canShare,
    savedToFileManager: false,
  };
}

function parseEnvelope(raw: string): BackupEnvelope {
  const parsed = JSON.parse(raw) as Partial<BackupEnvelope>;
  if (
    parsed.magic !== BACKUP_MAGIC ||
    parsed.version !== BACKUP_VERSION ||
    parsed.kdf !== 'sha256-chain-v1' ||
    typeof parsed.rounds !== 'number' ||
    typeof parsed.saltHex !== 'string' ||
    typeof parsed.nonceHex !== 'string' ||
    typeof parsed.payloadHex !== 'string' ||
    typeof parsed.macHex !== 'string'
  ) {
    throw new Error('This is not a valid BanTayi backup file.');
  }
  return parsed as BackupEnvelope;
}

async function restoreAssets(payload: BackupPayload): Promise<Map<string, string>> {
  const dir = await ensureRestoreAssetDirectory();
  const restored = new Map<string, string>();
  for (const asset of payload.assets) {
    const safeName = asset.filename.replace(/[^\w.-]/g, '_');
    const uri = `${dir}${Date.now()}_${safeName}`;
    await writeAsStringAsync(uri, asset.base64, { encoding: EncodingType.Base64 });
    restored.set(asset.key, uri);
  }
  return restored;
}

function itemsFromPayload(payload: BackupPayload, assetUris: Map<string, string>): Item[] {
  return payload.items.map((item) => {
    const { photo_asset_key, logo_asset_key, ...rest } = item;
    return {
      ...rest,
      photo_uri: photo_asset_key ? assetUris.get(photo_asset_key) ?? null : null,
      logo_uri: logo_asset_key ? assetUris.get(logo_asset_key) ?? null : null,
      notification_id_expiry: null,
      notification_id_warranty: null,
    };
  });
}

export async function pickAndRestoreEncryptedBackup(passphraseInput: string): Promise<RestoreResult | null> {
  const passphrase = requirePassphrase(passphraseInput);
  const picked = await DocumentPicker.getDocumentAsync({
    type: [BACKUP_MIME, 'application/json', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  const raw = await readAsStringAsync(asset.uri, { encoding: EncodingType.UTF8 });
  const payload = await decryptPayload(parseEnvelope(raw), passphrase);
  const assetUris = await restoreAssets(payload);
  await onRemindersGloballyDisabled();
  await replaceAllItems(itemsFromPayload(payload, assetUris));
  if (payload.profile) {
    await saveProfile(payload.profile);
  }
  const canEnableAppLock = payload.settings.appLockEnabled && (await isPinConfigured());
  await setAppLockEnabled(canEnableAppLock);
  await setRemindersEnabled(payload.settings.remindersEnabled);
  if (payload.settings.remindersEnabled) {
    await onRemindersGloballyEnabled();
  }
  return { itemCount: payload.items.length, assetCount: payload.assets.length };
}
