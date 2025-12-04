// components/PokemonMaps/PokemonMapModal.tsx
import React, { useState, useRef, useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";
import type {
  WebView as WebViewType,
  WebViewMessageEvent,
} from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { useUiOverlayStore } from "@/store/uiOverlayStore";
import {
  FULLSCREEN_HACK_JS,
  MAP_CONTROL_HELPERS_JS,
  buildCRMapScript,
} from "./mapScripts";

type MapToggleKind = "parent" | "sub" | "item";

export type MapCategoryToggle = {
  id: string; // internal key, e.g. "items"
  label: string; // chip label, e.g. "Items"
  kind: MapToggleKind; // "parent" (cat[]), "sub" (subcat[]), or "item" (item[])
  values: string[]; // underlying cat[] / subcat[] / item[] values
};

type MapState = {
  hideAll: boolean;
  showCounts: boolean;
  showLabels: boolean;
  bookmarkFollow: boolean;
  myCollected: boolean;
};

type PokemonMapModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string; // e.g. "Lumiose City Map"
  subtitle: string; // e.g. "Pokémon Legends: Z-A"
  url: string; // map URL
  disclaimer?: string;
  mapCategoryToggles?: MapCategoryToggle[];
};

const PokemonMapModal: React.FC<PokemonMapModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  url,
  disclaimer,
  mapCategoryToggles,
}) => {
  // ----- hooks (fixed order) -----
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebViewType | null>(null);

  const [mapState, setMapState] = useState<MapState>({
    hideAll: false,
    showCounts: false,
    showLabels: false,
    bookmarkFollow: false,
    myCollected: false,
  });

  // local state for per-map category chips
  const [categoryToggleState, setCategoryToggleState] = useState<
    Record<string, boolean>
  >({});

  const setFullscreenOverlayVisible = useUiOverlayStore(
    (s) => s.setFullscreenOverlayVisible
  );

  useEffect(() => {
    setFullscreenOverlayVisible(visible);
    return () => {
      setFullscreenOverlayVisible(false);
    };
  }, [visible, setFullscreenOverlayVisible]);

  useEffect(() => {
    // reset chip state when URL or visibility changes
    setCategoryToggleState({});
  }, [url, visible]);

  if (!visible) return null;

  // ----- helpers -----

  const runScript = (js: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(js);
    }
  };

  const handleOpenInBrowser = async () => {
    await WebBrowser.openBrowserAsync(url);
  };

  const resetError = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "GG_MAP_STATE" && data?.payload) {
        const payload = data.payload as {
          hideAll?: boolean;
          showCounts?: boolean;
          showLabels?: boolean;
          bookmarkFollow?: boolean;
          myCollected?: boolean;
          parentCategories?: string[];
          subCategories?: string[];
          items?: string[];
        };

        // Update core map state first
        setMapState((prev) => ({
          hideAll: payload.hideAll ?? prev.hideAll,
          showCounts: payload.showCounts ?? prev.showCounts,
          showLabels: payload.showLabels ?? prev.showLabels,
          bookmarkFollow: payload.bookmarkFollow ?? prev.bookmarkFollow,
          myCollected: payload.myCollected ?? prev.myCollected,
        }));

        // On first state sync only, initialize our chips
        // to match what's actually checked in the DOM.
        setCategoryToggleState((prev) => {
          if (!mapCategoryToggles || Object.keys(prev).length > 0) {
            return prev;
          }

          const parentSet = new Set(payload.parentCategories || []);
          const subSet = new Set(payload.subCategories || []);
          const itemSet = new Set(payload.items || []);
          const next: Record<string, boolean> = {};

          for (const toggle of mapCategoryToggles) {
            const values = toggle.values || [];
            let active = false;

            if (toggle.kind === "parent") {
              active =
                values.length > 0 && values.every((v) => parentSet.has(v));
            } else if (toggle.kind === "sub") {
              active =
                values.length > 0 && values.every((v) => subSet.has(v));
            } else if (toggle.kind === "item") {
              active =
                values.length > 0 && values.every((v) => itemSet.has(v));
            }

            next[toggle.id] = active;
          }

          return next;
        });
      }
    } catch {
      // ignore malformed messages
    }
  };

  // ----- core toggles -----

  const toggleHideAll = () => {
    const next = !mapState.hideAll;

    // update local state for hideAll
    setMapState((prev) => ({ ...prev, hideAll: next }));
    // reset all per-category chip states so UI matches the global mode
    setCategoryToggleState({});

    if (next) {
      // Going from "show" -> "hide all"
      // Turn on hide-all, and also clear all parent + sub categories
      runScript(
        buildCRMapScript(`
          window.CRMapControls.setHideAll(true);
          window.CRMapControls.setAllParents(false);
          window.CRMapControls.setAllSubCategories(false);
        `)
      );
    } else {
      // Going from "hide all" -> "show all"
      // Turn off hide-all and re-enable every parent + sub category
      runScript(
        buildCRMapScript(`
          window.CRMapControls.setHideAll(false);
          window.CRMapControls.setAllParents(true);
          window.CRMapControls.setAllSubCategories(true);
        `)
      );
    }
  };

  const toggleLabels = () => {
    const next = !mapState.showLabels;
    setMapState((prev) => ({ ...prev, showLabels: next }));
    runScript(
      buildCRMapScript(
        `window.CRMapControls.setLabelsVisible(${next ? "true" : "false"});`
      )
    );
  };

  // ----- per-map category toggles -----

  const toggleCategory = (toggle: MapCategoryToggle) => {
    setCategoryToggleState((prev) => {
      const isActive = !!prev[toggle.id];
      const nextActive = !isActive;

      const valuesArg = JSON.stringify(toggle.values);

      const method =
        toggle.kind === "parent"
          ? "setParentCategories"
          : toggle.kind === "sub"
            ? "setSubCategories"
            : "setItems"; // for kind === "item"

      // Toggle this group in the DOM
      runScript(
        buildCRMapScript(
          `window.CRMapControls.${method}(${valuesArg}, ${nextActive ? "true" : "false"
          });`
        )
      );

      // If the user just turned the main Items parent ON,
      // automatically turn all "items-*" chips ON too so they can toggle them OFF.
      const nextState: Record<string, boolean> = {
        ...prev,
        [toggle.id]: nextActive,
      };

      if (
        toggle.id === "items" &&
        nextActive &&
        mapCategoryToggles &&
        mapCategoryToggles.length > 0
      ) {
        const itemToggles = mapCategoryToggles.filter((t) =>
          t.id.startsWith("items-")
        );

        itemToggles.forEach((itemToggle) => {
          const valuesArg = JSON.stringify(itemToggle.values);
          const methodForGroup =
            itemToggle.kind === "parent"
              ? "setParentCategories"
              : itemToggle.kind === "sub"
                ? "setSubCategories"
                : "setItems";

          runScript(
            buildCRMapScript(
              `window.CRMapControls.${methodForGroup}(${valuesArg}, true);`
            )
          );
          nextState[itemToggle.id] = true;
        });
      }

      return nextState;
    });
  };

  // ----- chips -----

  const renderChip = (
    label: string,
    active: boolean,
    onPress: () => void,
    icon?: React.ReactNode
  ) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCategoryIcon = (id: string, active: boolean) => {
    let name: React.ComponentProps<typeof MaterialIcons>["name"] = "layers";

    const lower = id.toLowerCase();
    if (lower.includes("item")) name = "backpack";
    else if (lower.includes("pokemon")) name = "catching-pokemon";
    else if (lower.includes("poi")) name = "place";
    else if (lower.includes("wisp")) name = "local-fire-department";
    else if (lower.includes("outbreak")) name = "warning-amber";

    return (
      <MaterialIcons
        name={name}
        size={16}
        color={active ? "#ECFEFF" : "#E5E7EB"}
        style={{ marginRight: 4 }}
      />
    );
  };

  // Split toggles: primary row vs item row
  const primaryToggles = mapCategoryToggles?.filter(
    (t) => !t.id.startsWith("items-")
  );
  const itemToggles = mapCategoryToggles?.filter((t) =>
    t.id.startsWith("items-")
  );
  const itemsParentActive = !!categoryToggleState["items"];

  // ----- render -----

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
              accessibilityLabel={`Close ${title}`}
            >
              <MaterialIcons name="close" size={22} color="#F9FAFB" />
            </TouchableOpacity>

            <View style={styles.titleWrapper}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
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
            {disclaimer ||
              "Interactive map powered by GamerGuides.com — embedded view focuses on this map section."}
          </Text>
        </View>

        {/* Horizontal control bars */}
        <View style={styles.controlsWrapper}>
          {/* Primary row: Hide all, Labels, Pokémon, Items, POIs, etc. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.controlsContent}
          >
            {/* Hide All / Show all */}
            {renderChip(
              mapState.hideAll ? "Show All" : "Hide All",
              mapState.hideAll,
              toggleHideAll,
              <MaterialIcons
                name={mapState.hideAll ? "visibility-off" : "visibility"}
                size={16}
                color={mapState.hideAll ? "#ECFEFF" : "#E5E7EB"}
                style={{ marginRight: 4 }}
              />
            )}

            {/* Labels */}
            {renderChip(
              "Labels",
              mapState.showLabels,
              toggleLabels,
              <MaterialIcons
                name="label-outline"
                size={16}
                color={mapState.showLabels ? "#ECFEFF" : "#E5E7EB"}
                style={{ marginRight: 4 }}
              />
            )}

            {/* Parent + other non-item toggles */}
            {primaryToggles?.map((toggle) => {
              const active = !!categoryToggleState[toggle.id];
              return (
                <React.Fragment key={toggle.id}>
                  {renderChip(
                    toggle.label,
                    active,
                    () => toggleCategory(toggle),
                    renderCategoryIcon(toggle.id, active)
                  )}
                </React.Fragment>
              );
            })}
          </ScrollView>

          {/* Secondary row: item-specific chips, only when Items is active */}
          {itemsParentActive && itemToggles && itemToggles.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subControlsContent}
            >
              {itemToggles.map((toggle) => {
                const active = !!categoryToggleState[toggle.id];
                return (
                  <React.Fragment key={toggle.id}>
                    {renderChip(
                      toggle.label,
                      active,
                      () => toggleCategory(toggle),
                      renderCategoryIcon(toggle.id, active)
                    )}
                  </React.Fragment>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {hasError ? (
            <View style={styles.errorWrapper}>
              <Text style={styles.errorTitle}>Couldn’t load the map</Text>
              <Text style={styles.errorBody}>
                Check your connection or open it in your browser instead.
              </Text>

              <View style={styles.errorButtonsRow}>
                <TouchableOpacity
                  onPress={resetError}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenInBrowser}
                  style={styles.secondaryButtonAlt}
                >
                  <MaterialIcons
                    name="open-in-new"
                    size={18}
                    color="#E5E7EB"
                  />
                  <Text style={styles.secondaryButtonText}>Browser</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.loadingText}>
                    Loading interactive map…
                  </Text>
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
                onLoadEnd={() => {
                  setIsLoading(false);
                  if (webViewRef.current) {
                    webViewRef.current.injectJavaScript(FULLSCREEN_HACK_JS);
                    webViewRef.current.injectJavaScript(
                      MAP_CONTROL_HELPERS_JS
                    );
                  }
                }}
                onError={() => {
                  setHasError(true);
                  setIsLoading(false);
                }}
                onShouldStartLoadWithRequest={(request) => {
                  if (request.url.startsWith("about:")) return false;

                  try {
                    const urlObj = new URL(request.url);
                    if (urlObj.hostname !== "www.gamerguides.com") {
                      return false;
                    }
                  } catch {
                    return false;
                  }

                  return true;
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
    backgroundColor: "rgba(15,118,110,0.16)",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    fontSize: 11,
    color: "rgba(209,250,229,0.9)",
  },
  controlsWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  controlsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subControlsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.55)",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  chipActive: {
    borderColor: "rgba(34,211,238,0.9)",
    backgroundColor: "rgba(8,47,73,0.95)",
  },
  chipText: {
    fontSize: 12,
    color: "#E5E7EB",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#ECFEFF",
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
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#022c22",
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

export default PokemonMapModal;
