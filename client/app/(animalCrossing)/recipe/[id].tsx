// app/animalCrossing/recipes/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchRecipeByName,
  fetchRecipesIndex,
  warmRecipesIndex,
  type NookipediaRecipeItem,
} from "@/lib/animalCrossing/nookipediaRecipes";

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

export default function RecipeDetailPage() {
  const params = useLocalSearchParams();
  const rawId = String((params as any).id ?? "");
  const recipeName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaRecipeItem | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroFailed, setHeroFailed] = useState(false);

  useEffect(() => {
    void warmRecipesIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setItem(null);
        setHeroFailed(false);

        try {
          const x = await fetchRecipeByName(recipeName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          setItem(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchRecipeByName(recipeName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          setItem(x2);
          setThumbUsed(THUMB_FALLBACK);
        }

        // optional warm full index so back nav feels instant later
        void fetchRecipesIndex().catch(() => {});
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load recipe.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recipeName]);

  const displayName = item?.name ? String(item.name) : recipeName;

  const heroUri = !heroFailed
    ? asNonEmptyString((item as any)?.image_url)
    : (asNonEmptyString((item as any)?.render_url) ?? asNonEmptyString((item as any)?.image_url));

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

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Recipes" headerLayout="inline">
      {loading ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading…</Text>
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
                <StatRow label="Serial ID" value={serial} />
                <StatRow label="Recipes to Unlock" value={recipesToUnlock} />
                <StatRow label="Availability From" value={availabilityFrom} />
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

          {/* MATERIALS */}
          {materials.length ? (
            <View className="mt-3 px-1">
              <SectionTitle>Materials</SectionTitle>
              <View className="mt-2">
                <Card>
                  {materials.map((m: any, idx: number) => {
                    const n = asNonEmptyString(m?.name) ?? "Material";
                    const c = m?.count != null ? String(m.count) : "";
                    return (
                      <View
                        key={`${n}::${idx}`}
                        className="flex-row items-center justify-between py-2 border-b border-slate-800"
                      >
                        <Text className="text-[12px] text-slate-200 font-semibold">{n}</Text>
                        <Text className="text-[12px] text-slate-400">{c ? `× ${c}` : ""}</Text>
                      </View>
                    );
                  })}
                </Card>
              </View>
            </View>
          ) : null}

          {/* AVAILABILITY NOTES */}
          {availabilityNotes?.length ? (
            <View className="mt-3 px-1">
              <SectionTitle>How to Get</SectionTitle>
              <View className="mt-2">
                <Card>
                  {availabilityNotes.map((line: string, idx: number) => (
                    <Text key={`${idx}`} className="text-[12px] text-slate-200 mb-2">
                      • {line}
                    </Text>
                  ))}
                </Card>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </PageWrapper>
  );
}
