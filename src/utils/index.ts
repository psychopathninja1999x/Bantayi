/**
 * Shared helpers (dates, formatting, etc.).
 */

export { parseOptionalISODate, parseOptionalReminderDays } from './dates';
export {
  UPCOMING_LIST_DAYS,
  EXPIRING_SOON_DAYS,
  countActiveItems,
  countExpiredItems,
  countExpiringSoonItems,
  formatItemDateLines,
  itemDeadline,
  selectUpcomingReminderItems,
  statusToneForItem,
} from './item-helpers';

export function noop(): void {
  // Placeholder export so the module is non-empty for tooling.
}
