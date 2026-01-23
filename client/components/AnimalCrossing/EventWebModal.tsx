// components/AnimalCrossing/EventWebModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import type { WebView as WebViewType } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";

type EventWebModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string; // e.g. "Bug-Off"
  subtitle?: string; // e.g. "Seasonal Event • Nookipedia"
  url: string; // event url
  disclaimer?: string; // optional small strip text
};

const EventWebModal: React.FC<EventWebModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  url,
  disclaimer,
}) => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebViewType | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);

  // keep state clean when reopening / switching events
  useEffect(() => {
    if (!visible) return;
    setIsLoading(true);
    setHasError(false);
    setCurrentUrl(url);
  }, [visible, url]);

  const safeSubtitle = useMemo(() => subtitle ?? "Nookipedia • Event details", [subtitle]);

  const openInSafari = async () => {
    const target = currentUrl || url;
    if (!target) return;
    try {
      await WebBrowser.openBrowserAsync(target);
    } catch {
      // ignore
    }
  };

  const resetError = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top || 12, paddingBottom: insets.bottom || 12 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton} hitSlop={10}>
            <Feather name="x" size={18} color="#F9FAFB" />
          </Pressable>

          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {safeSubtitle}
            </Text>
          </View>

          <Pressable onPress={openInSafari} style={styles.headerButton}>
            <Feather name="external-link" size={16} color="#E5E7EB" />
            <Text style={styles.headerButtonText}>Safari</Text>
          </Pressable>
        </View>

        {/* Disclaimer strip */}
        <View style={styles.metaStrip}>
          <Text style={styles.metaText} numberOfLines={2}>
            {disclaimer ||
              "Viewing Nookipedia in-app. Use Safari if the page doesn’t load correctly."}
          </Text>
        </View>

        {/* Web content */}
        <View style={styles.content}>
          {hasError ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorTitle}>Couldn’t load this event</Text>
              <Text style={styles.errorBody}>
                Try again, or open it in Safari.
              </Text>

              <View style={styles.errorRow}>
                <Pressable onPress={resetError} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Try again</Text>
                </Pressable>

                <Pressable onPress={openInSafari} style={styles.secondaryBtn}>
                  <Feather name="external-link" size={16} color="#E5E7EB" />
                  <Text style={styles.secondaryBtnText}>Safari</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.loadingText}>Loading event…</Text>
                </View>
              )}

              <WebView
                ref={webViewRef}
                source={{ uri: url }}
                style={styles.webview}
                onLoadStart={() => {
                  setIsLoading(true);
                  setHasError(false);
                }}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => {
                  setHasError(true);
                  setIsLoading(false);
                }}
                onNavigationStateChange={(nav) => {
                  if (nav?.url) setCurrentUrl(nav.url);
                }}
                onShouldStartLoadWithRequest={(request) => {
                  // block about:
                  if (request.url.startsWith("about:")) return false;

                  // Keep the in-app view “anchored”:
                  // if the page tries to navigate to a different URL (e.g., external link),
                  // open it in Safari instead.
                  if (request.url && request.url !== currentUrl && request.url !== url) {
                    // only intercept real http(s)
                    if (request.url.startsWith("http://") || request.url.startsWith("https://")) {
                      void WebBrowser.openBrowserAsync(request.url);
                      return false;
                    }
                  }

                  return true;
                }}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                automaticallyAdjustContentInsets
                setSupportMultipleWindows={false}
              />

              {/* Floating Safari button inside the WebView frame */}
              <View pointerEvents="box-none" style={styles.fabWrap}>
                <Pressable onPress={openInSafari} style={styles.fab}>
                  <Feather name="external-link" size={16} color="#ECFEFF" />
                  <Text style={styles.fabText}>Safari</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 10,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(148,163,184,0.9)",
    marginTop: 2,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    backgroundColor: "rgba(15,23,42,0.8)",
    gap: 6,
  },
  headerButtonText: {
    fontSize: 12,
    color: "#E5E7EB",
    fontWeight: "600",
  },
  metaStrip: {
    backgroundColor: "rgba(15,118,110,0.16)",
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaText: {
    fontSize: 11,
    color: "rgba(209,250,229,0.9)",
  },
  content: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 6,
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
  errorWrap: {
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
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#022c22",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    backgroundColor: "rgba(15,23,42,0.9)",
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  fabWrap: {
    position: "absolute",
    right: 12,
    bottom: 12,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.9)",
    backgroundColor: "rgba(8,47,73,0.95)",
  },
  fabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ECFEFF",
  },
});

export default EventWebModal;
