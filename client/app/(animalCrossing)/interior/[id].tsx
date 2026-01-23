// app/animalCrossing/interior/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";

import PageWrapper from "@/components/PageWrapper";
import { fetchInteriorByName, type NookipediaInteriorDetailItem } from "@/lib/animalCrossing/nookipediaInterior";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => {
  return (
    <View className="flex-row justify-between p-2 items-start border-b border-slate-800/70">
      <Text className="text-[11px] text-slate-400 pr-3">{label}</Text>
      <View className="flex-1 items-end">
        {typeof value === "string" ? (
          <Text className="text-[11px] text-slate-100 text-right">{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

export default function InteriorDetailPage() {
  const params = useLocalSearchParams();
  const rawId = (params as any)?.id;
  const id = useMemo(() => decodeURIComponent(String(rawId ?? "").trim()), [rawId]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [item, setItem] = useState<NookipediaInteriorDetailItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const data = await fetchInteriorByName(id, { thumbsize: 512 });
        if (cancelled) return;

        setItem(data ?? null);
      } catch (e) {
        if (cancelled) return;
        console.warn("Interior detail failed:", e);
        setErr(e instanceof Error ? e.message : "Failed to load interior item.");
        setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = String(item?.name ?? id ?? "Interior").trim() || "Interior";
  const subtitle = String((item as any)?.category ?? "Interior").trim() || "Interior";
  const imageUrl = String((item as any)?.image_url ?? "").trim();

  const themes = Array.isArray((item as any)?.themes) ? (item as any).themes : [];
  const colors = Array.isArray((item as any)?.colors) ? (item as any).colors : [];
  const availability = Array.isArray((item as any)?.availability) ? (item as any).availability : [];
  const buy = Array.isArray((item as any)?.buy) ? (item as any).buy : [];

  return (
    <PageWrapper scroll={false} title={title} subtitle={subtitle}>
      {loading ? (
        <View className="flex-1 items-center justify-center pt-10">
          <ActivityIndicator />
          <Text className="text-[11px] text-slate-400 mt-3">Loading…</Text>
        </View>
      ) : err ? (
        <View className="flex-1 items-center justify-center px-6 pt-10">
          <Text className="text-[12px] text-rose-300 font-semibold">Failed to load</Text>
          <Text className="text-[11px] text-slate-500 mt-2 text-center">{err}</Text>
        </View>
      ) : !item ? (
        <View className="flex-1 items-center justify-center px-6 pt-10">
          <Text className="text-[12px] text-slate-200 font-semibold">Not found</Text>
          <Text className="text-[11px] text-slate-500 mt-2 text-center">Couldn’t find that interior item.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Hero */}
          <View className="mt-4 rounded-3xl bg-slate-900/80 border border-slate-700 px-4 py-4">
            <View className="flex-row items-center">
              <View className="w-[110px] h-[110px] rounded-3xl bg-slate-950/60 border border-slate-700 items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ width: 110, height: 110 }} resizeMode="contain" />
                ) : (
                  <Text className="text-[11px] text-slate-500">No image</Text>
                )}
              </View>

              <View className="flex-1 pl-3">
                <Text className="text-[14px] text-slate-100 font-semibold" numberOfLines={2}>
                  {String((item as any)?.name ?? "").trim()}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-1">{String((item as any)?.category ?? "").trim()}</Text>

                {!!String((item as any)?.version_added ?? "").trim() ? (
                  <Text className="text-[10px] text-slate-500 mt-2">Added: {String((item as any).version_added)}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Stats */}
          <View className="mt-3 rounded-3xl bg-slate-900/80 border border-slate-700 px-4 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Stats</Text>

            <Row label="Sell" value={String((item as any)?.sell ?? "—")} />
            <Row label="HHA Category" value={String((item as any)?.hha_category ?? "—")} />
            <Row label="HHA Base" value={String((item as any)?.hha_base ?? "—")} />
            <Row label="Tag" value={String((item as any)?.tag ?? "—")} />
            <Row
              label="Grid"
              value={`${String((item as any)?.grid_width ?? "—")} × ${String((item as any)?.grid_length ?? "—")}`}
            />
          </View>

          {/* Buy */}
          <View className="mt-3 rounded-3xl bg-slate-900/80 border border-slate-700 px-4 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Buy</Text>

            {buy.length === 0 ? (
              <Text className="text-[11px] text-slate-500">No buy info.</Text>
            ) : (
              buy.slice(0, 20).map((b: any, idx: number) => (
                <Row key={`buy::${idx}`} label={String(b?.currency ?? "Currency")} value={String(b?.price ?? "—")} />
              ))
            )}
          </View>

          {/* Others */}
          <View className="mt-3 rounded-3xl bg-slate-900/80 border border-slate-700 px-4 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">Others</Text>

            <Row label="Series" value={String((item as any)?.item_series ?? "—")} />
            <Row label="Set" value={String((item as any)?.item_set ?? "—")} />
            <Row label="Themes" value={themes.length ? themes.join(", ") : "—"} />
            <Row label="Colors" value={colors.length ? colors.join(", ") : "—"} />
            <Row label="Unlocked" value={String((item as any)?.unlocked ?? "—")} />
            <Row label="Notes" value={String((item as any)?.notes ?? "—")} />
          </View>

          {/* Availability */}
          <View className="mt-3 rounded-3xl bg-slate-900/80 border border-slate-700 px-4 py-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
              Availability
            </Text>

            {availability.length === 0 ? (
              <Text className="text-[11px] text-slate-500">No availability info.</Text>
            ) : (
              availability.slice(0, 30).map((a: any, idx: number) => {
                const from = String(a?.from ?? "").trim() || "—";
                const note = String(a?.note ?? "").trim();
                return <Row key={`avail::${idx}`} label={from} value={note ? note : "—"} />;
              })
            )}
          </View>
        </ScrollView>
      )}
    </PageWrapper>
  );
}
