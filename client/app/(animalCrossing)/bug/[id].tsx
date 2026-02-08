//client/app/(animalCrossing)/bugs/[id].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchBugByName,
  fetchBugIndex,
  warmBugIndex,
  type NookipediaBugItem,
  type NookipediaHemisphereAvailability,
} from "@/lib/animalCrossing/nookipediaBugs";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";
import LocalIcon from "@/components/LocalIcon";

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

function buildBugImageCandidates(item?: NookipediaBugItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any).image_url, (item as any).render_url]);
}

function monthName(m: number) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[m - 1] ?? String(m);
}

function GroveSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-emerald-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-emerald-100/90">{children}</Text>
    </View>
  );
}

function GroveCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-emerald-950/25 border border-emerald-500/20 p-4 overflow-hidden">
      {/* green blobs */}
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-rose-300/10" />
      <View className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-lime-300/10" />
      {/* red accents */}
      <View className="absolute top-10 left-8 w-3 h-3 rounded-full bg-rose-200/10" />
      <View className="absolute top-16 left-14 w-2 h-2 rounded-full bg-rose-200/10" />
      <View className="absolute bottom-14 right-12 w-3 h-3 rounded-full bg-rose-200/10" />
      {children}
    </View>
  );
}

function FieldTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-rose-950/22 border border-rose-300/18">
        <Text className="text-[16px] font-extrabold text-rose-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-emerald-100/80 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function GroveBadge({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-center mr-2 mb-2 px-3 py-2 rounded-full bg-emerald-900/18 border border-emerald-500/22">
      {icon ? <View className="mr-2">{icon}</View> : null}
      <Text className="text-[11px] font-semibold text-emerald-50">{text}</Text>
    </View>
  );
}

