//client/app/(animalCrossing)/interior/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import { fetchInteriorByName, type NookipediaInteriorDetailItem } from "@/lib/animalCrossing/nookipediaInterior";

function asNonEmptyString(v: any): string | null {
  const s = String(v ?? "").trim();
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-teal-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-teal-100/90">{children}</Text>
    </View>
  );
}

function PaperCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-teal-950/25 border border-teal-400/18 p-4 overflow-hidden">
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-teal-300/10" />
      <View className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full bg-lime-300/10" />
      <View className="absolute top-8 left-10 w-2 h-2 rounded-full bg-white/6" />
      <View className="absolute bottom-10 right-12 w-3 h-3 rounded-full bg-white/5" />
      {children}
    </View>
  );
}

function WoodTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-amber-900/30 border border-amber-200/18">
        <Text className="text-[16px] font-extrabold text-amber-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-teal-100/80 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function StatRow({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <Text className="text-[11px] text-teal-100/70">{label}</Text>
      <Text className="text-[11px] text-slate-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function interiorIconName(category?: string | null): keyof typeof Feather.glyphMap {
  const c = String(category ?? "").toLowerCase();
  if (c.includes("wall")) return "layout";
  if (c.includes("floor")) return "grid";
  if (c.includes("rug")) return "square";
  if (c.includes("ceiling")) return "umbrella";
  if (c.includes("houseware")) return "home";
  if (c.includes("misc")) return "box";
  return "package";
}

function interiorAccent(category?: string | null) {
  const c = String(category ?? "").toLowerCase();
  if (c.includes("wall")) return { bg: "bg-violet-500/14", border: "border-violet-200/18", color: "#ddd6fe" };
  if (c.includes("floor")) return { bg: "bg-amber-500/12", border: "border-amber-200/18", color: "#fde68a" };
  if (c.includes("rug")) return { bg: "bg-rose-500/12", border: "border-rose-200/18", color: "#fecdd3" };
  if (c.includes("ceiling")) return { bg: "bg-cyan-500/12", border: "border-cyan-200/18", color: "#a5f3fc" };
  if (c.includes("misc")) return { bg: "bg-sky-500/14", border: "border-sky-200/18", color: "#bae6fd" };
  return { bg: "bg-teal-500/16", border: "border-teal-200/18", color: "#a7f3d0" };
}

