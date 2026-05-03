import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  GlassCard,
  GlassHeader,
  ItemLogo,
  ScreenBackground,
  StatusBadge,
} from '@/src/components';
import { ROUTES, colors, hrefItemDetails, radii, spacing } from '@/src/constants';
import { CATEGORIES } from '@/src/constants/categories';
import { fontFamily, typography } from '@/src/constants/colors';
import { getAllItems } from '@/src/database';
import type { Item, ItemCategory } from '@/src/types';
import {
  formatItemCategoryLine,
  formatItemDateLines,
  statusToneForItem,
} from '@/src/utils/item-helpers';

type FilterId = 'all' | 'active' | 'expiring_soon' | 'expired' | 'warranty' | ItemCategory;
type StorageFilter = 'all' | string;
type ViewMode = 'list' | 'tile';

interface FilterDef {
  id: FilterId;
  label: string;
}

const PRIMARY_FILTERS: FilterDef[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'expiring_soon', label: 'Expiring soon' },
  { id: 'expired', label: 'Expired' },
  { id: 'warranty', label: 'Warranty' },
  ...CATEGORIES.map<FilterDef>((c) => ({ id: c.code, label: c.label })),
];

function applyFilter(items: Item[], filter: FilterId): Item[] {
  if (filter === 'all') return items;
  if (filter === 'active') {
    return items.filter((item) => {
      const tone = statusToneForItem(item);
      return item.status !== 'archived' && tone !== 'expired' && tone !== 'expiring_soon';
    });
  }
  if (filter === 'expiring_soon') {
    return items.filter((item) => statusToneForItem(item) === 'expiring_soon');
  }
  if (filter === 'expired') {
    return items.filter((item) => statusToneForItem(item) === 'expired');
  }
  if (filter === 'warranty') {
    return items.filter((i) => i.warranty_until);
  }
  return items.filter((i) => i.category === filter);
}

function storageLabelForItem(item: Item): string {
  return item.description?.trim() || 'Not specified';
}

function buildStorageCards(items: Item[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = storageLabelForItem(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (a.label === 'Not specified') return 1;
      if (b.label === 'Not specified') return -1;
      return b.count - a.count || a.label.localeCompare(b.label);
    });
}

interface StorageCardProps {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}

