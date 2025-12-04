// components/swiftui/SwiftHost.tsx
import React from 'react';
import type { ReactNode } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';
import { Host } from '@expo/ui/swift-ui';

type SwiftHostBaseProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

type SwiftInlineHostProps = SwiftHostBaseProps & {
  /** If true, Host will hug its SwiftUI contents (matchContents) */
  matchContents?: boolean;
};

/**
 * Full-screen / section Host – lets SwiftUI own a flex area.
 */
export function SwiftHostFull({
  children,
  style,
}: SwiftHostBaseProps): React.ReactElement {
  return (
    <Host style={[{ flex: 1 }, style]}>
      {children}
    </Host>
  );
}

/**
 * Overlay Host – for SwiftUI over a RN background (e.g. gradients).
 */
export function SwiftHostOverlay({
  children,
  style,
}: SwiftHostBaseProps): React.ReactElement {
  return (
    <Host
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        style,
      ]}
    >
      {children}
    </Host>
  );
}

/**
 * Inline Host – use inside rows / small areas.
 * matchContents makes the Host shrink-wrap the SwiftUI content.
 */
export function SwiftHostInline({
  children,
  style,
  matchContents = true,
}: SwiftInlineHostProps): React.ReactElement {
  return (
    <Host
      matchContents={matchContents}
      style={style}
    >
      {children}
    </Host>
  );
}
