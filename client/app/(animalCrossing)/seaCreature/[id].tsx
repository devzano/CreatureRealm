// app/animalCrossing/sea/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchSeaCreatureByName,
  fetchSeaCreatureIndex,
  warmSeaCreatureIndex,
  type NookipediaSeaCreatureItem,
  type NookipediaHemisphereAvailability,
} from "@/lib/animalCrossing/nookipediaSeaCreatures";

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

function buildSeaImageCandidates(item?: NookipediaSeaCreatureItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any)?.image_url, (item as any)?.render_url]);
}

function monthName(m: number) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[m - 1] ?? String(m);
}

/* -----------------------------
   Water “Crossy” UI pieces
------------------------------ */

function OceanSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-sky-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-sky-100/90">{children}</Text>
    </View>
  );
}

function OceanCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-sky-950/30 border border-sky-500/20 p-4 overflow-hidden">
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-sky-300/10" />
      <View className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-cyan-300/10" />
      <View className="absolute top-10 left-8 w-3 h-3 rounded-full bg-sky-100/10" />
      <View className="absolute top-16 left-14 w-2 h-2 rounded-full bg-sky-100/10" />
      <View className="absolute bottom-14 right-12 w-3 h-3 rounded-full bg-sky-100/10" />
      {children}
    </View>
  );
}

function LogTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-amber-900/28 border border-amber-200/18">
        <Text className="text-[16px] font-extrabold text-amber-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-sky-100/80 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function OceanChip({ label, value }: { label: string; value?: any }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-sky-200">•</Text>
        </View>
        <Text className="text-[11px] text-sky-100/90">{label}</Text>
      </View>
      <Text className="text-[11px] text-sky-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function BubbleNote({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-sky-900/18 border border-sky-500/18 px-4 py-3">
        <Text className="text-[10px] font-bold tracking-[0.14em] uppercase text-sky-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-sky-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-sky-500/18" />
    </View>
  );
}

