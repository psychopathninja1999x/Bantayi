import type { ReactNode } from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

import { GlassCard } from './GlassCard';

export interface AppCardProps extends ViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Subtle inner padding; default true. Pass `'sm'` for tighter list rows. */
  padded?: boolean | 'sm' | 'md' | 'lg';
}

/**
 * AppCard remains for backwards compatibility — now wraps the new
 * glassmorphic primitive (frosted, soft border, ambient shadow).
 */
export function AppCard({ children, style, padded = true, ...rest }: AppCardProps) {
  return (
    <GlassCard padded={padded} style={style} {...rest}>
      {children}
    </GlassCard>
  );
}
