# BanTayi — agent handoff

This file orients future contributors or AI agents on the **BanTayi MVP**: an offline-first Expo app (vault for expiry dates, warranties, photos). **No** backend, cloud sync, Firebase, push analytics, or user data intentionally leaving the device (beyond normal OS behavior for notifications and secure storage).

---

## Stack

| Piece | Notes |
|--------|--------|
| **Expo** | SDK ~54 |
| **Router** | Expo Router (file-based), TypeScript |
| **Data** | `expo-sqlite` — local `items` table |
| **Secrets / PIN** | `expo-secure-store` + `expo-crypto` (SHA-256, salted; PIN never stored plain) |
| **Photos** | `expo-image-picker` + `expo-file-system/legacy` `copyAsync` into app document directory |
| **Reminders** | `expo-notifications` — **local scheduled notifications only** (no push, no Firebase) |

Primary UI copy is **English**. Visual branding uses the Bantay mascot palette (forest green, sage, mint cream) and `./assets/images/bantayilogo.png` via `BantayLogo` and Expo `icon` / `splash` assets in `app.json`.

---

## Repository layout (app root)

Paths are relative to this `package.json` directory (`BanTayi/`).

- **`app/`** — Expo Router routes only (thin wrappers → screens).
- **`src/screens/`** — Real screens (`HomeScreen`, `VaultScreen`, `SearchScreen`, `AddItemScreen`, `EditItemScreen`, `ItemDetailsScreen`, `SettingsScreen`, PIN screens, etc.).
- **`src/database/`** — `initDatabase`, `schema.ts`, `migrations.ts`, `items.ts` (CRUD, search, upcoming helpers), `types.ts`.
- **`src/services/`** — `pin-lock.ts`, `item-reminders.ts`.
- **`src/components/`** — Themed `AppButton`, `AppCard`, `AppTextInput`, `StatusBadge`.
- **`src/constants/`** — `colors.ts` (primary design tokens), `categories.ts`, `routes.ts`.
- **`@/components`**, **`hooks/`**, **`constants/theme.ts`** — Legacy Expo template bits (e.g. tab icons); **prefer `@/src/constants/colors`** for BanTayi-branded UI.

Alias: `@/` maps to the project root (see `tsconfig`).

---

## Navigation

1. **`app/index.tsx`** — Boot: `isPinConfigured()` → redirect to `/pin-setup` or `/pin-unlock`.
2. **Stack** (`app/_layout.tsx`) — `index`, `splash`, `pin-setup`, `pin-unlock`, `change-pin`, `(main)`. DB `initDatabase()` runs once in root layout. Notification foreground handler is registered here.
3. **Main stack** (`app/(main)/_layout.tsx`) — Tabs + modal stack: `add-item`, `edit-item/[id]`, `item-details/[id]`.
4. **Tabs** (`app/(main)/(tabs)/_layout.tsx`) — `home`, `vault`, `search`, `settings`. Tab tint uses **`src/constants/colors`** (`primary`, muted inactive).

**Route helpers** — `src/constants/routes.ts`: `ROUTES.*`, `hrefItemDetails(id)`, `hrefEditItem(id)`.

After successful PIN setup or unlock, screens **`router.replace(ROUTES.home)`** (`/home`).

---

## SQLite — items

- **DB file** — `bantayi.db` (`schema.ts`).
- **Table** `items`: `id`, `title`, `category`, dates (`issue_date`, `purchase_date`, `expiry_date`, `warranty_until`), `reminder_days_before`, `photo_uri`, `status` (`active` \| `expired` \| `renewed` \| `archived`), **`notification_id_expiry`**, **`notification_id_warranty`**, `created_at`, `updated_at`.
- **Migrations** (`migrations.ts`) add notification ID columns on older installs (idempotent `PRAGMA table_info`).

**Important APIs** (`src/database/items.ts`):

