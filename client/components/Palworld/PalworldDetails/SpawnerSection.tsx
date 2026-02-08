// components/Palworld/PalworldDetails/PalDetailSpawnerSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Section from "@/components/Section";
import type { PalDetail } from "@/lib/palworld/pal/paldbDetails";

export type PalSpawnerSectionProps = {
  spawner?: NonNullable<PalDetail["spawner"]>;
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

function formatLocations(locs?: Array<{ slug: string; name: string }>): { label: string; count: number } | null {
  const rows = (locs ?? []).filter((l) => !!l?.name);
  if (rows.length === 0) return null;

  const MAX = 4;
  const names = rows.map((r) => r.name);

  if (names.length <= MAX) {
    return { label: names.join(" • "), count: names.length };
  }

  const shown = names.slice(0, MAX).join(" • ");
  return { label: `${shown} • +${names.length - MAX}`, count: names.length };
}

function prettifySourceText(input?: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  const base = raw
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " • ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*•\s*/g, " • ")
    .trim();

  const noUnderscore = base.replace(/[_]+/g, " ").replace(/[ \t]+/g, " ").trim();

  const recruiterMatch = noUnderscore.match(/^(Pal\s+Recruiter)\s+(.+?)\s+(\d+(?:\.\d+)?)%\s*$/i);
  if (recruiterMatch) {
    const label = recruiterMatch[1].replace(/[ \t]+/g, " ").trim();
    const region = recruiterMatch[2].replace(/[ \t]+/g, " ").trim();
    const pct = `${recruiterMatch[3]}%`;
    return `${label} • ${region} • ${pct}`;
  }

  const cageMatch = noUnderscore.match(/^(Captured\s+Cage)\s*:\s*(.+)$/i);
  if (cageMatch) {
    const left = cageMatch[1].replace(/[ \t]+/g, " ").trim();
    const right = cageMatch[2].replace(/[ \t]+/g, " ").trim();
    return `${left} • ${right}`;
  }

  if (noUnderscore.includes("•")) return noUnderscore;

  const tokens = noUnderscore.split(" ").filter(Boolean);
  const digitCount = tokens.filter((t) => /\d/.test(t)).length;
  const looksCodey = tokens.length >= 3 && digitCount >= 1 && tokens.every((t) => t.length <= 18);

  if (looksCodey) {
    const leadingNums: string[] = [];
    let i = 0;
    while (i < tokens.length && /^[0-9]+$/.test(tokens[i])) {
      leadingNums.push(tokens[i]);
      i++;
    }

    const rest = tokens.slice(i);

    const parts: string[] = [];
    if (leadingNums.length > 0) parts.push(leadingNums.join(" "));
    parts.push(...rest);

    return parts.join(" • ").trim();
  }

  return noUnderscore;
}

export const PalSpawnerSection: React.FC<PalSpawnerSectionProps> = ({ spawner }) => {
  const rows = spawner ?? [];
  if (rows.length === 0) return null;

  const MAX_SCROLL_HEIGHT = 380;

  const [contentH, setContentH] = useState(0);
  const isScrollable = contentH > MAX_SCROLL_HEIGHT + 1;

  const content = useMemo(() => {
    return (
      <>
        {rows.map((s, idx) => {
          const loc = formatLocations(s.locations);
          const src = prettifySourceText(s.sourceText);
          const key = `${s.palSlug}-${s.levelRange}-${s.sourceText}-${idx}`;

          return (
            <View key={key} className="py-2 border-b border-slate-800 last:border-b-0">
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  {s.iconUrl ? (
                    <Image
                      source={buildPaldbImageSource(s.iconUrl) as any}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        marginRight: 10,
                        marginTop: 2,
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
                        marginTop: 2,
                      }}
                      className="bg-slate-800/50 border border-slate-700"
                    />
                  )}

                  <View className="flex-1">
                    <Text className="text-[12px] text-slate-100 font-semibold">{s.palName}</Text>

                    {!!src ? (
                      <View className="flex-row items-center mt-0.5">
                        <MaterialCommunityIcons name="map-search-outline" size={12} color="#94a3b8" />
                        <Text className="ml-1 text-[11px] text-slate-400">{src}</Text>
                      </View>
                    ) : null}

                    {loc ? (
                      <View className="flex-row items-center mt-0.5">
                        <MaterialCommunityIcons name="map-marker-multiple-outline" size={12} color="#94a3b8" />
                        <Text className="ml-1 text-[11px] text-slate-400">{loc.label}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-[12px] text-slate-300 font-semibold">{s.levelRange}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </>
    );
  }, [rows]);

  return (
    <View className="mb-3">
      <Section
        title={
          <>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color="#9ca3af" /> Spawner
          </>
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

export default PalSpawnerSection;
