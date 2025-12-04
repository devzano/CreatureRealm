// app/_layout.tsx
import "./global.css";

import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import Constants from "expo-constants";

import { ThemeProvider } from "@/context/themeContext";
import AnimatedSplashScreen from "@/components/ui/AnimatedSplashScreen";
import UpdateAvailableModal from "@/components/UpdateAvailableModal";

// Keep native splash visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {
  // it's safe to ignore if this throws (e.g. already hidden)
});

type UpdateMode = "store" | "ota" | null;

function getVersioningInfo() {
  const extra = (Constants.expoConfig as any)?.extra ?? {};

  // current build number (you set this in app.json/app.config.ts)
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
    typeof extra?.androidStoreUrl === "string"
      ? extra.androidStoreUrl
      : null;

  return {
    currentBuild,
    minSupportedBuildNumber,
    iosStoreUrl,
    androidStoreUrl,
  };
}

export default function RootLayout() {
  const [splashFinished, setSplashFinished] = useState(false);

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateMode, setUpdateMode] = useState<UpdateMode>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  const handleSplashFinish = useCallback(() => {
    setSplashFinished(true);
  }, []);

  // Check for store or OTA updates
  useEffect(() => {
    if (__DEV__) return;

    (async () => {
      try {
        const {
          currentBuild,
          minSupportedBuildNumber,
          iosStoreUrl,
          androidStoreUrl,
        } = getVersioningInfo();

        // 1) Hard, store-forced update based on build numbers
        if (
          minSupportedBuildNumber != null &&
          currentBuild < minSupportedBuildNumber
        ) {
          setUpdateMode("store");
          const url =
            Platform.OS === "ios" ? iosStoreUrl : androidStoreUrl;

          if (!url) {
            console.warn(
              "[update] minSupportedBuildNumber set but store URL missing for this platform"
            );
          }

          setStoreUrl(url ?? null);
          setUpdateModalVisible(true);
          return;
        }

        // 2) Otherwise, check for OTA updates
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          setUpdateMode("ota");
          setUpdateModalVisible(true);
        }
      } catch (err) {
        console.warn("[update] Error checking for updates:", err);
      }
    })();
  }, []);

  const handleUpdateNow = useCallback(async () => {
    if (updateMode === "store") {
      if (!storeUrl) {
        console.warn(
          "[update] Store update requested but no store URL configured"
        );
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

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="game/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="pokemon/[id]"
              options={{ headerShown: false }}
            />
          </Stack>

          {/* Update Modal (store or OTA) */}
          <UpdateAvailableModal
            visible={updateModalVisible}
            onUpdateNow={handleUpdateNow}
            isUpdating={isUpdating}
          />

          {/* Animated splash overlay */}
          {!splashFinished && (
            <AnimatedSplashScreen onAnimationFinish={handleSplashFinish} />
          )}
        </View>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
