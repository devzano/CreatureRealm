// components/Palworld/PalworldDetails/PalDetailTribesSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Section from "@/components/Section";
import type { PalDetail } from "@/lib/palworld/pal/paldbDetails";

export type PalTribesSectionProps = {
  tribes?: NonNullable<PalDetail["tribes"]>;
};

function safeEncodeUrl(u?: string) {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;
  try {
    return encodeURI(s);
  } catch {
    return s;
  }
}

function isPaldbCdn(url: string) {
  return /^https?:\/\/cdn\.paldb\.cc\//i.test(url);
}

const USE_PALDB_HEADERS = false;

function buildPaldbImageSource(url?: string | null) {
  const u = safeEncodeUrl(url ?? undefined);
  if (!u) return undefined;

  if (!USE_PALDB_HEADERS) {
    return { uri: u } as const;
  }

  if (isPaldbCdn(u)) {
    return {
      uri: u,
      headers: {
        Referer: "https://paldb.cc/",
        Origin: "https://paldb.cc",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    } as const;
  }

  return { uri: u } as const;
}

export const PalTribesSection: React.FC<PalTribesSectionProps> = ({ tribes }) => {
  const rows = tribes ?? [];
  if (rows.length === 0) return null;

  const MAX_SCROLL_HEIGHT = 420;

  // Measure-based scroll detection
  const [contentH, setContentH] = useState(0);
  const isScrollable = contentH > MAX_SCROLL_HEIGHT + 1;

  const content = useMemo(() => {
    return (
      <>
        {rows.map((t, idx) => (
          <View
            key={`${t.palSlug}-${t.tribeRole}-${idx}`}
            className="flex-row items-center justify-between py-2 border-b border-slate-800 last:border-b-0"
          >
            <View className="flex-row items-center flex-1 pr-3">
              {t.iconUrl ? (
                <Image
                  source={buildPaldbImageSource(t.iconUrl) as any}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    marginRight: 10,
                  }}
                  contentFit="contain"
                  transition={120}
                  cachePolicy="disk"
                />
              ) : (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    marginRight: 10,
                  }}
                  className="bg-slate-800/50 border border-slate-700"
                />
              )}

              <Text className="text-[12px] text-slate-100 font-semibold flex-1">{t.palName}</Text>
            </View>

            <Text className="text-[12px] text-slate-400 font-semibold text-right">{t.tribeRole}</Text>
          </View>
        ))}
      </>
    );
  }, [rows]);

  return (
    <View className="mb-3">
      <Section
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="account-group-outline" size={12} color="#9ca3af" />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Tribes
            </Text>
          </View>
        }
        rightText={isScrollable ? "scroll for more" : undefined}
      >
        <ScrollView
          style={{ maxHeight: MAX_SCROLL_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          scrollEnabled={isScrollable}
          onContentSizeChange={(_, h) => setContentH(h)}
        >
          {content}
        </ScrollView>
      </Section>
    </View>
  );
};

export default PalTribesSection;
