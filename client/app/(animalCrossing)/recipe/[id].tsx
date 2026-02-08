// app/animalCrossing/recipes/[id].tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchRecipeByName,
  fetchRecipesIndex,
  warmRecipesIndex,
  type NookipediaRecipeItem,
} from "@/lib/animalCrossing/nookipediaRecipes";
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

function buildRecipeImageCandidates(item?: NookipediaRecipeItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any)?.image_url, (item as any)?.render_url]);
}

/* -----------------------------
   “Recipe” theme UI (rainbow)
------------------------------ */

function RainbowSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="flex-row items-center mr-2">
        <View className="w-2 h-2 rounded-full bg-rose-300/80 mr-1" />
        <View className="w-2 h-2 rounded-full bg-amber-300/80 mr-1" />
        <View className="w-2 h-2 rounded-full bg-lime-300/80 mr-1" />
        <View className="w-2 h-2 rounded-full bg-cyan-300/80 mr-1" />
        <View className="w-2 h-2 rounded-full bg-indigo-300/80 mr-1" />
        <View className="w-2 h-2 rounded-full bg-fuchsia-300/80" />
      </View>
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-white/80">{children}</Text>
    </View>
  );
}

function RainbowCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-slate-950/35 border border-white/10 p-4 overflow-hidden">
      {/* rainbow blobs */}
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-fuchsia-400/12" />
      <View className="absolute top-14 -left-10 w-40 h-40 rounded-full bg-cyan-400/10" />
      <View className="absolute -bottom-12 left-12 w-56 h-56 rounded-full bg-amber-400/10" />
      <View className="absolute bottom-10 -right-14 w-48 h-48 rounded-full bg-lime-400/10" />
      {/* sparkles */}
      <View className="absolute top-10 left-10 w-2 h-2 rounded-full bg-white/12" />
      <View className="absolute top-20 left-16 w-3 h-3 rounded-full bg-white/10" />
      <View className="absolute bottom-16 right-14 w-2 h-2 rounded-full bg-white/12" />
      {children}
    </View>
  );
}

function RainbowTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-white/8 border border-white/12">
        <Text className="text-[16px] font-extrabold text-white text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-white/65 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function RainbowChip({ label, value }: { label: string; value?: any }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-white/70">•</Text>
        </View>
        <Text className="text-[11px] text-white/70">{label}</Text>
      </View>
      <Text className="text-[11px] text-white text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function RainbowNote({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-white/7 border border-white/10 px-4 py-3">
        <Text className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-white/60">{label}</Text>
        <Text className="mt-1 text-[12px] text-white leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-white/10" />
    </View>
  );
}

