// components/ui/LiquidGlass.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { hexToRGBA } from '@/constants/colors';
import { useTheme } from '@/context/themeContext';

type LiquidGlassProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  glassEffectStyle?: 'regular' | 'clear';
  tinted?: boolean;
  tintColor?: string;
  /**
   * Controls the fallback background on non-iOS platforms.
   * - iOS: GlassView handles everything (including fallback on < iOS 26).
   * - Android/others:
   *    false → transparent
   *    true  → translucent bg using tintColor or a soft default.
   */
  showFallbackBackground?: boolean;
};

export default function LiquidGlass({
  children,
  style,
  interactive = true,
  glassEffectStyle = 'clear',
  tinted = false,
  tintColor,
  showFallbackBackground = false,
}: LiquidGlassProps) {
  const { isDarkMode } = useTheme();

  const isIOS = Platform.OS === 'ios';

  if (isIOS) {
    // GlassView itself will gracefully fallback to a regular View
    // on unsupported versions, so we don't need extra checks.
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        isInteractive={interactive}
        tintColor={tinted ? tintColor : undefined}
        style={[styles.glassBase, style]}
      >
        {children}
      </GlassView>
    );
  }

  // Fallback (Android / others)
  const fallbackBackgroundColor = showFallbackBackground
    ? (tinted ? tintColor : isDarkMode ? hexToRGBA("#000", 0.75) : hexToRGBA("#fff", 0.75))
    : 'transparent';

  const borderStyle = showFallbackBackground
    ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }
    : { borderWidth: 0, borderColor: 'transparent' };

  return (
    <View
      style={[
        styles.fallbackBase,
        { backgroundColor: fallbackBackgroundColor },
        borderStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassBase: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  fallbackBase: {
    borderRadius: 20,
  },
});