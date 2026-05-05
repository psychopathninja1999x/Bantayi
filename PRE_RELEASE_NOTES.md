# BanTayi Pre-release Notes

Version: 1.0.0  
Build target: Android / Google Play pre-release testing

## Play Console Release Notes

BanTayi is an offline-first personal vault for tracking expiry dates, warranties, document dates, photos, and local reminders.

What's included:

- Secure local vault with PIN lock support.
- Add, edit, search, renew, archive, and delete saved items.
- Attach receipt, warranty, document, or ID photos stored on-device.
- Local scheduled reminders for expiry and warranty dates.
- Notification bell with a local reminder overview screen.
- First-run notification permission prompt after onboarding.
- Improved add-item completion screen with item logo and saved details.
- Backup and restore tools for moving the local vault file.
- No account, no cloud sync, no ads, and no analytics.

## Tester Focus

Please test these flows before production:

- First install: profile setup, notification permission prompt, and home redirect.
- PIN setup, unlock, change PIN, and app lock toggle.
- Add item with expiry date, warranty date, both dates, and no-expiry mode.
- Add item with camera photo and gallery photo.
- Confirm the new success screen shows the logo and saved item breakdown.
- Notification bell opens the notification list.
- Local reminders toggle on/off in Settings.
- Search, vault filters, item details, edit, renew, archive, and delete.
- Backup and restore from Settings.
- Dark mode and light mode readability.
- Android back behavior on add, edit, details, notifications, and settings screens.

## Known Caveats

- Local notifications should be verified on a physical device or development/production build. Expo Go can have notification limitations.
- OCR/photo text recognition requires a native build with the ML Kit module available.
- Online logo search may contact Wikipedia/Wikimedia when the user explicitly searches for logos. If strict offline-only behavior is required for launch, disable this feature before submission.
- The current Android package is `com.psychopathninja.BanTayi`. Change it before the first Play upload if this is not the final package name.

## Production Checklist

- Run `npx tsc --noEmit`.
- Run `npx expo lint`.
- Build Android production AAB with `eas build --platform android --profile production`.
- Confirm the final Play Console permission list does not include microphone access.
- Complete Google Play Data Safety and Privacy Policy entries.
- Prepare screenshots, feature graphic, app icon, short description, and full description.
- Test the uploaded AAB through internal or closed testing before production rollout.
