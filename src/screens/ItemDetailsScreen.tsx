import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  AppTextInput,
  GlassCard,
  GlassHeader,
  ItemLogo,
  ScreenBackground,
  StatusBadge,
} from '@/src/components';

import { colors, radii, spacing } from '@/src/constants/colors';
import { hrefEditItem, ROUTES } from '@/src/constants/routes';
import { deleteItem, getItemById, updateItem } from '@/src/database';
import { localTodayISO } from '@/src/database/date-helpers';
import { DatabaseError } from '@/src/database/errors';
import type { Item } from '@/src/types';
import { parseOptionalISODate } from '@/src/utils/dates';
import { formatItemCategoryLine, itemDeadline, statusToneForItem } from '@/src/utils/item-helpers';

function normalizeParam(id: string | string[] | undefined): string | undefined {
  if (id == null) return undefined;
  return Array.isArray(id) ? id[0] : id;
}

const FRIENDLY_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${FRIENDLY_MONTHS[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
}

function relativeFromToday(iso: string | null): string {
  if (!iso) return '';
  const today = localTodayISO();
  const a = today.split('-').map(Number);
  const b = iso.split('-').map(Number);
  if (a.length !== 3 || b.length !== 3) return '';
  const dA = new Date(a[0], a[1] - 1, a[2]).getTime();
  const dB = new Date(b[0], b[1] - 1, b[2]).getTime();
  const days = Math.round((dB - dA) / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Due today';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} left`;
  if (days < 365) return `${Math.round(days / 30)} month${days >= 60 ? 's' : ''} left`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} left`;
}

export default function ItemDetailsScreen() {
  const router = useRouter();
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const itemId = normalizeParam(rawId);

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewExpiry, setRenewExpiry] = useState('');
  const [renewWarranty, setRenewWarranty] = useState('');
  const [renewError, setRenewError] = useState<string | null>(null);
  const [renewSaving, setRenewSaving] = useState(false);

  const load = useCallback(async () => {
    if (!itemId?.trim()) {
      setNotFound(true);
      setItem(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const row = await getItemById(itemId);
      setItem(row);
      setNotFound(!row);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load item.';
      Alert.alert('Error', message);
      setItem(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openRenew = useCallback(() => {
    if (!item) return;
    setRenewExpiry(item.expiry_date ?? '');
    setRenewWarranty(item.warranty_until ?? '');
    setRenewError(null);
    setRenewOpen(true);
  }, [item]);

  const closeRenew = useCallback(() => {
    setRenewOpen(false);
    setRenewError(null);
  }, []);

  const submitRenew = useCallback(async () => {
    if (!itemId?.trim() || !item) return;
    setRenewError(null);
    const expiryTrim = renewExpiry.trim();
    const warrantyTrim = renewWarranty.trim();
    let nextExpiry: string | null | undefined;
    let nextWarranty: string | null | undefined;
    if (expiryTrim) {
      const pe = parseOptionalISODate(renewExpiry);
      if (!pe.ok) return setRenewError(pe.message);
      nextExpiry = pe.value;
    }
    if (warrantyTrim) {
      const pw = parseOptionalISODate(renewWarranty);
      if (!pw.ok) return setRenewError(pw.message);
      nextWarranty = pw.value;
    }
    const mergedExpiry = nextExpiry !== undefined ? nextExpiry : item.expiry_date ?? null;
    const mergedWarranty = nextWarranty !== undefined ? nextWarranty : item.warranty_until ?? null;
    if (!item.no_expiry && !mergedExpiry && !mergedWarranty) {
      setRenewError('Enter at least an expiry date or a warranty end date.');
      return;
    }
    const changes: Parameters<typeof updateItem>[1] = { status: 'renewed' };
    if (nextExpiry !== undefined) changes.expiry_date = nextExpiry;
    if (nextWarranty !== undefined) changes.warranty_until = nextWarranty;

    setRenewSaving(true);
    try {
      const updated = await updateItem(itemId, changes);
      setItem(updated);
      closeRenew();
    } catch (e) {
      const message =
        e instanceof DatabaseError ? e.message : e instanceof Error ? e.message : 'Could not update.';
      setRenewError(message);
    } finally {
      setRenewSaving(false);
    }
  }, [closeRenew, item, itemId, renewExpiry, renewWarranty]);

  const confirmDelete = useCallback(() => {
    if (!itemId?.trim() || !item) return;
    Alert.alert(
      'Delete this item?',
      'It will be removed from your vault. Photos stay on the device unless you delete them manually.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteItem(itemId);
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(ROUTES.vault);
                }
              } catch (e) {
                const message =
                  e instanceof DatabaseError ? e.message : e instanceof Error ? e.message : 'Could not delete.';
                Alert.alert('Error', message);
              }
            })();
          },
        },
      ],
    );
  }, [item, itemId, router]);

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <GlassHeader title="Details" back brand={false} />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (notFound || !item || !itemId) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <GlassHeader title="Details" back brand={false} />
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

  const tone = statusToneForItem(item);
  const deadline = itemDeadline(item);
  const expiryLabel =
    item.category === 'bill_due'
      ? 'Due date'
      : item.category === 'card_expiry'
        ? 'Card expiry'
        : 'Expiry';

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="Details" back brand={false} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <View style={styles.titleCol}>
                <AppText variant="display" color={colors.primary} numberOfLines={3}>
                  {item.title}
                </AppText>
                <AppText
                  variant="labelMd"
                  uppercase
                  color={colors.onSurfaceVariant}
                  style={{ marginTop: 6 }}>
                  {formatItemCategoryLine(item)}
                </AppText>
              </View>
              <ItemLogo
                category={item.category}
                subcategory={item.subcategory}
                logoUri={item.logo_uri}
                size={68}
              />
            </View>
            <View style={styles.statusRow}>
              <StatusBadge tone={tone} />
              {deadline ? (
                <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                  {relativeFromToday(deadline)}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.bento}>
            <View style={styles.bentoCol}>
              <GlassCard radius="xxl" padded="md">
                <View style={styles.bentoHead}>
                  <MaterialIcons name="event-busy" size={20} color={colors.tertiary} />
                  <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                    {expiryLabel}
                  </AppText>
                </View>
                <AppText variant="headlineMd" color={colors.primary} style={styles.bentoValue}>
                  {item.no_expiry ? 'No expiry' : shortDate(item.expiry_date)}
                </AppText>
                <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                  {item.no_expiry
                    ? 'This item is marked as not expiring.'
                    : item.expiry_date
                      ? relativeFromToday(item.expiry_date)
                      : 'No expiry recorded'}
                </AppText>
              </GlassCard>
            </View>
            <View style={styles.bentoCol}>
              <GlassCard radius="xxl" padded="md">
                <View style={styles.bentoHead}>
                  <MaterialIcons name="verified" size={20} color={colors.secondary} />
                  <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                    Warranty
                  </AppText>
                </View>
                <AppText variant="headlineMd" color={colors.primary} style={styles.bentoValue}>
                  {shortDate(item.warranty_until)}
                </AppText>
                <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                  {item.warranty_until
                    ? relativeFromToday(item.warranty_until)
                    : 'No warranty recorded'}
                </AppText>
              </GlassCard>
            </View>
          </View>

          {item.description?.trim() ? (
            <GlassCard radius="xxl">
              <View style={styles.storageRow}>
                <View style={styles.storageIcon}>
                  <MaterialIcons name="inventory-2" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                    Storage
                  </AppText>
                  <AppText variant="bodyMd" color={colors.onSurface} style={{ marginTop: 2 }}>
                    {item.description}
                  </AppText>
                </View>
              </View>
            </GlassCard>
          ) : null}

          <GlassCard radius="xxl" padded="md">
            <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
              Dates
            </AppText>
            <DateRow label="Issued" value={shortDate(item.issue_date)} />
            <DateRow label="Purchased" value={shortDate(item.purchase_date)} />
            <DateRow label={expiryLabel} value={item.no_expiry ? 'No expiry' : shortDate(item.expiry_date)} />
            <DateRow label="Warranty" value={shortDate(item.warranty_until)} />
          </GlassCard>

          {item.photo_uri ? (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                Document preview
              </AppText>
              <GlassCard radius="xxl" padded="sm">
                <Image source={{ uri: item.photo_uri }} style={styles.photo} contentFit="cover" />
              </GlassCard>
            </View>
          ) : null}

          <GlassCard radius="xxl" padded="md">
            <View style={styles.reminderRow}>
              <View style={styles.reminderIcon}>
                <MaterialIcons
                  name={
                    item.reminder_days_before != null
                      ? 'notifications-active'
                      : 'notifications-off'
                  }
                  size={22}
                  color={colors.onPrimaryFixedVariant}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="labelMd" color={colors.primary}>
                  {item.reminder_days_before != null ? 'Reminder set' : 'No reminder set'}
                </AppText>
                <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                  {item.reminder_days_before != null
                    ? `Notify ${item.reminder_days_before} day${item.reminder_days_before === 1 ? '' : 's'} before deadline`
                    : item.no_expiry
                      ? 'No deadline reminders are needed for this item.'
                      : 'Edit the item to add a local reminder.'}
                </AppText>
              </View>
            </View>
          </GlassCard>

          <View style={styles.actions}>
            <AppButton
              variant="primary"
              icon="autorenew"
              onPress={openRenew}>
              Mark as renewed
            </AppButton>
            <View style={styles.actionRow}>
              <View style={styles.actionCol}>
                <AppButton
                  variant="outline"
                  icon="edit"
                  onPress={() => router.push(hrefEditItem(item.id))}>
                  Edit
                </AppButton>
              </View>
              <View style={styles.actionCol}>
                <AppButton
                  variant="destructive"
                  icon="delete-outline"
                  onPress={confirmDelete}>
                  Delete
                </AppButton>
              </View>
            </View>
          </View>

          <View style={styles.privacyFoot}>
            <MaterialIcons name="lock" size={16} color={colors.onSurfaceVariant} />
            <AppText variant="labelSm" color={colors.onSurfaceVariant}>
              Stored locally on this device.
            </AppText>
          </View>
        </ScrollView>

        <Modal visible={renewOpen} animationType="slide" transparent onRequestClose={closeRenew}>
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeRenew}
              accessibilityLabel="Close modal"
            />
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="always"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalSheet}>
              <View style={styles.modalGrabber} />
              <AppText variant="headlineMd" color={colors.primary}>
                Mark as renewed
              </AppText>
              <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
                Update the expiry and/or warranty if you renewed the item.
              </AppText>
              {renewError ? (
                <GlassCard accentBar={colors.error}>
                  <AppText variant="labelMd" color={colors.error}>
                    {renewError}
                  </AppText>
                </GlassCard>
              ) : null}
              <AppTextInput
                label="Expiry date"
                placeholder="YYYY-MM-DD"
                value={renewExpiry}
                onChangeText={setRenewExpiry}
                keyboardType="numbers-and-punctuation"
              />
              <AppTextInput
                label="Warranty until"
                placeholder="YYYY-MM-DD"
                value={renewWarranty}
                onChangeText={setRenewWarranty}
                keyboardType="numbers-and-punctuation"
              />
              <View style={styles.modalActions}>
                <AppButton variant="secondary" onPress={closeRenew} disabled={renewSaving}>
                  Cancel
                </AppButton>
                <AppButton
                  variant="primary"
                  loading={renewSaving}
                  disabled={renewSaving}
                  onPress={() => void submitRenew()}>
                  Save as renewed
                </AppButton>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

interface DateRowProps {
  label: string;
  value: string;
}

function DateRow({ label, value }: DateRowProps) {
  return (
    <View style={styles.dateRow}>
      <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="bodyMd" color={colors.onSurface} style={styles.dateValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
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
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleCol: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  bento: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bentoCol: {
    flex: 1,
  },
  bentoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  bentoValue: {
    marginBottom: 4,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainer,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  storageIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  dateValue: {
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCol: {
    flex: 1,
  },
  privacyFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.md,
    opacity: 0.7,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrimDim,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  modalGrabber: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
