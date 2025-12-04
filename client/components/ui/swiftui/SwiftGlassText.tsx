// components/swiftui/SwiftGlassText.tsx
import React from 'react';
import { Text } from '@expo/ui/swift-ui';
import {
  glassEffect,
  padding,
  cornerRadius,
  background,
} from '@expo/ui/swift-ui/modifiers';

type SwiftGlassTextProps = {
  children: string;
  size?: number;
  /**
   * "clear" = more transparent, "regular" = more frosted
   */
  variant?: 'clear' | 'regular';
  /**
   * Optional background tint behind the glass.
   */
  tintColor?: string;
};

export function SwiftGlassText({
  children,
  size = 20,
  variant = 'clear',
  tintColor,
}: SwiftGlassTextProps): React.ReactElement {
  const hasTint = Boolean(tintColor);

  return (
    <Text
      size={size}
      modifiers={[
        padding({ horizontal: 16, vertical: 8 }),
        cornerRadius(16),
        ...(hasTint ? [background(tintColor!)] : []),
        glassEffect({
          glass: {
            variant,
          },
        }),
      ]}
    >
      {children}
    </Text>
  );
}
