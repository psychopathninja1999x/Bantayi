import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { radii } from '@/src/constants/colors';
import type { ItemCategory } from '@/src/types';
import type { DocumentSubcategory } from '@/src/constants/document-subcategories';

import { CategoryIcon } from './CategoryIcon';

export interface ItemLogoProps {
  category: ItemCategory;
  subcategory?: DocumentSubcategory | null;
  logoUri?: string | null;
  size?: number;
}

export function ItemLogo({ category, subcategory, logoUri, size = 56 }: ItemLogoProps) {
  if (!logoUri) {
    return <CategoryIcon category={category} subcategory={subcategory} size={size} />;
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: Math.min(size / 3, radii.xl) }]}>
      <Image source={{ uri: logoUri }} style={styles.image} contentFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