- `createItem` / `getItemById` / `getAllItems` / `updateItem` / `deleteItem`
- `searchItems(query)` — non-empty trimmed query; case-insensitive substring on title + description
- `getUpcomingItems` — in-JS filter/sort using date helpers (`src/database/date-helpers.ts`)
- `markAsRenewed(id)` — thin `updateItem(id, { status: 'renewed' })` (details screen uses richer `updateItem` with dates)
- `setItemNotificationIds` — updates notification columns **without** bumping `updated_at`
- `clearAllItemNotificationIds` — used when reminders are disabled globally

**After write hooks** — `createItem` and `updateItem` call `runAfterItemWrite` → dynamic import `syncRemindersAfterItemChange(id)`. `deleteItem` loads the row, **`cancelNotificationsForItem`**, then `DELETE`.

**Consumption rule** — Always ensure `initDatabase()` completed before item APIs (root layout effect); `getDb()` throws if not initialized.

---

## Item flows (MVP)

### Add (`AddItemScreen`)

- Validation: title, category, at least one of `expiry_date` / `warranty_until`, valid optional ISO dates (`src/utils/dates.ts`), optional reminder days.
- **Save** → `createItem` → back or `replace` home.

### Edit (`EditItemScreen`)

- Loads by `id` from `useLocalSearchParams`; same validation as add.
- **Save** → `updateItem` → back or details.

### Details (`ItemDetailsScreen`)

- Shows metadata, `StatusBadge`, optional photo.
- **Renew modal** — Updates `status: 'renewed'` and **only includes `expiry_date` / `warranty_until` in `updateItem` when that field is non-empty** after trim, so clearing one field does not wipe the other date in the DB. Requires merged result to still have at least one deadline.
- **Delete** — confirm → `deleteItem` → back / vault.

### Search (`SearchScreen`)

- Debounced input → `searchItems`. List UI aligned with Vault (cards, badge, dates). Empty query shows hint; no fake IDs.

---

## PIN lock (`src/services/pin-lock.ts`)

- 4-digit PIN, `PIN_LENGTH`, `MAX_ATTEMPTS`, `LOCKOUT_MS`.
- Storage: random salt + SHA-256 digest of `bantayi|salt|pin`.
- `verifyPin` / `changePin(current, new)` — change re-verifies old PIN first.

---

## Local notifications (`src/services/item-reminders.ts`)

- **Preference** — SecureStore key `bantayi_local_reminders_enabled`; **`null` means default on** (`getRemindersEnabled`).
- **Permission** — Requested when user enables reminders in Settings (after granting intent) or when an item write would schedule a future local notification (`willSchedule` path inside `syncRemindersAfterItemChange`).
- **Schedule** — For non-archived items with `reminder_days_before != null`, fire at **deadline date minus N days**, 09:00 local; separate notifications for expiry vs warranty when both exist and are in the future.
- **Cancel** — Per item before reschedule; global off cancels all scheduled + clears ID columns in DB.
- **Android** — Channel id `bantayi-reminders`.
- **Not used** — Remote/push, Firebase.

---

## UI consistency

- Prefer **`@/src/constants/colors`** (`colors`, `spacing`, `typography`, `radii`) for BanTayi screens.
- Tab bar uses those tokens (not template `constants/theme` tint) for brand alignment.

---

## Commands

```bash
npx tsc --noEmit
npx expo lint
```

Local notification behavior is best verified on a **device or dev build** (Expo Go may be limited).

---

## Explicit non-goals (MVP)

- Push / remote notifications, Firebase, backend, accounts, sync, analytics, ads.

---

## Recent fixes (context for the next agent)

- Search implemented against `searchItems` (was placeholder).
- Renew modal: partial date updates no longer null out the sibling date.
- Item details: removed raw `status` debug card; `StatusBadge` remains.
- Tab active color aligned with `colors.primary`.
- Root stack: change-PIN title `Change PIN`.
- UI copy localized to English; branding uses `bantayilogo.png`, `colors`, and tab/header `BantayLogo`.

If you extend the app, keep **offline-first** assumptions and avoid introducing cloud dependencies without an explicit product decision.
