import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  GlassCard,
  GlassHeader,
  ItemLogo,
  ScreenBackground,
  StatusBadge,
} from '@/src/components';
import { hrefItemDetails } from '@/src/constants';
import { colors, fontFamily, spacing, typography } from '@/src/constants/colors';
import { searchItems } from '@/src/database';
import { DatabaseError } from '@/src/database/errors';
import type { Item } from '@/src/types';
import { formatItemDateLines, formatItemCategoryLine, statusToneForItem } from '@/src/utils/item-helpers';

const SEARCH_DEBOUNCE_MS = 280;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await searchItems(q);
      setResults(rows);
    } catch (e) {
      const message =
        e instanceof DatabaseError ? e.message : e instanceof Error ? e.message : 'Search failed.';
      setError(message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  useFocusEffect(
    useCallback(() => {
      void runSearch(debouncedQuery);
    }, [debouncedQuery, runSearch]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runSearch(debouncedQuery);
    } finally {
      setRefreshing(false);
    }
  }, [debouncedQuery, runSearch]);

  const renderItem: ListRenderItem<Item> = useCallback(
    ({ item }) => {
      const tone = statusToneForItem(item);
      const dates = formatItemDateLines(item);
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
                  numberOfLines={1}
                  style={{ marginTop: 4 }}>
                  {formatItemCategoryLine(item)}
                </AppText>
                <AppText
                  variant="labelSm"
                  color={colors.onSurfaceVariant}
                  numberOfLines={1}
                  style={{ marginTop: 2 }}>
                  {dates}
                </AppText>
              </View>
              <StatusBadge tone={tone} />
            </View>
          </GlassCard>
        </Pressable>
      );
    },
    [router],
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <AppText variant="display" color={colors.primaryContainer}>
        Search
      </AppText>
      <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
        Find items by title or notes — everything stays on this device.
      </AppText>
      <GlassCard padded={false} radius="xxl" style={styles.searchCard} flat>
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={22} color={colors.outline} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. insurance, receipt…"
            placeholderTextColor={colors.outline}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={colors.outline} />
            </Pressable>
          ) : null}
        </View>
      </GlassCard>
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
        </GlassCard>
      ) : null}
    </View>
  );

  const listEmpty =
    !loading && !error ? (
      <GlassCard radius="xxl" style={styles.emptyCard}>
        <AppText variant="headlineMd" color={colors.primary}>
          {debouncedQuery ? 'No matches' : 'Start typing'}
        </AppText>
        <AppText variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
          {debouncedQuery
            ? 'Try a different word or check your spelling.'
            : 'Search titles and notes from anywhere in your vault.'}
        </AppText>
      </GlassCard>
    ) : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="Search" brand />
        <FlatList
          data={error ? [] : results}
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
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
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
  },
  emptyCard: {
    marginTop: spacing.sm,
  },
});
