// app/animalCrossing/items/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchItemByName,
  fetchItemsIndex,
  warmItemsIndex,
  type NookipediaItem,
} from "@/lib/animalCrossing/nookipediaItems";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";

const THUMB_PRIMARY = 256;
const THUMB_FALLBACK = 128;

function asNonEmptyString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
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

function buildItemHeroCandidates(item?: NookipediaItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any)?.image_url, (item as any)?.render_url]);
}

/* -----------------------------
   “Item” theme UI (leaf/green)
------------------------------ */

function ItemSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-emerald-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-emerald-100/90">
        {children}
      </Text>
    </View>
  );
}

function ItemCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-emerald-950/18 border border-emerald-200/14 p-4 overflow-hidden">
      {/* soft blobs */}
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-300/10" />
      <View className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-lime-300/10" />
      {/* tiny “pollen” */}
      <View className="absolute top-10 left-8 w-3 h-3 rounded-full bg-lime-200/10" />
      <View className="absolute top-16 left-14 w-2 h-2 rounded-full bg-lime-200/10" />
      <View className="absolute bottom-14 right-12 w-3 h-3 rounded-full bg-lime-200/10" />
      {children}
    </View>
  );
}

function ItemTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-emerald-900/16 border border-emerald-200/16">
        <Text className="text-[16px] font-extrabold text-emerald-50 text-center">{title}</Text>
      </View>
      {subtitle ? (
        <Text className="mt-2 text-[11px] text-emerald-100/75 text-center">{subtitle}</Text>
      ) : null}
    </View>
  );
}

function ItemChip({ label, value }: { label: string; value?: any }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-emerald-200">•</Text>
        </View>
        <Text className="text-[11px] text-emerald-100/85">{label}</Text>
      </View>
      <Text className="text-[11px] text-emerald-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function ItemNote({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-emerald-900/14 border border-emerald-200/14 px-4 py-3">
        <Text className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-emerald-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-emerald-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-emerald-200/14" />
    </View>
  );
}