function AvailabilityCard({
  title,
  data,
}: {
  title: string;
  data?: NookipediaHemisphereAvailability | null;
}) {
  const months = asNonEmptyString((data as any)?.months);
  const ranges = Array.isArray((data as any)?.availability_array) ? (data as any).availability_array : [];
  const timesByMonth =
    (data as any)?.times_by_month && typeof (data as any).times_by_month === "object" ? (data as any).times_by_month : null;

  const hasAny = !!months || ranges.length > 0 || (timesByMonth && Object.keys(timesByMonth).length > 0);

  return (
    <View className="mt-4">
      <Text className="text-[11px] text-sky-100/70">{title}</Text>

      {!hasAny ? (
        <Text className="text-[11px] text-sky-200/40 mt-2">No availability data found.</Text>
      ) : (
        <>
          {months ? <Text className="text-[12px] text-sky-50 mt-2">{months}</Text> : null}

          {ranges.length ? (
            <View className="mt-3">
              <Text className="text-[11px] text-sky-100/70">Ranges</Text>
              <View className="mt-2">
                {ranges.map((r: any, idx: number) => {
                  const m = asNonEmptyString(r?.months) ?? "—";
                  const t = asNonEmptyString(r?.time) ?? "—";
                  return (
                    <View key={`${idx}:${m}:${t}`} className="flex-row items-start justify-between py-1">
                      <Text className="text-[11px] text-sky-50 flex-1 mr-3">{m}</Text>
                      <Text className="text-[11px] text-sky-100/70 text-right">{t}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {timesByMonth ? (
            <View className="mt-3">
              <Text className="text-[11px] text-sky-100/70">Times by Month</Text>
              <View className="mt-2 flex-row flex-wrap">
                {Array.from({ length: 12 }).map((_, i) => {
                  const monthNum = i + 1;
                  const key = String(monthNum);
                  const v = asNonEmptyString((timesByMonth as any)[key]) ?? "NA";
                  const isNA = v.toUpperCase() === "NA";

                  return (
                    <View key={key} className="w-1/3 p-1">
                      <View
                        className={`rounded-2xl border p-2 ${
                          isNA ? "border-sky-800/30 bg-sky-950/20" : "border-sky-500/20 bg-sky-900/15"
                        }`}
                      >
                        <Text className="text-[10px] text-sky-100/60">{monthName(monthNum)}</Text>
                        <Text className={`text-[11px] mt-1 ${isNA ? "text-sky-200/30" : "text-sky-50"}`} numberOfLines={2}>
                          {v}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

export default function SeaCreatureDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const seaName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  // ✅ COLLECTION (matches fish)
  // If your store category is not "sea", change it here + in 3 other places below.
  const key = useMemo(() => `sea:${String(seaName ?? "").trim()}`, [seaName]);
  const entry = useAnimalCrossingCollectionStore((s: any) => s.entries?.[key] ?? null);

  const toggleCollected = useAnimalCrossingCollectionStore((s: any) => s.toggleCollected);
  const incrementCount = useAnimalCrossingCollectionStore((s: any) => s.incrementCount);
  const decrementCount = useAnimalCrossingCollectionStore((s: any) => s.decrementCount);
  const setCount = useAnimalCrossingCollectionStore((s: any) => s.setCount);

  const isCollected = !!entry?.collected;
  const count = Math.max(Number(entry?.count || 0), 0);

  const onToggleCollected = useCallback(() => {
    toggleCollected("sea", seaName);
  }, [toggleCollected, seaName]);

  const onInc = useCallback(() => {
    incrementCount("sea", seaName);
  }, [incrementCount, seaName]);

  const onDec = useCallback(() => {
    decrementCount("sea", seaName);
  }, [decrementCount, seaName]);

  const onSetToOneIfNeeded = useCallback(() => {
    if (!isCollected || count <= 0) setCount("sea", seaName, 1);
  }, [isCollected, count, setCount, seaName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sea, setSea] = useState<NookipediaSeaCreatureItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroLoading, setHeroLoading] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaSeaCreatureItem[]>([]);

  useEffect(() => {
    void warmSeaCreatureIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setSea(null);
        setHeroCandidateIndex(0);

        setRelated([]);
        setRelatedLoading(false);

        let fetched: NookipediaSeaCreatureItem | null = null;

        try {
          const x = await fetchSeaCreatureByName(seaName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setSea(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchSeaCreatureByName(seaName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setSea(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        const myShadowSize = asNonEmptyString((fetched as any)?.shadow_size);
        const myName = String((fetched as any)?.name ?? seaName).trim().toLowerCase();

        if (myShadowSize) {
          setRelatedLoading(true);

          try {
            const index = await fetchSeaCreatureIndex();
            if (cancelled) return;

            const filtered = index.filter((x: any) => {
              const n = String(x?.name ?? "").trim().toLowerCase();
              if (!n || n === myName) return false;

              const shadow = asNonEmptyString(x?.shadow_size);
              return !!shadow && shadow === myShadowSize;
            });

            filtered.sort((a: any, b: any) => {
              const an = String(a?.name ?? "");
              const bn = String(b?.name ?? "");
              return an.localeCompare(bn);
            });

            setRelated(filtered.slice(0, 24));
          } catch (e2) {
            console.warn("Related sea creature index failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load sea creature.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seaName]);

  const displayName = sea?.name ? String(sea.name) : seaName;

  const candidates = useMemo(() => buildSeaImageCandidates(sea), [sea]);
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
    if (heroCandidateIndex + 1 < candidates.length) {
      setHeroCandidateIndex((i) => i + 1);
    }
  }, [heroCandidateIndex, candidates.length]);

  const number = sea?.number != null ? String(sea.number) : null;
  const shadowSize = asNonEmptyString((sea as any)?.shadow_size);
  const shadowMovement = asNonEmptyString((sea as any)?.shadow_movement);
  const rarity = asNonEmptyString(sea?.rarity);
  const totalCatch = (sea as any)?.total_catch != null ? String((sea as any).total_catch) : null;

  const sellNook = formatBells((sea as any)?.sell_nook);

  const tankW = (sea as any)?.tank_width != null ? String((sea as any).tank_width) : null;
  const tankL = (sea as any)?.tank_length != null ? String((sea as any).tank_length) : null;

  const catchphrases = joinList((sea as any)?.catchphrases);

  const needsRelated = !!shadowSize;
  const showMainSpinner = loading || (needsRelated && relatedLoading);

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (shadowSize) parts.push(`Shadow: ${shadowSize}`);
    if (rarity) parts.push(rarity);
    return parts.join(" • ");
  }, [shadowSize, rarity]);

  const goRelated = useCallback(
    (name: string) => {
      router.push({
        pathname: "/sea/[id]",
        params: { id: encodeURIComponent(name) },
      } as any);
    },
    [router]
  );

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Sea Creatures" headerLayout="inline">
      {showMainSpinner ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-sky-100/80">{loading ? "Loading…" : "Loading related…"}</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          {/* HERO / “Ocean Logbook” */}
          <View className="mt-4">
            <OceanCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-sky-500/12 border border-sky-500/22 items-center justify-center">
                    <Feather name="droplet" size={16} color="#bae6fd" />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-sky-100/75 uppercase">
                    Ocean Logbook
                  </Text>
                </View>

                {number ? (
                  <View className="px-3 py-2 rounded-full bg-sky-900/18 border border-sky-500/22">
                    <Text className="text-[11px] font-extrabold text-sky-50">#{number}</Text>
                  </View>
                ) : null}
              </View>

              <View>
                {/* TOP: Row with portrait + title + collected controls */}
                <View className="flex-row">
                  {/* portrait */}
                  <View className="w-[132px]">
                    <View className="rounded-[26px] bg-sky-900/18 border border-sky-500/18 p-3 items-center justify-center">
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
                                  backgroundColor: "rgba(2, 132, 199, 0.14)",
                                  borderRadius: 18,
                                }}
                              >
                                <ActivityIndicator />
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <View className="w-[96px] h-[96px] rounded-[22px] bg-sky-950/25 border border-sky-500/18 items-center justify-center">
                            <Feather name="image" size={18} color="#bae6fd" />
                            <Text className="text-sky-100/60 text-[10px] mt-2">No image</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* title + collected */}
                  <View className="flex-1 pl-3">
                    <LogTitle title={displayName} subtitle={subtitleLine || null} />

                    <View className="mt-2 flex-row justify-center items-center">
                      <Pressable
                        onPress={() => {
                          onToggleCollected();
                          onSetToOneIfNeeded();
                        }}
                        className={`px-3 py-2 rounded-full border ${
                          isCollected ? "bg-emerald-500/15 border-emerald-500/35" : "bg-amber-500/10 border-amber-300/25"
                        }`}
                      >
                        <Text className={`text-[12px] font-extrabold ${isCollected ? "text-emerald-100" : "text-amber-100"}`}>
                          {isCollected ? "Caught" : "Not Caught"}
                        </Text>
                      </Pressable>

                      {isCollected ? (
                        <View className="flex-row items-center ml-3">
                          <Pressable
                            onPress={onDec}
                            className="w-9 h-9 rounded-2xl bg-sky-950/25 border border-sky-500/18 items-center justify-center"
                          >
                            <Text className="text-sky-50 text-[16px] font-bold">−</Text>
                          </Pressable>

                          <View className="px-3">
                            <Text className="text-[14px] text-sky-50 font-semibold text-center">{count}</Text>
                            <Text className="text-[10px] text-sky-100/60 text-center">owned</Text>
                          </View>

                          <Pressable
                            onPress={onInc}
                            className="w-9 h-9 rounded-2xl bg-sky-950/25 border border-sky-500/18 items-center justify-center"
                          >
                            <Text className="text-sky-50 text-[16px] font-bold">+</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* BOTTOM: full-width catchphrases */}
                <View className="mt-3 w-full">
                  <BubbleNote label="Catchphrases" value={catchphrases} />
                </View>
              </View>
            </OceanCard>
          </View>

          <OceanSectionLabel>Overview</OceanSectionLabel>
          <OceanCard>
            <OceanChip label="Shadow Size" value={shadowSize} />
            <OceanChip label="Shadow Movement" value={shadowMovement} />
            <OceanChip label="Rarity" value={rarity} />
            <OceanChip label="Total Catch Needed" value={totalCatch} />
          </OceanCard>

          <OceanSectionLabel>Pricing</OceanSectionLabel>
          <OceanCard>
            <OceanChip label="Sell (Nook’s)" value={sellNook ? `${sellNook} Bells` : null} />
          </OceanCard>

          <OceanSectionLabel>Tank Size</OceanSectionLabel>
          <OceanCard>
            <OceanChip label="Width × Length" value={tankW && tankL ? `${tankW} × ${tankL}` : null} />
          </OceanCard>

          <OceanSectionLabel>Availability</OceanSectionLabel>
          <OceanCard>
            <AvailabilityCard title="Northern Hemisphere" data={(sea as any)?.north} />
            <AvailabilityCard title="Southern Hemisphere" data={(sea as any)?.south} />
          </OceanCard>

          {shadowSize ? (
            <>
              <OceanSectionLabel>Related</OceanSectionLabel>
              <OceanCard>
                {related.length === 0 ? (
                  <Text className="mt-2 text-[11px] text-sky-200/40">No related sea creatures found.</Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap">
                    {related.map((r, idx) => {
                      const name = String((r as any)?.name ?? "").trim();
                      if (!name) return null;

                      const imgs = buildSeaImageCandidates(r);
                      const img = imgs[0] ?? null;

                      if (img) ExpoImage.prefetch(img).catch(() => {});

                      return (
                        <View key={`${name}::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goRelated(name)}
                            className="rounded-[26px] p-3 border items-center border-sky-500/18 bg-sky-900/12"
                          >
                            <View
                              style={{
                                width: 68,
                                height: 68,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 18,
                                backgroundColor: "rgba(2, 132, 199, 0.10)",
                                borderWidth: 1,
                                borderColor: "rgba(56, 189, 248, 0.18)",
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
                                <Feather name="image" size={18} color="#bae6fd" />
                              )}
                            </View>

                            <Text className="text-[11px] font-semibold text-sky-50 text-center mt-2" numberOfLines={2}>
                              {name}
                            </Text>

                            <Text className="text-[10px] text-sky-100/60 mt-1" numberOfLines={1}>
                              {shadowSize}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </OceanCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
