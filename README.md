<p align="center">
  <img src="./assets/images/bantayilogo.png" alt="BanTayi logo — Bantay mascot" width="180" />
</p>

<h1 align="center">BanTayi</h1>

<p align="center"><strong>Keep watch over what matters.</strong></p>

<p align="center">
  A calm, private place to track important documents, IDs, warranties, and renewal dates—so nothing slips past you.
</p>

---

## About BanTayi

**BanTayi** (from Cebuano word *bantay/bantayi*, “to watch over”) is an **offline-first** mobile app for people who want one reliable vault for expiry dates, warranty windows, and the paperwork behind daily life. The experience is built around clear status, gentle reminders, and the **Bantay** mascot—a friendly guide through your home, vault, and settings.

Everything is designed for **local-first** use: your items, photos, and PIN live on your device. There is no mandatory cloud account, no backend server bundled with the app, and no deliberate shipping of your vault data to a third-party service.

## What you can do

| Area | Description |
|------|-------------|
| **Home** | See what needs attention—upcoming expirations and warranties at a glance. |
| **Vault** | Browse everything you’ve saved, organized by category and status. |
| **Search** | Find items quickly by title or notes. |
| **Add & edit items** | Capture titles, categories, issue and purchase dates, expiry and warranty end dates, optional reminder lead time, and optional photos (e.g. receipts or document snaps). |
| **Item details** | View full metadata, renew or archive-style flows, and delete when you’re done. |
| **PIN lock** | Protect the app with a 4-digit PIN (stored securely; never kept in plain text). |
| **Local reminders** | Schedule **on-device** notifications for deadlines (e.g. “N days before”). No push or analytics backend—just the OS notification system. |
| **Backup & restore** | Move your data when you need to (see in-app flows for export/import). |
| **Profile setup** | Personalize how the app greets you. |
| **Look & feel** | Forest green, sage, and mint-cream palette with glass-style cards and cohesive typography (Lexend). |

## Privacy & data

- **SQLite** database on device for your items.  
- **Secure storage** for PIN and reminder preferences.  
- **Photos** you attach are copied into app storage on your phone—they aren’t uploaded by the app by design.  
- **Notifications** are scheduled locally; disabling reminders cancels scheduled alerts and clears stored notification IDs.

If you grant **photo library** access, it’s only so you can attach images you choose; see `app.json` for the user-facing permission string.

## Tech stack (for contributors)

- **Expo SDK 54** · **Expo Router** (file-based routing) · **TypeScript**  
- **expo-sqlite** — local `items` data  
- **expo-secure-store** + **expo-crypto** — PIN handling  
- **expo-image-picker** / **expo-file-system** — optional images  
- **expo-notifications** — local reminders only  

Screens and logic live mainly under `app/` (routes) and `src/` (screens, database, services, components).

## Get started

```bash
npm install
npx expo start
```

Then open the project in **Expo Go**, an **Android** or **iOS** emulator, or a **development build**, depending on your setup. See the [Expo documentation](https://docs.expo.dev/) for environment details.

## Repository

Source for this project: **[github.com/psychopathninja1999x/Bantayi](https://github.com/psychopathninja1999x/Bantayi)**

---

<p align="center"><em>BanTayi — keep watch over what matters.</em></p>
