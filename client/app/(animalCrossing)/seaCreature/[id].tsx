// app/animalCrossing/sea/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchSeaCreatureByName,
  fetchSeaCreatureIndex,
  warmSeaCreatureIndex,
  type NookipediaSeaCreatureItem,
  type NookipediaHemisphereAvailability,
} from "@/lib/animalCrossing/nookipediaSeaCreatures";

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
    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{children}</Text>
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
  const months = asNonEmptyString((data as any)?.months);

  const ranges = Array.isArray((data as any)?.availability_array) ? (data as any).availability_array : [];

  const timesByMonth =
    (data as any)?.times_by_month && typeof (data as any).times_by_month === "object"
      ? (data as any).times_by_month
      : null;

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
                        <Text className={`text-[11px] mt-1 ${isNA ? "text-slate-600" : "text-slate-200"}`} numberOfLines={2}>
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

function buildSeaImageCandidates(item?: NookipediaSeaCreatureItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any).image_url, (item as any).render_url]);
}

export default function SeaCreatureDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const seaName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sea, setSea] = useState<NookipediaSeaCreatureItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroFailed, setHeroFailed] = useState(false);

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
        setHeroFailed(false);

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
  const heroUri = !heroFailed ? (candidates[0] ?? null) : (candidates[1] ?? candidates[0] ?? null);

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
              </View>
            </Card>
          </View>

          {/* OVERVIEW */}
          <View className="mt-3 px-1">
            <SectionTitle>Overview</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Number" value={number} />
                <StatRow label="Shadow Size" value={shadowSize} />
                <StatRow label="Shadow Movement" value={shadowMovement} />
                <StatRow label="Rarity" value={rarity} />
                <StatRow label="Total Catch Needed" value={totalCatch} />
              </Card>
            </View>
          </View>

          {/* RELATED (SAME SHADOW SIZE) */}
          {shadowSize ? (
            <View className="mt-3 px-1">
              <SectionTitle>Related Shadow Size</SectionTitle>
              <View className="mt-2">
                <Card>
                  <Text className="text-[11px] text-slate-400">Same size: {shadowSize}</Text>

                  {related.length === 0 ? (
                    <Text className="mt-2 text-[11px] text-slate-600">No related sea creatures found.</Text>
                  ) : (
                    <View className="mt-2 flex-row flex-wrap">
                      {related.map((r, idx) => {
                        const name = String((r as any)?.name ?? "").trim();
                        if (!name) return null;

                        const imgs = buildSeaImageCandidates(r);
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

                              <Text className="text-[11px] font-semibold text-slate-100 text-center mt-2" numberOfLines={2}>
                                {name}
                              </Text>

                              <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={2}>
                                {shadowSize}
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

          {/* PRICING */}
          <View className="mt-3 px-1">
            <SectionTitle>Pricing</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Sell (Nook’s)" value={sellNook ? `${sellNook} Bells` : null} />
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
                <AvailabilitySection title="Northern Hemisphere" data={(sea as any)?.north} />
                <AvailabilitySection title="Southern Hemisphere" data={(sea as any)?.south} />
              </Card>
            </View>
          </View>
        </ScrollView>
      )}
    </PageWrapper>
  );
}
