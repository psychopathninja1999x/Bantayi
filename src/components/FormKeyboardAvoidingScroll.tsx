import type { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

type Props = PropsWithChildren<
  Pick<ScrollViewProps, 'contentContainerStyle' | 'showsVerticalScrollIndicator'>
>;

/**
 * Avoid `KeyboardAvoidingView` on iOS — with the New Architecture it often fights native
 * keyboard/layout updates and resigns focused fields immediately after focus.
 *
 * Prefer `automaticallyAdjustKeyboardInsets` + Android window resize instead.
 */
export function FormKeyboardAvoidingScroll({
  children,
  contentContainerStyle,
  showsVerticalScrollIndicator,
}: Props) {
  return (
    <View style={styles.flex}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled={Platform.OS === 'android'}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
