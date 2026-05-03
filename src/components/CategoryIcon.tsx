import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/src/constants/colors';
import {
  DOCUMENT_SUBCATEGORY_ART,
  getDocumentSubcategoryInfo,
} from '@/src/constants/document-subcategories';
import type { DocumentSubcategory } from '@/src/constants/document-subcategories';
import type { ItemCategory } from '@/src/types';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface CategoryVisual {
  icon: IconName;
  /** Tile background. */
  bg: string;
  /** Icon foreground. */
  fg: string;
}

const VISUALS: Record<ItemCategory, CategoryVisual> = {
  item: { icon: 'category', bg: colors.surfaceContainerHigh, fg: colors.primary },
  bill_due: { icon: 'event', bg: colors.tertiaryFixed, fg: colors.onTertiaryFixedVariant },
  card_expiry: { icon: 'credit-card', bg: colors.primaryFixed, fg: colors.onPrimaryFixedVariant },
  document: { icon: 'description', bg: colors.primaryFixed, fg: colors.onPrimaryFixedVariant },
  receipt_warranty: { icon: 'receipt-long', bg: colors.secondaryFixed, fg: colors.onSecondaryFixedVariant },
  medicine: { icon: 'medication', bg: colors.errorContainer, fg: colors.error },
  vehicle: { icon: 'directions-car', bg: colors.primaryFixed, fg: colors.onPrimaryFixedVariant },
  subscription: { icon: 'autorenew', bg: colors.secondaryFixed, fg: colors.onSecondaryFixedVariant },
  insurance: { icon: 'health-and-safety', bg: colors.tertiaryFixed, fg: colors.onTertiaryFixedVariant },
  appliance: { icon: 'kitchen', bg: colors.primaryFixed, fg: colors.onPrimaryFixedVariant },
  gadget: { icon: 'devices', bg: colors.surfaceContainerHigh, fg: colors.primary },
  other: { icon: 'inventory-2', bg: colors.surfaceContainerHigh, fg: colors.primary },
};

export function getCategoryVisual(category: ItemCategory): CategoryVisual {
  return VISUALS[category] ?? VISUALS.other;
}

export interface CategoryIconProps {
  category: ItemCategory;
  /** Document subtype; used for tile artwork or icon fallback. */
  subcategory?: DocumentSubcategory | null;
  size?: number;
}

export function CategoryIcon({
  category,
  subcategory = null,
  size = 48,
}: CategoryIconProps) {
  const v = getCategoryVisual(category);
  const iconSize = Math.round(size * 0.5);
  const inner = Math.max(28, Math.round(size - 14));

  const art =
    category === 'document' && subcategory ? DOCUMENT_SUBCATEGORY_ART[subcategory] : undefined;
  if (art) {
    return (
      <View style={[styles.tile, { width: size, height: size, backgroundColor: v.bg }]}>
        <Image
          source={art}
          style={{ width: inner, height: inner }}
          contentFit="contain"
        />
      </View>
    );
  }

  const subInfo = category === 'document' ? getDocumentSubcategoryInfo(subcategory) : null;
  const iconName = subInfo?.icon ?? v.icon;

  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: v.bg }]}>
      <MaterialIcons name={iconName} size={iconSize} color={v.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
