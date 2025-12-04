// components/navigation/FloatingTabBar.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import LiquidGlass from '@/components/ui/LiquidGlass';
import AppColors, { hexToRGBA } from '@/constants/colors';
import { useTheme } from '@/context/themeContext';
import { useUiOverlayStore } from '@/store/uiOverlayStore';

const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();

  const isFullscreenOverlayVisible = useUiOverlayStore(
    (s) => s.isFullscreenOverlayVisible
  ); // 👈 hook is called here with other hooks

  const routes = state.routes;
  const count = routes.length;

  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = useMemo(
    () => (rowWidth ? rowWidth / count : 0),
    [rowWidth, count]
  );

  const anim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 16,
      stiffness: 180,
      mass: 0.6,
    }).start();
  }, [state.index, anim]);

  const translateX = useMemo(
    () =>
      Animated.multiply(
        anim,
        tabWidth
      ) as unknown as Animated.AnimatedInterpolation<number>,
    [anim, tabWidth]
  );

  const bgColor = hexToRGBA('#18181B', 0.9);
  // isDarkMode
  //   ? hexToRGBA('#18181B', 0.9)
  //   : Platform.OS === 'android'
  //   ? hexToRGBA('#E5E7EB', 0.9)
  //   : 'rgba(255,255,255,0.58)';

  const borderColor = isDarkMode
    ? 'rgba(10,10,10,0.26)'
    : 'rgba(255,255,255,0.58)';

  if (isFullscreenOverlayVisible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.absoluteBox}>
      <View style={{ height: insets.bottom + 8 }} />
      <View style={styles.outerWrap}>
        <View style={styles.shellShadow}>
          <LiquidGlass
            tinted
            tintColor={bgColor}
            showFallbackBackground
            style={[styles.floatingShell]}
          >
            <View
              onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
              style={styles.row}
            >
              {tabWidth > 0 && (
                <Animated.View
                  style={[
                    styles.indicatorWrap,
                    {
                      width: Math.max(tabWidth - 34, 70),
                      transform: [{ translateX }],
                    },
                  ]}
                >
                  <View style={styles.indicator} />
                </Animated.View>
              )}

              {routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                const activeColor =
                  (options.tabBarActiveTintColor as string | undefined) ??
                  AppColors.primary[500];
                const inactiveColor =
                  (options.tabBarInactiveTintColor as string | undefined) ??
                  (isDarkMode ? '#93A3AF' : '#7A8993');

                const color = isFocused ? activeColor : inactiveColor;

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                };

                const onLongPress = () => {
                  navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  });
                };

                return (
                  <Pressable
                    key={route.key}
                    accessibilityRole="tab"
                    accessibilityState={
                      isFocused ? { selected: true } : undefined
                    }
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={[styles.tabItem, { width: tabWidth || undefined }]}
                    android_ripple={{ borderless: true }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {typeof options.tabBarIcon === 'function' ? (
                      options.tabBarIcon({ color, focused: isFocused, size: 26 })
                    ) : (
                      <Text
                        style={{
                          color,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {(options.title as string) ?? route.name}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </LiquidGlass>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    backgroundColor: 'transparent',
  },
  outerWrap: {
    paddingHorizontal: 16,
  },
  shellShadow: {
    borderRadius: 28,
    borderCurve: Platform.OS === 'ios' ? 'continuous' : undefined,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 0 },
      default: {},
    }),
  },
  floatingShell: {
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxWidth: 720,
    width: '100%',
    overflow: 'hidden',
    borderCurve: Platform.OS === 'ios' ? 'continuous' : undefined,
  },
  row: {
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indicatorWrap: {
    position: 'absolute',
    bottom: -2,
    left: 18,
    height: 3,
    borderRadius: 999,
  },
  indicator: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: AppColors.primary[500],
  },
  tabItem: {
    height: 46,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FloatingTabBar;
