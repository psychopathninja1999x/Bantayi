import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  salt: 'bantayi_pin_salt_v1',
  hash: 'bantayi_pin_hash_v1',
  failures: 'bantayi_pin_failures_v1',
  lockoutUntil: 'bantayi_pin_lockout_until_v1',
  appLockEnabled: 'bantayi_app_lock_enabled_v1',
} as const;

export const PIN_LENGTH = 4;
export const MAX_ATTEMPTS = 5;
/** Cooldown after too many wrong PINs (MVP). */
export const LOCKOUT_MS = 30_000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPin(pin: string, saltHex: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `bantayi|${saltHex}|${pin}`,
  );
}

export function isValidPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function isPinConfigured(): Promise<boolean> {
  const [salt, hash] = await Promise.all([
    SecureStore.getItemAsync(KEYS.salt),
    SecureStore.getItemAsync(KEYS.hash),
  ]);
  return Boolean(salt && hash);
}

export async function getAppLockEnabled(): Promise<boolean> {
  const [configured, raw] = await Promise.all([
    isPinConfigured(),
    SecureStore.getItemAsync(KEYS.appLockEnabled),
  ]);
  if (!configured) return false;
  return raw == null ? true : raw === '1';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (enabled && !(await isPinConfigured())) {
    throw new Error('Set up a PIN before enabling App Lock.');
  }
  await SecureStore.setItemAsync(KEYS.appLockEnabled, enabled ? '1' : '0');
}

/**
 * Stores a new PIN: random salt + SHA-256(salt|pin). Resets lockout counters.
 */
export async function setPin(pin: string): Promise<void> {
  if (!isValidPinFormat(pin)) {
    throw new Error('PIN must be exactly 4 digits.');
  }
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = bytesToHex(saltBytes);
  const hash = await hashPin(pin, saltHex);
  await SecureStore.setItemAsync(KEYS.salt, saltHex);
  await SecureStore.setItemAsync(KEYS.hash, hash);
  await SecureStore.setItemAsync(KEYS.failures, '0');
  await SecureStore.setItemAsync(KEYS.appLockEnabled, '1');
  try {
    await SecureStore.deleteItemAsync(KEYS.lockoutUntil);
  } catch {
    /* no-op */
  }
}

export async function getLockoutRemainingMs(): Promise<number> {
  const raw = await SecureStore.getItemAsync(KEYS.lockoutUntil);
  if (!raw) return 0;
  const until = Number.parseInt(raw, 10);
  if (Number.isNaN(until)) return 0;
  return Math.max(0, until - Date.now());
}

async function clearLockoutIfExpired(): Promise<void> {
  const remaining = await getLockoutRemainingMs();
  if (remaining <= 0) {
    try {
      await SecureStore.deleteItemAsync(KEYS.lockoutUntil);
    } catch {
      /* no-op */
    }
  }
}

async function getFailures(): Promise<number> {
  const raw = await SecureStore.getItemAsync(KEYS.failures);
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
}

async function setFailures(n: number): Promise<void> {
  await SecureStore.setItemAsync(KEYS.failures, String(n));
}

export type VerifyPinResult =
  | { ok: true }
  | { ok: false; reason: 'wrong'; attemptsRemaining: number }
  | { ok: false; reason: 'lockout'; msRemaining: number };

/**
 * Compares PIN to stored hash (never stores plain PIN). Enforces lockout and attempt limits.
 */
export async function verifyPin(pin: string): Promise<VerifyPinResult> {
  if (!(await isPinConfigured())) {
    return { ok: false, reason: 'wrong', attemptsRemaining: MAX_ATTEMPTS };
  }

  await clearLockoutIfExpired();

  const lockMs = await getLockoutRemainingMs();
  if (lockMs > 0) {
    return { ok: false, reason: 'lockout', msRemaining: lockMs };
  }

  if (!isValidPinFormat(pin)) {
    const fails = await getFailures();
    return { ok: false, reason: 'wrong', attemptsRemaining: Math.max(0, MAX_ATTEMPTS - fails) };
  }

  const salt = await SecureStore.getItemAsync(KEYS.salt);
  const storedHash = await SecureStore.getItemAsync(KEYS.hash);
  if (!salt || !storedHash) {
    return { ok: false, reason: 'wrong', attemptsRemaining: 0 };
  }

  const candidate = await hashPin(pin, salt);
  if (candidate === storedHash) {
    await setFailures(0);
    try {
      await SecureStore.deleteItemAsync(KEYS.lockoutUntil);
    } catch {
      /* no-op */
    }
    return { ok: true };
  }

  const failures = (await getFailures()) + 1;
  await setFailures(failures);

  if (failures >= MAX_ATTEMPTS) {
    await SecureStore.setItemAsync(KEYS.lockoutUntil, String(Date.now() + LOCKOUT_MS));
    await setFailures(0);
    return { ok: false, reason: 'lockout', msRemaining: LOCKOUT_MS };
  }

  return {
    ok: false,
    reason: 'wrong',
    attemptsRemaining: MAX_ATTEMPTS - failures,
  };
}

/**
 * Verifies current PIN then replaces salt+hash with a new PIN.
 */
export async function changePin(currentPin: string, newPin: string): Promise<void> {
  if (!isValidPinFormat(newPin)) {
    throw new Error('New PIN must be exactly 4 digits.');
  }
  const wasEnabled = await getAppLockEnabled();
  const result = await verifyPin(currentPin);
  if (!result.ok) {
    if (result.reason === 'lockout') {
      throw new Error('Locked out temporarily. Please wait.');
    }
    throw new Error('Current PIN is incorrect.');
  }
  await setPin(newPin);
  await setAppLockEnabled(wasEnabled);
}
