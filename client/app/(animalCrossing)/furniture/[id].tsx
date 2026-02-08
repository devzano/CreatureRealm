//client/app/(animalCrossing)/furniture/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchFurnitureByName,
  warmFurnitureIndex,
  fetchRelatedFurnitureLite,
  type NookipediaFurnitureItem,
  type NookipediaFurnitureLite,
} from "@/lib/animalCrossing/nookipediaFurniture";
import { useAnimalCrossingCollectionStore, acMakeKey } from "@/store/animalCrossingCollectionStore";
import LocalIcon from "@/components/LocalIcon";

const THUMB_PRIMARY = 256;
const THUMB_FALLBACK = 128;

function uniqStrings(list: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    const v = String(s || "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function buildFurnitureImageCandidates(item?: any | null): string[] {
  if (!item) return [];
  const candidates: string[] = [];

  const vars = Array.isArray((item as any).variations) ? (item as any).variations : [];
  for (const v of vars) {
    const sq = (v as any).image_url_square;
    const url = (v as any).image_url ?? (v as any).image;
    if (sq) candidates.push(String(sq));
    if (url) candidates.push(String(url));
  }

  const directSq = (item as any).image_url_square;
  const direct = (item as any).image_url ?? (item as any).image;
  if (directSq) candidates.push(String(directSq));
  if (direct) candidates.push(String(direct));

  return uniqStrings(candidates);
}

type Variation = {
  variation?: string;
  pattern?: string;
  image_url?: string;
  image_url_square?: string;
  colors?: string[];
  [k: string]: any;
};

function getVariations(item?: NookipediaFurnitureItem | null): Variation[] {
  const vars = Array.isArray((item as any)?.variations) ? ((item as any).variations as any[]) : [];
  return vars.map((v) => ({
    variation: (v as any).variation,
    pattern: (v as any).pattern,
    image_url: (v as any).image_url,
    image_url_square: (v as any).image_url_square,
    colors: Array.isArray((v as any).colors) ? (v as any).colors : [],
    ...v,
  }));
}

function getBestImageForVariation(v?: Variation | null) {
  if (!v) return null;
  const candidates = uniqStrings([
    String(v.image_url_square ?? ""),
    String(v.image_url ?? ""),
    String((v as any).image ?? ""),
  ]);
  return candidates[0] ?? null;
}

function formatBells(n: any) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  try {
    return num.toLocaleString();
  } catch {
    return String(num);
  }
}

function joinList(xs: any, sep = " • ") {
  const arr = Array.isArray(xs) ? xs : [];
  const cleaned = arr.map((x) => String(x ?? "").trim()).filter((s) => !!s);
  return cleaned.length ? cleaned.join(sep) : null;
}

function asNonEmptyString(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function yesNo(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (s === "true") return "Yes";
  if (s === "false") return "No";
  return null;
}

function liteToImageCandidates(x?: NookipediaFurnitureLite | null): string[] {
  if (!x) return [];
  return uniqStrings([String(x.image_url_square ?? ""), String(x.image_url ?? "")]);
}

// -----------------------------
// BETTER FURNITURE COLORSCHEME (AC: warm paper + mint + wood)
// - Softer mint paper instead of deep emerald
// - Warm “wood” accents
// - Category-tinted icon badge
// -----------------------------

function SectionLabel({ children }: { children: React.ReactNode; }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-teal-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-teal-100/90">{children}</Text>
    </View>
  );
}

function PaperCard({ children }: { children: React.ReactNode; }) {
  return (
    <View className="rounded-[28px] bg-teal-950/25 border border-teal-400/18 p-4 overflow-hidden">
      {/* warm + mint “paper” blobs */}
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-teal-300/10" />
      <View className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full bg-lime-300/10" />
      <View className="absolute top-8 left-10 w-2 h-2 rounded-full bg-white/6" />
      <View className="absolute bottom-10 right-12 w-3 h-3 rounded-full bg-white/5" />
      {children}
    </View>
  );
}

function WoodTitle({ title, subtitle }: { title: string; subtitle?: string | null; }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-amber-900/30 border border-amber-200/18">
        <Text className="text-[16px] font-extrabold text-amber-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-teal-100/80 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function Badge({ icon, text }: { icon?: React.ReactNode; text: string; }) {
  return (
    <View className="flex-row items-center mr-2 mb-2 px-3 py-2 rounded-full bg-teal-900/14 border border-teal-300/18">
      {icon ? <View className="mr-2">{icon}</View> : null}
      <Text className="text-[11px] font-semibold text-teal-50">{text}</Text>
    </View>
  );
}