function CollectedPill({
  isCollected,
  count,
  onToggle,
  onInc,
  onDec,
}: {
  isCollected: boolean;
  count: number;
  onToggle: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <View className="mt-3 items-center">
      <Pressable
        onPress={onToggle}
        className={`px-4 py-2 rounded-full border ${
          isCollected ? "bg-emerald-500/14 border-emerald-200/20" : "bg-emerald-900/14 border-emerald-200/14"
        }`}
      >
        <Text
          className={`text-[11px] font-extrabold tracking-[0.08em] ${
            isCollected ? "text-emerald-100" : "text-emerald-50"
          }`}
        >
          {isCollected ? "COLLECTED" : "COLLECT"}
        </Text>
      </Pressable>

      {isCollected ? (
        <View className="mt-3 flex-row items-center">
          <Pressable
            onPress={onDec}
            className="w-9 h-9 rounded-2xl bg-emerald-900/14 border border-emerald-200/14 items-center justify-center"
          >
            <Text className="text-emerald-50 text-[16px] font-bold">−</Text>
          </Pressable>

          <View className="px-4 items-center">
            <Text className="text-[16px] text-emerald-50 font-extrabold">{count}</Text>
            <Text className="text-[10px] text-emerald-100/60 font-extrabold tracking-[0.14em] uppercase">owned</Text>
          </View>

          <Pressable
            onPress={onInc}
            className="w-9 h-9 rounded-2xl bg-emerald-900/14 border border-emerald-200/14 items-center justify-center"
          >
            <Text className="text-emerald-50 text-[16px] font-bold">+</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const itemName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  // collection store
  const key = useMemo(() => `item:${String(itemName ?? "").trim()}`, [itemName]);
  const entry = useAnimalCrossingCollectionStore((s: any) => s.entries?.[key] ?? null);

  const toggleCollected = useAnimalCrossingCollectionStore((s: any) => s.toggleCollected);
  const incrementCount = useAnimalCrossingCollectionStore((s: any) => s.incrementCount);
  const decrementCount = useAnimalCrossingCollectionStore((s: any) => s.decrementCount);
  const setCount = useAnimalCrossingCollectionStore((s: any) => s.setCount);

  const isCollected = !!entry?.collected;
  const count = Math.max(Number(entry?.count || 0), 0);

  const onToggleCollected = useCallback(() => {
    toggleCollected("item", itemName);
    if (!isCollected && count <= 0) setCount("item", itemName, 1);
  }, [toggleCollected, setCount, itemName, isCollected, count]);

  const onInc = useCallback(() => incrementCount("item", itemName), [incrementCount, itemName]);
  const onDec = useCallback(() => decrementCount("item", itemName), [decrementCount, itemName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroLoading, setHeroLoading] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaItem[]>([]);

  useEffect(() => {
    void warmItemsIndex();
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

        let fetched: NookipediaItem | null = null;

        try {
          const x = await fetchItemByName(itemName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setItem(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchItemByName(itemName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setItem(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        const myType = asNonEmptyString((fetched as any)?.material_type);
        const myName = String((fetched as any)?.name ?? itemName).trim().toLowerCase();

        if (myType) {
          setRelatedLoading(true);

          try {
            const index = await fetchItemsIndex();
            if (cancelled) return;

            const filtered = index.filter((x: any) => {
              const n = String(x?.name ?? "").trim().toLowerCase();
              if (!n || n === myName) return false;

              const t = asNonEmptyString(x?.material_type);
              return !!t && t === myType;
            });

            filtered.sort((a: any, b: any) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")));
            setRelated(filtered.slice(0, 24));
          } catch (e2) {
            console.warn("Related items index failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load item.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [itemName]);

  const displayName = item?.name ? String(item.name) : itemName;

  const heroCandidates = useMemo(() => buildItemHeroCandidates(item), [item]);
  const heroUri = heroCandidates[heroCandidateIndex] ?? null;

  useEffect(() => setHeroCandidateIndex(0), [heroCandidates.length]);

  useEffect(() => {
    if (!heroUri) return;
    ExpoImage.prefetch(heroUri).catch(() => {});
  }, [heroUri]);

  const onHeroError = useCallback(() => {
    setHeroLoading(false);
    if (heroCandidateIndex + 1 < heroCandidates.length) setHeroCandidateIndex((i) => i + 1);
  }, [heroCandidateIndex, heroCandidates.length]);

  const stack = (item as any)?.stack != null ? String((item as any).stack) : null;
  const sell = formatBells((item as any)?.sell);

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

  const materialType = asNonEmptyString((item as any)?.material_type);
  const seasonality = asNonEmptyString((item as any)?.material_seasonality);

  const edible = (item as any)?.edible != null ? (String((item as any).edible) === "true" ? "Yes" : "No") : null;
  const isFence = (item as any)?.is_fence != null ? (String((item as any).is_fence) === "true" ? "Yes" : "No") : null;

  const plantType = asNonEmptyString((item as any)?.plant_type);
  const versionAdded = asNonEmptyString((item as any)?.version_added);

  const availabilityFrom = joinList(
    Array.isArray((item as any)?.availability)
      ? (item as any).availability.map((a: any) => a?.from).filter(Boolean)
      : [],
    " • "
  );

  const notes = asNonEmptyString((item as any)?.notes);

  const showMainSpinner = loading || (materialType && relatedLoading);

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (materialType) parts.push(materialType);
    if (seasonality) parts.push(seasonality);
    if (stack) parts.push(`Stack: ${stack}`);
    return parts.join(" • ");
  }, [materialType, seasonality, stack]);

  const goRelated = useCallback(
    (name: string) => {
      router.push({ pathname: "/items/[id]", params: { id: encodeURIComponent(name) } } as any);
    },
    [router]
  );

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Items" headerLayout="inline">
      {showMainSpinner ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-emerald-100/80">{loading ? "Loading…" : "Loading related…"}</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          {/* HERO / “Pocket Items” */}
          <View className="mt-4">
            <ItemCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-emerald-500/12 border border-emerald-200/16 items-center justify-center">
                    <Feather name="package" size={16} color="#a7f3d0" />
                  </View>
                  <Text className="ml-2 text-[11px] font-extrabold tracking-[0.14em] text-emerald-100/75 uppercase">
                    Pocket Items
                  </Text>
                </View>

                {materialType ? (
                  <View className="px-3 py-2 rounded-full bg-emerald-900/16 border border-emerald-200/14">
                    <Text className="text-[11px] font-extrabold text-emerald-50">{materialType}</Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row">
                {/* portrait */}
                <View className="w-[132px]">
                  <View className="rounded-[26px] bg-emerald-900/10 border border-emerald-200/14 p-3 items-center justify-center">
                    <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                      {heroUri ? (
                        <>
                          <ExpoImage
                            source={{ uri: heroUri }}
                            style={{ width: 96, height: 96 }}
                            contentFit="contain"
                            transition={120}
                            cachePolicy="disk"
                            onLoadStart={() => setHeroLoading(true)}
                            onLoad={() => setHeroLoading(false)}
                            onError={onHeroError}
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
                                backgroundColor: "rgba(16, 185, 129, 0.10)",
                                borderRadius: 18,
                              }}
                            >
                              <ActivityIndicator />
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                          <Feather name="image" size={18} color="#a7f3d0" />
                          <Text className="text-emerald-100/60 text-[10px] mt-2">No image</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* title + collected */}
                <View className="flex-1 pl-3">
                  <ItemTitle title={displayName} subtitle={subtitleLine || null} />
                  <CollectedPill isCollected={isCollected} count={count} onToggle={onToggleCollected} onInc={onInc} onDec={onDec} />
                  {thumbUsed !== THUMB_PRIMARY ? (
                    <Text className="mt-3 text-[10px] text-emerald-100/45 text-center">Loaded thumb {thumbUsed}</Text>
                  ) : null}
                </View>
              </View>

              <ItemNote label="Isabelle" value={notes || null} />
            </ItemCard>
          </View>

          <ItemSectionLabel>Overview</ItemSectionLabel>
          <ItemCard>
            <ItemChip label="Stack" value={stack} />
            <ItemChip label="Material Type" value={materialType} />
            <ItemChip label="Seasonality" value={seasonality} />
            <ItemChip label="Edible" value={edible} />
            <ItemChip label="Is Fence" value={isFence} />
            <ItemChip label="Plant Type" value={plantType} />
            <ItemChip label="Version Added" value={versionAdded} />
          </ItemCard>

          <ItemSectionLabel>Pricing</ItemSectionLabel>
          <ItemCard>
            <ItemChip label="Sell" value={sell ? `${sell} Bells` : null} />
            <ItemChip label="Buy" value={buy} />
          </ItemCard>

          {availabilityFrom ? (
            <>
              <ItemSectionLabel>Availability</ItemSectionLabel>
              <ItemCard>
                <ItemChip label="From" value={availabilityFrom} />
              </ItemCard>
            </>
          ) : null}

          {materialType ? (
            <>
              <ItemSectionLabel>Related</ItemSectionLabel>
              <ItemCard>
                {related.length === 0 ? (
                  <Text className="mt-2 text-[11px] text-emerald-100/45">No related items found.</Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap">
                    {related.map((r, idx) => {
                      const name = String((r as any)?.name ?? "").trim();
                      if (!name) return null;

                      const img = asNonEmptyString((r as any)?.image_url);
                      if (img) ExpoImage.prefetch(img).catch(() => {});

                      return (
                        <View key={`${name}::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goRelated(name)}
                            className="rounded-[26px] p-3 border items-center border-emerald-200/14 bg-emerald-900/10"
                          >
                            <View
                              style={{
                                width: 68,
                                height: 68,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 18,
                                backgroundColor: "rgba(16, 185, 129, 0.10)",
                                borderWidth: 1,
                                borderColor: "rgba(167, 243, 208, 0.14)",
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
                                <Feather name="image" size={18} color="#a7f3d0" />
                              )}
                            </View>

                            <Text className="text-[11px] font-semibold text-emerald-50 text-center mt-2" numberOfLines={2}>
                              {name}
                            </Text>

                            <Text className="text-[10px] text-emerald-100/60 mt-1" numberOfLines={1}>
                              {materialType}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ItemCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
