// client/components/Palworld/PalworldDetails/UniqueComboSection.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import Section from "@/components/Section";
import LiquidGlass from "@/components/ui/LiquidGlass";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { elementHex } from "@/lib/palworld/palworldDB";

type UniqueComboPal = {
  palSlug: string;
  palName: string;
  iconUrl?: string | null;
  element?: string | null;
};

type UniqueCombo = {
  parents: [UniqueComboPal, UniqueComboPal];
  child: UniqueComboPal;
};

type ComboRow = {
  parentA: UniqueComboPal;
  parentB: UniqueComboPal;
  chanceText?: string | null;
};

const PALDB_BASE = "https://paldb.cc";
const PAGE_SIZE = 50;

function safeChildSlugFromInputs(uniqueCombo?: UniqueCombo | null, breedingUrl?: string | null): string | null {
  const fromCombo = uniqueCombo?.child?.palSlug?.trim();
  if (fromCombo) return fromCombo;

  if (breedingUrl) {
    try {
      const u = new URL(breedingUrl);
      const child = (u.searchParams.get("child") ?? "").trim();
      if (child) return child;
    } catch {}
  }

  return null;
}

function buildPaldbBreedApiUrl(childSlug: string) {
  const u = new URL(`${PALDB_BASE}/en/api/pal_breed_3`);
  u.searchParams.set("child3", childSlug);
  return u.toString();
}