function LeafChip({ label, value }: { label: string; value?: any; }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-teal-200">•</Text>
        </View>
        <Text className="text-[11px] text-teal-100/90">{label}</Text>
      </View>
      <Text className="text-[11px] text-slate-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function SpeechBubble({ label, value }: { label: string; value?: string | null; }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-teal-900/14 border border-teal-300/16 px-4 py-3">
        <Text className="text-[10px] font-bold tracking-[0.14em] uppercase text-teal-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-slate-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-teal-300/16" />
    </View>
  );
}

function categoryIconName(category?: string | null): keyof typeof Feather.glyphMap {
  const c = String(category ?? "").toLowerCase();
  if (c.includes("wall")) return "layout";
  if (c.includes("floor")) return "grid";
  if (c.includes("rug")) return "square";
  if (c.includes("houseware")) return "home";
  if (c.includes("misc")) return "box";
  if (c.includes("ceiling")) return "umbrella";
  return "package";
}

/**
 * More “AC” category palette:
 * - Housewares = mint
 * - Misc = sky
 * - Wall = lilac
 * - Floor = sand
 * - Rug = rose
 * - Ceiling = aqua
 */
function categoryAccent(category?: string | null) {
  const c = String(category ?? "").toLowerCase();
  if (c.includes("houseware")) return { iconBg: "bg-teal-500/16", iconBorder: "border-teal-200/18", iconColor: "#a7f3d0" };
  if (c.includes("misc")) return { iconBg: "bg-sky-500/14", iconBorder: "border-sky-200/18", iconColor: "#bae6fd" };
  if (c.includes("wall")) return { iconBg: "bg-violet-500/14", iconBorder: "border-violet-200/18", iconColor: "#ddd6fe" };
  if (c.includes("floor")) return { iconBg: "bg-amber-500/12", iconBorder: "border-amber-200/18", iconColor: "#fde68a" };
  if (c.includes("rug")) return { iconBg: "bg-rose-500/12", iconBorder: "border-rose-200/18", iconColor: "#fecdd3" };
  if (c.includes("ceiling")) return { iconBg: "bg-cyan-500/12", iconBorder: "border-cyan-200/18", iconColor: "#a5f3fc" };
  return { iconBg: "bg-teal-500/14", iconBorder: "border-teal-200/18", iconColor: "#a7f3d0" };
}

