// app/fossil/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

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
  return uniqStrings([(item as any).image_url]);
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

export default function FossilDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const fossilName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fossil, setFossil] = useState<NookipediaFossilIndividualItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroFailed, setHeroFailed] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaFossilIndividualItem[]>([]);

  // group info
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupDetail, setGroupDetail] = useState<NookipediaFossilGroupDetailItem | null>(null);

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
        setHeroFailed(false);

        setRelated([]);
        setRelatedLoading(false);

        setGroupDetail(null);
        setGroupLoading(false);

        // 1) detail
        let fetched: NookipediaFossilIndividualItem | null = null;

        try {
          const x = await fetchFossilIndividualByName(fossilName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setFossil(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchFossilIndividualByName(fossilName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setFossil(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        const myGroup = asNonEmptyString((fetched as any)?.fossil_group);

        // 1b) group detail
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

        // 2) related (same group)
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
  const heroUri = !heroFailed ? (candidates[0] ?? null) : (candidates[1] ?? candidates[0] ?? null);

  const fossilGroup = asNonEmptyString((fossil as any)?.fossil_group);
  const sell = formatBells((fossil as any)?.sell);

  const hhaBase = (fossil as any)?.hha_base != null ? String((fossil as any).hha_base) : null;
  const interactable =
    (fossil as any)?.interactable != null
      ? String((fossil as any).interactable) === "true"
        ? "Yes"
        : "No"
      : null;

  const size =
    (fossil as any)?.width != null && (fossil as any)?.length != null
      ? `${String((fossil as any).width)} × ${String((fossil as any).length)}`
      : null;

  const colors = joinList((fossil as any)?.colors);

  const groupRoom =
    groupDetail?.room != null && Number.isFinite(Number(groupDetail.room)) ? String(groupDetail.room) : null;

  const groupDesc = asNonEmptyString(groupDetail?.description);
  const groupPieces = Array.isArray((groupDetail as any)?.fossils) ? (groupDetail as any).fossils : [];

  const goPiece = useCallback(
    (name: string) => {
      router.push({
        pathname: "/fossil/[id]",
        params: { id: encodeURIComponent(name) },
      } as any);
    },
    [router]
  );

  const goGroup = useCallback(() => {
    if (!fossilGroup) return;
    router.push({
      pathname: "/fossil-group/[id]",
      params: { id: encodeURIComponent(fossilGroup) },
    } as any);
  }, [router, fossilGroup]);

  const showMainSpinner = loading || (fossilGroup && relatedLoading);

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Fossils" headerLayout="inline">
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

                {fossilGroup ? (
                  <Pressable
                    onPress={goGroup}
                    className="mt-3 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700 flex-row items-center"
                  >
                    <Feather name="layers" size={14} color="#cbd5e1" />
                    <Text className="ml-2 text-[11px] text-slate-200 font-semibold">View {fossilGroup} group</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </View>

          {/* OVERVIEW */}
          <View className="mt-3 px-1">
            <SectionTitle>Overview</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Fossil Group" value={fossilGroup} />
                <StatRow label="Interactable" value={interactable} />
                <StatRow label="Size (W × L)" value={size} />
                <StatRow label="Colors" value={colors} />
              </Card>
            </View>
          </View>

          {/* MUSEUM INFO (GROUP DETAIL) */}
          {fossilGroup ? (
            <View className="mt-3 px-1">
              <SectionTitle>Museum Info</SectionTitle>
              <View className="mt-2">
                <Card>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] text-slate-400">Group</Text>
                    {groupLoading ? <ActivityIndicator /> : null}
                  </View>

                  <Text className="text-[12px] text-slate-200 mt-2">{fossilGroup}</Text>

                  {groupRoom ? <StatRow label="Room" value={groupRoom} /> : null}

                  {groupDesc ? (
                    <View className="mt-3">
                      <Text className="text-[11px] text-slate-400">Blathers</Text>
                      <Text className="text-[12px] text-slate-200 mt-2 leading-5">{groupDesc}</Text>
                    </View>
                  ) : groupLoading ? (
                    <Text className="text-[11px] text-slate-500 mt-2">Loading description…</Text>
                  ) : (
                    <Text className="text-[11px] text-slate-600 mt-2">No description found.</Text>
                  )}

                  {groupPieces.length ? (
                    <View className="mt-4">
                      <Text className="text-[11px] text-slate-400">Set Pieces</Text>
                      <View className="mt-2 flex-row flex-wrap">
                        {groupPieces.map((p: any, idx: number) => {
                          const n = String(p?.name ?? "").trim();
                          if (!n) return null;

                          const img = asNonEmptyString(p?.image_url);

                          return (
                            <View key={`${n}::piece::${idx}`} className="w-1/3 p-1">
                              <Pressable
                                onPress={() => goPiece(n)}
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
                                  {n}
                                </Text>

                                <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
                                  {fossilGroup}
                                </Text>
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : groupLoading ? (
                    <Text className="text-[11px] text-slate-500 mt-3">Loading set pieces…</Text>
                  ) : null}
                </Card>
              </View>
            </View>
          ) : null}

          {/* PRICING */}
          <View className="mt-3 px-1">
            <SectionTitle>Pricing</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Sell" value={sell ? `${sell} Bells` : null} />
                <StatRow label="HHA Base" value={hhaBase} />
              </Card>
            </View>
          </View>

          {/* RELATED (SAME GROUP) */}
          {fossilGroup ? (
            <View className="mt-3 px-1">
              <SectionTitle>Related Fossil Group</SectionTitle>
              <View className="mt-2">
                <Card>
                  <Text className="text-[11px] text-slate-400">Same group: {fossilGroup}</Text>

                  {related.length === 0 ? (
                    <Text className="mt-2 text-[11px] text-slate-600">No related fossils found.</Text>
                  ) : (
                    <View className="mt-2 flex-row flex-wrap">
                      {related.map((r, idx) => {
                        const name = String((r as any)?.name ?? "").trim();
                        if (!name) return null;

                        const imgs = buildFossilImageCandidates(r);
                        const img = imgs[0] ?? null;

                        return (
                          <View key={`${name}::${idx}`} className="w-1/3 p-1">
                            <Pressable
                              onPress={() => goPiece(name)}
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

                              <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
                                {fossilGroup}
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
