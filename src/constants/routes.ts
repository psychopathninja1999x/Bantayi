import type { Href } from 'expo-router';

/**
 * Central route paths (Expo Router — route groups omitted from URL).
 */
export const ROUTES = {
  splash: '/splash',
  pinSetup: '/pin-setup',
  pinUnlock: '/pin-unlock',
  profileSetup: '/profile-setup',
  home: '/home',
  vault: '/vault',
  search: '/search',
  settings: '/settings',
  addItem: '/add-item',
  backupRestore: '/backup-restore',
  changePin: '/change-pin',
} as const;

/** Dynamic paths (cast for expo-router typed routes). */
export function hrefItemDetails(id: string): Href {
  return `/item-details/${id}` as Href;
}

export function hrefEditItem(id: string): Href {
  return `/edit-item/${id}` as Href;
}