export default function InteriorDetailPage() {
  const params = useLocalSearchParams();
  const rawId = (params as any)?.id;
  const id = useMemo(() => decodeURIComponent(String(rawId ?? "").trim()), [rawId]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [item, setItem] = useState<NookipediaInteriorDetailItem | null>(null);

  const [heroLoading, setHeroLoading] = useState(false);

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

  useEffect(() => {
    if (!imageUrl) return;
    ExpoImage.prefetch(imageUrl).catch(() => {});
  }, [imageUrl]);

  const themes = Array.isArray((item as any)?.themes) ? (item as any).themes : [];
  const colors = Array.isArray((item as any)?.colors) ? (item as any).colors : [];
  const availability = Array.isArray((item as any)?.availability) ? (item as any).availability : [];
  const buy = Array.isArray((item as any)?.buy) ? (item as any).buy : [];

  const iconName = interiorIconName(subtitle);
  const accent = interiorAccent(subtitle);

  return (
    <PageWrapper scroll={false} title={title} subtitle={subtitle} headerLayout="inline">
      {loading ? (
        <View className="flex-1 items-center justify-center pt-10">
          <ActivityIndicator />
          <Text className="text-[11px] text-teal-100/70 mt-3">Loading…</Text>
        </View>
      ) : err ? (
        <View className="flex-1 items-center justify-center px-6 pt-10">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-[12px] text-rose-200 font-semibold text-center">Failed to load</Text>
            <Text className="text-[11px] text-slate-200/60 mt-2 text-center">{err}</Text>
          </View>
        </View>
      ) : !item ? (
        <View className="flex-1 items-center justify-center px-6 pt-10">
          <Text className="text-[12px] text-slate-200 font-semibold">Not found</Text>
          <Text className="text-[11px] text-slate-300/50 mt-2 text-center">Couldn’t find that interior item.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} className="px-3">
          <View className="mt-4">
            <PaperCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className={`w-8 h-8 rounded-2xl ${accent.bg} border ${accent.border} items-center justify-center`}>
                    <Feather name={iconName as any} size={16} color={accent.color} />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-teal-100/75 uppercase">
                    Nook&#39;s Catalog
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="w-[132px]">
                  <View className="rounded-[26px] bg-teal-900/14 border border-teal-300/16 p-3 items-center justify-center overflow-hidden">
                    <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                      {imageUrl ? (
                        <>
                          <ExpoImage
                            source={{ uri: imageUrl }}
                            style={{ width: 96, height: 96 }}
                            contentFit="contain"
                            transition={120}
                            cachePolicy="disk"
                            onLoadStart={() => setHeroLoading(true)}
                            onLoad={() => setHeroLoading(false)}
                            onError={() => setHeroLoading(false)}
                          />
                          {heroLoading && (
                            <View
                              style={{
                                position: "absolute",
                                inset: 0,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(13, 148, 136, 0.18)",
                                borderRadius: 18,
                              }}
                            >
                              <ActivityIndicator />
                            </View>
                          )}
                        </>
                      ) : (
                        <>
                          <View className="rounded-[22px] bg-teal-950/35 border border-teal-300/16 w-[96px] h-[96px] items-center justify-center">
                            <Feather name="image" size={18} color="#99f6e4" />
                          </View>
                          <Text className="text-[10px] text-teal-100/60 mt-2">No image</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>

                <View className="flex-1 pl-3">
                  <WoodTitle title={title} subtitle={subtitle} />
                </View>
              </View>
            </PaperCard>
          </View>

          <SectionLabel>Stats</SectionLabel>
          <PaperCard>
            <StatRow
              label="Sell"
              value={formatBells((item as any)?.sell) ? `${formatBells((item as any)?.sell)} Bells` : null}
            />
            <StatRow label="HHA Category" value={asNonEmptyString((item as any)?.hha_category)} />
            <StatRow label="HHA Base" value={asNonEmptyString((item as any)?.hha_base)} />
            <StatRow label="Tag" value={asNonEmptyString((item as any)?.tag)} />
            {asNonEmptyString((item as any)?.grid_width) && asNonEmptyString((item as any)?.grid_length) ? (
              <StatRow label="Grid" value={`${String((item as any)?.grid_width)} × ${String((item as any)?.grid_length)}`} />
            ) : null}
            <StatRow label="Version Added" value={asNonEmptyString((item as any)?.version_added)} />
          </PaperCard>

          <SectionLabel>Buy</SectionLabel>
          <PaperCard>
            {buy.length === 0 ? (
              <Text className="text-[11px] text-teal-100/55">No buy info.</Text>
            ) : (
              buy.slice(0, 20).map((b: any, idx: number) => {
                const cur = asNonEmptyString(b?.currency) ?? "Currency";
                const price = asNonEmptyString(b?.price) ?? "—";
                return <StatRow key={`buy::${idx}`} label={cur} value={price} />;
              })
            )}
          </PaperCard>

          <SectionLabel>Details</SectionLabel>
          <PaperCard>
            <StatRow label="Series" value={asNonEmptyString((item as any)?.item_series)} />
            <StatRow label="Set" value={asNonEmptyString((item as any)?.item_set)} />
            <StatRow label="Themes" value={joinList(themes, ", ")} />
            <StatRow label="Colors" value={joinList(colors, ", ")} />
            <StatRow label="Unlocked" value={asNonEmptyString((item as any)?.unlocked)} />
            <StatRow label="Notes" value={asNonEmptyString((item as any)?.notes)} />
          </PaperCard>

          <SectionLabel>Availability</SectionLabel>
          <PaperCard>
            {availability.length === 0 ? (
              <Text className="text-[11px] text-teal-100/55">No availability info.</Text>
            ) : (
              availability.slice(0, 30).map((a: any, idx: number) => {
                const from = asNonEmptyString(a?.from) ?? "—";
                const note = asNonEmptyString(a?.note) ?? "—";
                return <StatRow key={`avail::${idx}`} label={from} value={note} />;
              })
            )}
          </PaperCard>

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
