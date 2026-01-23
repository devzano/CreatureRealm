// app/art/[id].tsx  (or wherever your ArtDetailPage lives)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchArtByName,
  fetchArtIndex,
  warmArtIndex,
  type NookipediaArtItem,
} from "@/lib/animalCrossing/nookipediaArt";
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

function buildArtHeroCandidates(item?: NookipediaArtItem | null): string[] {
  if (!item) return [];
  const candidates: any[] = [];

  const realImg = (item as any)?.real_info?.image_url;
  const fakeImg = (item as any)?.fake_info?.image_url;

  const realTex = (item as any)?.real_info?.texture_url;
  const fakeTex = (item as any)?.fake_info?.texture_url;

  if (realImg) candidates.push(realImg);
  if (fakeImg) candidates.push(fakeImg);
  if (realTex) candidates.push(realTex);
  if (fakeTex) candidates.push(fakeTex);

  return uniqStrings(candidates);
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

export default function ArtDetailPage() {
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const artName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const key = useMemo(() => `art:${String(artName ?? "").trim()}`, [artName]);

  const entry = useAnimalCrossingCollectionStore((s: any) => (s.entries?.[key] ?? null));
  const toggleCollected = useAnimalCrossingCollectionStore((s: any) => s.toggleCollected);
  const incrementCount = useAnimalCrossingCollectionStore((s: any) => s.incrementCount);
  const decrementCount = useAnimalCrossingCollectionStore((s: any) => s.decrementCount);
  const setCount = useAnimalCrossingCollectionStore((s: any) => s.setCount);

  const isCollected = !!entry?.collected;
  const count = Math.max(Number(entry?.count || 0), 0);

  const onToggleCollected = useCallback(() => {
    toggleCollected("art", artName);
  }, [toggleCollected, artName]);

  const onInc = useCallback(() => {
    incrementCount("art", artName);
  }, [incrementCount, artName]);

  const onDec = useCallback(() => {
    // Your store turns collected off at 0 automatically for decrementCount
    decrementCount("art", artName);
  }, [decrementCount, artName]);

  const onSetToOneIfNeeded = useCallback(() => {
    // If someone wants it "Collected" but count is 0, set to 1.
    if (!isCollected || count <= 0) setCount("art", artName, 1);
  }, [isCollected, count, setCount, artName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaArtItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroFailed, setHeroFailed] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaArtItem[]>([]);

  useEffect(() => {
    void warmArtIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setItem(null);
        setHeroFailed(false);

        setRelated([]);
        setRelatedLoading(false);

        let fetched: NookipediaArtItem | null = null;

        try {
          const x = await fetchArtByName(artName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setItem(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchArtByName(artName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setItem(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        const myType = asNonEmptyString((fetched as any)?.art_type);
        const myName = String((fetched as any)?.name ?? artName).trim().toLowerCase();

        if (myType) {
          setRelatedLoading(true);

          try {
            const index = await fetchArtIndex();
            if (cancelled) return;

            const filtered = index.filter((x: any) => {
              const n = String(x?.name ?? "").trim().toLowerCase();
              if (!n || n === myName) return false;

              const t = asNonEmptyString(x?.art_type);
              return !!t && t === myType;
            });

            filtered.sort((a: any, b: any) => {
              const an = String(a?.name ?? "");
              const bn = String(b?.name ?? "");
              return an.localeCompare(bn);
            });

            setRelated(filtered.slice(0, 24));
          } catch (e2) {
            console.warn("Related art index failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load art.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [artName]);

  const displayName = item?.name ? String(item.name) : artName;

  const heroCandidates = useMemo(() => buildArtHeroCandidates(item), [item]);
  const heroUri = !heroFailed
    ? (heroCandidates[0] ?? null)
    : (heroCandidates[1] ?? heroCandidates[0] ?? null);

  const hasFake = (item as any)?.has_fake === true ? "Yes" : "No";

  const artType = asNonEmptyString((item as any)?.art_type);
  const author = asNonEmptyString((item as any)?.author);
  const year = asNonEmptyString((item as any)?.year);
  const artStyle = asNonEmptyString((item as any)?.art_style);
  const artRealName = asNonEmptyString((item as any)?.art_name);

  const buy = formatBells((item as any)?.buy);
  const sell = formatBells((item as any)?.sell);
  const availability = asNonEmptyString((item as any)?.availability);

  const w = (item as any)?.width != null ? String((item as any).width) : null;
  const l = (item as any)?.length != null ? String((item as any).length) : null;
  const size = w && l ? `${w} × ${l}` : null;

  const realInfo = (item as any)?.real_info ?? null;
  const fakeInfo = (item as any)?.fake_info ?? null;

  const realImg = asNonEmptyString(realInfo?.image_url);
  const realTex = asNonEmptyString(realInfo?.texture_url);
  const realDesc = asNonEmptyString(realInfo?.description);

  const fakeImg = asNonEmptyString(fakeInfo?.image_url);
  const fakeTex = asNonEmptyString(fakeInfo?.texture_url);
  const fakeDesc = asNonEmptyString(fakeInfo?.description);

  const showMainSpinner = loading || (artType && relatedLoading);

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Art" headerLayout="inline">
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
                <View style={{ width: 180, height: 180, alignItems: "center", justifyContent: "center" }}>
                  {heroUri ? (
                    <Image
                      source={{ uri: heroUri }}
                      style={{ width: 180, height: 180 }}
                      resizeMode="contain"
                      onError={() => {
                        if (!heroFailed) setHeroFailed(true);
                      }}
                    />
                  ) : (
                    <View className="w-[180px] h-[180px] rounded-3xl bg-slate-950/60 border border-slate-700 items-center justify-center">
                      <Feather name="image" size={20} color="#64748b" />
                      <Text className="text-slate-500 text-[11px] mt-2">No image</Text>
                    </View>
                  )}
                </View>

                <Text className="mt-3 text-base font-semibold text-slate-50 text-center">{displayName}</Text>
                {artType ? (
                  <Text className="mt-1 text-[11px] text-slate-500 text-center">
                    {artType} • Has fake: {hasFake}
                  </Text>
                ) : null}

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
              </View>
            </Card>
          </View>

          {/* OVERVIEW */}
          <View className="mt-3 px-1">
            <SectionTitle>Overview</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Art Name" value={artRealName} />
                <StatRow label="Type" value={artType} />
                <StatRow label="Author" value={author} />
                <StatRow label="Year" value={year} />
                <StatRow label="Style" value={artStyle} />
                <StatRow label="Size" value={size} />
                <StatRow label="Availability" value={availability} />
              </Card>
            </View>
          </View>

          {/* PRICING */}
          <View className="mt-3 px-1">
            <SectionTitle>Pricing</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Buy" value={buy ? `${buy} Bells` : null} />
                <StatRow label="Sell" value={sell ? `${sell} Bells` : null} />
              </Card>
            </View>
          </View>

          {/* REAL */}
          {realImg || realTex || realDesc ? (
            <View className="mt-3 px-1">
              <SectionTitle>Real</SectionTitle>
              <View className="mt-2">
                <Card>
                  <View className="flex-row">
                    <View className="w-1/2 pr-1">
                      <View className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 items-center">
                        <Text className="text-[11px] text-slate-400 mb-2">Icon</Text>
                        {realImg ? (
                          <Image source={{ uri: realImg }} style={{ width: 120, height: 120 }} resizeMode="contain" />
                        ) : (
                          <Feather name="image" size={18} color="#64748b" />
                        )}
                      </View>
                    </View>

                    <View className="w-1/2 pl-1">
                      <View className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 items-center">
                        <Text className="text-[11px] text-slate-400 mb-2">Texture</Text>
                        {realTex ? (
                          <Image source={{ uri: realTex }} style={{ width: 120, height: 120 }} resizeMode="contain" />
                        ) : (
                          <Feather name="image" size={18} color="#64748b" />
                        )}
                      </View>
                    </View>
                  </View>

                  {realDesc ? <Text className="mt-3 text-[12px] text-slate-200">{realDesc}</Text> : null}
                </Card>
              </View>
            </View>
          ) : null}

          {/* FAKE */}
          {fakeImg || fakeTex || fakeDesc ? (
            <View className="mt-3 px-1">
              <SectionTitle>Fake</SectionTitle>
              <View className="mt-2">
                <Card>
                  <View className="flex-row">
                    <View className="w-1/2 pr-1">
                      <View className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 items-center">
                        <Text className="text-[11px] text-slate-400 mb-2">Icon</Text>
                        {fakeImg ? (
                          <Image source={{ uri: fakeImg }} style={{ width: 120, height: 120 }} resizeMode="contain" />
                        ) : (
                          <Feather name="image" size={18} color="#64748b" />
                        )}
                      </View>
                    </View>

                    <View className="w-1/2 pl-1">
                      <View className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 items-center">
                        <Text className="text-[11px] text-slate-400 mb-2">Texture</Text>
                        {fakeTex ? (
                          <Image source={{ uri: fakeTex }} style={{ width: 120, height: 120 }} resizeMode="contain" />
                        ) : (
                          <Feather name="image" size={18} color="#64748b" />
                        )}
                      </View>
                    </View>
                  </View>

                  {fakeDesc ? <Text className="mt-3 text-[12px] text-slate-200">{fakeDesc}</Text> : null}
                </Card>
              </View>
            </View>
          ) : null}

          {/* RELATED */}
          {artType ? (
            <View className="mt-3 px-1">
              <SectionTitle>Related Type</SectionTitle>
              <View className="mt-2">
                <Card>
                  <Text className="text-[11px] text-slate-400">Same type: {artType}</Text>

                  {related.length === 0 ? (
                    <Text className="mt-2 text-[11px] text-slate-600">No related art found.</Text>
                  ) : (
                    <View className="mt-2 flex-row flex-wrap">
                      {related.map((r, idx) => {
                        const name = String((r as any)?.name ?? "").trim();
                        if (!name) return null;

                        const imgs = buildArtHeroCandidates(r);
                        const img = imgs[0] ?? null;

                        return (
                          <View key={`${name}::${idx}`} className="w-1/3 p-1">
                            <View className="rounded-3xl p-3 border items-center border-slate-700 bg-slate-900/70">
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

                              <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
                                {artType}
                              </Text>
                            </View>
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
