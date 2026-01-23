// components/Palworld/PalworldDetails/PalDetailSpawnerSection.tsx
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
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

function formatLocations(
  locs?: Array<{ slug: string; name: string; }>
): { label: string; count: number; } | null {
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

  // normalize html-ish spacing
  const base = raw
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " • ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*•\s*/g, " • ")
    .trim();

  // If it already contains bullets from <br>, keep them but still clean underscores
  const noUnderscore = base.replace(/[_]+/g, " ").replace(/[ \t]+/g, " ").trim();

  // Pal Recruiter pattern: "Pal Recruiter Grass 1.89%"
  const recruiterMatch = noUnderscore.match(
    /^(Pal\s+Recruiter)\s+(.+?)\s+(\d+(?:\.\d+)?)%\s*$/i
  );
  if (recruiterMatch) {
    const label = recruiterMatch[1].replace(/[ \t]+/g, " ").trim();
    const region = recruiterMatch[2].replace(/[ \t]+/g, " ").trim();
    const pct = `${recruiterMatch[3]}%`;
    return `${label} • ${region} • ${pct}`;
  }

  // Captured Cage: "Captured Cage: Grass2" -> "Captured Cage • Grass2"
  const cageMatch = noUnderscore.match(/^(Captured\s+Cage)\s*:\s*(.+)$/i);
  if (cageMatch) {
    const left = cageMatch[1].replace(/[ \t]+/g, " ").trim();
    const right = cageMatch[2].replace(/[ \t]+/g, " ").trim();
    return `${left} • ${right}`;
  }

  // If it contains bullets already (like multiple cavern names), just return cleaned
  if (noUnderscore.includes("•")) {
    return noUnderscore;
  }

  // Tokenize for code-like ids (numbers/words separated by underscores originally)
  const tokens = noUnderscore.split(" ").filter(Boolean);

  // If it looks like a code-ish identifier (many short tokens, contains digits),
  // present as grouped bullets for readability.
  const digitCount = tokens.filter((t) => /\d/.test(t)).length;
  const looksCodey =
    tokens.length >= 3 && digitCount >= 1 && tokens.every((t) => t.length <= 18);

  if (looksCodey) {
    // Group leading numeric tokens into a single "1 2" chunk when applicable
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

    // Also split something like "PvP 21 2 1" into "PvP • 21 • 2 • 1"
    return parts.join(" • ").trim();
  }

  // Default: just return cleaned, de-underscored text
  return noUnderscore;
}

export const PalSpawnerSection: React.FC<PalSpawnerSectionProps> = ({
  spawner,
}) => {
  const rows = spawner ?? [];
  if (rows.length === 0) return null;

  const MAX_VISIBLE = 10;
  const visible = rows.slice(0, MAX_VISIBLE);
  const isScrollable = rows.length > MAX_VISIBLE;

  const MAX_SCROLL_HEIGHT = 380;

  const content = (
    <>
      {visible.map((s, idx) => {
        const loc = formatLocations(s.locations);
        const src = prettifySourceText(s.sourceText);
        const key = `${s.palSlug}-${s.levelRange}-${s.sourceText}-${idx}`;

        return (
          /* Changed Pressable to View and removed navigation logic */
          <View
            key={key}
            className="py-2 border-b border-slate-800 last:border-b-0"
          >
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
                  <Text className="text-[12px] text-slate-100 font-semibold">
                    {s.palName}
                  </Text>

                  {!!src ? (
                    <View className="flex-row items-center mt-0.5">
                      <MaterialCommunityIcons
                        name="map-search-outline"
                        size={12}
                        color="#94a3b8"
                      />
                      <Text className="ml-1 text-[11px] text-slate-400">
                        {src}
                      </Text>
                    </View>
                  ) : null}

                  {loc ? (
                    <View className="flex-row items-center mt-0.5">
                      <MaterialCommunityIcons
                        name="map-marker-multiple-outline"
                        size={12}
                        color="#94a3b8"
                      />
                      <Text className="ml-1 text-[11px] text-slate-400">
                        {loc.label}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View className="items-end">
                <Text className="text-[12px] text-slate-300 font-semibold">
                  {s.levelRange}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );

  return (
    <View className="mb-3">
      <Section
        title={
          <>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={12}
              color="#9ca3af"
            />{" "}
            Spawner
          </>
        }
        rightText={
          isScrollable ? `Showing ${MAX_VISIBLE} / ${rows.length}` : undefined
        }
      >
        {isScrollable ? (
          <ScrollView
            style={{ maxHeight: MAX_SCROLL_HEIGHT }}
            showsVerticalScrollIndicator={false}
          >
            <View>{content}</View>
          </ScrollView>
        ) : (
          <View>{content}</View>
        )}
      </Section>
    </View>
  );
};

export default PalSpawnerSection;
