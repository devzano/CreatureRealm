// client/app/(animalCrossing)/art/[id].tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import { fetchArtByName, fetchArtIndex, warmArtIndex, type NookipediaArtItem } from "@/lib/animalCrossing/nookipediaArt";
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

function MuseumSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-amber-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-slate-200/90">{children}</Text>
    </View>
  );
}

function MuseumCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-slate-950/40 border border-slate-700/60 p-4 overflow-hidden">
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-slate-200/5" />
      <View className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-amber-200/5" />
      <View className="absolute top-10 left-8 w-3 h-3 rounded-full bg-slate-100/5" />
      <View className="absolute top-16 left-14 w-2 h-2 rounded-full bg-slate-100/5" />
      <View className="absolute bottom-14 right-12 w-3 h-3 rounded-full bg-slate-100/5" />
      {children}
    </View>
  );
}

function ExhibitTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-amber-900/25 border border-amber-200/20">
        <Text className="text-[16px] font-extrabold text-amber-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-slate-200/80 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function MuseumChip({ label, value }: { label: string; value?: any }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-amber-200">•</Text>
        </View>
        <Text className="text-[11px] text-slate-200/90">{label}</Text>
      </View>
      <Text className="text-[11px] text-slate-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function CuratorNote({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-amber-900/18 border border-amber-200/18 px-4 py-3">
        <Text className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-amber-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-amber-200/18" />
    </View>
  );
}

function ThumbBox({
  title,
  uri,
}: {
  title: string;
  uri?: string | null;
}) {
  const u = String(uri ?? "").trim();

  return (
    <View className="w-full">
      <View className="rounded-[26px] border border-slate-700 bg-slate-900/35 p-3 items-center">
        <Text className="text-[11px] text-slate-200/65 mb-2">{title}</Text>

        <View
          className="rounded-[18px] overflow-hidden bg-slate-950/50"
          style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}
        >
          {u ? (
            <ExpoImage
              source={{ uri: u }}
              style={{ width: 120, height: 120 }}
              contentFit="cover"
              transition={120}
              cachePolicy="disk"
            />
          ) : (
            <Feather name="image" size={18} color="#94a3b8" />
          )}
        </View>
      </View>
    </View>
  );
}

