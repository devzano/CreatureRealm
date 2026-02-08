//client/app/(animalCrossing)/fossil/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchFossilIndividualByName,
  fetchFossilIndividualsIndex,
  warmFossilIndividualsIndex,
  fetchFossilGroupByName,
  warmFossilGroupsIndex,
  type NookipediaFossilIndividualItem,
  type NookipediaFossilGroupDetailItem,
} from "@/lib/animalCrossing/nookipediaFossils";
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

function buildFossilImageCandidates(item?: NookipediaFossilIndividualItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any)?.image_url]);
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

export default function FossilDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const fossilName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fossil, setFossil] = useState<NookipediaFossilIndividualItem | null>(null);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaFossilIndividualItem[]>([]);

  const [groupLoading, setGroupLoading] = useState(false);
  const [groupDetail, setGroupDetail] = useState<NookipediaFossilGroupDetailItem | null>(null);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroImgLoading, setHeroImgLoading] = useState(false);

  useEffect(() => {
    void warmFossilIndividualsIndex();
    void warmFossilGroupsIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setFossil(null);
        setHeroCandidateIndex(0);

        setRelated([]);
        setRelatedLoading(false);

        setGroupDetail(null);
        setGroupLoading(false);

        let fetched: NookipediaFossilIndividualItem | null = null;

        try {
          const x = await fetchFossilIndividualByName(fossilName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setFossil(x);
        } catch {
          const x2 = await fetchFossilIndividualByName(fossilName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setFossil(x2);
        }

        const myGroup = asNonEmptyString((fetched as any)?.fossil_group);

        if (myGroup) {
          setGroupLoading(true);
          try {
            const gd = await fetchFossilGroupByName(myGroup);
            if (!cancelled) setGroupDetail(gd);
          } catch (e2) {
            console.warn("Group detail fetch failed:", myGroup, e2);
          } finally {
            if (!cancelled) setGroupLoading(false);
          }
        }

        const myName = String((fetched as any)?.name ?? fossilName).trim().toLowerCase();

        if (myGroup) {
          setRelatedLoading(true);
          try {
            const index = await fetchFossilIndividualsIndex();
            if (cancelled) return;

            const myGroupNorm = myGroup.trim().toLowerCase();

            const filtered = index.filter((x: any) => {
              const n = String(x?.name ?? "").trim().toLowerCase();
              if (!n || n === myName) return false;

              const g = asNonEmptyString(x?.fossil_group);
              if (!g) return false;

              return g.trim().toLowerCase() === myGroupNorm;
            });

            filtered.sort((a: any, b: any) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")));
            setRelated(filtered.slice(0, 24));
          } catch (e2) {
            console.warn("Related fossils index failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load fossil.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fossilName]);

  const displayName = fossil?.name ? String(fossil.name) : fossilName;

  const candidates = useMemo(() => buildFossilImageCandidates(fossil), [fossil]);
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
    if (heroCandidateIndex + 1 < candidates.length) setHeroCandidateIndex((i) => i + 1);
  }, [heroCandidateIndex, candidates.length]);

  const fossilGroup = asNonEmptyString((fossil as any)?.fossil_group);
  const sell = formatBells((fossil as any)?.sell);

  const hhaBase = (fossil as any)?.hha_base != null ? String((fossil as any).hha_base) : null;
  const interactable =
    (fossil as any)?.interactable != null ? (String((fossil as any).interactable) === "true" ? "Yes" : "No") : null;

  const size =
    (fossil as any)?.width != null && (fossil as any)?.length != null
      ? `${String((fossil as any).width)} × ${String((fossil as any).length)}`
      : null;

  const colors = joinList((fossil as any)?.colors);

  const groupRoom =
    groupDetail?.room != null && Number.isFinite(Number(groupDetail.room)) ? String(groupDetail.room) : null;

  const groupDesc = asNonEmptyString(groupDetail?.description);
  const groupPieces = Array.isArray((groupDetail as any)?.fossils) ? (groupDetail as any).fossils : [];

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (fossilGroup) parts.push(`Exhibit: ${fossilGroup}`);
    if (size) parts.push(`Size: ${size}`);
    return parts.join(" • ");
  }, [fossilGroup, size]);

  const goPiece = useCallback(
    (name: string) => {
      router.push({ pathname: "/fossil/[id]", params: { id: encodeURIComponent(name) } } as any);
    },
    [router]
  );

  const goGroup = useCallback(() => {
    if (!fossilGroup) return;
    router.push({ pathname: "/fossil-group/[id]", params: { id: encodeURIComponent(fossilGroup) } } as any);
  }, [router, fossilGroup]);

  const showMainSpinner = loading || (fossilGroup && relatedLoading);

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Fossils" headerLayout="inline">
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
          {/* HERO / “Museum Exhibit” */}
          <View className="mt-4">
            <MuseumCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-amber-500/10 border border-amber-200/20 items-center justify-center">
                    <Feather name="book-open" size={16} color="#fde68a" />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-slate-200/75 uppercase">
                    Museum Exhibit
                  </Text>
                </View>

                {fossilGroup ? (
                  <Pressable onPress={goGroup} className="px-3 py-2 rounded-full bg-slate-900/40 border border-slate-700">
                    <Text className="text-[11px] font-extrabold text-slate-50">{fossilGroup}</Text>
                  </Pressable>
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

                {/* title */}
                <View className="flex-1 pl-3">
                  <ExhibitTitle title={displayName} subtitle={subtitleLine || null} />
                  {groupRoom ? <Text className="mt-2 text-[11px] text-slate-200/70 text-center">Room {groupRoom}</Text> : null}
                </View>
              </View>

              {/* Blathers */}
              <CuratorNote
                label="Blathers"
                value={groupDesc || (fossilGroup ? (groupLoading ? "Loading notes…" : "No notes found.") : "No group notes.")}
              />
            </MuseumCard>
          </View>

          <MuseumSectionLabel>Artifact Details</MuseumSectionLabel>
          <MuseumCard>
            <MuseumChip label="Fossil Group" value={fossilGroup} />
            <MuseumChip label="Interactable" value={interactable} />
            <MuseumChip label="Size (W × L)" value={size} />
            <MuseumChip label="Colors" value={colors} />
          </MuseumCard>

          <MuseumSectionLabel>Appraisal</MuseumSectionLabel>
          <MuseumCard>
            <MuseumChip label="Sell" value={sell ? `${sell} Bells` : null} />
            <MuseumChip label="HHA Base" value={hhaBase} />
          </MuseumCard>

          {fossilGroup ? (
            <>
              <MuseumSectionLabel>Set Pieces</MuseumSectionLabel>
              <MuseumCard>
                {groupPieces.length ? (
                  <View className="flex-row flex-wrap">
                    {groupPieces.map((p: any, idx: number) => {
                      const n = String(p?.name ?? "").trim();
                      if (!n) return null;

                      const img = asNonEmptyString(p?.image_url);
                      if (img) ExpoImage.prefetch(img).catch(() => {});

                      return (
                        <View key={`${n}::piece::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goPiece(n)}
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
                              {n}
                            </Text>

                            <Text className="text-[10px] text-slate-300/50 mt-1" numberOfLines={1}>
                              {fossilGroup}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ) : groupLoading ? (
                  <Text className="text-[11px] text-slate-300/50">Loading set pieces…</Text>
                ) : (
                  <Text className="text-[11px] text-slate-300/40">No set pieces found.</Text>
                )}
              </MuseumCard>
            </>
          ) : null}

          {fossilGroup ? (
            <>
              <MuseumSectionLabel>Related</MuseumSectionLabel>
              <MuseumCard>
                {related.length === 0 ? (
                  <Text className="mt-2 text-[11px] text-slate-300/40">No related fossils found.</Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap">
                    {related.map((r, idx) => {
                      const name = String((r as any)?.name ?? "").trim();
                      if (!name) return null;

                      const imgs = buildFossilImageCandidates(r);
                      const img = imgs[0] ?? null;
                      if (img) ExpoImage.prefetch(img).catch(() => {});

                      return (
                        <View key={`${name}::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goPiece(name)}
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
                              {fossilGroup}
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
