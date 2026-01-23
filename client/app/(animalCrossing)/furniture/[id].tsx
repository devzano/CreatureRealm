// app/json/furniture/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchFurnitureByName,
  fetchFurnitureIndex,
  warmFurnitureIndex,
  type NookipediaFurnitureItem,
} from "@/lib/animalCrossing/nookipediaFurniture";
import { useAnimalCrossingCollectionStore, acMakeKey } from "@/store/animalCrossingCollectionStore";

const THUMB_PRIMARY = 256;
const THUMB_FALLBACK = 128;

function uniqStrings(list: any[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function buildFurnitureImageCandidates(item?: NookipediaFurnitureItem | null): string[] {
  if (!item) return [];
  const candidates: any[] = [];

  const vars = Array.isArray((item as any).variations) ? (item as any).variations : [];
  for (const v of vars) {
    candidates.push((v as any).image_url_square);
    candidates.push((v as any).image_url);
    candidates.push((v as any).image);
  }

  candidates.push((item as any).image_url_square);
  candidates.push((item as any).image_url);
  candidates.push((item as any).image);

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
  const candidates = uniqStrings([v.image_url_square, v.image_url, (v as any).image]);
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

function StatRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-[12px] text-slate-400">{label}</Text>
      <Text className="text-[12px] text-slate-100 font-semibold text-right ml-3 flex-1">{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-3xl bg-slate-900/80 border border-slate-700 p-4">{children}</View>;
}

export default function FurnitureDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const furnitureName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const entryKey = useMemo(() => acMakeKey("furniture", furnitureName), [furnitureName]);
  const entry = useAnimalCrossingCollectionStore(
    useCallback((s: any) => s.entries[entryKey], [entryKey])
  );
  const toggleCollected = useAnimalCrossingCollectionStore(useCallback((s: any) => s.toggleCollected, []));
  const incrementCount = useAnimalCrossingCollectionStore(useCallback((s: any) => s.incrementCount, []));
  const decrementCount = useAnimalCrossingCollectionStore(useCallback((s: any) => s.decrementCount, []));

  const isCollected = !!entry?.collected;
  const count = Number(entry?.count || 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaFurnitureItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [selectedVarIndex, setSelectedVarIndex] = useState<number>(0);
  const [heroLoading, setHeroLoading] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaFurnitureItem[]>([]);

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
            const index = await fetchFurnitureIndex();
            if (cancelled) return;

            const me = String((fetched as any)?.name ?? furnitureName).trim().toLowerCase();

            const filtered = index.filter((x: any) => {
              const n = String(x?.name ?? "").trim().toLowerCase();
              if (!n || n === me) return false;

              const xs = asNonEmptyString(x?.item_series);
              const xset = asNonEmptyString(x?.item_set);

              if (set && xset && xset === set) return true;
              if (series && xs && xs === series) return true;

              return false;
            });

            filtered.sort((a: any, b: any) => {
              const aSet = asNonEmptyString(a?.item_set);
              const bSet = asNonEmptyString(b?.item_set);
              if (set) {
                const aIs = aSet === set ? 1 : 0;
                const bIs = bSet === set ? 1 : 0;
                if (aIs !== bIs) return bIs - aIs;
              }
              const an = String(a?.name ?? "");
              const bn = String(b?.name ?? "");
              return an.localeCompare(bn);
            });

            setRelated(filtered.slice(0, 24));
          } catch (e2) {
            console.warn("Related furniture index failed:", e2);
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

  const onSelectVariation = useCallback((idx: number) => {
    setSelectedVarIndex(idx);
  }, []);

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

  const needsRelated = !!(itemSeries || itemSet);
  const showMainSpinner = loading || (needsRelated && relatedLoading);

  const goRelated = useCallback(
    (name: string) => {
      router.push({
        pathname: "/json/furniture/[id]",
        params: { id: encodeURIComponent(name) },
      } as any);
    },
    [router]
  );

  return (
    <PageWrapper scroll={false} title={displayName} subtitle={category ?? "Furniture"} headerLayout="inline">
      {showMainSpinner ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">{loading ? "Loading…" : "Loading related…"}</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <Text className="text-sm text-rose-300 text-center">{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
          {/* HERO */}
          <View className="mt-4">
            <Card>
              <View className="items-center">
                <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
                  {hero ? (
                    <>
                      <Image
                        source={{ uri: hero }}
                        style={{ width: 160, height: 160 }}
                        resizeMode="contain"
                        onLoadStart={() => setHeroLoading(true)}
                        onLoadEnd={() => setHeroLoading(false)}
                        onError={() => setHeroLoading(false)}
                      />

                      {heroLoading ? (
                        <View
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            right: 0,
                            bottom: 0,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(2,6,23,0.25)",
                            borderRadius: 24,
                          }}
                        >
                          <ActivityIndicator />
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View className="w-[160px] h-[160px] rounded-3xl bg-slate-950/60 border border-slate-700 items-center justify-center">
                      <Feather name="image" size={20} color="#64748b" />
                      <Text className="text-slate-500 text-[11px] mt-2">No image</Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center mt-3">
                  <Pressable onPress={() => toggleCollected("furniture", furnitureName)}>
                    <Text
                      className={`px-3 py-2 rounded-2xl border text-[12px] font-semibold ${
                        isCollected
                          ? "text-emerald-200 bg-emerald-500/15 border-emerald-500/40"
                          : "text-slate-200 bg-slate-950/40 border-slate-700"
                      }`}
                    >
                      {isCollected ? "Collected" : "Collect"}
                    </Text>
                  </Pressable>

                  {isCollected ? (
                    <View className="flex-row items-center ml-3">
                      <Pressable onPress={() => decrementCount("furniture", furnitureName)}>
                        <Text
                          className="w-8 h-8 text-center text-[16px] font-bold text-slate-100 rounded-2xl bg-slate-950/60 border border-slate-700"
                          style={{ textAlignVertical: "center" }}
                        >
                          −
                        </Text>
                      </Pressable>

                      <View className="px-3">
                        <Text className="text-[13px] text-slate-100 font-semibold">{count}</Text>
                      </View>

                      <Pressable onPress={() => incrementCount("furniture", furnitureName)}>
                        <Text
                          className="w-8 h-8 text-center text-[16px] font-bold text-slate-100 rounded-2xl bg-slate-950/60 border border-slate-700"
                          style={{ textAlignVertical: "center" }}
                        >
                          +
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <Text className="mt-3 text-base font-semibold text-slate-50 text-center">{displayName}</Text>
              </View>
            </Card>
          </View>

          {/* OVERVIEW */}
          <View className="mt-3 px-1">
            <SectionTitle>Overview</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Category" value={category} />
                <StatRow label="Series" value={itemSeries} />
                <StatRow label="Set" value={itemSet} />
                <StatRow label="Tag" value={tag} />
                <StatRow label="Themes" value={themes} />
                <StatRow label="Functions" value={functions} />
              </Card>
            </View>
          </View>

          {/* HHA + LUCKY */}
          <View className="mt-3 px-1">
            <SectionTitle>HHA & Lucky</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="HHA Category" value={hhaCategory} />
                <StatRow label="HHA Base" value={hhaBase} />
                <StatRow label="Lucky" value={lucky} />
                <StatRow label="Lucky Season" value={luckySeason} />
              </Card>
            </View>
          </View>

          {/* PRICING */}
          <View className="mt-3 px-1">
            <SectionTitle>Pricing</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Buy" value={buyText} />
                <StatRow label="Sell" value={sell ? `${sell} Bells` : null} />
                <StatRow label="Availability" value={availabilityText} />
              </Card>
            </View>
          </View>

          {/* CUSTOMIZATION */}
          <View className="mt-3 px-1">
            <SectionTitle>Customization</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Customizable" value={customizable} />
                <StatRow label="Custom Kits" value={customKits} />
                <StatRow label="Kit Type" value={customKitType} />
                <StatRow label="Body Part" value={customBodyPart} />
                <StatRow label="Pattern Part" value={customPatternPart} />
                <StatRow label="Variation Total" value={variationTotal} />
                <StatRow label="Pattern Total" value={patternTotal} />
              </Card>
            </View>
          </View>

          {/* SIZE + META */}
          <View className="mt-3 px-1">
            <SectionTitle>Size & Meta</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Grid" value={gridW && gridL ? `${gridW} × ${gridL}` : null} />
                <StatRow label="Height" value={height} />
                <StatRow label="Door Decor" value={doorDecor} />
                <StatRow label="Version Added" value={versionAdded} />
                <StatRow label="Unlocked" value={unlocked} />
              </Card>
            </View>
          </View>

          {/* RELATED */}
          {itemSeries || itemSet ? (
            <View className="mt-3 px-1">
              <SectionTitle>Related {itemSet ? "Set" : "Series"}</SectionTitle>

              <View className="mt-2">
                <Card>
                  <Text className="text-[11px] text-slate-400">
                    {itemSet ? `Same set: ${itemSet}` : `Same series: ${itemSeries}`}
                  </Text>

                  {related.length === 0 ? (
                    <Text className="mt-2 text-[11px] text-slate-600">No related items found.</Text>
                  ) : (
                    <View className="mt-2 flex-row flex-wrap">
                      {related.map((r, idx) => {
                        const name = String((r as any)?.name ?? "").trim();
                        if (!name) return null;

                        const candidates = buildFurnitureImageCandidates(r);
                        const img = candidates[0] ?? null;

                        return (
                          <View key={`${name}::${idx}`} className="w-1/3 p-1">
                            <Pressable
                              onPress={() => goRelated(name)}
                              className="rounded-3xl p-3 border items-center border-slate-700 bg-slate-900/70"
                            >
                              <View
                                style={{
                                  width: 68,
                                  height: 68,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 18,
                                  backgroundColor: "rgba(2,6,23,0.35)",
                                  borderWidth: 1,
                                  borderColor: "rgba(51,65,85,0.7)",
                                }}
                              >
                                {img ? (
                                  <Image source={{ uri: img }} style={{ width: 64, height: 64 }} resizeMode="contain" />
                                ) : (
                                  <Feather name="image" size={18} color="#64748b" />
                                )}
                              </View>

                              <Text className="text-[11px] font-semibold text-slate-100 text-center mt-2" numberOfLines={2}>
                                {name}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Card>
              </View>
            </View>
          ) : null}

          {/* VARIATIONS GRID */}
          {variations.length > 0 ? (
            <View className="mt-3 px-1">
              <SectionTitle>Variations</SectionTitle>

              <View className="mt-2 flex-row flex-wrap">
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
                        className={`rounded-3xl p-3 border items-center ${
                          isActive ? "border-sky-400 bg-slate-900/90" : "border-slate-700 bg-slate-900/70"
                        }`}
                      >
                        <View
                          style={{
                            width: 68,
                            height: 68,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 18,
                            backgroundColor: "rgba(2,6,23,0.35)",
                            borderWidth: 1,
                            borderColor: isActive ? "rgba(56,189,248,0.55)" : "rgba(51,65,85,0.7)",
                          }}
                        >
                          {img ? (
                            <Image source={{ uri: img }} style={{ width: 64, height: 64 }} resizeMode="contain" />
                          ) : (
                            <Feather name="image" size={18} color="#64748b" />
                          )}
                        </View>

                        <Text className="text-[11px] font-semibold text-slate-100 text-center mt-2" numberOfLines={2}>
                          {label}
                        </Text>

                        {colors ? (
                          <Text className="text-[10px] text-slate-500 text-center mt-1" numberOfLines={2}>
                            {colors}
                          </Text>
                        ) : (
                          <Text className="text-[10px] text-slate-600 text-center mt-1">—</Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* NOTES */}
          {notes ? (
            <View className="mt-3 px-1">
              <SectionTitle>Notes</SectionTitle>
              <View className="mt-2">
                <Card>
                  <Text className="text-[12px] text-slate-200">{notes}</Text>
                </Card>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </PageWrapper>
  );
}
