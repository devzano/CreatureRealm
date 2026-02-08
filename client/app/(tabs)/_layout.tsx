// app/(tabs)/_layout.tsx
import React, { useMemo } from "react";
import { View, Platform, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from 'expo-constants';

import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

function useBannerAdUnitId() {
  return useMemo(() => {
    const extra = (Constants.expoConfig as any)?.extra ?? {};

    const iosUnit =
      typeof extra?.admobBannerUnitIdIos === "string"
        ? extra.admobBannerUnitIdIos
        : null;

    const androidUnit =
      typeof extra?.admobBannerUnitIdAndroid === "string"
        ? extra.admobBannerUnitIdAndroid
        : null;

    const picked = Platform.OS === "ios" ? iosUnit : androidUnit;

    if (!picked) {
      console.warn("[ads] Missing AdMob banner unit id");
    }

    return picked;
  }, []);
}

function BottomBanner() {
  const insets = useSafeAreaInsets();
  const adUnitId = useBannerAdUnitId();

  if (Platform.OS === "web") return null;

  return (
    <View style={[styles.bannerWrap, { paddingBottom: insets.bottom }]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        // tabBar={(props) => <FloatingTabBar {...props} />} //
        screenOptions={{
          tabBarActiveTintColor: "#0cd3f1",
          tabBarInactiveTintColor: "#9CA3AF",
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="sports-esports" color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      <BottomBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
