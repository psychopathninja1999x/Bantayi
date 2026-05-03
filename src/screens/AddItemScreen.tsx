import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  CategoryIcon,
  GlassCard,
  GlassHeader,
  ScreenBackground,
} from '@/src/components';
import { CATEGORIES } from '@/src/constants/categories';
import { colors, fontFamily, radii, spacing, typography } from '@/src/constants/colors';
import { DOCUMENT_SUBCATEGORIES } from '@/src/constants/document-subcategories';
import type { DocumentSubcategory } from '@/src/constants/document-subcategories';
import { PHILIPPINE_BANK_SUGGESTIONS } from '@/src/constants/philippine-banks';
import { ROUTES } from '@/src/constants/routes';
import { createItem } from '@/src/database';
import { DatabaseError } from '@/src/database/errors';
import { pickLocalImage } from '@/src/services/local-image';
import {
  downloadOnlineLogo,
  searchOnlineLogos,
  type OnlineLogoResult,
} from '@/src/services/online-logo-search';
import { scanVisualProof } from '@/src/services/visual-proof';
import type { DetectedVisualProof } from '@/src/services/visual-proof';
import type { ItemCategory } from '@/src/types';
import { parseOptionalISODate, parseOptionalReminderDays } from '@/src/utils/dates';

const STEPS = ['Proof', 'Name', 'Logo', 'Dates', 'Storage'] as const;
type DateField = 'expiryDate' | 'warrantyUntil' | 'issueDate' | 'purchaseDate';

const STORAGE_SUGGESTIONS = [
  'Wallet',
  'Cabinet',
  'Document folder',
  'Safe box',
  'Medicine kit',
  'Email inbox',
  'Phone gallery',
  'Car compartment',
];

