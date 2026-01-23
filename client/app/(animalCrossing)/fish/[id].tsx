// app/fish/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchFishByName,
  fetchFishIndex,
  warmFishIndex,
  type NookipediaFishItem,
  type NookipediaHemisphereAvailability,
} from "@/lib/animalCrossing/nookipediaFish";
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

function StatRow({ label, value }: { label: string; value?: any }) {
  const v = value == null ? null : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-1">
      <Text className="text-[11px] text-slate-400">{label}</Text>
      <Text className="text-[11px] text-slate-200 text-right ml-3 flex-1">{v}</Text>
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

function monthName(m: number) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[m - 1] ?? String(m);
}

function AvailabilitySection({
  title,
  data,
}: {
  title: string;
  data?: NookipediaHemisphereAvailability | null;
}) {
  const months = asNonEmptyString(data?.months);
  const ranges = Array.isArray(data?.availability_array) ? data!.availability_array! : [];
  const timesByMonth =
    data?.times_by_month && typeof data.times_by_month === "object" ? data.times_by_month : null;

  const hasAny = !!months || ranges.length > 0 || (timesByMonth && Object.keys(timesByMonth).length > 0);

  return (
    <View className="mt-4">
      <Text className="text-[11px] text-slate-400">{title}</Text>

      {!hasAny ? (
        <Text className="text-[11px] text-slate-500 mt-2">No availability data found.</Text>
      ) : (
        <>
          {months ? <Text className="text-[12px] text-slate-200 mt-2">{months}</Text> : null}

          {ranges.length ? (
            <View className="mt-3">
              <Text className="text-[11px] text-slate-400">Ranges</Text>
              <View className="mt-2">
                {ranges.map((r: any, idx: number) => {
                  const m = asNonEmptyString(r?.months) ?? "—";
                  const t = asNonEmptyString(r?.time) ?? "—";
                  return (
                    <View key={`${idx}:${m}:${t}`} className="flex-row items-start justify-between py-1">
                      <Text className="text-[11px] text-slate-200 flex-1 mr-3">{m}</Text>
                      <Text className="text-[11px] text-slate-400 text-right">{t}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {timesByMonth ? (
            <View className="mt-3">
              <Text className="text-[11px] text-slate-400">Times by Month</Text>
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
                          isNA ? "border-slate-800 bg-slate-950/40" : "border-slate-700 bg-slate-900/70"
                        }`}
                      >
                        <Text className="text-[10px] text-slate-400">{monthName(monthNum)}</Text>
                        <Text
                          className={`text-[11px] mt-1 ${isNA ? "text-slate-600" : "text-slate-200"}`}
                          numberOfLines={2}
                        >
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

function buildFishImageCandidates(item?: NookipediaFishItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any).image_url, (item as any).render_url]);
}

export default function FishDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const fishName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const key = useMemo(() => `fish:${String(fishName ?? "").trim()}`, [fishName]);
  const entry = useAnimalCrossingCollectionStore((s: any) => (s.entries?.[key] ?? null));

  const toggleCollected = useAnimalCrossingCollectionStore((s: any) => s.toggleCollected);
  const incrementCount = useAnimalCrossingCollectionStore((s: any) => s.incrementCount);
  const decrementCount = useAnimalCrossingCollectionStore((s: any) => s.decrementCount);
  const setCount = useAnimalCrossingCollectionStore((s: any) => s.setCount);

  const isCollected = !!entry?.collected;
  const count = Math.max(Number(entry?.count || 0), 0);

  const onToggleCollected = useCallback(() => {
    toggleCollected("fish", fishName);
  }, [toggleCollected, fishName]);

  const onInc = useCallback(() => {
    incrementCount("fish", fishName);
  }, [incrementCount, fishName]);

  const onDec = useCallback(() => {
    decrementCount("fish", fishName);
  }, [decrementCount, fishName]);

  const onSetToOneIfNeeded = useCallback(() => {
    if (!isCollected || count <= 0) setCount("fish", fishName, 1);
  }, [isCollected, count, setCount, fishName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fish, setFish] = useState<NookipediaFishItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroFailed, setHeroFailed] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaFishItem[]>([]);

  // Warm fish index as soon as this page mounts (helps deep-links)
  useEffect(() => {
    void warmFishIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setFish(null);
        setHeroFailed(false);

        setRelated([]);
        setRelatedLoading(false);

        // 1) fetch detail (with thumb fallback)
        let fetched: NookipediaFishItem | null = null;

        try {
          const x = await fetchFishByName(fishName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setFish(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchFishByName(fishName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setFish(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        // 2) Related: same location (exact match)
        const myLoc = asNonEmptyString((fetched as any)?.location);
        const myName = String((fetched as any)?.name ?? fishName).trim().toLowerCase();

        if (myLoc) {
          setRelatedLoading(true);

          try {
            const index = await fetchFishIndex();
            if (cancelled) return;

            const myLocNorm = myLoc.trim().toLowerCase();

            const filtered = index.filter((x: any) => {
              const n = String(x?.name ?? "").trim().toLowerCase();
              if (!n || n === myName) return false;

              const loc = asNonEmptyString(x?.location);
              if (!loc) return false;

              return loc.trim().toLowerCase() === myLocNorm;
            });

            filtered.sort((a: any, b: any) => {
              const an = String(a?.name ?? "");
              const bn = String(b?.name ?? "");
              return an.localeCompare(bn);
            });

            setRelated(filtered.slice(0, 24));
          } catch (e2) {
            console.warn("Related fish index failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load fish.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fishName]);

  const displayName = fish?.name ? String(fish.name) : fishName;

  const candidates = useMemo(() => buildFishImageCandidates(fish), [fish]);
  const heroUri = !heroFailed ? (candidates[0] ?? null) : (candidates[1] ?? candidates[0] ?? null);

  const number = fish?.number != null ? String(fish.number) : null;
  const location = asNonEmptyString(fish?.location);
  const shadowSize = asNonEmptyString((fish as any)?.shadow_size);
  const rarity = asNonEmptyString(fish?.rarity);
  const totalCatch = fish?.total_catch != null ? String(fish.total_catch) : null;

  const sellNook = formatBells((fish as any)?.sell_nook);
  const sellCJ = formatBells((fish as any)?.sell_cj);

  const tankW = (fish as any)?.tank_width != null ? String((fish as any).tank_width) : null;
  const tankL = (fish as any)?.tank_length != null ? String((fish as any).tank_length) : null;

  const catchphrases = joinList((fish as any)?.catchphrases);

  const needsRelated = !!location;
  const showMainSpinner = loading || (needsRelated && relatedLoading);

  const goRelated = useCallback(
    (name: string) => {
      router.push({
        pathname: "/fish/[id]",
        params: { id: encodeURIComponent(name) },
      } as any);
    },
    [router]
  );

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Fish" headerLayout="inline">
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
                  {heroUri ? (
                    <Image
                      source={{ uri: heroUri }}
                      style={{ width: 160, height: 160 }}
                      resizeMode="contain"
                      onError={() => {
                        if (!heroFailed) setHeroFailed(true);
                      }}
                    />
                  ) : (
                    <View className="w-[160px] h-[160px] rounded-3xl bg-slate-950/60 border border-slate-700 items-center justify-center">
                      <Feather name="image" size={20} color="#64748b" />
                      <Text className="text-slate-500 text-[11px] mt-2">No image</Text>
                    </View>
                  )}
                </View>

                <Text className="mt-3 text-base font-semibold text-slate-50 text-center">{displayName}</Text>

                <View className="mt-3 flex-row items-center">
                  <Pressable
                    onPress={() => {
                      onToggleCollected();
                      onSetToOneIfNeeded();
                    }}
                    className={`px-3 py-2 rounded-2xl border ${
                      isCollected ? "bg-emerald-500/15 border-emerald-500/40" : "bg-slate-950/40 border-slate-700"
                    }`}
                  >
                    <Text className={`text-[11px] font-semibold ${isCollected ? "text-emerald-200" : "text-slate-200"}`}>
                      {isCollected ? "Collected" : "Collect"}
                    </Text>
                  </Pressable>

                  {isCollected ? (
                    <View className="flex-row items-center ml-3">
                      <Pressable
                        onPress={onDec}
                        className="w-9 h-9 rounded-2xl bg-slate-950/60 border border-slate-700 items-center justify-center"
                      >
                        <Text className="text-slate-100 text-[16px] font-bold">−</Text>
                      </Pressable>

                      <View className="px-3">
                        <Text className="text-[14px] text-slate-100 font-semibold">{count}</Text>
                        <Text className="text-[10px] text-slate-500 text-center">owned</Text>
                      </View>

                      <Pressable
                        onPress={onInc}
                        className="w-9 h-9 rounded-2xl bg-slate-950/60 border border-slate-700 items-center justify-center"
                      >
                        <Text className="text-slate-100 text-[16px] font-bold">+</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                {thumbUsed !== THUMB_PRIMARY ? (
                  <Text className="mt-2 text-[10px] text-slate-500">Loaded thumb {thumbUsed}</Text>
                ) : null}
              </View>
            </Card>
          </View>

          {/* OVERVIEW */}
          <View className="mt-3 px-1">
            <SectionTitle>Overview</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Number" value={number} />
                <StatRow label="Location" value={location} />
                <StatRow label="Shadow Size" value={shadowSize} />
                <StatRow label="Rarity" value={rarity} />
                <StatRow label="Total Catch Needed" value={totalCatch} />
              </Card>
            </View>
          </View>

          {/* PRICING */}
          <View className="mt-3 px-1">
            <SectionTitle>Pricing</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Sell (Nook’s)" value={sellNook ? `${sellNook} Bells` : null} />
                <StatRow label="Sell (C.J.)" value={sellCJ ? `${sellCJ} Bells` : null} />
              </Card>
            </View>
          </View>

          {/* TANK */}
          <View className="mt-3 px-1">
            <SectionTitle>Tank Size</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Width × Length" value={tankW && tankL ? `${tankW} × ${tankL}` : null} />
              </Card>
            </View>
          </View>

          {/* CATCHPHRASES */}
          {catchphrases ? (
            <View className="mt-3 px-1">
              <SectionTitle>Catchphrases</SectionTitle>
              <View className="mt-2">
                <Card>
                  <Text className="text-[12px] text-slate-200">{catchphrases}</Text>
                </Card>
              </View>
            </View>
          ) : null}

          {/* AVAILABILITY */}
          <View className="mt-3 px-1">
            <SectionTitle>Availability</SectionTitle>
            <View className="mt-2">
              <Card>
                <AvailabilitySection title="Northern Hemisphere" data={(fish as any)?.north} />
                <AvailabilitySection title="Southern Hemisphere" data={(fish as any)?.south} />
              </Card>
            </View>
          </View>

          {/* RELATED (SAME LOCATION) */}
          {location ? (
            <View className="mt-3 px-1">
              <SectionTitle>Related Location</SectionTitle>
              <View className="mt-2">
                <Card>
                  <Text className="text-[11px] text-slate-400">Same location: {location}</Text>

                  {related.length === 0 ? (
                    <Text className="mt-2 text-[11px] text-slate-600">No related fish found.</Text>
                  ) : (
                    <View className="mt-2 flex-row flex-wrap">
                      {related.map((r, idx) => {
                        const name = String((r as any)?.name ?? "").trim();
                        if (!name) return null;

                        const imgs = buildFishImageCandidates(r);
                        const img = imgs[0] ?? null;

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

                              <Text
                                className="text-[11px] font-semibold text-slate-100 text-center mt-2"
                                numberOfLines={2}
                              >
                                {name}
                              </Text>

                              <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={2}>
                                {location}
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
        </ScrollView>
      )}
    </PageWrapper>
  );
}