export default function FurnitureDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const furnitureName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const entryKey = useMemo(() => acMakeKey("furniture", furnitureName), [furnitureName]);
  const entry = useAnimalCrossingCollectionStore(useCallback((s: any) => s.entries[entryKey], [entryKey]));
  const toggleCollected = useAnimalCrossingCollectionStore(useCallback((s: any) => s.toggleCollected, []));

  const isCollected = !!entry?.collected;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaFurnitureItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [selectedVarIndex, setSelectedVarIndex] = useState<number>(0);
  const [heroLoading, setHeroLoading] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaFurnitureLite[]>([]);

  useEffect(() => {
    void warmFurnitureIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);
        setItem(null);
        setSelectedVarIndex(0);
        setRelated([]);
        setRelatedLoading(false);

        let fetched: NookipediaFurnitureItem | null = null;

        try {
          const x = await fetchFurnitureByName(furnitureName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setItem(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchFurnitureByName(furnitureName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setItem(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        const series = asNonEmptyString((fetched as any)?.item_series);
        const set = asNonEmptyString((fetched as any)?.item_set);
        const needsRelated = !!(series || set);

        if (needsRelated) {
          setRelatedLoading(true);
          try {
            const xs = await fetchRelatedFurnitureLite({
              item_set: set,
              item_series: set ? null : series,
              excludeName: String((fetched as any)?.name ?? furnitureName),
              limit: 24,
            });
            if (cancelled) return;
            setRelated(xs);
          } catch (e2) {
            console.warn("Related lookup failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load furniture.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [furnitureName]);

  const variations = useMemo(() => getVariations(item), [item]);

  const hero = useMemo(() => {
    const v = variations[selectedVarIndex];
    const vImg = getBestImageForVariation(v);
    if (vImg) return vImg;
    const candidates = buildFurnitureImageCandidates(item);
    return candidates[0] ?? null;
  }, [variations, selectedVarIndex, item]);

  useEffect(() => {
    if (!variations.length) return;
    if (selectedVarIndex < variations.length) return;
    setSelectedVarIndex(0);
  }, [variations.length, selectedVarIndex]);

  useEffect(() => {
    if (!hero) return;
    ExpoImage.prefetch(hero).catch(() => { });
  }, [hero]);

  const lastPrefetchKeyRef = useRef<string>("");
  useEffect(() => {
    const urls: string[] = [];

    for (const r of related.slice(0, 9)) {
      const c = liteToImageCandidates(r);
      if (c[0]) urls.push(c[0]);
    }
    for (const v of variations.slice(0, 9)) {
      const u = getBestImageForVariation(v);
      if (u) urls.push(u);
    }

    const capped = uniqStrings(urls).slice(0, 12);
    const key = capped.join("|");
    if (!key || key === lastPrefetchKeyRef.current) return;
    lastPrefetchKeyRef.current = key;

    capped.forEach((u) => {
      ExpoImage.prefetch(u).catch(() => { });
    });
  }, [related, variations]);

  const onSelectVariation = useCallback((idx: number) => setSelectedVarIndex(idx), []);

  const displayName = item?.name ? String(item.name) : furnitureName;

  const category = asNonEmptyString((item as any)?.category);
  const itemSeries = asNonEmptyString((item as any)?.item_series);
  const itemSet = asNonEmptyString((item as any)?.item_set);

  const themes = joinList((item as any)?.themes);
  const functions = joinList((item as any)?.functions);

  const hhaCategory = asNonEmptyString((item as any)?.hha_category);
  const hhaBase = (item as any)?.hha_base != null ? String((item as any).hha_base) : null;

  const tag = asNonEmptyString((item as any)?.tag);

  const lucky = yesNo((item as any)?.lucky);
  const luckySeason = asNonEmptyString((item as any)?.lucky_season);

  const variationTotal = (item as any)?.variation_total != null ? String((item as any).variation_total) : null;
  const patternTotal = (item as any)?.pattern_total != null ? String((item as any).pattern_total) : null;

  const customizable = yesNo((item as any)?.customizable);
  const customKits = (item as any)?.custom_kits != null ? String((item as any).custom_kits) : null;
  const customKitType = asNonEmptyString((item as any)?.custom_kit_type);
  const customBodyPart = asNonEmptyString((item as any)?.custom_body_part);
  const customPatternPart = asNonEmptyString((item as any)?.custom_pattern_part);

  const gridW = (item as any)?.grid_width != null ? String((item as any).grid_width) : null;
  const gridL = (item as any)?.grid_length != null ? String((item as any).grid_length) : null;
  const height = (item as any)?.height != null ? String((item as any).height) : null;

  const doorDecor = yesNo((item as any)?.door_decor);
  const versionAdded = asNonEmptyString((item as any)?.version_added);
  const unlocked = yesNo((item as any)?.unlocked);

  const sell = formatBells((item as any)?.sell);

  const buyArr = Array.isArray((item as any)?.buy) ? (item as any).buy : [];
  const buyText = buyArr.length
    ? buyArr
      .map((b: any) => {
        const p = formatBells(b?.price);
        const c = asNonEmptyString(b?.currency);
        if (!p) return null;
        return c ? `${p} ${c}` : `${p}`;
      })
      .filter((s: any) => !!s)
      .join(" • ")
    : null;

  const availabilityArr = Array.isArray((item as any)?.availability) ? (item as any).availability : [];
  const availabilityText =
    availabilityArr.length > 0
      ? availabilityArr
        .map((a: any) => {
          const from = asNonEmptyString(a?.from);
          const note = asNonEmptyString(a?.note);
          if (!from && !note) return null;
          if (from && note) return `${from} (${note})`;
          return from ?? note;
        })
        .filter((s: any) => !!s)
        .join(" • ")
      : null;

  const notes = asNonEmptyString((item as any)?.notes);

  const showMainSpinner = loading;

  const goRelated = useCallback(
    (name: string) => {
      router.push({ pathname: "/furniture/[id]", params: { id: encodeURIComponent(name) } } as any);
    },
    [router]
  );

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (itemSet) parts.push(`Set: ${itemSet}`);
    else if (itemSeries) parts.push(`Series: ${itemSeries}`);
    if (category) parts.push(category);
    return parts.join(" • ");
  }, [itemSet, itemSeries, category]);

  const iconName = categoryIconName(category);
  const accent = categoryAccent(category);

  return (
    <PageWrapper scroll={false} title={displayName} subtitle={category ?? "Furniture"} headerLayout="inline">
      {showMainSpinner ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-teal-100/80">Loading…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          {/* TOP “CATALOG” CARD */}
          <View className="mt-4">
            <PaperCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className={`w-8 h-8 rounded-2xl ${accent.iconBg} border ${accent.iconBorder} items-center justify-center`}>
                    <Feather name={iconName} size={16} color={accent.iconColor} />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-teal-100/75 uppercase">
                    Nook&#39;s Catalog
                  </Text>
                </View>

                <Pressable onPress={() => toggleCollected("furniture", furnitureName)}>
                  <View
                    className={`px-3 py-2 rounded-full border ${isCollected ? "bg-teal-500/18 border-teal-200/22" : "bg-amber-500/10 border-amber-200/18"
                      }`}
                  >
                    <Text className={`text-[12px] font-extrabold ${isCollected ? "text-teal-50" : "text-amber-100"}`}>
                      {isCollected ? "In Storage" : "Need This"}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View className="flex-row items-center">
                <View className="w-[132px]">
                  <View className="rounded-[26px] bg-teal-900/14 border border-teal-300/16 p-3 items-center justify-center">
                    <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                      {hero ? (
                        <>
                          <ExpoImage
                            source={{ uri: hero }}
                            style={{ width: 96, height: 96 }}
                            contentFit="contain"
                            transition={120}
                            cachePolicy="disk"
                            onLoadStart={() => setHeroLoading(true)}
                            onLoad={() => setHeroLoading(false)}
                            onError={() => setHeroLoading(false)}
                          />
                          {heroLoading && (
                            <View
                              style={{
                                position: "absolute",
                                inset: 0,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(13, 148, 136, 0.18)",
                                borderRadius: 18,
                              }}
                            >
                              <ActivityIndicator />
                            </View>
                          )}
                        </>
                      ) : (
                        <View className="w-[96px] h-[96px] rounded-[22px] bg-teal-950/35 border border-teal-300/16 items-center justify-center">
                          <LocalIcon
                            source={null}
                            size={92}
                            roundedClassName="rounded-[22px]"
                            placeholderClassName="bg-teal-950/35 border border-teal-300/16"
                          />
                          <View style={{ position: "absolute", alignItems: "center" }}>
                            <Feather name="image" size={18} color="#99f6e4" />
                            <Text className="text-teal-100/60 text-[10px] mt-2">No image</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View className="flex-1 pl-3">
                  <WoodTitle title={displayName} subtitle={subtitleLine || null} />
                </View>
              </View>
            </PaperCard>
          </View>

          <SectionLabel>Overview</SectionLabel>
          <PaperCard>
            <LeafChip label="Category" value={category} />
            <LeafChip label="Series" value={itemSeries} />
            <LeafChip label="Set" value={itemSet} />
            <LeafChip label="Tag" value={tag} />
            <LeafChip label="Themes" value={themes} />
            <LeafChip label="Functions" value={functions} />
          </PaperCard>

          <SectionLabel>Pricing</SectionLabel>
          <PaperCard>
            <LeafChip label="Buy" value={buyText} />
            <LeafChip label="Sell" value={sell ? `${sell} Bells` : null} />
            <LeafChip label="Availability" value={availabilityText} />
          </PaperCard>

          <SectionLabel>HHA & Lucky</SectionLabel>
          <PaperCard>
            <LeafChip label="HHA Category" value={hhaCategory} />
            <LeafChip label="HHA Base" value={hhaBase} />
            <LeafChip label="Lucky" value={lucky} />
            <LeafChip label="Lucky Season" value={luckySeason} />
          </PaperCard>

          <SectionLabel>Customization</SectionLabel>
          <PaperCard>
            <LeafChip label="Customizable" value={customizable} />
            <LeafChip label="Custom Kits" value={customKits} />
            <LeafChip label="Kit Type" value={customKitType} />
            <LeafChip label="Body Part" value={customBodyPart} />
            <LeafChip label="Pattern Part" value={customPatternPart} />
            <LeafChip label="Variation Total" value={variationTotal} />
            <LeafChip label="Pattern Total" value={patternTotal} />
          </PaperCard>

          <SectionLabel>Size & Meta</SectionLabel>
          <PaperCard>
            <LeafChip label="Grid" value={gridW && gridL ? `${gridW} × ${gridL}` : null} />
            <LeafChip label="Height" value={height} />
            <LeafChip label="Door Decor" value={doorDecor} />
            <LeafChip label="Version Added" value={versionAdded} />
            <LeafChip label="Unlocked" value={unlocked} />
            <LeafChip label="Thumbsize" value={thumbUsed ? `${thumbUsed}px` : null} />
          </PaperCard>

          {variations.length > 0 ? (
            <>
              <SectionLabel>Variations</SectionLabel>

              <View className="flex-row flex-wrap">
                {variations.map((v, idx) => {
                  const img = getBestImageForVariation(v);
                  const isActive = idx === selectedVarIndex;

                  const labelParts: string[] = [];
                  const vv = asNonEmptyString(v?.variation);
                  const pp = asNonEmptyString(v?.pattern);
                  if (vv) labelParts.push(vv);
                  if (pp) labelParts.push(pp);

                  const label = labelParts.length ? labelParts.join(" • ") : `Variation ${idx + 1}`;
                  const colors = joinList(v?.colors, ", ");

                  return (
                    <View key={`${label}::${idx}`} className="w-1/3 p-1">
                      <Pressable
                        onPress={() => onSelectVariation(idx)}
                        className={`rounded-[26px] p-3 border items-center ${isActive ? "border-teal-200/35 bg-teal-900/14" : "border-teal-300/16 bg-teal-950/18"
                          }`}
                      >
                        <View
                          style={{
                            width: 68,
                            height: 68,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 18,
                            backgroundColor: "rgba(13, 148, 136, 0.12)",
                            borderWidth: 1,
                            borderColor: isActive ? "rgba(153, 246, 228, 0.45)" : "rgba(94, 234, 212, 0.16)",
                          }}
                        >
                          {img ? (
                            <ExpoImage
                              source={{ uri: img }}
                              style={{ width: 64, height: 64, borderRadius: 18 }}
                              contentFit="contain"
                              transition={120}
                              cachePolicy="disk"
                            />
                          ) : (
                            <Feather name="image" size={18} color="#99f6e4" />
                          )}
                        </View>

                        <Text className="text-[11px] font-semibold text-slate-50 text-center mt-2" numberOfLines={2}>
                          {label}
                        </Text>

                        {colors ? (
                          <Text className="text-[10px] text-teal-100/60 text-center mt-1" numberOfLines={2}>
                            {colors}
                          </Text>
                        ) : (
                          <Text className="text-[10px] text-teal-100/40 text-center mt-1">—</Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {itemSeries || itemSet ? (
            <>
              <SectionLabel>Related {itemSet ? "Set" : "Series"}</SectionLabel>
              <PaperCard>
                <View className="flex-row items-center justify-between">{relatedLoading ? <ActivityIndicator /> : null}</View>

                {!relatedLoading && related.length === 0 ? (
                  <Text className="mt-2 text-[11px] text-teal-100/55">No related items found.</Text>
                ) : relatedLoading ? (
                  <Text className="mt-2 text-[11px] text-teal-100/55">Loading related…</Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap">
                    {related.map((r, idx) => {
                      const name = String(r?.name ?? "").trim();
                      if (!name) return null;

                      const candidates = liteToImageCandidates(r);
                      const img = candidates[0] ?? null;

                      return (
                        <View key={`${name}::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goRelated(name)}
                            className="rounded-[26px] p-3 border items-center border-teal-300/16 bg-teal-950/18"
                          >
                            <View
                              style={{
                                width: 68,
                                height: 68,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 18,
                                backgroundColor: "rgba(13, 148, 136, 0.12)",
                                borderWidth: 1,
                                borderColor: "rgba(94, 234, 212, 0.16)",
                              }}
                            >
                              {img ? (
                                <ExpoImage
                                  source={{ uri: img }}
                                  style={{ width: 64, height: 64 }}
                                  contentFit="contain"
                                  transition={120}
                                  cachePolicy="disk"
                                />
                              ) : (
                                <Feather name="image" size={18} color="#99f6e4" />
                              )}
                            </View>

                            <Text className="text-[11px] font-semibold text-slate-50 text-center mt-2" numberOfLines={2}>
                              {name}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </PaperCard>
            </>
          ) : null}

          {notes ? (
            <>
              <SectionLabel>Notes</SectionLabel>
              <PaperCard>
                <Text className="text-[12px] text-slate-50 leading-5">{notes}</Text>
              </PaperCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