function parseISOToDate(value: string): Date {
  const parsed = parseOptionalISODate(value);
  if (!parsed.ok || !parsed.value) return new Date();
  const [year, month, day] = parsed.value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddItemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const nameInputRef = useRef<TextInput>(null);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [documentSubcategory, setDocumentSubcategory] = useState<DocumentSubcategory | null>(null);
  const [description, setDescription] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [warrantyUntil, setWarrantyUntil] = useState('');
  const [noExpiry, setNoExpiry] = useState(false);
  const [reminderDays, setReminderDays] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [searchingLogos, setSearchingLogos] = useState(false);
  const [downloadingLogoId, setDownloadingLogoId] = useState<string | null>(null);
  const [onlineLogoResults, setOnlineLogoResults] = useState<OnlineLogoResult[]>([]);
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const clearError = useCallback(() => setFormError(null), []);

  const selectedCategoryLabel = useMemo(
    () => CATEGORIES.find((c) => c.code === category)?.label ?? 'Pick a category',
    [category],
  );

  const primaryDateLabel =
    category === 'bill_due'
      ? 'Due date'
      : category === 'card_expiry'
        ? 'Card expiry'
        : 'Expiry date';

  const dateValues = useMemo(
    () => ({ expiryDate, warrantyUntil, issueDate, purchaseDate }),
    [expiryDate, issueDate, purchaseDate, warrantyUntil],
  );

  const setDateField = useCallback((field: DateField, value: string) => {
    if (field === 'expiryDate') setExpiryDate(value);
    if (field === 'warrantyUntil') setWarrantyUntil(value);
    if (field === 'issueDate') setIssueDate(value);
    if (field === 'purchaseDate') setPurchaseDate(value);
  }, []);

  const clearDateField = useCallback(
    (field: DateField) => {
      setDateField(field, '');
      setActiveDateField(null);
      clearError();
    },
    [clearError, setDateField],
  );

  const applyDetectedProof = useCallback((detected: DetectedVisualProof) => {
    if (detected.category) {
      setCategory(detected.category);
      setDocumentSubcategory(
        detected.category === 'document' ? detected.documentSubcategory : null,
      );
    }
    if (detected.issueDate) setIssueDate(detected.issueDate);
    if (detected.purchaseDate) setPurchaseDate(detected.purchaseDate);
    if (detected.expiryDate) setExpiryDate(detected.expiryDate);
    if (detected.warrantyUntil) setWarrantyUntil(detected.warrantyUntil);
  }, []);

  const askToApplyDetectedProof = useCallback(
    (detected: DetectedVisualProof, ocrAvailable: boolean) => {
      const details = [
        detected.documentKind ? `Type: ${detected.documentKind}` : null,
        detected.issueDate ? `Issue: ${detected.issueDate}` : null,
        detected.purchaseDate ? `Purchase: ${detected.purchaseDate}` : null,
        detected.expiryDate ? `Expiry: ${detected.expiryDate}` : null,
        detected.warrantyUntil ? `Warranty: ${detected.warrantyUntil}` : null,
      ].filter(Boolean);

      if (!ocrAvailable) {
        Alert.alert(
          'Photo attached',
          'OCR is only available in a development/native build with the ML Kit module. The photo was saved as visual proof.',
        );
        return;
      }

      if (details.length === 0) {
        Alert.alert(
          'No dates detected',
          'The photo was attached, but BanTayi could not confidently detect dates from the image.',
        );
        return;
      }

      Alert.alert('Use detected details?', details.join('\n'), [
        { text: 'Keep manual', style: 'cancel' },
        { text: 'Use details', onPress: () => applyDetectedProof(detected) },
      ]);
    },
    [applyDetectedProof],
  );

  const attachVisualProof = useCallback(
    async (source: 'camera' | 'library') => {
      clearError();
      setScanning(true);
      try {
        const scan = await scanVisualProof(source);
        if (!scan) return;
        setPhotoUri(scan.photoUri);
        askToApplyDetectedProof(scan.detected, scan.ocrText != null);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not attach the visual proof.';
        setFormError(message);
      } finally {
        setScanning(false);
      }
    },
    [askToApplyDetectedProof, clearError],
  );

  const removePhoto = useCallback(() => {
    setPhotoUri(null);
    clearError();
  }, [clearError]);

  const attachCustomLogo = useCallback(async () => {
    clearError();
    try {
      const uri = await pickLocalImage('bantayi_logo');
      if (uri) setLogoUri(uri);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not attach the custom logo.';
      setFormError(message);
    }
  }, [clearError]);

  const removeCustomLogo = useCallback(() => {
    setLogoUri(null);
    clearError();
  }, [clearError]);

  const logoSearchQuery = useMemo(() => {
    const fromTitle = title.trim();
    if (fromTitle) return fromTitle;
    return selectedCategoryLabel === 'Pick a category' ? '' : selectedCategoryLabel;
  }, [selectedCategoryLabel, title]);

  const runOnlineLogoSearch = useCallback(async () => {
    clearError();
    const query = logoSearchQuery.trim();
    if (!query) {
      setFormError('Enter an item name first so BanTayi knows what logo to search for.');
      return;
    }
    setSearchingLogos(true);
    try {
      const results = await searchOnlineLogos(query);
      setOnlineLogoResults(results);
      if (results.length === 0) {
        setFormError('No online logos found. Try a clearer item name or upload a custom logo.');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not search online logos.';
      setFormError(message);
    } finally {
      setSearchingLogos(false);
    }
  }, [clearError, logoSearchQuery]);

  const confirmOnlineLogoSearch = useCallback(() => {
    Alert.alert(
      'Search online?',
      'BanTayi will search online using the item name. Your saved vault data stays on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Search', onPress: () => void runOnlineLogoSearch() },
      ],
    );
  }, [runOnlineLogoSearch]);

  const selectOnlineLogo = useCallback(
    async (result: OnlineLogoResult) => {
      clearError();
      setDownloadingLogoId(result.id);
      try {
        const uri = await downloadOnlineLogo(result);
        setLogoUri(uri);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not save this logo locally.';
        setFormError(message);
      } finally {
        setDownloadingLogoId(null);
      }
    },
    [clearError],
  );

  const goNext = useCallback(() => {
    nameInputRef.current?.blur();
    Keyboard.dismiss();
    clearError();
    if (step === 1) {
      if (!title.trim()) return setFormError('Title is required.');
    }
    if (step === 2) {
      if (!category) return setFormError('Pick an item category.');
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }, [category, clearError, step, title]);

  const goBack = useCallback(() => {
    nameInputRef.current?.blur();
    Keyboard.dismiss();
    clearError();
    setStep((current) => Math.max(current - 1, 0));
  }, [clearError]);

  const save = useCallback(async () => {
    nameInputRef.current?.blur();
    Keyboard.dismiss();
    clearError();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setStep(1);
      setFormError('Title is required.');
      return;
    }
    if (!category) {
      setStep(1);
      setFormError('Pick an item category.');
      return;
    }
    const parsedIssue = parseOptionalISODate(issueDate);
    if (!parsedIssue.ok) return setFormError(parsedIssue.message);
    const parsedPurchase = parseOptionalISODate(purchaseDate);
    if (!parsedPurchase.ok) return setFormError(parsedPurchase.message);
    const parsedExpiry = parseOptionalISODate(expiryDate);
    if (!parsedExpiry.ok) return setFormError(parsedExpiry.message);
    const parsedWarranty = parseOptionalISODate(warrantyUntil);
    if (!parsedWarranty.ok) return setFormError(parsedWarranty.message);

    if (!noExpiry && !parsedExpiry.value && !parsedWarranty.value) {
      setFormError('Enter an expiry date and/or warranty end date (at least one).');
      return;
    }

    const parsedReminder = parseOptionalReminderDays(reminderDays);
    if (!parsedReminder.ok) return setFormError(parsedReminder.message);

    setSaving(true);
    try {
      await createItem({
        title: trimmedTitle,
        category,
        subcategory: category === 'document' ? documentSubcategory : null,
        description: description.trim() || null,
        issue_date: parsedIssue.value,
        purchase_date: parsedPurchase.value,
        expiry_date: noExpiry ? null : parsedExpiry.value,
        warranty_until: noExpiry ? null : parsedWarranty.value,
        no_expiry: noExpiry,
        reminder_days_before: noExpiry ? null : parsedReminder.value,
        photo_uri: photoUri,
        logo_uri: logoUri,
      });

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(ROUTES.home);
      }
    } catch (e) {
      const message =
        e instanceof DatabaseError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Save failed.';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }, [
    category,
    clearError,
    description,
    documentSubcategory,
    expiryDate,
    issueDate,
    logoUri,
    noExpiry,
    photoUri,
    purchaseDate,
    reminderDays,
    router,
    title,
    warrantyUntil,
  ]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="New item" back brand={false} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
          style={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <View style={styles.headerBlock}>
            <AppText variant="display" color={colors.primaryContainer}>
              Add new item
            </AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              {step === 0
                ? 'Start with visual proof.'
                : step === 1
                  ? 'Give this vault item a clear name.'
                  : step === 2
                    ? 'Choose how this item appears.'
                    : step === 3
                      ? 'Set the dates BanTayi should watch.'
                      : 'Choose where the original is kept.'}
            </AppText>
          </View>

          <View style={styles.stepper}>
            {STEPS.map((label, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <View key={label} style={styles.stepItem}>
                  <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
                    <AppText
                      variant="labelSm"
                      color={active || done ? colors.onPrimary : colors.onSurfaceVariant}>
                      {done ? '✓' : String(index + 1)}
                    </AppText>
                  </View>
                  <AppText
                    variant="labelSm"
                    color={active ? colors.primaryContainer : colors.onSurfaceVariant}>
                    {label}
                  </AppText>
                </View>
              );
            })}
          </View>

          {formError ? (
            <GlassCard accentBar={colors.error} style={styles.errorCard}>
              <AppText variant="labelMd" color={colors.error}>
                {formError}
              </AppText>
            </GlassCard>
          ) : null}

          <ScrollView
            style={styles.stage}
            contentContainerStyle={styles.stageContent}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}>
            {step === 0 ? (
              <View style={styles.proofStep}>
                {photoUri ? (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.heroPreview} contentFit="cover" />
                    <View style={styles.previewBadge}>
                      <MaterialIcons name="verified" size={18} color={colors.onPrimary} />
                      <AppText variant="labelMd" color={colors.onPrimary}>
                        Visual proof attached
                      </AppText>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyProof}>
                    <MaterialIcons name="document-scanner" size={54} color={colors.primaryContainer} />
                    <AppText variant="headlineMd" color={colors.primaryContainer} center>
                      Scan a receipt, document, or ID
                    </AppText>
                    <AppText variant="labelMd" color={colors.onSurfaceVariant} center>
                      BanTayi saves the photo locally and can read dates in a native build.
                    </AppText>
                  </View>
                )}

                <View style={styles.actionStack}>
                  <AppButton
                    variant="primary"
                    icon="photo-camera"
                    onPress={() => void attachVisualProof('camera')}
                    disabled={saving || scanning}
                    loading={scanning}>
                    Scan with camera
                  </AppButton>
                  <AppButton
                    variant="outline"
                    icon="photo-library"
                    onPress={() => void attachVisualProof('library')}
                    disabled={saving || scanning}>
                    Pick custom photo
                  </AppButton>
                  {photoUri ? (
                    <AppButton
                      variant="ghost"
                      icon="delete"
                      onPress={removePhoto}
                      disabled={saving || scanning}>
                      Remove photo
                    </AppButton>
                  ) : null}
                </View>
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.nameStep}>
                <View style={styles.nameHero}>
                  <View style={styles.logoPreviewLarge}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.logoImage} contentFit="cover" />
                    ) : (
                      <MaterialIcons name="edit-note" size={44} color={colors.primary} />
                    )}
                  </View>
                  <AppText variant="headlineMd" color={colors.primaryContainer} center>
                    What should BanTayi call this?
                  </AppText>
                </View>

                <View style={styles.nameField}>
                  <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                    Item name
                  </AppText>
                  <TextInput
                    ref={nameInputRef}
                    value={title}
                    onChangeText={(t) => {
                      setTitle(t);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Passport, NBI clearance, MacBook warranty"
                    placeholderTextColor={colors.outline}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => {
                      nameInputRef.current?.blur();
                      Keyboard.dismiss();
                    }}
                    style={styles.nameInput}
                  />
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.detailsStep}>
                <View style={styles.identityRow}>
                  <View style={styles.logoPreview}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.logoImage} contentFit="cover" />
                    ) : category ? (
                      <CategoryIcon
                        category={category}
                        subcategory={documentSubcategory}
                        size={78}
                      />
                    ) : (
                      <MaterialIcons name="add-photo-alternate" size={34} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.identityText}>
                    <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                      Item logo
                    </AppText>
                    <AppText variant="headlineMd" color={colors.primaryContainer} numberOfLines={1}>
                      {logoUri ? 'Custom logo' : 'Built-in logo'}
                    </AppText>
                    <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                      Upload or find a logo. Category is selected separately below.
                    </AppText>
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <View style={styles.sectionTitleBlock}>
                    <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                      Logo
                    </AppText>
                    <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                      Optional visual shown in lists and details.
                    </AppText>
                  </View>
                  <View style={styles.logoGrid}>
                    <Pressable
                      onPress={() => void attachCustomLogo()}
                      style={[styles.logoChoice, logoUri && styles.logoChoiceSelected]}>
                      {logoUri ? (
                        <Image source={{ uri: logoUri }} style={styles.logoChoiceImage} contentFit="cover" />
                      ) : (
                        <MaterialIcons name="upload" size={30} color={colors.primary} />
                      )}
                      <AppText
                        variant="labelSm"
                        color={logoUri ? colors.primaryContainer : colors.onSurfaceVariant}
                        numberOfLines={1}>
                        Upload
                      </AppText>
                    </Pressable>
                    <Pressable
                      onPress={confirmOnlineLogoSearch}
                      disabled={searchingLogos}
                      style={[styles.logoChoice, searchingLogos && { opacity: 0.72 }]}>
                      <MaterialIcons name="travel-explore" size={30} color={colors.primary} />
                      <AppText variant="labelSm" color={colors.onSurfaceVariant} numberOfLines={1}>
                        Find online
                      </AppText>
                    </Pressable>
                  </View>
                </View>

                {logoUri ? (
                  <AppButton variant="ghost" icon="delete" onPress={removeCustomLogo}>
                    Remove custom logo
                  </AppButton>
                ) : null}

                {onlineLogoResults.length > 0 ? (
                  <View style={styles.onlineLogoSection}>
                    <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                      Online results
                    </AppText>
                    <View style={styles.onlineLogoGrid}>
                      {onlineLogoResults.map((result) => {
                        const downloading = downloadingLogoId === result.id;
                        return (
                          <Pressable
                            key={result.id}
                            onPress={() => void selectOnlineLogo(result)}
                            disabled={downloadingLogoId != null}
                            style={[styles.onlineLogoChoice, downloading && { opacity: 0.7 }]}>
                            <Image
                              source={{ uri: result.thumbnailUrl }}
                              style={styles.onlineLogoImage}
                              contentFit="contain"
                            />
                            <AppText
                              variant="labelSm"
                              color={colors.onSurfaceVariant}
                              numberOfLines={2}
                              center>
                              {downloading ? 'Saving...' : result.title}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View style={styles.sectionBlock}>
                  <View style={styles.sectionTitleBlock}>
                    <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                      Category
                    </AppText>
                    <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                      Required. This controls labels, reminders, and grouping.
                    </AppText>
                  </View>
                  <View style={styles.categoryGrid}>
                    {CATEGORIES.map((c) => {
                      const selected = category === c.code;
                      return (
                        <Pressable
                          key={c.code}
                          onPress={() => {
                            setCategory(c.code);
                            if (c.code !== 'document') setDocumentSubcategory(null);
                            if (formError) setFormError(null);
                          }}
                          style={[styles.categoryChoice, selected && styles.categoryChoiceSelected]}>
                          <CategoryIcon category={c.code} size={36} />
                          <AppText
                            variant="labelSm"
                            color={selected ? colors.primaryContainer : colors.onSurfaceVariant}
                            numberOfLines={1}>
                            {c.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {category === 'document' ? (
                  <View style={styles.documentGrid}>
                    {DOCUMENT_SUBCATEGORIES.slice(0, 6).map((s) => {
                      const selected = documentSubcategory === s.code;
                      return (
                        <Pressable
                          key={s.code}
                          onPress={() => {
                            setDocumentSubcategory((prev) => (prev === s.code ? null : s.code));
                            if (formError) setFormError(null);
                          }}
                          style={[styles.docChoice, selected && styles.docChoiceSelected]}>
                          <AppText
                            variant="labelSm"
                            color={selected ? colors.onSecondaryContainer : colors.onSurfaceVariant}
                            numberOfLines={1}>
                            {s.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {category === 'card_expiry' ? (
                  <View style={styles.bankSection}>
                    <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                      Suggested Philippine banks
                    </AppText>
                    <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                      BanTayi only tracks the card expiry date. Do not enter card numbers or CVV.
                    </AppText>
                    <View style={styles.bankGrid}>
                      {PHILIPPINE_BANK_SUGGESTIONS.map((bank) => {
                        const selected = selectedBank === bank;
                        return (
                          <Pressable
                            key={bank}
                            onPress={() => {
                              setSelectedBank(bank);
                              setTitle(`${bank} card`);
                              if (formError) setFormError(null);
                            }}
                            style={[styles.bankChoice, selected && styles.bankChoiceSelected]}>
                            <AppText
                              variant="labelSm"
                              color={
                                selected ? colors.onSecondaryContainer : colors.onSurfaceVariant
                              }
                              numberOfLines={1}>
                              {bank}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {step === 3 ? (
              <View style={styles.deadlineStep}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: noExpiry }}
                  onPress={() => {
                    setNoExpiry((current) => !current);
                    clearError();
                  }}
                  style={({ pressed }) => [styles.noExpiryRow, pressed && { opacity: 0.86 }]}>
                  <View style={[styles.checkBox, noExpiry && styles.checkBoxChecked]}>
                    {noExpiry ? <MaterialIcons name="check" size={18} color={colors.onPrimary} /> : null}
                  </View>
                  <View style={styles.noExpiryText}>
                    <AppText variant="labelMd" color={colors.onSurface}>
                      This card has no expiry
                    </AppText>
                    <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                      BanTayi will keep it in the vault without deadline reminders.
                    </AppText>
                  </View>
                </Pressable>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <DatePickerField
                      label={primaryDateLabel}
                      value={expiryDate}
                      onPress={() => setActiveDateField('expiryDate')}
                      onClear={() => clearDateField('expiryDate')}
                      disabled={noExpiry}
                    />
                  </View>
                  <View style={styles.col}>
                    <DatePickerField
                      label="Warranty until"
                      value={warrantyUntil}
                      onPress={() => setActiveDateField('warrantyUntil')}
                      onClear={() => clearDateField('warrantyUntil')}
                      disabled={noExpiry}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <DatePickerField
                      label="Issue date"
                      value={issueDate}
                      onPress={() => setActiveDateField('issueDate')}
                      onClear={() => clearDateField('issueDate')}
                    />
                  </View>
                  <View style={styles.col}>
                    <DatePickerField
                      label="Purchase date"
                      value={purchaseDate}
                      onPress={() => setActiveDateField('purchaseDate')}
                      onClear={() => clearDateField('purchaseDate')}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                    Reminder days before
                  </AppText>
                  <GlassCard padded={false} radius="lg" flat>
                    <View style={styles.reminderRow}>
                      <MaterialIcons name="notifications" size={20} color={colors.primaryContainer} />
                      <TextInput
                        value={reminderDays}
                        onChangeText={setReminderDays}
                        keyboardType="number-pad"
                        placeholder="7"
                        placeholderTextColor={colors.outline}
                        returnKeyType="done"
                        style={styles.reminderInput}
                        editable={!noExpiry}
                      />
                      <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                        days
                      </AppText>
                    </View>
                  </GlassCard>
                </View>
              </View>
            ) : null}

            {step === 4 ? (
              <View style={styles.storageStep}>
                <View style={styles.storageHero}>
                  <MaterialIcons name="inventory-2" size={46} color={colors.primaryContainer} />
                  <AppText variant="headlineMd" color={colors.primaryContainer} center>
                    Where will you keep it?
                  </AppText>
                  <AppText variant="labelMd" color={colors.onSurfaceVariant} center>
                    Pick a quick note so you can find the original later.
                  </AppText>
                </View>

                <View style={styles.storageGrid}>
                  {STORAGE_SUGGESTIONS.map((suggestion) => {
                    const selected = description === suggestion;
                    return (
                      <Pressable
                        key={suggestion}
                        onPress={() => {
                          setDescription((current) =>
                            current === suggestion ? '' : suggestion,
                          );
                          if (formError) setFormError(null);
                        }}
                        style={[styles.storageChoice, selected && styles.storageChoiceSelected]}>
                        <AppText
                          variant="labelMd"
                          color={selected ? colors.onSecondaryContainer : colors.onSurfaceVariant}
                          center>
                          {suggestion}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.nameField}>
                  <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                    Custom location
                  </AppText>
                  <TextInput
                    value={description}
                    onChangeText={(t) => {
                      setDescription(t);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Green folder, top drawer"
                    placeholderTextColor={colors.outline}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                    style={styles.nameInput}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {step > 0 ? (
              <AppButton variant="outline" onPress={goBack} disabled={saving || scanning} style={styles.footerButton}>
                Back
              </AppButton>
            ) : null}
            {step < STEPS.length - 1 ? (
              <AppButton
                variant="primary"
                trailingIcon="arrow-forward"
                onPress={goNext}
                disabled={saving || scanning}
                style={styles.footerButton}>
                Continue
              </AppButton>
            ) : (
              <AppButton
                variant="primary"
                icon="verified-user"
                loading={saving}
                disabled={saving}
                onPress={() => void save()}
                style={styles.footerButton}>
                Save to vault
              </AppButton>
            )}
          </View>
          {activeDateField && Platform.OS === 'ios' ? (
            <Modal transparent animationType="fade" visible onRequestClose={() => setActiveDateField(null)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setActiveDateField(null)} />
              <View style={[styles.iosPickerSheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                <View style={styles.iosPickerHeader}>
                  <AppButton
                    variant="ghost"
                    size="md"
                    onPress={() => activeDateField && clearDateField(activeDateField)}>
                    Clear
                  </AppButton>
                  <AppButton variant="primary" size="md" onPress={() => setActiveDateField(null)}>
                    Done
                  </AppButton>
                </View>
                <DateTimePicker
                  value={parseISOToDate(dateValues[activeDateField])}
                  mode="date"
                  display="inline"
                  themeVariant={scheme === 'dark' ? 'dark' : 'light'}
                  textColor={colors.onSurface}
                  onChange={(_, selectedDate) => {
                    if (!selectedDate || !activeDateField) return;
                    setDateField(activeDateField, formatDateValue(selectedDate));
                    clearError();
                  }}
                  style={styles.iosPicker}
                />
              </View>
            </Modal>
          ) : null}
          {activeDateField && Platform.OS !== 'ios' ? (
            <DateTimePicker
              value={parseISOToDate(dateValues[activeDateField])}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setActiveDateField(null);
                if (event.type === 'dismissed' || !selectedDate) return;
                setDateField(activeDateField, formatDateValue(selectedDate));
                clearError();
              }}
            />
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

interface DatePickerFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  onClear: () => void;
  disabled?: boolean;
}

function DatePickerField({ label, value, onPress, onClear, disabled }: DatePickerFieldProps) {
  return (
    <View style={styles.dateField}>
      <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant} style={styles.dateLabel}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.dateButton,
          disabled && styles.dateButtonDisabled,
          pressed && { opacity: 0.86 },
        ]}>
        <MaterialIcons name="calendar-today" size={19} color={colors.primaryContainer} />
        <AppText
          variant="labelMd"
          color={disabled ? colors.onSurfaceVariant : value ? colors.onSurface : colors.outline}
          numberOfLines={1}
          style={styles.dateText}>
          {disabled ? 'No expiry' : value || 'Pick date'}
        </AppText>
        {value && !disabled ? (
          <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8}>
            <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerBlock: {
    gap: 4,
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  stepDotActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  stepDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  errorCard: {
    marginBottom: spacing.sm,
  },
  stage: {
    flex: 1,
    minHeight: 0,
  },
  stageContent: {
    flexGrow: 1,
    paddingBottom: spacing.md,
  },
  proofStep: {
    flex: 1,
    gap: spacing.md,
  },
  previewWrap: {
    flex: 1,
    minHeight: 220,
    borderRadius: radii.xxl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  heroPreview: {
    flex: 1,
  },
  previewBadge: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyProof: {
    flex: 1,
    minHeight: 220,
    borderRadius: radii.xxl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryFixedDim,
    backgroundColor: colors.glassFillSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  actionStack: {
    gap: spacing.sm,
  },
  detailsStep: {
    flex: 1,
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionTitleBlock: {
    gap: 2,
  },
  nameStep: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  nameHero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  nameField: {
    gap: 6,
  },
  nameInput: {
    minHeight: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    paddingHorizontal: spacing.md,
    color: colors.onSurface,
    fontSize: typography.bodyMd.size,
    fontFamily: fontFamily.regular,
  },
  logoPreviewLarge: {
    width: 108,
    height: 108,
    borderRadius: radii.xxl,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoPreview: {
    width: 86,
    height: 86,
    borderRadius: radii.xl,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoChoiceImage: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  logoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  logoChoice: {
    width: '30.7%',
    minHeight: 76,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  logoChoiceSelected: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.secondaryFixed,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChoice: {
    width: '30.7%',
    minHeight: 86,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  categoryChoiceSelected: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.secondaryFixed,
  },
  onlineLogoSection: {
    gap: spacing.sm,
  },
  onlineLogoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  onlineLogoChoice: {
    width: '30.7%',
    minHeight: 112,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.xs,
  },
  onlineLogoImage: {
    width: 58,
    height: 58,
  },
  documentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  bankSection: {
    gap: spacing.xs,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  bankChoice: {
    width: '31.5%',
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankChoiceSelected: {
    borderColor: colors.secondaryContainer,
    backgroundColor: colors.secondaryContainer,
  },
  docChoice: {
    maxWidth: '48%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
  },
  docChoiceSelected: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  deadlineStep: {
    flex: 1,
    gap: spacing.md,
  },
  noExpiryRow: {
    minHeight: 72,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  noExpiryText: {
    flex: 1,
    gap: 2,
  },
  storageStep: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  storageHero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  storageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  storageChoice: {
    width: '47.8%',
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  storageChoiceSelected: {
    borderColor: colors.secondaryContainer,
    backgroundColor: colors.secondaryContainer,
  },
  field: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: 56,
  },
  reminderInput: {
    flex: 1,
    color: colors.onSurface,
    fontSize: typography.bodyMd.size,
    fontFamily: fontFamily.regular,
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  footerButton: {
    flex: 1,
  },
  dateField: {
    gap: 6,
  },
  dateLabel: {
    paddingHorizontal: 4,
  },
  dateButton: {
    minHeight: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateButtonDisabled: {
    opacity: 0.62,
  },
  dateText: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  iosPickerSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  iosPicker: {
    minHeight: 340,
  },
});
