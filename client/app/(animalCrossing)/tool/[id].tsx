// app/animalCrossing/tools/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchToolByName,
  fetchToolsIndex,
  warmToolsIndex,
  type NookipediaToolItem,
} from "@/lib/animalCrossing/nookipediaTools";

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

function buildToolImageCandidates(item?: NookipediaToolItem | null): string[] {
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
  return <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{children}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-3xl bg-slate-900/80 border border-slate-700 p-4">{children}</View>;
}

function formatBuy(buy: any): string | null {
  const arr = Array.isArray(buy) ? buy : [];
  const parts = arr
    .map((b: any) => {
      if (b == null) return null;
      if (typeof b === "object") {
        const p = b?.price;
        const c = asNonEmptyString(b?.currency);
        if (p != null) return `${formatBells(p) ?? String(p)}${c ? ` ${c}` : ""}`;
        if (c) return c;
      }
      const s = String(b).trim();
      return s ? s : null;
    })
    .filter(Boolean) as string[];

  const cleaned = uniqStrings(parts);
  return cleaned.length ? cleaned.join(" • ") : null;
}

export default function ToolDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const toolName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaToolItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroFailed, setHeroFailed] = useState(false);

  const [relatedLoading, setRelatedLoading] = useState(false);
  const [related, setRelated] = useState<NookipediaToolItem[]>([]);

  useEffect(() => {
    void warmToolsIndex();
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

        let fetched: NookipediaToolItem | null = null;

        try {
          const x = await fetchToolByName(toolName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          fetched = x;
          setItem(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchToolByName(toolName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          fetched = x2;
          setItem(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        const myCategory = asNonEmptyString((fetched as any)?.category);
        const myName = String((fetched as any)?.name ?? toolName).trim().toLowerCase();

        if (myCategory) {
          setRelatedLoading(true);

          try {
            const index = await fetchToolsIndex();
            if (cancelled) return;

            const filtered = index.filter((x: any) => {
              const n = String(x?.name ?? "").trim().toLowerCase();
              if (!n || n === myName) return false;

              const cat = asNonEmptyString(x?.category);
              return !!cat && cat === myCategory;
            });

            filtered.sort((a: any, b: any) => {
              const an = String(a?.name ?? "");
              const bn = String(b?.name ?? "");
              return an.localeCompare(bn);
            });

            setRelated(filtered.slice(0, 24));
          } catch (e2) {
            console.warn("Related tools index failed:", e2);
          } finally {
            if (!cancelled) setRelatedLoading(false);
          }
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load tool.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toolName]);

  const displayName = item?.name ? String(item.name) : toolName;

  const candidates = useMemo(() => buildToolImageCandidates(item), [item]);
  const heroUri = !heroFailed ? (candidates[0] ?? null) : (candidates[1] ?? candidates[0] ?? null);

  const uses =
    (item as any)?.uses != null && Number.isFinite(Number((item as any).uses))
      ? String((item as any).uses)
      : null;

  const sell = formatBells((item as any)?.sell);
  const buy = formatBuy((item as any)?.buy);

  const hha = (item as any)?.hha_base != null ? String((item as any).hha_base) : null;

  const customizable =
    (item as any)?.customizable != null ? (String((item as any).customizable) === "true" ? "Yes" : "No") : null;

  const customKits = (item as any)?.custom_kits != null ? String((item as any).custom_kits) : null;
  const customBodyPart = asNonEmptyString((item as any)?.custom_body_part);
  const versionAdded = asNonEmptyString((item as any)?.version_added);

  const availabilityFrom = joinList(
    Array.isArray((item as any)?.availability) ? (item as any).availability.map((a: any) => a?.from).filter(Boolean) : [],
    " • "
  );

  const notes = asNonEmptyString((item as any)?.notes);
  const category = asNonEmptyString((item as any)?.category);

  const goRelated = useCallback(
    (name: string) => {
      router.push({
        pathname: "/tools/[id]",
        params: { id: encodeURIComponent(name) },
      } as any);
    },
    [router]
  );

  const showMainSpinner = loading || (category && relatedLoading);

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Tools" headerLayout="inline">
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
                {category ? <Text className="mt-1 text-[11px] text-slate-500 text-center">{category}</Text> : null}
              </View>
            </Card>
          </View>

          {/* OVERVIEW */}
          <View className="mt-3 px-1">
            <SectionTitle>Overview</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Uses" value={uses} />
                <StatRow label="Customizable" value={customizable} />
                <StatRow label="Custom Kits" value={customKits} />
                <StatRow label="Custom Body Part" value={customBodyPart} />
                <StatRow label="HHA Base" value={hha} />
                <StatRow label="Version Added" value={versionAdded} />
              </Card>
            </View>
          </View>

          {/* PRICING */}
          <View className="mt-3 px-1">
            <SectionTitle>Pricing</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Sell" value={sell ? `${sell} Bells` : null} />
                <StatRow label="Buy" value={buy} />
              </Card>
            </View>
          </View>

          {/* AVAILABILITY */}
          {availabilityFrom ? (
            <View className="mt-3 px-1">
              <SectionTitle>Availability</SectionTitle>
              <View className="mt-2">
                <Card>
                  <StatRow label="From" value={availabilityFrom} />
                </Card>
              </View>
            </View>
          ) : null}

          {/* NOTES */}
          {notes ? (
            <View className="mt-3 px-1">
              <SectionTitle>Notes</SectionTitle>
              <View className="mt-2">
                <Card>
                  <Text className="text-[12px] text-slate-200">{notes}</Text>
                </Card>
              </View>
            </View>
          ) : null}

          {/* RELATED */}
          {category ? (
            <View className="mt-3 px-1">
              <SectionTitle>Related Category</SectionTitle>
              <View className="mt-2">
                <Card>
                  <Text className="text-[11px] text-slate-400">Same category: {category}</Text>

                  {related.length === 0 ? (
                    <Text className="mt-2 text-[11px] text-slate-600">No related tools found.</Text>
                  ) : (
                    <View className="mt-2 flex-row flex-wrap">
                      {related.map((r, idx) => {
                        const name = String((r as any)?.name ?? "").trim();
                        if (!name) return null;

                        const imgs = buildToolImageCandidates(r);
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

                              <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
                                {category}
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
