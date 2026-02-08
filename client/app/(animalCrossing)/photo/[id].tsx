// client/app/(animalCrossing)/photos/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchPhotoByName,
  fetchPhotosIndex,
  warmPhotosIndex,
  type NookipediaPhotoItem,
} from "@/lib/animalCrossing/nookipediaPhotos";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";

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

function buildPhotoImageCandidates(item?: NookipediaPhotoItem | null): string[] {
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

/* -----------------------------
   “Photo” theme UI (gold/sepia)
------------------------------ */

function PhotoSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-amber-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-amber-100/90">{children}</Text>
    </View>
  );
}

function PhotoCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-amber-950/16 border border-amber-200/14 p-4 overflow-hidden">
      {/* soft blobs */}
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-amber-300/10" />
      <View className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-orange-300/10" />
      {/* dust specks */}
      <View className="absolute top-10 left-8 w-3 h-3 rounded-full bg-yellow-200/10" />
      <View className="absolute top-16 left-14 w-2 h-2 rounded-full bg-yellow-200/10" />
      <View className="absolute bottom-14 right-12 w-3 h-3 rounded-full bg-yellow-200/10" />
      {children}
    </View>
  );
}

function PhotoTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-amber-900/18 border border-amber-200/16">
        <Text className="text-[16px] font-extrabold text-amber-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-amber-100/75 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function PhotoChip({ label, value }: { label: string; value?: any }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-amber-200">•</Text>
        </View>
        <Text className="text-[11px] text-amber-100/85">{label}</Text>
      </View>
      <Text className="text-[11px] text-amber-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function PhotoNote({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-amber-900/14 border border-amber-200/14 px-4 py-3">
        <Text className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-amber-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-amber-200/14" />
    </View>
  );
}