export default function ArtDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const artName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const key = useMemo(() => `art:${String(artName ?? "").trim()}`, [artName]);

  const entry = useAnimalCrossingCollectionStore((s: any) => s.entries?.[key] ?? null);
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
    decrementCount("art", artName);
  }, [decrementCount, artName]);

  const onSetToOneIfNeeded = useCallback(() => {
    if (!isCollected || count <= 0) setCount("art", artName, 1);
  }, [isCollected, count, setCount, artName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaArtItem | null>(null);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaArtItem[]>([]);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroImgLoading, setHeroImgLoading] = useState(false);

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
        setHeroCandidateIndex(0);

        setRelated([]);
        setRelatedLoading(false);

        let fetched: NookipediaArtItem | null = null;

        try {
          const x = await fetchArtByName(artName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setItem(x);
        } catch {
          const x2 = await fetchArtByName(artName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setItem(x2);
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

            filtered.sort((a: any, b: any) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")));
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
  const heroUri = heroCandidates[heroCandidateIndex] ?? null;

  useEffect(() => {
    setHeroCandidateIndex(0);
  }, [heroCandidates.length]);

  useEffect(() => {
    if (!heroUri) return;
    ExpoImage.prefetch(heroUri).catch(() => {});
  }, [heroUri]);

  const onHeroError = useCallback(() => {
    setHeroImgLoading(false);
    if (heroCandidateIndex + 1 < heroCandidates.length) setHeroCandidateIndex((i) => i + 1);
  }, [heroCandidateIndex, heroCandidates.length]);

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

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (artType) parts.push(artType);
    parts.push(`Has fake: ${hasFake}`);
    return parts.join(" • ");
  }, [artType, hasFake]);

  const showMainSpinner = loading || (artType && relatedLoading);

  const goRelatedArt = useCallback(
    (name: string) => {
      router.push({ pathname: "/art/[id]", params: { id: encodeURIComponent(name) } } as any);
    },
    [router]
  );

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Art" headerLayout="inline">
      {showMainSpinner ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-200/80">{loading ? "Loading…" : "Loading related…"}</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          {/* HERO / “Museum Gallery” */}
          <View className="mt-4">
            <MuseumCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-amber-500/10 border border-amber-200/20 items-center justify-center">
                    <Feather name="image" size={16} color="#fde68a" />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-slate-200/75 uppercase">
                    Museum Gallery
                  </Text>
                </View>

                {artType ? (
                  <View className="px-3 py-2 rounded-full bg-slate-900/40 border border-slate-700">
                    <Text className="text-[11px] font-extrabold text-slate-50">{artType}</Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row">
                {/* portrait */}
                <View className="w-[132px]">
                  <View className="rounded-[26px] bg-slate-900/35 border border-slate-700/70 p-3 items-center justify-center">
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
                                backgroundColor: "rgba(15, 23, 42, 0.35)",
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
                            placeholderClassName="bg-slate-950/40 border border-slate-700"
                          />
                          <View style={{ position: "absolute", alignItems: "center" }}>
                            <Feather name="image" size={18} color="#94a3b8" />
                            <Text className="text-slate-300/60 text-[10px] mt-2">No image</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* title + controls */}
                <View className="flex-1 pl-3">
                  <ExhibitTitle title={displayName} subtitle={subtitleLine || null} />

                  <View className="mt-3 flex-row items-center justify-center">
                    <Pressable
                      onPress={() => {
                        onToggleCollected();
                        onSetToOneIfNeeded();
                      }}
                      className={`px-3 py-2 rounded-full border ${
                        isCollected ? "bg-emerald-500/15 border-emerald-500/40" : "bg-slate-900/40 border-slate-700"
                      }`}
                    >
                      <Text className={`text-[12px] font-extrabold ${isCollected ? "text-emerald-200" : "text-slate-200"}`}>
                        {isCollected ? "Collected" : "Collect"}
                      </Text>
                    </Pressable>

                    {isCollected ? (
                      <View className="flex-row items-center ml-3">
                        <Pressable
                          onPress={onDec}
                          className="w-9 h-9 rounded-2xl bg-slate-950/40 border border-slate-700 items-center justify-center"
                        >
                          <Text className="text-slate-100 text-[16px] font-bold">−</Text>
                        </Pressable>

                        <View className="px-3">
                          <Text className="text-[14px] text-slate-100 font-semibold text-center">{count}</Text>
                          <Text className="text-[10px] text-slate-300/50 text-center">owned</Text>
                        </View>

                        <Pressable
                          onPress={onInc}
                          className="w-9 h-9 rounded-2xl bg-slate-950/40 border border-slate-700 items-center justify-center"
                        >
                          <Text className="text-slate-100 text-[16px] font-bold">+</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <CuratorNote
                label="Redd"
                value={artType ? `Keep an eye out… some ${artType.toLowerCase()} pieces have fakes.` : `Keep an eye out… some pieces have fakes.`}
              />
            </MuseumCard>
          </View>

          <MuseumSectionLabel>Artwork Details</MuseumSectionLabel>
          <MuseumCard>
            <MuseumChip label="Art Name" value={artRealName} />
            <MuseumChip label="Type" value={artType} />
            <MuseumChip label="Author" value={author} />
            <MuseumChip label="Year" value={year} />
            <MuseumChip label="Style" value={artStyle} />
            <MuseumChip label="Size (W × L)" value={size} />
            <MuseumChip label="Availability" value={availability} />
            <MuseumChip label="Has Fake" value={hasFake} />
          </MuseumCard>

          <MuseumSectionLabel>Appraisal</MuseumSectionLabel>
          <MuseumCard>
            <MuseumChip label="Buy" value={buy ? `${buy} Bells` : null} />
            <MuseumChip label="Sell" value={sell ? `${sell} Bells` : null} />
          </MuseumCard>

          {(realImg || realTex || realDesc) ? (
            <>
              <MuseumSectionLabel>Real</MuseumSectionLabel>
              <MuseumCard>
                <View className="flex-row">
                  <View className="pr-1 flex-1">
                    <ThumbBox title="Icon" uri={realImg} />
                  </View>
                  <View className="pl-1 flex-1">
                    <ThumbBox title="Texture" uri={realTex} />
                  </View>
                </View>

                <CuratorNote label="Notes" value={realDesc || null} />
              </MuseumCard>
            </>
          ) : null}

          {(fakeImg || fakeTex || fakeDesc) ? (
            <>
              <MuseumSectionLabel>Fake</MuseumSectionLabel>
              <MuseumCard>
                <View className="flex-row">
                  <View className="pr-1 flex-1">
                    <ThumbBox title="Icon" uri={fakeImg} />
                  </View>
                  <View className="pl-1 flex-1">
                    <ThumbBox title="Texture" uri={fakeTex} />
                  </View>
                </View>

                <CuratorNote label="Notes" value={fakeDesc || null} />
              </MuseumCard>
            </>
          ) : null}

          {artType ? (
            <>
              <MuseumSectionLabel>Related</MuseumSectionLabel>
              <MuseumCard>
                {related.length === 0 ? (
                  <Text className="mt-2 text-[11px] text-slate-300/40">No related art found.</Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap">
                    {related.map((r, idx) => {
                      const name = String((r as any)?.name ?? "").trim();
                      if (!name) return null;

                      const imgs = buildArtHeroCandidates(r);
                      const img = imgs[0] ?? null;
                      if (img) ExpoImage.prefetch(img).catch(() => {});

                      return (
                        <View key={`${name}::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goRelatedArt(name)}
                            className="rounded-[26px] p-3 border items-center border-slate-700 bg-slate-900/35"
                          >
                            <View
                              style={{
                                width: 68,
                                height: 68,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 18,
                                backgroundColor: "rgba(15, 23, 42, 0.35)",
                                borderWidth: 1,
                                borderColor: "rgba(51, 65, 85, 0.7)",
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
                                <Feather name="image" size={18} color="#94a3b8" />
                              )}
                            </View>

                            <Text className="text-[11px] font-semibold text-slate-50 text-center mt-2" numberOfLines={2}>
                              {name}
                            </Text>

                            <Text className="text-[10px] text-slate-300/50 mt-1" numberOfLines={1}>
                              {artType}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </MuseumCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