function decodeHtmlEntities(s: string) {
  return String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string) {
  return decodeHtmlEntities(String(s ?? "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(haystack: string, re: RegExp): string | null {
  const m = re.exec(haystack);
  return m?.[1] ?? null;
}

function parsePalSlugFromHref(hrefRaw: string): string | null {
  const href = decodeHtmlEntities(hrefRaw || "").trim();
  if (!href) return null;

  let slug =
    href.match(/\/Pal\/([^\/\?#]+)/i)?.[1] ??
    href.match(/[?&]name=([^&#]+)/i)?.[1] ??
    null;

  if (!slug) {
    if (!href.includes("/") && !href.includes("?") && !href.includes("#")) {
      slug = href;
    } else {
      const last = href
        .split("?")[0]
        .split("#")[0]
        .split("/")
        .filter(Boolean)
        .pop();
      slug = last ?? null;
    }
  }

  if (!slug) return null;

  try {
    slug = decodeURIComponent(slug);
  } catch {}

  return slug.trim() || null;
}

function bestNameFromAnchor(anchorHtml: string): string | null {
  const alt = firstMatch(anchorHtml, /<img[^>]+alt="([^"]+)"/i);
  if (alt) return stripTags(alt);

  const title = firstMatch(anchorHtml, /title="([^"]+)"/i);
  if (title) return stripTags(title);

  const inner = firstMatch(anchorHtml, /<a[^>]*>([\s\S]*?)<\/a>/i);
  if (inner) return stripTags(inner);

  return null;
}

function bestIconFromAnchor(anchorHtml: string): string | null {
  const src = firstMatch(anchorHtml, /<img[^>]+src="([^"]+)"/i);
  return src ? decodeHtmlEntities(src).trim() : null;
}

function parseAllCombinationsFromApiHtml(apiHtml: string): ComboRow[] {
  const cols: string[] = [];
  const colRe = /<div[^>]+class="col"[^>]*>([\s\S]*?)<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = colRe.exec(apiHtml))) cols.push(m[1]);

  const blocks = cols.length ? cols : [apiHtml];

  const out: ComboRow[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const itemAnchorRe =
      /(<a[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>)/gi;

    const anchors: Array<{ full: string; href: string }> = [];
    let a: RegExpExecArray | null;

    while ((a = itemAnchorRe.exec(block))) {
      anchors.push({ full: a[1], href: a[2] });
      if (anchors.length >= 3) break;
    }

    if (anchors.length < 2) continue;

    const aSlug = parsePalSlugFromHref(anchors[0].href);
    const bSlug = parsePalSlugFromHref(anchors[1].href);
    if (!aSlug || !bSlug) continue;

    const aName = bestNameFromAnchor(anchors[0].full) ?? aSlug;
    const bName = bestNameFromAnchor(anchors[1].full) ?? bSlug;

    const aIcon = bestIconFromAnchor(anchors[0].full);
    const bIcon = bestIconFromAnchor(anchors[1].full);

    const key = `${aSlug}__${bSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      parentA: { palSlug: aSlug, palName: aName, iconUrl: aIcon },
      parentB: { palSlug: bSlug, palName: bName, iconUrl: bIcon },
      chanceText: null,
    });
  }

  return out;
}

export default function PalUniqueComboSection({
  uniqueCombo,
  breedingUrl,
  accent,
}: {
  uniqueCombo?: UniqueCombo | null;
  breedingUrl?: string | null;
  accent?: string | null;
}) {
  const router = useRouter();

  const hasUniqueCombo =
    !!uniqueCombo?.parents?.[0]?.palSlug &&
    !!uniqueCombo?.parents?.[1]?.palSlug &&
    !!uniqueCombo?.child?.palSlug;

  if (!hasUniqueCombo && !breedingUrl) return null;

  const parentA = uniqueCombo?.parents?.[0] ?? null;
  const parentB = uniqueCombo?.parents?.[1] ?? null;
  const child = uniqueCombo?.child ?? null;

  const resultColor = child?.element ? elementHex(child.element) : "#94a3b8";
  const buttonColor = accent || resultColor || "#22c55e";

  const targetChildSlug = useMemo(() => {
    return safeChildSlugFromInputs(uniqueCombo ?? null, breedingUrl ?? null);
  }, [uniqueCombo, breedingUrl]);

  const apiUrl = useMemo(() => {
    return targetChildSlug ? buildPaldbBreedApiUrl(targetChildSlug) : null;
  }, [targetChildSlug]);

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [allCombos, setAllCombos] = useState<ComboRow[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const showViewAll = allCombos.length > 0;
  const visibleCombos = useMemo(() => allCombos.slice(0, visibleCount), [allCombos, visibleCount]);

  const canLoadMore = visibleCount < allCombos.length;

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const PalChip = ({
    pal,
    isChild = false,
  }: {
    pal: UniqueComboPal;
    isChild?: boolean;
  }) => {
    const elementColor = isChild && pal.element ? elementHex(pal.element) : "#94a3b8";

    return (
      <LiquidGlass
        interactive
        tinted={isChild}
        tintColor={elementColor}
        showFallbackBackground
        style={{ borderRadius: 999 }}
      >
        <Pressable
          onPress={() => {
            if (!pal.palSlug) return;
            closeSheet();
            router.push({
              pathname: "/(palworld)/pal/[id]",
              params: { id: pal.palSlug },
            } as any);
          }}
          className="flex-row items-center rounded-full border px-3 py-2 bg-slate-900/40"
          style={{
            borderColor: isChild ? `${elementColor}66` : "rgba(255,255,255,0.1)",
          }}
        >
          {pal.iconUrl ? (
            <Image
              source={{ uri: pal.iconUrl }}
              style={{ width: 24, height: 24, borderRadius: 12 }}
              contentFit="contain"
            />
          ) : (
            <View className="w-6 h-6 rounded-full bg-white/10 border border-white/15" />
          )}
          <Text className="ml-2 text-[12px] font-semibold text-slate-100">{pal.palName}</Text>
        </Pressable>
      </LiquidGlass>
    );
  };

  const onFetchBreedingResults = useCallback(async () => {
    if (!apiUrl) {
      setFetchError("Missing child slug (can't build PalDB API URL).");
      return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
      const res = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "text/html,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const apiHtml = await res.text();
      const combos = parseAllCombinationsFromApiHtml(apiHtml);

      setAllCombos(combos);
      setVisibleCount(PAGE_SIZE);
      setSheetVisible(true);
    } catch (e: any) {
      setFetchError(e?.message ? String(e.message) : "Failed to fetch results.");
      setAllCombos([]);
      setVisibleCount(PAGE_SIZE);
    } finally {
      setIsFetching(false);
    }
  }, [apiUrl]);

  const openBreedingBottomSheet = useCallback(() => {
    if (isFetching) return;

    if (allCombos.length > 0) {
      setVisibleCount((v) => (v < PAGE_SIZE ? PAGE_SIZE : v));
      setSheetVisible(true);
      return;
    }

    void onFetchBreedingResults();
  }, [allCombos.length, isFetching, onFetchBreedingResults]);

  const onViewAllPress = useCallback(() => {
    // no refetch, just reopen
    setVisibleCount((v) => (v < PAGE_SIZE ? PAGE_SIZE : v));
    setSheetVisible(true);
  }, []);

  const onLoadMore = useCallback(() => {
    if (!canLoadMore) return;
    setVisibleCount((v) => Math.min(allCombos.length, v + PAGE_SIZE));
  }, [allCombos.length, canLoadMore]);

  const hideFetchButtons = hasUniqueCombo;

  const onScroll = useCallback(
    (e: any) => {
      if (!canLoadMore) return;

      const y = e?.nativeEvent?.contentOffset?.y ?? 0;
      const h = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
      const contentH = e?.nativeEvent?.contentSize?.height ?? 0;

      if (y + h >= contentH - 240) {
        onLoadMore();
      }
    },
    [canLoadMore, onLoadMore]
  );

  return (
    <View className="mt-3 mb-3">
      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        tintColor="#020617"
        fixedHeight={620}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="dna" size={16} color="#cbd5e1" />
            <Text className="ml-2 text-sm font-semibold text-slate-100">All Combinations</Text>
          </View>

          <Pressable
            onPress={closeSheet}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
          >
            <Ionicons name="close" size={20} color="white" />
          </Pressable>
        </View>

        <Text className="text-xs text-slate-400 mb-3">
          {allCombos.length.toLocaleString()} combos found
          {allCombos.length > 0 ? (
            <Text className="text-xs text-slate-500">{`  •  Showing ${Math.min(
              visibleCount,
              allCombos.length
            ).toLocaleString()}`}</Text>
          ) : null}
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          {allCombos.length === 0 ? (
            <Text className="text-sm text-slate-300">No combos found.</Text>
          ) : (
            <>
              {visibleCombos.map((row, idx) => (
                <View
                  key={`${row.parentA.palSlug}__${row.parentB.palSlug}__${idx}`}
                  className="mb-3 p-3 rounded-2xl bg-white/5 border border-white/10"
                >
                  <View className="flex-row items-center justify-center">
                    <PalChip pal={row.parentA} />
                    <View className="mx-2">
                      <MaterialCommunityIcons name="plus" size={14} color="#64748b" />
                    </View>
                    <PalChip pal={row.parentB} />
                  </View>

                  {row.chanceText ? (
                    <View className="mt-2 items-center">
                      <View className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/20">
                        <Text className="text-xs font-semibold text-emerald-200">{row.chanceText}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}

              {canLoadMore ? (
                <View className="mt-1 mb-2 items-center">
                  <View className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                    <Text className="text-xs text-slate-300">
                      Loading more… ({Math.min(visibleCount, allCombos.length).toLocaleString()} /{" "}
                      {allCombos.length.toLocaleString()})
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </BottomSheetModal>

      <Section
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="dna" size={14} color="#9ca3af" />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Breeding
            </Text>
          </View>
        }
      >
        {hasUniqueCombo && parentA && parentB && child ? (
          <View className="flex-row items-center justify-center py-2">
            <View className="flex-1 items-center justify-center">
              <Text className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">
                Parents
              </Text>
              <View className="items-center gap-y-2">
                <PalChip pal={parentA} />
                <MaterialCommunityIcons name="plus" size={14} color="#0cd3f1" />
                <PalChip pal={parentB} />
              </View>
            </View>

            <View className="px-2">
              <MaterialCommunityIcons name="chevron-right" size={24} color="#0cd3f1" />
            </View>

            <View className="flex-1 items-center justify-center">
              <Text className="text-[11px] font-semibold mb-2 uppercase tracking-widest" style={{ color: resultColor }}>
                Result
              </Text>
              <PalChip pal={child} isChild />
            </View>
          </View>
        ) : null}

        {!hideFetchButtons ? (
          <View className="mb-1">
            {!showViewAll ? (
              <TouchableOpacity
                onPress={openBreedingBottomSheet}
                activeOpacity={0.85}
                disabled={isFetching || !apiUrl}
                style={{
                  backgroundColor: buttonColor,
                  opacity: isFetching || !apiUrl ? 0.75 : 1,
                }}
                className="mt-1 flex-row items-center justify-center rounded-xl py-3 px-3"
              >
                <MaterialCommunityIcons name="egg-easter" size={18} color="#ecfdf5" />
                <Text className="ml-2 text-sm font-medium text-emerald-50">
                  {isFetching ? "Loading…" : "Open Breeding Calculator"}
                </Text>
              </TouchableOpacity>
            ) : null}

            {showViewAll ? (
              <TouchableOpacity
                onPress={onViewAllPress}
                activeOpacity={0.85}
                style={{ backgroundColor: buttonColor }}
                className="mt-1 flex-row items-center justify-center rounded-xl py-3 px-3"
              >
                <MaterialCommunityIcons name="format-list-bulleted" size={18} color="#ecfdf5" />
                <Text className="ml-2 text-sm font-medium text-emerald-50">
                  View All Combinations ({allCombos.length})
                </Text>
              </TouchableOpacity>
            ) : null}

            {fetchError ? <Text className="text-xs text-red-300">Failed to load: {fetchError}</Text> : null}
          </View>
        ) : null}
      </Section>
    </View>
  );
}
