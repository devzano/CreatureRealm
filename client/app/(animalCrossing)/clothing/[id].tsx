// client/app/(animalCrossing)/clothing/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchClothingByName,
  warmClothingIndex,
  fetchRelatedClothingLiteByCategory,
  warmClothingRelatedIndex,
  type NookipediaClothingItem,
  type NookipediaClothingLite,
} from "@/lib/animalCrossing/nookipediaClothing";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";
import LocalIcon from "@/components/LocalIcon";

const THUMB_PRIMARY = 256;
const THUMB_FALLBACK = 128;

function asNonEmptyString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function joinList(xs: any, sep = " • ") {
  const arr = Array.isArray(xs) ? xs : [];
  const cleaned = arr.map((x) => String(x ?? "").trim()).filter((s) => !!s);
  return cleaned.length ? cleaned.join(sep) : null;
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

function buildClothingImageCandidates(item?: NookipediaClothingItem | null): string[] {
  if (!item) return [];

  const candidates: any[] = [];
  const vars = Array.isArray((item as any).variations) ? (item as any).variations : [];
  for (const v of vars) {
    const url = (v as any)?.image_url;
    if (url) candidates.push(url);
  }

  candidates.push((item as any).image_url, (item as any).render_url);
  return uniqStrings(candidates);
}

function liteImageCandidates(x?: NookipediaClothingLite | null): string[] {
  if (!x) return [];
  return uniqStrings([String(x.image_url ?? ""), String(x.render_url ?? "")]);
}

/* -----------------------------
   “Boutique” UI (clothing theme)
------------------------------ */

function BoutiqueSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-fuchsia-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-fuchsia-100/90">{children}</Text>
    </View>
  );
}

function BoutiqueCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-fuchsia-950/18 border border-fuchsia-300/16 p-4 overflow-hidden">
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-fuchsia-300/10" />
      <View className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-violet-300/10" />
      <View className="absolute top-10 left-8 w-3 h-3 rounded-full bg-rose-200/10" />
      <View className="absolute top-16 left-14 w-2 h-2 rounded-full bg-rose-200/10" />
      <View className="absolute bottom-14 right-12 w-3 h-3 rounded-full bg-rose-200/10" />
      {children}
    </View>
  );
}

function BoutiqueTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-violet-900/18 border border-violet-200/18">
        <Text className="text-[16px] font-extrabold text-fuchsia-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-fuchsia-100/75 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function BoutiqueChip({ label, value }: { label: string; value?: any }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-fuchsia-200">•</Text>
        </View>
        <Text className="text-[11px] text-fuchsia-100/85">{label}</Text>
      </View>
      <Text className="text-[11px] text-fuchsia-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function BoutiqueBadge({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-center mr-2 mb-2 px-3 py-2 rounded-full bg-fuchsia-900/16 border border-fuchsia-200/16">
      {icon ? <View className="mr-2">{icon}</View> : null}
      <Text className="text-[11px] font-semibold text-fuchsia-50">{text}</Text>
    </View>
  );
}

function StylistNote({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-violet-900/16 border border-violet-200/14 px-4 py-3">
        <Text className="text-[10px] font-bold tracking-[0.14em] uppercase text-violet-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-fuchsia-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-violet-200/14" />
    </View>
  );
}