function GroveChip({ label, value }: { label: string; value?: any }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-emerald-200">•</Text>
        </View>
        <Text className="text-[11px] text-emerald-100/90">{label}</Text>
      </View>
      <Text className="text-[11px] text-emerald-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function BugNote({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-rose-950/18 border border-rose-300/18 px-4 py-3">
        <Text className="text-[10px] font-bold tracking-[0.14em] uppercase text-rose-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-rose-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-rose-300/18" />
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
  const months = asNonEmptyString(data?.months);
  const ranges = Array.isArray(data?.availability_array) ? data!.availability_array! : [];
  const timesByMonth = data?.times_by_month && typeof data.times_by_month === "object" ? data.times_by_month : null;

  const hasAny = !!months || ranges.length > 0 || (timesByMonth && Object.keys(timesByMonth).length > 0);

  return (
    <View className="mt-4">
      <Text className="text-[11px] text-emerald-100/70">{title}</Text>

      {!hasAny ? (
        <Text className="text-[11px] text-emerald-200/40 mt-2">No availability data found.</Text>
      ) : (
        <>
          {months ? <Text className="text-[12px] text-emerald-50 mt-2">{months}</Text> : null}

          {ranges.length ? (
            <View className="mt-3">
              <Text className="text-[11px] text-emerald-100/70">Ranges</Text>
              <View className="mt-2">
                {ranges.map((r: any, idx: number) => {
                  const m = asNonEmptyString(r?.months) ?? "—";
                  const t = asNonEmptyString(r?.time) ?? "—";
                  return (
                    <View key={`${idx}:${m}:${t}`} className="flex-row items-start justify-between py-1">
                      <Text className="text-[11px] text-emerald-50 flex-1 mr-3">{m}</Text>
                      <Text className="text-[11px] text-emerald-100/70 text-right">{t}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {timesByMonth ? (
            <View className="mt-3">
              <Text className="text-[11px] text-emerald-100/70">Times by Month</Text>
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
                          isNA ? "border-emerald-900/30 bg-emerald-950/18" : "border-emerald-500/20 bg-emerald-900/12"
                        }`}
                      >
                        <Text className="text-[10px] text-emerald-100/60">{monthName(monthNum)}</Text>
                        <Text className={`text-[11px] mt-1 ${isNA ? "text-emerald-200/30" : "text-emerald-50"}`} numberOfLines={2}>
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

export default function BugDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const bugName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const key = useMemo(() => `bug:${String(bugName ?? "").trim()}`, [bugName]);
  const entry = useAnimalCrossingCollectionStore((s: any) => s.entries?.[key] ?? null);

  const toggleCollected = useAnimalCrossingCollectionStore((s: any) => s.toggleCollected);
  const incrementCount = useAnimalCrossingCollectionStore((s: any) => s.incrementCount);
  const decrementCount = useAnimalCrossingCollectionStore((s: any) => s.decrementCount);
  const setCount = useAnimalCrossingCollectionStore((s: any) => s.setCount);

  const isCollected = !!entry?.collected;
  const count = Math.max(Number(entry?.count || 0), 0);

  const onToggleCollected = useCallback(() => {
    toggleCollected("bug", bugName);
  }, [toggleCollected, bugName]);

  const onInc = useCallback(() => {
    incrementCount("bug", bugName);
  }, [incrementCount, bugName]);

  const onDec = useCallback(() => {
    decrementCount("bug", bugName);
  }, [decrementCount, bugName]);

  const onSetToOneIfNeeded = useCallback(() => {
    if (!isCollected || count <= 0) setCount("bug", bugName, 1);
  }, [isCollected, count, setCount, bugName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bug, setBug] = useState<NookipediaBugItem | null>(null);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaBugItem[]>([]);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroImgLoading, setHeroImgLoading] = useState(false);

  useEffect(() => {
    void warmBugIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setBug(null);
        setHeroCandidateIndex(0);

        setRelated([]);
        setRelatedLoading(false);

        let fetched: NookipediaBugItem | null = null;

        try {
          const x = await fetchBugByName(bugName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setBug(x);
        } catch {
          const x2 = await fetchBugByName(bugName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setBug(x2);
        }

        const myLoc = asNonEmptyString((fetched as any)?.location);
        const myName = String((fetched as any)?.name ?? bugName).trim().toLowerCase();

        if (myLoc) {
          setRelatedLoading(true);

          try {
            const index = await fetchBugIndex();
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
            console.warn("Related bugs index failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load bug.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bugName]);

  const displayName = bug?.name ? String(bug.name) : bugName;

  const candidates = useMemo(() => buildBugImageCandidates(bug), [bug]);
  const heroUri = candidates[heroCandidateIndex] ?? null;

  useEffect(() => {
    setHeroCandidateIndex(0);
  }, [candidates.length]);

  useEffect(() => {
    if (!heroUri) return;
    ExpoImage.prefetch(heroUri).catch(() => {});
  }, [heroUri]);

  const onHeroError = useCallback(() => {
    setHeroImgLoading(false);
    if (heroCandidateIndex + 1 < candidates.length) {
      setHeroCandidateIndex((i) => i + 1);
    }
  }, [heroCandidateIndex, candidates.length]);

  const number = bug?.number != null ? String(bug.number) : null;
  const location = asNonEmptyString(bug?.location);
  const weather = asNonEmptyString((bug as any)?.weather);
  const rarity = asNonEmptyString(bug?.rarity);
  const totalCatch = bug?.total_catch != null ? String(bug.total_catch) : null;

  const sellNook = formatBells((bug as any)?.sell_nook);
  const sellFlick = formatBells((bug as any)?.sell_flick);

  const tankW = (bug as any)?.tank_width != null ? String((bug as any).tank_width) : null;
  const tankL = (bug as any)?.tank_length != null ? String((bug as any).tank_length) : null;

  const catchphrases = joinList((bug as any)?.catchphrases);

  const needsRelated = !!location;
  const showMainSpinner = loading || (needsRelated && relatedLoading);

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (location) parts.push(location);
    if (weather) parts.push(weather);
    if (rarity) parts.push(rarity);
    return parts.join(" • ");
  }, [location, weather, rarity]);

  const goRelated = useCallback(
    (name: string) => {
      router.push({
        pathname: "/bug/[id]",
        params: { id: encodeURIComponent(name) },
      } as any);
    },
    [router]
  );

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Bugs" headerLayout="inline">
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
          {/* HERO / “Bug Journal” */}
          <View className="mt-4">
            <GroveCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-emerald-500/12 border border-emerald-500/22 items-center justify-center">
                    <Feather name="aperture" size={16} color="#FECDD3" />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-emerald-100/75 uppercase">
                    Bug Journal
                  </Text>
                </View>

                {number ? (
                  <View className="px-3 py-2 rounded-full bg-rose-900/16 border border-rose-400/22">
                    <Text className="text-[11px] font-extrabold text-rose-50">#{number}</Text>
                  </View>
                ) : null}
              </View>

              <View>
                <View className="flex-row">
                  <View className="w-[132px]">
                    <View className="rounded-[26px] bg-emerald-900/14 border border-emerald-500/18 p-3 items-center justify-center">
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
                                  backgroundColor: "rgba(16, 185, 129, 0.14)",
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
                              placeholderClassName="bg-emerald-950/20 border border-emerald-500/18"
                            />
                            <View style={{ position: "absolute", alignItems: "center" }}>
                              <Feather name="image" size={18} color="#a7f3d0" />
                              <Text className="text-emerald-100/60 text-[10px] mt-2">No image</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Title + Badges + Controls Column */}
                  <View className="flex-1 pl-3">
                    <FieldTitle title={displayName} subtitle={subtitleLine || null} />

                    {/* Collected + count (match fish) */}
                    <View className="mt-2 flex-row justify-center items-center">
                      <Pressable
                        onPress={() => {
                          onToggleCollected();
                          onSetToOneIfNeeded();
                        }}
                        className={`px-3 py-2 rounded-full border ${
                          isCollected ? "bg-emerald-500/15 border-emerald-500/35" : "bg-rose-500/10 border-rose-300/25"
                        }`}
                      >
                        <Text className={`text-[12px] font-extrabold ${isCollected ? "text-emerald-100" : "text-rose-100"}`}>
                          {isCollected ? "Caught" : "Not Caught"}
                        </Text>
                      </Pressable>

                      {isCollected ? (
                        <View className="flex-row items-center ml-3">
                          <Pressable
                            onPress={onDec}
                            className="w-9 h-9 rounded-2xl bg-emerald-950/18 border border-emerald-500/18 items-center justify-center"
                          >
                            <Text className="text-emerald-50 text-[16px] font-bold">−</Text>
                          </Pressable>

                          <View className="px-3">
                            <Text className="text-[14px] text-emerald-50 font-semibold text-center">{count}</Text>
                            <Text className="text-[10px] text-emerald-100/60 text-center">owned</Text>
                          </View>

                          <Pressable
                            onPress={onInc}
                            className="w-9 h-9 rounded-2xl bg-emerald-950/18 border border-emerald-500/18 items-center justify-center"
                          >
                            <Text className="text-emerald-50 text-[16px] font-bold">+</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="mt-3 w-full">
                  <BugNote label="Catchphrases" value={catchphrases} />
                </View>
              </View>
            </GroveCard>
          </View>

          <GroveSectionLabel>Overview</GroveSectionLabel>
          <GroveCard>
            <GroveChip label="Location" value={location} />
            <GroveChip label="Weather" value={weather} />
            <GroveChip label="Rarity" value={rarity} />
            <GroveChip label="Total Catch Needed" value={totalCatch} />
          </GroveCard>

          <GroveSectionLabel>Pricing</GroveSectionLabel>
          <GroveCard>
            <GroveChip label="Sell (Nook’s)" value={sellNook ? `${sellNook} Bells` : null} />
            <GroveChip label="Sell (Flick)" value={sellFlick ? `${sellFlick} Bells` : null} />
          </GroveCard>

          <GroveSectionLabel>Tank Size</GroveSectionLabel>
          <GroveCard>
            <GroveChip label="Width × Length" value={tankW && tankL ? `${tankW} × ${tankL}` : null} />
          </GroveCard>

          <GroveSectionLabel>Availability</GroveSectionLabel>
          <GroveCard>
            <AvailabilityCard title="Northern Hemisphere" data={(bug as any)?.north} />
            <AvailabilityCard title="Southern Hemisphere" data={(bug as any)?.south} />
          </GroveCard>

          {location ? (
            <>
              <GroveSectionLabel>Related</GroveSectionLabel>
              <GroveCard>
                {related.length === 0 ? (
                  <Text className="mt-2 text-[11px] text-emerald-200/40">No related bugs found.</Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap">
                    {related.map((r, idx) => {
                      const name = String((r as any)?.name ?? "").trim();
                      if (!name) return null;

                      const imgs = buildBugImageCandidates(r);
                      const img = imgs[0] ?? null;

                      if (img) ExpoImage.prefetch(img).catch(() => {});

                      return (
                        <View key={`${name}::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goRelated(name)}
                            className="rounded-[26px] p-3 border items-center border-emerald-500/18 bg-emerald-900/10"
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
                                borderColor: "rgba(52, 211, 153, 0.18)",
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
                                <View style={{ width: 68, height: 68, alignItems: "center", justifyContent: "center" }}>
                                  <LocalIcon
                                    source={null}
                                    size={68}
                                    roundedClassName="rounded-2xl"
                                    placeholderClassName="bg-emerald-950/18 border border-emerald-500/18"
                                  />
                                  <View style={{ position: "absolute" }}>
                                    <Feather name="image" size={18} color="#a7f3d0" />
                                  </View>
                                </View>
                              )}
                            </View>

                            <Text className="text-[11px] font-semibold text-emerald-50 text-center mt-2" numberOfLines={2}>
                              {name}
                            </Text>

                            <Text className="text-[10px] text-emerald-100/60 mt-1" numberOfLines={2}>
                              {location}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </GroveCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
