// components/Palworld/PalworldBreedingCalculatorModal.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType, WebViewMessageEvent } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { useUiOverlayStore } from "@/store/uiOverlayStore";

type PalworldBreedingCalculatorModalProps = {
  visible: boolean;
  onClose: () => void;
};

const BREEDING_URL = "https://palworld.gg/breeding-calculator";

const PalworldBreedingCalculatorModal: React.FC<
  PalworldBreedingCalculatorModalProps
> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebViewType | null>(null);

  const setFullscreenOverlayVisible = useUiOverlayStore(
    (s) => s.setFullscreenOverlayVisible
  );

  useEffect(() => {
    setFullscreenOverlayVisible(visible);
    return () => {
      setFullscreenOverlayVisible(false);
    };
  }, [visible, setFullscreenOverlayVisible]);

  if (!visible) return null;

  const handleOpenInBrowser = async () => {
    await WebBrowser.openBrowserAsync(BREEDING_URL);
  };

  const resetError = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const handleMessage = (_event: WebViewMessageEvent) => {
    // no-op (kept so modal mirrors your map modal shape)
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top || 12,
            paddingBottom: insets.bottom || 12,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View className="flex-row items-center gap-x-2 flex-shrink">
            <TouchableOpacity
              onPress={onClose}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Close breeding calculator"
            >
              <MaterialIcons name="close" size={22} color="#F9FAFB" />
            </TouchableOpacity>

            <View style={styles.titleWrapper}>
              <Text style={styles.title}>Breeding Calculator</Text>
              <Text style={styles.subtitle}>Palworld • palworld.gg</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleOpenInBrowser}
            style={styles.secondaryButton}
          >
            <MaterialIcons name="open-in-new" size={18} color="#E5E7EB" />
            <Text style={styles.secondaryButtonText}>Open in browser</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer strip */}
        <View style={styles.metaStrip}>
          <Text style={styles.metaText}>
            Embedded web view — you can open the full page in your browser anytime.
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {hasError ? (
            <View style={styles.errorWrapper}>
              <Text style={styles.errorTitle}>Couldn’t load the calculator</Text>
              <Text style={styles.errorBody}>
                Check your connection or open it in your browser instead.
              </Text>

              <View style={styles.errorButtonsRow}>
                <TouchableOpacity onPress={resetError} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenInBrowser}
                  style={styles.secondaryButtonAlt}
                >
                  <MaterialIcons name="open-in-new" size={18} color="#E5E7EB" />
                  <Text style={styles.secondaryButtonText}>Browser</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.loadingText}>Loading breeding calculator…</Text>
                </View>
              )}

              <WebView
                ref={webViewRef}
                source={{ uri: BREEDING_URL }}
                style={styles.webview}
                onLoadStart={() => {
                  setIsLoading(true);
                  setHasError(false);
                }}
                onLoadEnd={() => {
                  setIsLoading(false);
                }}
                onError={() => {
                  setHasError(true);
                  setIsLoading(false);
                }}
                onShouldStartLoadWithRequest={(request) => {
                  // allow internal navigation within palworld.gg only
                  if (request.url.startsWith("about:")) return false;

                  try {
                    const urlObj = new URL(request.url);
                    const host = urlObj.hostname;

                    if (host === "palworld.gg" || host === "www.palworld.gg") {
                      return true;
                    }

                    return false;
                  } catch {
                    return false;
                  }
                }}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                automaticallyAdjustContentInsets
                setSupportMultipleWindows={false}
                onMessage={handleMessage}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    flex: 1,
    backgroundColor: "#050816",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    justifyContent: "space-between",
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
  },
  titleWrapper: {
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(148,163,184,0.9)",
    marginTop: 2,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    backgroundColor: "rgba(15,23,42,0.8)",
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: 12,
    color: "#E5E7EB",
    fontWeight: "500",
  },
  metaStrip: {
    backgroundColor: "rgba(234,88,12,0.16)",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    fontSize: 11,
    color: "rgba(255,237,213,0.9)",
  },
  content: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    backgroundColor: "#020617",
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    backgroundColor: "rgba(15,23,42,0.75)",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#E5E7EB",
  },
  errorWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F9FAFB",
    textAlign: "center",
  },
  errorBody: {
    fontSize: 13,
    color: "rgba(148,163,184,0.9)",
    textAlign: "center",
    marginBottom: 10,
  },
  errorButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F97316",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2A0E05",
  },
  secondaryButtonAlt: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    backgroundColor: "rgba(15,23,42,0.9)",
    gap: 4,
  },
});

export default PalworldBreedingCalculatorModal;
