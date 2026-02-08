// app/_layout.tsx
import "./global.css";

import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import * as NavigationBar from "expo-navigation-bar";
import { Asset } from "expo-asset";
import Constants from "expo-constants";

import mobileAds from "react-native-google-mobile-ads";

import { ThemeProvider } from "@/context/themeContext";
import AnimatedSplashScreen from "@/components/ui/AnimatedSplashScreen";
import UpdateAvailableModal from "@/components/UpdateAvailableModal";
import AppImages from "@/constants/images";

SplashScreen.preventAutoHideAsync().catch(() => { });

type UpdateMode = "store" | "ota" | null;

function getVersioningInfo() {
  const extra = (Constants.expoConfig as any)?.extra ?? {};

  const rawBuild = extra?.buildNumber;
  let currentBuild = 1;

  if (typeof rawBuild === "number") {
    currentBuild = rawBuild;
  } else if (typeof rawBuild === "string") {
    const parsed = Number(rawBuild);
    if (!Number.isNaN(parsed)) {
      currentBuild = parsed;
    }
  }

  const rawMinBuild = extra?.minSupportedBuildNumber;
  let minSupportedBuildNumber: number | null = null;

  if (typeof rawMinBuild === "number") {
    minSupportedBuildNumber = rawMinBuild;
  } else if (typeof rawMinBuild === "string") {
    const parsed = Number(rawMinBuild);
    if (!Number.isNaN(parsed)) {
      minSupportedBuildNumber = parsed;
    }
  }

  const iosStoreUrl: string | null =
    typeof extra?.iosStoreUrl === "string" ? extra.iosStoreUrl : null;
  const androidStoreUrl: string | null =
    typeof extra?.androidStoreUrl === "string" ? extra.androidStoreUrl : null;

  return {
    currentBuild,
    minSupportedBuildNumber,
    iosStoreUrl,
    androidStoreUrl,
  };
}

async function initMobileAds() {
  if (Platform.OS === "web") return;

  try {
    await mobileAds().setRequestConfiguration({
      testDeviceIdentifiers: [
        "9279d05aaca0f38b5740572b17ae0ace", // iPhone 15
      ],
      // Optional extras you may want later:
      // maxAdContentRating: MaxAdContentRating.PG,
      // tagForChildDirectedTreatment: false,
      // tagForUnderAgeOfConsent: false,
    });

    await mobileAds().initialize();
  } catch (e) {
    console.warn("[ads] Failed to initialize mobile ads:", e);
  }
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateMode, setUpdateMode] = useState<UpdateMode>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  const handleSplashFinish = useCallback(() => {
    setSplashFinished(true);
  }, []);

  const checkUpdates = async () => {
    if (__DEV__) return;
    try {
      const { currentBuild, minSupportedBuildNumber, iosStoreUrl, androidStoreUrl } =
        getVersioningInfo();

      if (minSupportedBuildNumber != null && currentBuild < minSupportedBuildNumber) {
        setUpdateMode("store");
        setStoreUrl(Platform.OS === "ios" ? iosStoreUrl : androidStoreUrl);
        setUpdateModalVisible(true);
        return;
      }

      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setUpdateMode("ota");
        setUpdateModalVisible(true);
      }
    } catch (err) {
      console.warn("[update] Error checking for updates:", err);
    }
  };

  useEffect(() => {
    async function prepare() {
      try {
        const imageAssets = Object.values(AppImages).map((image) => {
          return Asset.fromModule(image).downloadAsync();
        });

        await Promise.all([
          ...imageAssets,
          checkUpdates(),
          initMobileAds(),
        ]);
      } catch (e) {
        console.warn("[prepare] Error during loading:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const hideNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
      } catch (e) {
        console.warn("[navigation] Failed to configure nav bar:", e);
      }
    };

    hideNavigationBar();
  }, []);

  const handleUpdateNow = useCallback(async () => {
    if (updateMode === "store") {
      if (!storeUrl) {
        console.warn("[update] Store update requested but no store URL configured");
        return;
      }

      try {
        await Linking.openURL(storeUrl);
      } catch (err) {
        console.warn("[update] Error opening store URL:", err);
      }

      return;
    }

    if (updateMode === "ota") {
      try {
        setIsUpdating(true);
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (err) {
        console.warn("[update] Error applying OTA update:", err);
        setIsUpdating(false);
      }
      return;
    }

    console.warn("[update] handleUpdateNow called with no updateMode");
  }, [storeUrl, updateMode]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#020617" }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(pokemon)" options={{ headerShown: false }} />
            <Stack.Screen name="(palworld)" options={{ headerShown: false }} />
            <Stack.Screen name="(animalCrossing)" options={{ headerShown: false }} />
          </Stack>

          <UpdateAvailableModal
            visible={updateModalVisible}
            onUpdateNow={handleUpdateNow}
            isUpdating={isUpdating}
          />

          {!splashFinished && (
            <AnimatedSplashScreen onAnimationFinish={handleSplashFinish} />
          )}
        </View>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