export default function PhotoDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const photoName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  // ✅ collection store wiring (so "is collected" + count works)
  const key = useMemo(() => `photo:${String(photoName ?? "").trim()}`, [photoName]);
  const entry = useAnimalCrossingCollectionStore((s: any) => s.entries?.[key] ?? null);

  const toggleCollected = useAnimalCrossingCollectionStore((s: any) => s.toggleCollected);
  const incrementCount = useAnimalCrossingCollectionStore((s: any) => s.incrementCount);
  const decrementCount = useAnimalCrossingCollectionStore((s: any) => s.decrementCount);
  const setCount = useAnimalCrossingCollectionStore((s: any) => s.setCount);

  const isCollected = !!entry?.collected;
  const count = Math.max(Number(entry?.count || 0), 0);

  const onToggleCollected = useCallback(() => {
    toggleCollected("photo", photoName);
  }, [toggleCollected, photoName]);

  const onInc = useCallback(() => {
    incrementCount("photo", photoName);
  }, [incrementCount, photoName]);

  const onDec = useCallback(() => {
    decrementCount("photo", photoName);
  }, [decrementCount, photoName]);

  const onSetToOneIfNeeded = useCallback(() => {
    if (!isCollected || count <= 0) setCount("photo", photoName, 1);
  }, [isCollected, count, setCount, photoName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaPhotoItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroLoading, setHeroLoading] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaPhotoItem[]>([]);

  useEffect(() => {
    void warmPhotosIndex();
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

        let fetched: NookipediaPhotoItem | null = null;

        try {
          const x = await fetchPhotoByName(photoName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setItem(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchPhotoByName(photoName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setItem(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        const myCategory = asNonEmptyString((fetched as any)?.category);
        const myName = String((fetched as any)?.name ?? photoName).trim().toLowerCase();

        if (myCategory) {
          setRelatedLoading(true);

          try {
            const index = await fetchPhotosIndex();
            if (cancelled) return;

            const filtered = index.filter((x: any) => {
              const n = String(x?.name ?? "").trim().toLowerCase();
              if (!n || n === myName) return false;

              const cat = asNonEmptyString(x?.category);
              return !!cat && cat === myCategory;
            });

            filtered.sort((a: any, b: any) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")));
            setRelated(filtered.slice(0, 24));
          } catch (e2) {
            console.warn("Related photos index failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load photo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photoName]);

  const displayName = item?.name ? String(item.name) : photoName;

  const candidates = useMemo(() => buildPhotoImageCandidates(item), [item]);
  const heroUri = candidates[heroCandidateIndex] ?? null;

  useEffect(() => {
    setHeroCandidateIndex(0);
  }, [candidates.length]);

  useEffect(() => {
    if (!heroUri) return;
    ExpoImage.prefetch(heroUri).catch(() => {});
  }, [heroUri]);

  const onHeroError = useCallback(() => {
    setHeroLoading(false);
    if (heroCandidateIndex + 1 < candidates.length) setHeroCandidateIndex((i) => i + 1);
  }, [heroCandidateIndex, candidates.length]);

  const category = asNonEmptyString((item as any)?.category);
  const sell = formatBells((item as any)?.sell);

  const customizable =
    (item as any)?.customizable != null ? (String((item as any).customizable) === "true" ? "Yes" : "No") : null;

  const customBody = asNonEmptyString((item as any)?.custom_body_part);
  const interactable =
    (item as any)?.interactable != null ? (String((item as any).interactable) === "true" ? "Yes" : "No") : null;

  const versionAdded = asNonEmptyString((item as any)?.version_added);

  const gridW = (item as any)?.grid_width != null ? String((item as any).grid_width) : null;
  const gridL = (item as any)?.grid_length != null ? String((item as any).grid_length) : null;
  const gridSize = gridW && gridL ? `${gridW} × ${gridL}` : null;

  const variationCount = Array.isArray((item as any)?.variations) ? String((item as any).variations.length) : null;

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
  const vars: any[] = Array.isArray((item as any)?.variations) ? (item as any).variations : [];

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (category) parts.push(category);
    if (gridSize) parts.push(`Grid: ${gridSize}`);
    if (variationCount) parts.push(`${variationCount} variations`);
    return parts.join(" • ");
  }, [category, gridSize, variationCount]);

  const goRelated = useCallback(
    (name: string) => {
      router.push({ pathname: "/photos/[id]", params: { id: encodeURIComponent(name) } } as any);
    },
    [router]
  );

  const showMainSpinner = loading || (category && relatedLoading);

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Photos" headerLayout="inline">
      {showMainSpinner ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-amber-100/80">{loading ? "Loading…" : "Loading related…"}</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          {/* HERO / “Photo Album” */}
          <View className="mt-4">
            <PhotoCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-amber-500/12 border border-amber-200/16 items-center justify-center">
                    <Feather name="camera" size={16} color="#fde68a" />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-amber-100/75 uppercase">
                    Photo Album
                  </Text>
                </View>

                {category ? (
                  <View className="px-3 py-2 rounded-full bg-amber-900/16 border border-amber-200/14">
                    <Text className="text-[11px] font-extrabold text-amber-50">{category}</Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row">
                {/* portrait */}
                <View className="w-[132px]">
                  <View className="rounded-[26px] bg-amber-900/10 border border-amber-200/14 p-3 items-center justify-center">
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
                                backgroundColor: "rgba(245, 158, 11, 0.10)",
                                borderRadius: 18,
                              }}
                            >
                              <ActivityIndicator />
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                          <Feather name="image" size={18} color="#fde68a" />
                          <Text className="text-amber-100/60 text-[10px] mt-2">No image</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* title + collected */}
                <View className="flex-1 pl-3">
                  <PhotoTitle title={displayName} subtitle={subtitleLine || null} />

                  {/* ✅ Collected status + count controls */}
                  <View className="mt-3 items-center">
                    <Pressable
                      onPress={() => {
                        onToggleCollected();
                        onSetToOneIfNeeded();
                      }}
                      className={`px-4 py-2 rounded-full border ${
                        isCollected ? "bg-emerald-500/12 border-emerald-200/20" : "bg-amber-900/10 border-amber-200/14"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-extrabold tracking-[0.08em] ${
                          isCollected ? "text-emerald-100" : "text-amber-50"
                        }`}
                      >
                        {isCollected ? "COLLECTED" : "COLLECT"}
                      </Text>
                    </Pressable>

                    {isCollected ? (
                      <View className="mt-3 flex-row items-center">
                        <Pressable
                          onPress={onDec}
                          className="w-9 h-9 rounded-2xl bg-amber-900/10 border border-amber-200/14 items-center justify-center"
                        >
                          <Text className="text-amber-50 text-[16px] font-bold">−</Text>
                        </Pressable>

                        <View className="px-4 items-center">
                          <Text className="text-[16px] text-amber-50 font-extrabold">{count}</Text>
                          <Text className="text-[10px] text-amber-100/60 font-bold tracking-[0.14em] uppercase">
                            owned
                          </Text>
                        </View>

                        <Pressable
                          onPress={onInc}
                          className="w-9 h-9 rounded-2xl bg-amber-900/10 border border-amber-200/14 items-center justify-center"
                        >
                          <Text className="text-amber-50 text-[16px] font-bold">+</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {thumbUsed !== THUMB_PRIMARY ? (
                      <Text className="mt-2 text-[10px] text-amber-100/50">Loaded thumb {thumbUsed}</Text>
                    ) : null}
                  </View>
                </View>
              </View>

              <PhotoNote label="Isabelle" value={notes || null} />
            </PhotoCard>
          </View>

          <PhotoSectionLabel>Overview</PhotoSectionLabel>
          <PhotoCard>
            <PhotoChip label="Category" value={category} />
            <PhotoChip label="Customizable" value={customizable} />
            <PhotoChip label="Custom Part" value={customBody} />
            <PhotoChip label="Interactable" value={interactable} />
            <PhotoChip label="Grid Size" value={gridSize} />
            <PhotoChip label="Variations" value={variationCount} />
            <PhotoChip label="Version Added" value={versionAdded} />
          </PhotoCard>

          <PhotoSectionLabel>Pricing</PhotoSectionLabel>
          <PhotoCard>
            <PhotoChip label="Sell" value={sell ? `${sell} Bells` : null} />
            <PhotoChip label="Buy" value={buy} />
          </PhotoCard>

          {availabilityFrom ? (
            <>
              <PhotoSectionLabel>Availability</PhotoSectionLabel>
              <PhotoCard>
                <PhotoChip label="From" value={availabilityFrom} />
              </PhotoCard>
            </>
          ) : null}

          {vars.length ? (
            <>
              <PhotoSectionLabel>Variations</PhotoSectionLabel>
              <PhotoCard>
                <View className="flex-row flex-wrap">
                  {vars.map((v, idx) => {
                    const vName = asNonEmptyString(v?.variation) ?? `Variation ${idx + 1}`;
                    const img = asNonEmptyString(v?.image_url);
                    const colors = Array.isArray(v?.colors) ? v.colors.join(" • ") : null;
                    if (img) ExpoImage.prefetch(img).catch(() => {});

                    return (
                      <View key={`${vName}::${idx}`} className="w-1/2 p-1">
                        <View className="rounded-[26px] p-3 border items-center border-amber-200/14 bg-amber-900/10">
                          <View
                            style={{
                              width: 72,
                              height: 72,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 18,
                              backgroundColor: "rgba(245, 158, 11, 0.10)",
                              borderWidth: 1,
                              borderColor: "rgba(253, 230, 138, 0.14)",
                            }}
                          >
                            {img ? (
                              <ExpoImage
                                source={{ uri: img }}
                                style={{ width: 68, height: 68 }}
                                contentFit="contain"
                                transition={120}
                                cachePolicy="disk"
                              />
                            ) : (
                              <Feather name="image" size={18} color="#fde68a" />
                            )}
                          </View>

                          <Text className="text-[11px] font-semibold text-amber-50 text-center mt-2" numberOfLines={2}>
                            {vName}
                          </Text>

                          {colors ? (
                            <Text className="text-[10px] text-amber-100/60 mt-1" numberOfLines={1}>
                              {colors}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </PhotoCard>
            </>
          ) : null}

          {category ? (
            <>
              <PhotoSectionLabel>Related</PhotoSectionLabel>
              <PhotoCard>
                {related.length === 0 ? (
                  <Text className="mt-2 text-[11px] text-amber-100/45">No related photos found.</Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap">
                    {related.map((r, idx) => {
                      const name = String((r as any)?.name ?? "").trim();
                      if (!name) return null;

                      const imgs = buildPhotoImageCandidates(r);
                      const img = imgs[0] ?? null;
                      if (img) ExpoImage.prefetch(img).catch(() => {});

                      return (
                        <View key={`${name}::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goRelated(name)}
                            className="rounded-[26px] p-3 border items-center border-amber-200/14 bg-amber-900/10"
                          >
                            <View
                              style={{
                                width: 68,
                                height: 68,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 18,
                                backgroundColor: "rgba(245, 158, 11, 0.10)",
                                borderWidth: 1,
                                borderColor: "rgba(253, 230, 138, 0.14)",
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
                                <Feather name="image" size={18} color="#fde68a" />
                              )}
                            </View>

                            <Text className="text-[11px] font-semibold text-amber-50 text-center mt-2" numberOfLines={2}>
                              {name}
                            </Text>

                            <Text className="text-[10px] text-amber-100/60 mt-1" numberOfLines={1}>
                              {category}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </PhotoCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