function StorageCard({ label, count, selected, onPress }: StorageCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.storageCard,
        selected && styles.storageCardSelected,
        pressed && { opacity: 0.88 },
      ]}>
      <View style={[styles.storageIcon, selected && styles.storageIconSelected]}>
        <MaterialIcons
          name={label === 'All storage' ? 'inventory-2' : 'folder'}
          size={22}
          color={selected ? colors.onPrimary : colors.primary}
        />
      </View>
      <View style={styles.storageText}>
        <AppText
          variant="labelMd"
          color={selected ? colors.onPrimary : colors.onSurface}
          numberOfLines={1}>
          {label}
        </AppText>
        <AppText
          variant="labelSm"
          color={selected ? colors.onPrimary : colors.onSurfaceVariant}
          numberOfLines={1}>
          {count} item{count === 1 ? '' : 's'}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function VaultScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [storageFilter, setStorageFilter] = useState<StorageFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const load = useCallback(async () => {
    try {
      setError(null);
      const all = await getAllItems();
      setItems(all);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not read database.';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const byFilter = applyFilter(items, filter).filter((item) => {
      if (storageFilter === 'all') return true;
      return storageLabelForItem(item) === storageFilter;
    });
    const q = search.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        (it.description ?? '').toLowerCase().includes(q) ||
        formatItemCategoryLine(it).toLowerCase().includes(q),
    );
  }, [items, filter, search, storageFilter]);

  const storageCards = useMemo(() => buildStorageCards(items), [items]);

  const summary = items.length === 0
    ? 'Add your first item to begin.'
    : `You have ${items.length} item${items.length === 1 ? '' : 's'} secured in your vault.`;

  const renderItem: ListRenderItem<Item> = useCallback(
    ({ item }) => {
      const tone = statusToneForItem(item);
      const dates = formatItemDateLines(item);
      if (viewMode === 'tile') {
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(hrefItemDetails(item.id))}
            style={({ pressed }) => [styles.tileWrap, pressed && styles.rowPressed]}>
            <GlassCard radius="xl" padded="md" style={styles.tileCard}>
              <View style={styles.tileTop}>
                <ItemLogo
                  category={item.category}
                  subcategory={item.subcategory}
                  logoUri={item.logo_uri}
                  size={52}
                />
                <StatusBadge tone={tone} />
              </View>
              <AppText
                variant="headlineMd"
                color={colors.onSurface}
                numberOfLines={2}
                style={styles.tileTitle}>
                {item.title}
              </AppText>
              <AppText
                variant="labelSm"
                color={colors.onSurfaceVariant}
                uppercase
                numberOfLines={1}>
                {formatItemCategoryLine(item)}
              </AppText>
              {dates && dates !== 'No dates' ? (
                <AppText
                  variant="labelSm"
                  color={colors.onSurfaceVariant}
                  numberOfLines={2}
                  style={styles.tileDates}>
                  {dates}
                </AppText>
              ) : null}
            </GlassCard>
          </Pressable>
        );
      }
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(hrefItemDetails(item.id))}
          style={({ pressed }) => [styles.rowWrap, pressed && styles.rowPressed]}>
          <GlassCard radius="xxl" padded="md">
            <View style={styles.rowInner}>
              <ItemLogo
                category={item.category}
                subcategory={item.subcategory}
                logoUri={item.logo_uri}
                size={56}
              />
              <View style={styles.rowText}>
                <AppText variant="headlineMd" color={colors.onSurface} numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText
                  variant="labelSm"
                  color={colors.onSurfaceVariant}
                  uppercase
                  style={{ marginTop: 4 }}
                  numberOfLines={1}>
                  {formatItemCategoryLine(item)}
                </AppText>
                {dates && dates !== 'No dates' ? (
                  <AppText
                    variant="labelSm"
                    color={colors.onSurfaceVariant}
                    numberOfLines={1}
                    style={{ marginTop: 2 }}>
                    {dates}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.rowRight}>
                <StatusBadge tone={tone} />
                <Pressable hitSlop={8} style={styles.moreBtn}>
                  <MaterialIcons name="more-vert" size={20} color={colors.outline} />
                </Pressable>
              </View>
            </View>
          </GlassCard>
        </Pressable>
      );
    },
    [router, viewMode],
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <AppText variant="display" color={colors.primaryContainer}>
        All safe.
      </AppText>
      <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
        {summary}
      </AppText>

      <GlassCard padded={false} radius="xxl" style={styles.searchCard} flat>
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={22} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your vault..."
            placeholderTextColor={colors.outline}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={colors.outline} />
            </Pressable>
          ) : null}
        </View>
      </GlassCard>

      <ScrollView
        horizontal
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storageCardsRow}>
        <StorageCard
          label="All storage"
          count={items.length}
          selected={storageFilter === 'all'}
          onPress={() => setStorageFilter('all')}
        />
        {storageCards.map((card) => (
          <StorageCard
            key={card.label}
            label={card.label}
            count={card.count}
            selected={storageFilter === card.label}
            onPress={() => setStorageFilter(card.label)}
          />
        ))}
      </ScrollView>

      <View style={styles.viewToggle}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === 'list' }}
          onPress={() => setViewMode('list')}
          style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}>
          <MaterialIcons
            name="view-list"
            size={18}
            color={viewMode === 'list' ? colors.onPrimary : colors.onSurfaceVariant}
          />
          <AppText
            variant="labelMd"
            color={viewMode === 'list' ? colors.onPrimary : colors.onSurfaceVariant}>
            List
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === 'tile' }}
          onPress={() => setViewMode('tile')}
          style={[styles.viewToggleButton, viewMode === 'tile' && styles.viewToggleButtonActive]}>
          <MaterialIcons
            name="grid-view"
            size={18}
            color={viewMode === 'tile' ? colors.onPrimary : colors.onSurfaceVariant}
          />
          <AppText
            variant="labelMd"
            color={viewMode === 'tile' ? colors.onPrimary : colors.onSurfaceVariant}>
            Tiles
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}>
        {PRIMARY_FILTERS.map((f) => {
          const selected = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <AppText
                variant="labelMd"
                color={selected ? colors.onPrimary : colors.onSurfaceVariant}
                style={styles.chipLabel}>
                {f.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {error ? (
        <GlassCard accentBar={colors.error}>
          <AppText variant="labelMd" color={colors.error}>
            {error}
          </AppText>
          <View style={{ marginTop: spacing.sm }}>
            <AppButton variant="outline" onPress={() => void load()}>
              Try again
            </AppButton>
          </View>
        </GlassCard>
      ) : null}
    </View>
  );

  const listEmpty =
    !loading && !error ? (
      <GlassCard radius="xxl" style={styles.emptyCard}>
        <AppText variant="headlineMd" color={colors.primary}>
          Nothing here yet
        </AppText>
        <AppText
          variant="bodyMd"
          color={colors.onSurfaceVariant}
          style={{ marginTop: 4, marginBottom: spacing.md }}>
          Save your first warranty, receipt, or ID and BanTayi will keep watch.
        </AppText>
        <AppButton
          variant="accent"
          icon="add"
          onPress={() => router.push(ROUTES.addItem)}>
          Add first item
        </AppButton>
      </GlassCard>
    ) : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="Vault" brand />
        <FlatList
          key={viewMode}
          numColumns={viewMode === 'tile' ? 2 : 1}
          columnWrapperStyle={viewMode === 'tile' ? styles.tileColumnWrapper : undefined}
          data={error ? [] : filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: viewMode === 'tile' ? spacing.md : spacing.sm }} />}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  headerBlock: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  searchCard: {
    marginTop: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.onSurface,
    fontSize: typography.bodyMd.size,
    fontFamily: fontFamily.regular,
    paddingVertical: 6,
  },
  storageCardsRow: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  storageCard: {
    width: 170,
    minHeight: 82,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  storageCardSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  storageIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageIconSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  storageText: {
    flex: 1,
    gap: 2,
  },
  chipsRow: {
    paddingVertical: 4,
    gap: spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    padding: 4,
    gap: 4,
  },
  viewToggleButton: {
    minHeight: 36,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primaryContainer,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHighest,
  },
  chipSelected: {
    backgroundColor: colors.primaryContainer,
  },
  chipLabel: {
    letterSpacing: 0.1,
  },
  loader: {
    paddingVertical: spacing.sm,
  },
  rowWrap: {
    width: '100%',
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    flexShrink: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  moreBtn: {
    padding: 4,
  },
  tileColumnWrapper: {
    gap: spacing.sm,
  },
  tileWrap: {
    flex: 1,
    maxWidth: '50%',
  },
  tileCard: {
    minHeight: 178,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tileTitle: {
    marginTop: spacing.sm,
    minHeight: 56,
  },
  tileDates: {
    marginTop: 4,
  },
  emptyCard: {
    marginTop: spacing.sm,
  },
});
