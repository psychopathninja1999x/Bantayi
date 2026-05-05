import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image as NativeImage,
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
  AppTextInput,
  FormKeyboardAvoidingScroll,
  GlassCard,
  GlassHeader,
  ScreenBackground,
} from '@/src/components';
import { CATEGORIES } from '@/src/constants/categories';
import { hrefItemDetails } from '@/src/constants';
import { colors, fontFamily, radii, spacing, typography } from '@/src/constants/colors';
import { DOCUMENT_SUBCATEGORIES } from '@/src/constants/document-subcategories';
import type { DocumentSubcategory } from '@/src/constants/document-subcategories';
import { getItemById, updateItem } from '@/src/database';
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

type DateField = 'expiryDate' | 'warrantyUntil' | 'issueDate' | 'purchaseDate';

function normalizeParam(id: string | string[] | undefined): string | undefined {
  if (id == null) return undefined;
  return Array.isArray(id) ? id[0] : id;
}

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

export default function EditItemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const itemId = normalizeParam(rawId);

  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

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

  const clearError = useCallback(() => setFormError(null), []);

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

  const populateFromItem = useCallback(
    (row: NonNullable<Awaited<ReturnType<typeof getItemById>>>) => {
      setTitle(row.title);
      setCategory(row.category);
      setDescription(row.description ?? '');
      setIssueDate(row.issue_date ?? '');
      setPurchaseDate(row.purchase_date ?? '');
      setExpiryDate(row.expiry_date ?? '');
      setWarrantyUntil(row.warranty_until ?? '');
      setNoExpiry(row.no_expiry);
      setReminderDays(row.reminder_days_before != null ? String(row.reminder_days_before) : '');
      setPhotoUri(row.photo_uri);
      setLogoUri(row.logo_uri);
      setDocumentSubcategory(row.subcategory ?? null);
    },
    [],
  );

  const load = useCallback(async () => {
    if (!itemId?.trim()) {
      setMissing(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMissing(false);
    try {
      const row = await getItemById(itemId);
      if (!row) {
        setMissing(true);
        return;
      }
      populateFromItem(row);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load item.';
      Alert.alert('Error', message);
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [itemId, populateFromItem]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
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
          'The photo was saved as visual proof. No expiry, warranty, issue, or purchase date was detected, so you can enter the details manually.',
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

  const attachVisualProof = useCallback(async (source: 'camera' | 'library') => {
    clearError();
    setScanning(true);
    try {
      const scan = await scanVisualProof(source);
      if (!scan) return;
      setPhotoUri(scan.photoUri);
      askToApplyDetectedProof(scan.detected, scan.ocrAvailable);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not attach the visual proof.';
      setFormError(message);
    } finally {
      setScanning(false);
    }
  }, [askToApplyDetectedProof, clearError]);

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

  const runOnlineLogoSearch = useCallback(async () => {
    clearError();
    const query = title.trim();
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
  }, [clearError, title]);

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

  const save = useCallback(async () => {
    if (!itemId?.trim()) return;
    clearError();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return setFormError('Title is required.');
    if (!category) return setFormError('Pick a category.');

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
      await updateItem(itemId, {
        title: trimmedTitle,
        category,
        subcategory: category === 'document' ? documentSubcategory : null,
        description: description.trim(),
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
        router.replace(hrefItemDetails(itemId));
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
    documentSubcategory,
    clearError,
    description,
    expiryDate,
    issueDate,
    itemId,
    logoUri,
    noExpiry,
    photoUri,
    purchaseDate,
    reminderDays,
    router,
    title,
    warrantyUntil,
  ]);

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <GlassHeader title="Edit item" back brand={false} />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (missing || !itemId) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <GlassHeader title="Edit item" back brand={false} />
          <View style={styles.centeredBox}>
            <AppText variant="headlineMd" color={colors.primary} center>
              Item not found
            </AppText>
            <AppButton variant="primary" onPress={() => router.back()}>
              Go back
            </AppButton>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="Edit item" back brand={false} />
        <FormKeyboardAvoidingScroll
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
            <View style={styles.headerBlock}>
              <AppText variant="display" color={colors.primaryContainer}>
                Edit item
              </AppText>
              <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
                Update what changed — everything stays on this device.
              </AppText>
            </View>

            {formError ? (
              <GlassCard accentBar={colors.error}>
                <AppText variant="labelMd" color={colors.error}>
                  {formError}
                </AppText>
              </GlassCard>
            ) : null}

            <View style={styles.field}>
              <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                Logo
              </AppText>
              <GlassCard radius="xxl" padded="sm">
                <View style={styles.logoEditRow}>
                  <View style={styles.logoEditPreview}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.logoImage} contentFit="cover" />
                    ) : (
                      <MaterialIcons name="upload" size={28} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.logoEditText}>
                    <AppText variant="labelMd" color={colors.onSurface}>
                      {logoUri ? 'Custom logo selected' : 'Built-in category logo'}
                    </AppText>
                    <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                      This appears in vault and search lists. Visual proof stays separate.
                    </AppText>
                  </View>
                </View>
                <View style={styles.photoActions}>
                  <AppButton variant="outline" size="md" onPress={() => void attachCustomLogo()}>
                    Upload logo
                  </AppButton>
                  <AppButton
                    variant="outline"
                    size="md"
                    onPress={confirmOnlineLogoSearch}
                    loading={searchingLogos}
                    disabled={searchingLogos}>
                    Find online
                  </AppButton>
                  {logoUri ? (
                    <AppButton variant="destructive" size="md" onPress={removeCustomLogo}>
                      Remove
                    </AppButton>
                  ) : null}
                </View>
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
              </GlassCard>
            </View>

            <View style={styles.field}>
              <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                Category
              </AppText>
              <ScrollView
                horizontal
                keyboardDismissMode="none"
                keyboardShouldPersistTaps="always"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}>
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
                      style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}>
                      <AppText
                        variant="labelMd"
                        color={selected ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
                        {c.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {category === 'document' ? (
              <View style={styles.field}>
                <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                  Document type
                </AppText>
                <ScrollView
                  horizontal
                  keyboardDismissMode="none"
                  keyboardShouldPersistTaps="always"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}>
                  {DOCUMENT_SUBCATEGORIES.map((s) => {
                    const selected = documentSubcategory === s.code;
                    return (
                      <Pressable
                        key={s.code}
                        onPress={() => {
                          setDocumentSubcategory((prev) =>
                            prev === s.code ? null : s.code,
                          );
                          if (formError) setFormError(null);
                        }}
                        style={[
                          styles.chip,
                          selected ? styles.chipSelected : styles.chipUnselected,
                        ]}>
                        <AppText
                          variant="labelMd"
                          color={
                            selected ? colors.onSecondaryContainer : colors.onSurfaceVariant
                          }
                          numberOfLines={2}>
                          {s.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <AppTextInput
              label="Item name"
              placeholder="e.g. MacBook Pro M3"
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (formError) setFormError(null);
              }}
            />

            <View style={styles.row}>
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
                    BanTayi will keep it without deadline reminders.
                  </AppText>
                </View>
              </Pressable>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <DatePickerField
                  label="Expiry date"
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
              <GlassCard padded={false} radius="lg">
                <View style={styles.reminderRow}>
                  <MaterialIcons name="notifications" size={20} color={colors.primaryContainer} />
                  <TextInput
                    value={reminderDays}
                    onChangeText={setReminderDays}
                    keyboardType="number-pad"
                    placeholder="7"
                    placeholderTextColor={colors.outline}
                    style={styles.reminderInput}
                    editable={!noExpiry}
                  />
                  <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                    days
                  </AppText>
                </View>
              </GlassCard>
              <AppText variant="labelSm" color={colors.onSurfaceVariant} style={styles.hint}>
                Leave blank to skip reminders for this item.
              </AppText>
            </View>

            <View style={styles.field}>
              <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                Visual proof
              </AppText>
              {photoUri ? (
                <GlassCard radius="xxl" padded="sm">
                  <NativeImage
                    key={photoUri}
                    source={{ uri: photoUri }}
                    style={styles.preview}
                    resizeMode="cover"
                  />
                  <View style={styles.photoActions}>
                    <AppButton
                      variant="outline"
                      size="md"
                      onPress={() => void attachVisualProof('camera')}
                      disabled={saving || scanning}
                      loading={scanning}>
                      Rescan
                    </AppButton>
                    <AppButton
                      variant="outline"
                      size="md"
                      onPress={() => void attachVisualProof('library')}
                      disabled={saving || scanning}>
                      Replace
                    </AppButton>
                    <AppButton
                      variant="destructive"
                      size="md"
                      onPress={removePhoto}
                      disabled={saving || scanning}>
                      Remove
                    </AppButton>
                  </View>
                </GlassCard>
              ) : (
                <View style={styles.uploader}>
                  <MaterialIcons
                    name="add-a-photo"
                    size={36}
                    color={colors.primaryContainer}
                  />
                  <AppText variant="labelMd" color={colors.primaryContainer}>
                    Scan receipt, document, or ID
                  </AppText>
                  <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                    BanTayi can detect issue, expiry, and warranty dates on-device.
                  </AppText>
                  <View style={styles.scanActions}>
                    <AppButton
                      variant="primary"
                      size="md"
                      icon="photo-camera"
                      onPress={() => void attachVisualProof('camera')}
                      disabled={saving || scanning}
                      loading={scanning}>
                      Scan with camera
                    </AppButton>
                    <AppButton
                      variant="outline"
                      size="md"
                      icon="photo-library"
                      onPress={() => void attachVisualProof('library')}
                      disabled={saving || scanning}>
                      Pick photo
                    </AppButton>
                  </View>
                </View>
              )}
            </View>

            <AppTextInput
              label="Notes"
              placeholder="Specific details, serial numbers, or storage location…"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View style={{ marginTop: spacing.sm }}>
              <AppButton
                variant="primary"
                icon="save"
                loading={saving}
                disabled={saving}
                onPress={() => void save()}>
                Save changes
              </AppButton>
            </View>
        </FormKeyboardAvoidingScroll>
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredBox: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  headerBlock: {
    gap: 4,
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  field: {
    gap: 8,
  },
  hint: {
    paddingHorizontal: 4,
  },
  chipRow: {
    paddingVertical: 4,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipUnselected: {
    backgroundColor: colors.glassFill,
    borderColor: colors.glassBorder,
  },
  chipSelected: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
    shadowColor: colors.secondaryFixedDim,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noExpiryRow: {
    flex: 1,
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
  col: {
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
  preview: {
    width: '100%',
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
  },
  logoEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoEditPreview: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.glassFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoEditText: {
    flex: 1,
    gap: 2,
  },
  onlineLogoSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  uploader: {
    minHeight: 180,
    borderRadius: radii.xxl,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.primaryFixedDim,
    backgroundColor: colors.glassFillSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.lg,
  },
  scanActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
