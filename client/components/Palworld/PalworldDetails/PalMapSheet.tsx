// client/components/Palworld/PalworldDetails/PalMapSheet.tsx
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, Linking, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { BASE as PALDB_BASE } from "@/lib/palworld/palworldDB";

type PalMapSheetProps = {
  visible: boolean;
  onRequestClose: () => void;
  palCode: string;
  height?: number;
};

function safeOpenUrl(url: string) {
  Linking.openURL(url).catch((err) => {
    console.warn("Failed to open URL:", url, err);
  });
}

function buildPaldbMapUrl(palCode: string, t: "dayTimeLocations" | "nightTimeLocations") {
  const base = PALDB_BASE || "https://paldb.cc";
  const code = String(palCode ?? "").trim();
  return `${base}/en/Map?pal=${encodeURIComponent(code)}&t=${encodeURIComponent(t)}`;
}

export default function PalMapSheet({ visible, onRequestClose, palCode, height = 520 }: PalMapSheetProps) {
  const { height: windowH } = useWindowDimensions();

  const [mapMode, setMapMode] = useState<"day" | "night">("day");
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const compactFixedHeight = 360;
  const expandedFixedHeight = useMemo(() => {
    const h = Math.floor(windowH * 0.9);
    return Math.max(670, Math.min(h, 670));
  }, [windowH]);

  const fixedHeight = mapReady && !mapError ? expandedFixedHeight : compactFixedHeight;
  const containerHeight = mapReady && !mapError ? height : 220;

  const mapUrl = useMemo(() => {
    if (!palCode) return "";
    return buildPaldbMapUrl(palCode, mapMode === "day" ? "dayTimeLocations" : "nightTimeLocations");
  }, [palCode, mapMode]);

  useEffect(() => {
    if (!visible) return;
    setMapMode("day");
    setMapLoading(true);
    setMapReady(false);
    setMapError(false);
  }, [visible, palCode]);

  const onShouldStartLoadWithRequest = useCallback((req: any) => {
    const url = String(req?.url ?? "");
    if (!url) return false;
    if (url.startsWith("about:")) return false;

    const allowHosts = new Set([
      "paldb.cc",
      "www.paldb.cc",
      "cdn.paldb.cc",
      "cdnjs.cloudflare.com",
      "api.mapbox.com",
      "unpkg.com",
      "cdn.jsdelivr.net",
      "static.cloudflareinsights.com",
      "www.googletagmanager.com",
      "www.google-analytics.com",
      "s.nitropay.com",
    ]);

    try {
      const u = new URL(url);
      const host = u.hostname;

      if (allowHosts.has(host)) return true;

      if (req?.navigationType === "click") {
        safeOpenUrl(url);
        return false;
      }

      return true;
    } catch {
      return true;
    }
  }, []);

  const setMode = useCallback((mode: "day" | "night") => {
    setMapMode(mode);
    setMapLoading(true);
    setMapReady(false);
    setMapError(false);
  }, []);

  return (
    <BottomSheetModal visible={visible} onRequestClose={onRequestClose} fixedHeight={fixedHeight}>
      <View className="px-4 pb-4">
        <View className="flex-row items-center gap-x-2">
          <TouchableOpacity
            onPress={() => setMode("day")}
            className={`flex-1 flex-row items-center justify-center rounded-xl border px-4 py-3 ${
              mapMode === "day" ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5"
            }`}
          >
            <MaterialCommunityIcons name="weather-sunny" size={18} color="#e5e7eb" />
            <Text className="ml-2 text-slate-100">Day</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode("night")}
            className={`flex-1 flex-row items-center justify-center rounded-xl border px-4 py-3 ${
              mapMode === "night" ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5"
            }`}
          >
            <MaterialCommunityIcons name="weather-night" size={18} color="#e5e7eb" />
            <Text className="ml-2 text-slate-100">Night</Text>
          </TouchableOpacity>
        </View>

        <View
          className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black"
          style={{ height: containerHeight }}
        >
          {mapError ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-slate-200 font-semibold">Couldn’t load map</Text>
              <Text className="text-[12px] text-slate-400 mt-2 text-center">
                Try switching Day/Night, or check your connection.
              </Text>
            </View>
          ) : (
            <>
              {!mapReady && (
                <View className="absolute inset-0 z-10 items-center justify-center bg-black/60">
                  <ActivityIndicator />
                  <Text className="mt-2 text-[12px] text-slate-300">
                    {mapLoading ? "Loading map…" : "Preparing map…"}
                  </Text>
                </View>
              )}

              <WebView
                key={`${palCode}-${mapMode}`}
                source={{ uri: mapUrl }}
                onLoadStart={() => {
                  setMapLoading(true);
                  setMapReady(false);
                  setMapError(false);
                }}
                onLoadEnd={() => {
                  setMapLoading(false);
                }}
                onError={() => {
                  setMapError(true);
                  setMapLoading(false);
                  setMapReady(false);
                }}
                onMessage={(event) => {
                  const msg = String(event?.nativeEvent?.data ?? "");
                  if (msg === "PALDB_MAP_READY") {
                    setMapReady(true);
                    setMapLoading(false);
                  }
                }}
                style={{
                  backgroundColor: "black",
                  opacity: mapReady ? 1 : 0,
                }}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState={false}
                setSupportMultipleWindows={false}
                allowsBackForwardNavigationGestures
                originWhitelist={["*"]}
                onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                injectedJavaScriptBeforeContentLoaded={`
                  (function () {
                    try {
                      var style = document.createElement('style');
                      style.type = 'text/css';
                      style.appendChild(document.createTextNode(\`
                        html, body { background: #000 !important; }
                        body { visibility: hidden !important; }
                      \`));
                      document.head.appendChild(style);
                    } catch (e) {}
                  })();
                  true;
                `}
                injectedJavaScript={`
                  (function () {
                    var css = \`
                      nav, footer, #toTop,
                      #topbanner970, #leftside_banner, #rightside_banner,
                      .navbar, .background-image,
                      .nav-tabs, .tab-content > #cache,
                      iframe, .nitro, [id*="nitro"], [class*="nitro"] {
                        display: none !important;
                      }

                      html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: 100% !important;
                        overflow: hidden !important;
                        background: #000 !important;
                      }
                      .page, .page-content, .container, .tab-content {
                        margin: 0 !important;
                        padding: 0 !important;
                        max-width: none !important;
                        width: 100% !important;
                        height: 100% !important;
                      }

                      #map {
                        display: block !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        height: 100% !important;
                      }
                      #map-container {
                        height: 100vh !important;
                        width: 100vw !important;
                        overflow: hidden !important;
                        background: #000 !important;
                      }

                      .leaflet-control-container,
                      .leaflet-control,
                      .leaflet-top,
                      .leaflet-bottom,
                      .leaflet-left,
                      .leaflet-right,
                      .leaflet-bar,
                      .leaflet-control-zoom,
                      .leaflet-control-fullscreen,
                      .leaflet-control-attribution,
                      .leaflet-control-scale,
                      .show-button,
                      .close-button {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        pointer-events: none !important;
                      }
                    \`;

                    function injectCssOnce() {
                      try {
                        if (document.getElementById('__cr_map_css__')) return;
                        var style = document.createElement('style');
                        style.id = '__cr_map_css__';
                        style.type = 'text/css';
                        style.appendChild(document.createTextNode(css));
                        document.head.appendChild(style);
                      } catch (e) {}
                    }

                    function forceSizing() {
                      var mc = document.getElementById('map-container');
                      if (mc) {
                        mc.style.height = '100vh';
                        mc.style.width = '100vw';
                      }
                    }

                    function isLeafletMounted() {
                      var mc = document.getElementById('map-container');
                      if (!mc) return false;

                      var leaflet = mc.classList.contains('leaflet-container')
                        ? mc
                        : mc.querySelector('.leaflet-container');

                      if (!leaflet) return false;

                      var tile = leaflet.querySelector('img.leaflet-tile');
                      var pane = leaflet.querySelector('.leaflet-pane');
                      return !!(tile || pane);
                    }

                    injectCssOnce();
                    forceSizing();

                    var tries = 0;
                    var timer = setInterval(function () {
                      tries++;
                      injectCssOnce();
                      forceSizing();

                      if (isLeafletMounted()) {
                        try { document.body.style.visibility = 'visible'; } catch (e) {}
                        try {
                          window.ReactNativeWebView &&
                            window.ReactNativeWebView.postMessage('PALDB_MAP_READY');
                        } catch (e) {}
                        clearInterval(timer);
                        return;
                      }

                      if (tries > 120) {
                        try { document.body.style.visibility = 'visible'; } catch (e) {}
                        clearInterval(timer);
                      }
                    }, 150);
                  })();
                  true;
                `}
              />
            </>
          )}
        </View>

        <TouchableOpacity
          onPress={onRequestClose}
          className="mt-4 items-center justify-center rounded-xl bg-white/10 py-3"
        >
          <Text className="text-slate-200">Close</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}