export default function RecipeDetailPage() {
  const params = useLocalSearchParams();
  const rawId = String((params as any).id ?? "");
  const recipeName = useMemo(() => decodeURIComponent(rawId), [rawId]);
  const key = useMemo(() => `recipe:${String(recipeName ?? "").trim()}`, [recipeName]);
  const entry = useAnimalCrossingCollectionStore((s: any) => s.entries?.[key] ?? null);

  const toggleCollected = useAnimalCrossingCollectionStore((s: any) => s.toggleCollected);
  const incrementCount = useAnimalCrossingCollectionStore((s: any) => s.incrementCount);
  const decrementCount = useAnimalCrossingCollectionStore((s: any) => s.decrementCount);
  const setCount = useAnimalCrossingCollectionStore((s: any) => s.setCount);

  const isCollected = !!entry?.collected;
  const count = Math.max(Number(entry?.count || 0), 0);

  const onToggleCollected = useCallback(() => {
    toggleCollected("recipe", recipeName);
  }, [toggleCollected, recipeName]);

  const onInc = useCallback(() => {
    incrementCount("recipe", recipeName);
  }, [incrementCount, recipeName]);

  const onDec = useCallback(() => {
    decrementCount("recipe", recipeName);
  }, [decrementCount, recipeName]);

  const onSetToOneIfNeeded = useCallback(() => {
    if (!isCollected || count <= 0) setCount("recipe", recipeName, 1);
  }, [isCollected, count, setCount, recipeName]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaRecipeItem | null>(null);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroLoading, setHeroLoading] = useState(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    void warmRecipesIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const myReq = ++requestIdRef.current;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setItem(null);
        setHeroCandidateIndex(0);

        const low = await fetchRecipeByName(recipeName, { thumbsize: THUMB_FALLBACK });
        if (cancelled || requestIdRef.current !== myReq) return;

        setItem(low);
        setLoading(false);

        void fetchRecipesIndex().catch(() => {});

        try {
          const hi = await fetchRecipeByName(recipeName, { thumbsize: THUMB_PRIMARY });
          if (cancelled || requestIdRef.current !== myReq) return;

          if (hi) {
            setItem((prev) => ({ ...(prev as any), ...(hi as any) }));
          }
        } catch {
          // ignore: we already have low-res content
        }
      } catch (e) {
        if (cancelled || requestIdRef.current !== myReq) return;
        setError(e instanceof Error ? e.message : "Failed to load recipe.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recipeName]);

  const displayName = item?.name ? String(item.name) : recipeName;

  const heroCandidates = useMemo(() => buildRecipeImageCandidates(item), [item]);
  const heroUri = heroCandidates[heroCandidateIndex] ?? null;

  useEffect(() => {
    setHeroCandidateIndex(0);
  }, [heroCandidates.length]);

  useEffect(() => {
    if (!heroUri) return;
    ExpoImage.prefetch(heroUri).catch(() => {});
  }, [heroUri]);

  const onHeroError = useCallback(() => {
    setHeroLoading(false);
    if (heroCandidateIndex + 1 < heroCandidates.length) setHeroCandidateIndex((i) => i + 1);
  }, [heroCandidateIndex, heroCandidates.length]);

  const serial = (item as any)?.serial_id != null ? String((item as any).serial_id) : null;
  const sell = formatBells((item as any)?.sell);

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

  const recipesToUnlock = (item as any)?.recipes_to_unlock != null ? String((item as any).recipes_to_unlock) : null;

  const availabilityFrom = joinList(
    Array.isArray((item as any)?.availability)
      ? (item as any).availability.map((a: any) => a?.from).filter(Boolean)
      : [],
    " • "
  );

  const availabilityNotes = (() => {
    const arr = Array.isArray((item as any)?.availability) ? (item as any).availability : [];
    const parts = arr
      .map((a: any) => {
        const f = asNonEmptyString(a?.from);
        const n = asNonEmptyString(a?.note);
        if (!f && !n) return null;
        if (f && n) return `${f}: ${n}`;
        return f ?? n;
      })
      .filter(Boolean);
    return parts.length ? parts : null;
  })();

  const materials = Array.isArray((item as any)?.materials) ? (item as any).materials : [];

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (serial) parts.push(`#${serial}`);
    if (materials.length) parts.push(`${materials.length} materials`);
    return parts.join(" • ");
  }, [serial, materials.length]);

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Recipes" headerLayout="inline">
      {loading ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-white/70">Loading…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/35 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          {/* HERO / “DIY Rainbow” */}
          <View className="mt-4">
            <RainbowCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-white/8 border border-white/12 items-center justify-center">
                    <Feather name="tool" size={16} color="#ffffff" />
                  </View>
                  <Text className="ml-2 text-[11px] font-extrabold tracking-[0.14em] text-white/70 uppercase">
                    DIY Rainbow
                  </Text>
                </View>

                <View className="px-3 py-2 rounded-full bg-white/8 border border-white/10">
                  <Text className="text-[11px] font-extrabold text-white">#{serial}</Text>
                </View>
              </View>

              <View className="flex-row">
                {/* portrait */}
                <View className="w-[132px]">
                  <View className="rounded-[26px] bg-white/6 border border-white/10 p-3 items-center justify-center">
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
                                backgroundColor: "rgba(255,255,255,0.06)",
                                borderRadius: 18,
                              }}
                            >
                              <ActivityIndicator />
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                          <Feather name="image" size={18} color="#ffffff" />
                          <Text className="text-white/60 text-[10px] mt-2">No image</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* title + collected */}
                <View className="flex-1 pl-3">
                  <RainbowTitle title={displayName} subtitle={subtitleLine || null} />

                  <View className="mt-3 items-center">
                    <View className="flex-row">
                      <View className="w-2 h-2 rounded-full bg-rose-300/80 mr-1" />
                      <View className="w-2 h-2 rounded-full bg-amber-300/80 mr-1" />
                      <View className="w-2 h-2 rounded-full bg-lime-300/80 mr-1" />
                      <View className="w-2 h-2 rounded-full bg-cyan-300/80 mr-1" />
                      <View className="w-2 h-2 rounded-full bg-indigo-300/80 mr-1" />
                      <View className="w-2 h-2 rounded-full bg-fuchsia-300/80" />
                    </View>

                    <Pressable
                      onPress={() => {
                        onToggleCollected();
                        onSetToOneIfNeeded();
                      }}
                      className={`mt-3 px-4 py-2 rounded-full border ${
                        isCollected ? "bg-emerald-500/14 border-emerald-200/20" : "bg-white/8 border-white/12"
                      }`}
                    >
                      <Text className={`text-[11px] font-extrabold tracking-[0.08em] ${isCollected ? "text-emerald-100" : "text-white"}`}>
                        {isCollected ? "Learned" : "Learn"}
                      </Text>
                    </Pressable>

                    {isCollected ? (
                      <View className="mt-3 flex-row items-center">
                        <Pressable
                          onPress={onDec}
                          className="w-9 h-9 rounded-2xl bg-white/8 border border-white/12 items-center justify-center"
                        >
                          <Text className="text-white text-[16px] font-bold">−</Text>
                        </Pressable>

                        <View className="px-4 items-center">
                          <Text className="text-[16px] text-white font-extrabold">{count}</Text>
                          <Text className="text-[10px] text-white/60 font-extrabold tracking-[0.14em] uppercase">owned</Text>
                        </View>

                        <Pressable
                          onPress={onInc}
                          className="w-9 h-9 rounded-2xl bg-white/8 border border-white/12 items-center justify-center"
                        >
                          <Text className="text-white text-[16px] font-bold">+</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <RainbowNote label="Isabelle" value={availabilityNotes?.[0] ?? null} />
            </RainbowCard>
          </View>

          <RainbowSectionLabel>Overview</RainbowSectionLabel>
          <RainbowCard>
            <RainbowChip label="Serial ID" value={serial} />
            <RainbowChip label="Recipes to Unlock" value={recipesToUnlock} />
            <RainbowChip label="Availability From" value={availabilityFrom} />
          </RainbowCard>

          <RainbowSectionLabel>Pricing</RainbowSectionLabel>
          <RainbowCard>
            <RainbowChip label="Sell" value={sell ? `${sell} Bells` : null} />
            <RainbowChip label="Buy" value={buy} />
          </RainbowCard>

          {materials.length ? (
            <>
              <RainbowSectionLabel>Materials</RainbowSectionLabel>
              <RainbowCard>
                {materials.map((m: any, idx: number) => {
                  const n = asNonEmptyString(m?.name) ?? "Material";
                  const c = m?.count != null ? String(m.count) : null;
                  const isLast = idx === materials.length - 1;

                  return (
                    <View
                      key={`${n}::${idx}`}
                      className={`flex-row items-center justify-between py-2 ${isLast ? "" : "border-b border-white/10"}`}
                    >
                      <View className="flex-row items-center">
                        <View className="w-2 h-2 rounded-full bg-white/40 mr-2" />
                        <Text className="text-[12px] text-white font-semibold">{n}</Text>
                      </View>
                      <Text className="text-[12px] text-white/70 font-semibold">{c ? `× ${c}` : ""}</Text>
                    </View>
                  );
                })}
              </RainbowCard>
            </>
          ) : null}

          {availabilityNotes?.length ? (
            <>
              <RainbowSectionLabel>How to Get</RainbowSectionLabel>
              <RainbowCard>
                {availabilityNotes.map((line: string, idx: number) => (
                  <Text key={`${idx}`} className="text-[12px] text-white/90 mb-2">
                    • {line}
                  </Text>
                ))}
              </RainbowCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