export default function ClothingDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const clothingName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const key = useMemo(() => `clothing:${String(clothingName ?? "").trim()}`, [clothingName]);
  const entry = useAnimalCrossingCollectionStore((s: any) => s.entries?.[key] ?? null);

  const toggleCollected = useAnimalCrossingCollectionStore((s: any) => s.toggleCollected);
  const incrementCount = useAnimalCrossingCollectionStore((s: any) => s.incrementCount);
  const decrementCount = useAnimalCrossingCollectionStore((s: any) => s.decrementCount);
  const setCount = useAnimalCrossingCollectionStore((s: any) => s.setCount);

  const isCollected = !!entry?.collected;
  const count = Math.max(Number(entry?.count || 0), 0);

  const onToggleCollected = useCallback(() => {
    toggleCollected("clothing", clothingName);
  }, [toggleCollected, clothingName]);

  const onInc = useCallback(() => {
    incrementCount("clothing", clothingName);
  }, [incrementCount, clothingName]);

  const onDec = useCallback(() => {
    decrementCount("clothing", clothingName);
  }, [decrementCount, clothingName]);

  const onSetToOneIfNeeded = useCallback(() => {
    if (!isCollected || count <= 0) setCount("clothing", clothingName, 1);
  }, [isCollected, count, setCount, clothingName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaClothingItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaClothingLite[]>([]);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroImgLoading, setHeroImgLoading] = useState(false);

  // warm caches (safe; doesn’t block UI)
  useEffect(() => {
    void warmClothingIndex();
    void warmClothingRelatedIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setItem(null);
        setHeroCandidateIndex(0);

        setRelated([]);
        setRelatedLoading(false);

        let fetched: NookipediaClothingItem | null = null;

        try {
          const x = await fetchClothingByName(clothingName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setItem(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchClothingByName(clothingName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setItem(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        // ✅ NON-BLOCKING related (category-based, fast index)
        const myCategory = asNonEmptyString((fetched as any)?.category);
        if (myCategory) {
          setRelatedLoading(true);
          try {
            const xs = await fetchRelatedClothingLiteByCategory({
              category: myCategory,
              excludeName: String((fetched as any)?.name ?? clothingName),
              limit: 24,
            });
            if (cancelled) return;
            setRelated(xs);
          } catch (e2) {
            console.warn("Related clothing lookup failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load clothing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clothingName]);

  const displayName = item?.name ? String(item.name) : clothingName;

  const candidates = useMemo(() => buildClothingImageCandidates(item), [item]);
  const heroUri = candidates[heroCandidateIndex] ?? null;

  useEffect(() => {
    setHeroCandidateIndex(0);
  }, [candidates.length]);

  // ✅ Prefetch hero only (not in render)
  useEffect(() => {
    if (!heroUri) return;
    ExpoImage.prefetch(heroUri).catch(() => {});
  }, [heroUri]);

  // ✅ Prefetch a small set of related thumbs (not in render)
  const lastPrefetchKeyRef = useRef<string>("");
  useEffect(() => {
    const urls: string[] = [];
    for (const r of related.slice(0, 10)) {
      const c = liteImageCandidates(r);
      if (c[0]) urls.push(c[0]);
    }
    const capped = uniqStrings(urls).slice(0, 12);
    const key = capped.join("|");
    if (!key || key === lastPrefetchKeyRef.current) return;
    lastPrefetchKeyRef.current = key;

    capped.forEach((u) => {
      ExpoImage.prefetch(u).catch(() => {});
    });
  }, [related]);

  const onHeroError = useCallback(() => {
    setHeroImgLoading(false);
    if (heroCandidateIndex + 1 < candidates.length) setHeroCandidateIndex((i) => i + 1);
  }, [heroCandidateIndex, candidates.length]);

  const category = asNonEmptyString((item as any)?.category);
  const sell = formatBells((item as any)?.sell);
  const variationTotal = (item as any)?.variation_total != null ? String((item as any).variation_total) : null;

  const villEquip =
    (item as any)?.vill_equip != null ? (String((item as any).vill_equip) === "true" ? "Yes" : "No") : null;

  const seasonality = asNonEmptyString((item as any)?.seasonality);
  const versionAdded = asNonEmptyString((item as any)?.version_added);

  const labelThemes = joinList((item as any)?.label_themes);
  const styles = joinList((item as any)?.styles);

  const availabilityFrom = joinList(
    Array.isArray((item as any)?.availability)
      ? (item as any).availability.map((a: any) => a?.from).filter(Boolean)
      : [],
    " • "
  );

  const buy = (() => {
    const arr = Array.isArray((item as any)?.buy) ? (item as any).buy : [];
    if (!arr.length) return null;
    const parts = arr
      .map((b: any) => {
        const p = b?.price;
        const c = asNonEmptyString(b?.currency);
        if (p == null) return null;
        return `${formatBells(p) ?? String(p)}${c ? ` ${c}` : ""}`;
      })
      .filter(Boolean);
    return parts.length ? parts.join(" • ") : null;
  })();

  const notes = asNonEmptyString((item as any)?.notes);

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (category) parts.push(category);
    if (variationTotal) parts.push(`${variationTotal} variations`);
    if (seasonality) parts.push(seasonality);
    return parts.join(" • ");
  }, [category, variationTotal, seasonality]);

  const goRelated = useCallback(
    (name: string) => {
      router.push({ pathname: "/clothing/[id]", params: { id: encodeURIComponent(name) } } as any);
    },
    [router]
  );

  // ✅ DO NOT BLOCK PAGE ON RELATED
  const showMainSpinner = loading;

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Clothing" headerLayout="inline">
      {showMainSpinner ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-fuchsia-100/80">Loading…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          {/* HERO */}
          <View className="mt-4">
            <BoutiqueCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-fuchsia-500/12 border border-fuchsia-200/18 items-center justify-center">
                    <Feather name="shopping-bag" size={16} color="#f5d0fe" />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-fuchsia-100/75 uppercase">
                    Able Sisters
                  </Text>
                </View>

                {category ? (
                  <View className="px-3 py-2 rounded-full bg-violet-900/14 border border-violet-200/16">
                    <Text className="text-[11px] font-extrabold text-fuchsia-50">{category}</Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row">
                <View className="w-[132px]">
                  <View className="rounded-[26px] bg-fuchsia-900/10 border border-fuchsia-200/14 p-3 items-center justify-center">
                    <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                      {heroUri ? (
                        <>
                          <ExpoImage
                            source={{ uri: heroUri }}
                            style={{ width: 96, height: 96 }}
                            contentFit="contain"
                            transition={120}
                            cachePolicy="disk"
                            onLoadStart={() => setHeroImgLoading(true)}
                            onLoad={() => setHeroImgLoading(false)}
                            onError={onHeroError}
                          />
                          {heroImgLoading ? (
                            <View
                              style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                right: 0,
                                bottom: 0,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(217, 70, 239, 0.12)",
                                borderRadius: 18,
                              }}
                            >
                              <ActivityIndicator />
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                          <LocalIcon
                            source={null}
                            size={96}
                            roundedClassName="rounded-[22px]"
                            placeholderClassName="bg-fuchsia-950/16 border border-fuchsia-200/14"
                          />
                          <View style={{ position: "absolute", alignItems: "center" }}>
                            <Feather name="image" size={18} color="#f5d0fe" />
                            <Text className="text-fuchsia-100/60 text-[10px] mt-2">No image</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View className="flex-1 pl-3">
                  <BoutiqueTitle title={displayName} subtitle={subtitleLine || null} />

                  <View className="mt-3 flex-row justify-center items-center">
                    <Pressable
                      onPress={() => {
                        onToggleCollected();
                        onSetToOneIfNeeded();
                      }}
                      className={`px-3 py-2 rounded-full border ${
                        isCollected ? "bg-emerald-500/15 border-emerald-500/35" : "bg-violet-500/10 border-violet-200/18"
                      }`}
                    >
                      <Text className={`text-[12px] font-extrabold ${isCollected ? "text-emerald-100" : "text-fuchsia-100"}`}>
                        {isCollected ? "Owned" : "Not Owned"}
                      </Text>
                    </Pressable>

                    {isCollected ? (
                      <View className="flex-row items-center ml-3">
                        <Pressable
                          onPress={onDec}
                          className="w-9 h-9 rounded-2xl bg-fuchsia-950/12 border border-fuchsia-200/14 items-center justify-center"
                        >
                          <Text className="text-fuchsia-50 text-[16px] font-bold">−</Text>
                        </Pressable>

                        <View className="px-3">
                          <Text className="text-[14px] text-fuchsia-50 font-semibold text-center">{count}</Text>
                          <Text className="text-[10px] text-fuchsia-100/60 text-center">owned</Text>
                        </View>

                        <Pressable
                          onPress={onInc}
                          className="w-9 h-9 rounded-2xl bg-fuchsia-950/12 border border-fuchsia-200/14 items-center justify-center"
                        >
                          <Text className="text-fuchsia-50 text-[16px] font-bold">+</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <StylistNote label="Mabel" value={notes || null} />
            </BoutiqueCard>
          </View>

          <BoutiqueSectionLabel>Overview</BoutiqueSectionLabel>
          <BoutiqueCard>
            <BoutiqueChip label="Category" value={category} />
            <BoutiqueChip label="Seasonality" value={seasonality} />
            <BoutiqueChip label="Version Added" value={versionAdded} />
            <BoutiqueChip label="Villager Equip" value={villEquip} />
          </BoutiqueCard>

          <BoutiqueSectionLabel>Pricing</BoutiqueSectionLabel>
          <BoutiqueCard>
            <BoutiqueChip label="Sell" value={sell ? `${sell} Bells` : null} />
            <BoutiqueChip label="Buy" value={buy} />
          </BoutiqueCard>

          {(labelThemes || styles) ? (
            <>
              <BoutiqueSectionLabel>Style</BoutiqueSectionLabel>
              <BoutiqueCard>
                <BoutiqueChip label="Label Themes" value={labelThemes} />
                <BoutiqueChip label="Styles" value={styles} />
              </BoutiqueCard>
            </>
          ) : null}

          {availabilityFrom ? (
            <>
              <BoutiqueSectionLabel>Availability</BoutiqueSectionLabel>
              <BoutiqueCard>
                <BoutiqueChip label="From" value={availabilityFrom} />
              </BoutiqueCard>
            </>
          ) : null}

          {category ? (
            <>
              <BoutiqueSectionLabel>Related</BoutiqueSectionLabel>
              <BoutiqueCard>
                <View className="flex-row items-center justify-between">
                  {relatedLoading ? <ActivityIndicator /> : null}
                </View>

                {!relatedLoading && related.length === 0 ? (
                  <Text className="mt-2 text-[11px] text-fuchsia-100/45">No related clothing found.</Text>
                ) : relatedLoading ? (
                  <Text className="mt-2 text-[11px] text-fuchsia-100/45">Loading related…</Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap">
                    {related.map((r, idx) => {
                      const name = String(r?.name ?? "").trim();
                      if (!name) return null;

                      const imgs = liteImageCandidates(r);
                      const img = imgs[0] ?? null;

                      return (
                        <View key={`${name}::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goRelated(name)}
                            className="rounded-[26px] p-3 border items-center border-fuchsia-200/14 bg-fuchsia-900/10"
                          >
                            <View
                              style={{
                                width: 68,
                                height: 68,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 18,
                                backgroundColor: "rgba(217, 70, 239, 0.10)",
                                borderWidth: 1,
                                borderColor: "rgba(248, 208, 254, 0.16)",
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
                                <View style={{ width: 68, height: 68, alignItems: "center", justifyContent: "center" }}>
                                  <LocalIcon
                                    source={null}
                                    size={68}
                                    roundedClassName="rounded-2xl"
                                    placeholderClassName="bg-fuchsia-950/16 border border-fuchsia-200/14"
                                  />
                                  <View style={{ position: "absolute" }}>
                                    <Feather name="image" size={18} color="#f5d0fe" />
                                  </View>
                                </View>
                              )}
                            </View>

                            <Text className="text-[11px] font-semibold text-fuchsia-50 text-center mt-2" numberOfLines={2}>
                              {name}
                            </Text>

                            <Text className="text-[10px] text-fuchsia-100/60 mt-1" numberOfLines={1}>
                              {category}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </BoutiqueCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
