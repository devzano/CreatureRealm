// components/AnimalCrossing/ACNookMilesGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import LocalIcon from "@/components/LocalIcon";

import {
  fetchNookMilesData,
  type NookMilesAchievement,
  type NookMilesPlusCategory,
  type NookMilesTier,
  type NookMilesPlusTask,
} from "@/lib/animalCrossing/nookMiles";

type ACNookMilesGridProps = {
  search: string;
  numColumns?: number; // default 2
  emptyText?: string; // default "No Nook Miles found."
};

type Mode = "miles" | "plus";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeText(v: any): string {
  if (v == null) return "";
  return String(v);
}

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function containsFold(hay: any, needle: any) {
  const h = norm(hay);
  const n = norm(needle);
  if (!n) return true;
  return h.includes(n);
}

function isRemoteImage(src: string | null | undefined) {
  const s = String(src ?? "");
  return s.startsWith("http://") || s.startsWith("https://");
}

function SmartImage({
  source,
  size,
  rounded = 14,
  contentFit = "cover",
  style,
}: {
  source: string;
  size: number;
  rounded?: number;
  contentFit?: "cover" | "contain";
  style?: any;
}) {
  if (isRemoteImage(source)) {
    return (
      <ExpoImage
        source={{ uri: source }}
        style={[{ width: size, height: size, borderRadius: rounded }, style]}
        contentFit={contentFit}
      />
    );
  }

  return (
    <LocalIcon
      source={source}
      size={size}
      roundedClassName={`rounded-[${rounded}px]`}
      placeholderClassName="bg-white/5 border border-white/10"
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode; }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function fmtMiles(n: number | null | undefined) {
  if (!Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  return `${v}`;
}

function maxMilesFromTiers(tiers: NookMilesTier[]) {
  let best = 0;
  for (const t of tiers ?? []) {
    const m = safeNum((t as any).miles);
    if (m != null) best = Math.max(best, m);
  }
  return best > 0 ? best : null;
}

function maxMilesFromTasks(tasks: NookMilesPlusTask[]) {
  let best = 0;
  for (const t of tasks ?? []) {
    const m = safeNum((t as any).miles);
    if (m != null) best = Math.max(best, m);
  }
  return best > 0 ? best : null;
}

function achievementMatchesSearch(a: NookMilesAchievement, search: string) {
  const q = norm(search);
  if (!q) return true;

  const blobs: string[] = [
    a.id,
    a.title,
    a.description ?? "",
    a.iconUrl ?? "",
    ...((a.tiers ?? []).flatMap((t) => [
      ...(((t as any).tierNames ?? []) as string[]),
      t.task,
      String(t.miles),
    ])),
  ];

  return blobs.some((b) => containsFold(b, q));
}

function plusMatchesSearch(c: NookMilesPlusCategory, search: string) {
  const q = norm(search);
  if (!q) return true;

  const blobs: string[] = [
    c.id,
    c.title,
    c.iconUrl ?? "",
    ...((c.tasks ?? []).flatMap((t) => [t.title, String(t.miles)])),
  ];

  return blobs.some((b) => containsFold(b, q));
}

type Selected =
  | { kind: "achievement"; item: NookMilesAchievement; }
  | { kind: "plus"; item: NookMilesPlusCategory; }
  | null;

function TilePill({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "neutral" | "emerald" | "amber";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10"
        : "border-white/10 bg-white/[0.04]";

  const tcls =
    tone === "emerald"
      ? "text-emerald-200"
      : tone === "amber"
        ? "text-amber-200"
        : "text-white/70";

  return (
    <View className={["px-2 py-0.5 rounded-full border", cls].join(" ")}>
      <Text className={["text-[10px] font-semibold", tcls].join(" ")} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export default function ACNookMilesGrid({
  search,
  numColumns = 2,
  emptyText = "No Nook Miles found.",
}: ACNookMilesGridProps) {
  const cols = clamp(numColumns, 1, 2);
  const TILE_H = 160;

  const [mode, setMode] = useState<Mode>("miles");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [achievements, setAchievements] = useState<NookMilesAchievement[]>([]);
  const [plusCats, setPlusCats] = useState<NookMilesPlusCategory[]>([]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<Selected>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        const data = await fetchNookMilesData();
        if (cancelled) return;

        setAchievements(Array.isArray(data.achievements) ? data.achievements : []);
        setPlusCats(Array.isArray(data.plusCategories) ? data.plusCategories : []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load Nook Miles.");
        setAchievements([]);
        setPlusCats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAchievements = useMemo(() => {
    const list = Array.isArray(achievements) ? achievements : [];
    const out = list.filter((a) => achievementMatchesSearch(a, search));

    out.sort((a, b) => {
      const ma = maxMilesFromTiers(a.tiers ?? []) ?? 0;
      const mb = maxMilesFromTiers(b.tiers ?? []) ?? 0;
      if (mb !== ma) return mb - ma;
      return safeText(a.title).localeCompare(safeText(b.title));
    });

    return out;
  }, [achievements, search]);

  const filteredPlus = useMemo(() => {
    const list = Array.isArray(plusCats) ? plusCats : [];
    const out = list.filter((c) => plusMatchesSearch(c, search));

    out.sort((a, b) => {
      const ma = maxMilesFromTasks(a.tasks ?? []) ?? 0;
      const mb = maxMilesFromTasks(b.tasks ?? []) ?? 0;
      if (mb !== ma) return mb - ma;
      return safeText(a.title).localeCompare(safeText(b.title));
    });

    return out;
  }, [plusCats, search]);

  const openAchievement = useCallback((a: NookMilesAchievement) => {
    setSelected({ kind: "achievement", item: a });
    setSheetVisible(true);
  }, []);

  const openPlus = useCallback((c: NookMilesPlusCategory) => {
    setSelected({ kind: "plus", item: c });
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setSelected(null), 180);
  }, []);

  const listForMode = mode === "miles" ? filteredAchievements : filteredPlus;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <ActivityIndicator />
        <Text className="text-[11px] text-white/50 mt-3">Loading Nook Miles…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 py-6 px-4">
        <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <Text className="text-[12px] text-rose-300 font-semibold">Couldn’t load Nook Miles</Text>
          <Text className="text-[11px] text-white/50 mt-1">{error}</Text>
        </View>
      </View>
    );
  }

  if (!listForMode.length) {
    return (
      <View className="py-10 items-center px-6">
        <Text className="text-white/70 text-sm text-center">{emptyText}</Text>
      </View>
    );
  }

  return (
    <>
      {/* Sub-tabs */}
      <View className="px-4 mt-2 mb-2">
        <View className="flex-row items-center rounded-full bg-slate-900/80 border border-slate-700 p-1">
          <Pressable
            onPress={() => setMode("miles")}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${mode === "miles" ? "bg-slate-800" : ""
              }`}
          >
            <Text className={`text-[11px] font-semibold ${mode === "miles" ? "text-slate-50" : "text-slate-400"}`}>
              Nook Miles
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("plus")}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${mode === "plus" ? "bg-slate-800" : ""
              }`}
          >
            <Text className={`text-[11px] font-semibold ${mode === "plus" ? "text-slate-50" : "text-slate-400"}`}>
              Nook Miles+
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Grid */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 26 }}>
        <View className="px-4">
          <View className="flex-row flex-wrap -mx-2">
            {mode === "miles"
              ? filteredAchievements.map((a) => {
                const thumb = a.iconUrl ?? null;
                const tiersCount = (a.tiers ?? []).length;
                const mx = maxMilesFromTiers(a.tiers ?? []);
                const tileTitle = safeText(a.title) || "Nook Miles";

                return (
                  <View key={a.id} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
                    <Pressable
                      onPress={() => openAchievement(a)}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden active:opacity-90"
                      style={{ height: TILE_H }}
                    >
                      <View className="flex-1 px-3 pt-3 pb-3">
                        <View className="flex-row items-center justify-between mb-3">
                          {/* <View className="flex-row items-center" style={{ gap: 6 }}> */}
                          <TilePill text="Achievement" tone="emerald" />
                          <TilePill text={`${tiersCount} tiers`} />
                          {/* {mx ? <TilePill text={`${fmtMiles(mx)} mi`} /> : null} */}
                          {/* </View> */}
                        </View>

                        <View className="flex-1">
                          <View className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]">
                            {thumb ? (
                              <SmartImage
                                source={thumb}
                                size={70}
                                rounded={0}
                                contentFit="contain"
                                style={{ width: "100%", height: 70, borderRadius: 0 }}
                              />
                            ) : (
                              <View className="items-center justify-center" style={{ width: "100%", height: 70 }}>
                                <Text className="text-[22px]">🎟️</Text>
                              </View>
                            )}
                          </View>

                          <View className="mt-2">
                            <Text numberOfLines={1} className="text-white text-[13px] font-bold leading-4">
                              {tileTitle}
                            </Text>

                            <Text numberOfLines={1} className="text-white/45 text-[11px] mt-1">
                              {a.description ? safeText(a.description) : "Tap to view tiers"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })
              : filteredPlus.map((c) => {
                const thumb = c.iconUrl ?? null;
                const tasksCount = (c.tasks ?? []).length;
                const mx = maxMilesFromTasks(c.tasks ?? []);
                const tileTitle = safeText(c.title) || "Nook Miles+";

                return (
                  <View key={c.id} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
                    <Pressable
                      onPress={() => openPlus(c)}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden active:opacity-90"
                      style={{ height: TILE_H }}
                    >
                      <View className="flex-1 px-3 pt-3 pb-3">
                        <View className="flex-row items-center justify-between mb-3">
                          {/* <View className="flex-row items-center" style={{ gap: 6 }}> */}
                          <TilePill text="Daily" tone="amber" />
                          <TilePill text={`${tasksCount} tasks`} />
                          {/* {mx ? <TilePill text={`${fmtMiles(mx)} mi`} /> : null} */}
                          {/* </View> */}
                        </View>

                        <View className="flex-1">
                          <View className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]">
                            {thumb ? (
                              <SmartImage
                                source={thumb}
                                size={70}
                                rounded={0}
                                contentFit="contain"
                                style={{ width: "100%", height: 70, borderRadius: 0 }}
                              />
                            ) : (
                              <View className="items-center justify-center" style={{ width: "100%", height: 70 }}>
                                <Text className="text-[22px]">🗓️</Text>
                              </View>
                            )}
                          </View>

                          <View className="mt-2">
                            <Text numberOfLines={2} className="text-white text-[13px] font-bold leading-4">
                              {tileTitle}
                            </Text>

                            <Text numberOfLines={1} className="text-white/45 text-[11px] mt-1">
                              Tap to view tasks
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center flex-1 pr-3" style={{ gap: 12 }}>
              {selected?.kind === "achievement" || selected?.kind === "plus" ? (
                selected.item.iconUrl ? (
                  <View className="rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    <SmartImage source={selected.item.iconUrl} size={56} rounded={12} contentFit="contain" />
                  </View>
                ) : (
                  <View className="h-[56px] w-[56px] rounded-xl border border-white/10 bg-white/[0.04] items-center justify-center">
                    <Text className="text-[22px]">{selected.kind === "achievement" ? "🎟️" : "🗓️"}</Text>
                  </View>
                )
              ) : null}

              <View className="flex-1">
                <Text className="text-white text-[18px] font-bold" numberOfLines={2}>
                  {safeText(selected?.item?.title)}
                </Text>

                <View className="flex-row items-center mt-1.5" style={{ gap: 8 }}>
                  {selected && selected.kind === "achievement" ? (
                    <>
                      <TilePill text="Nook Miles" tone="emerald" />
                      <TilePill text={`${(selected.item.tiers ?? []).length} tiers`} />
                    </>
                  ) : selected && selected.kind === "plus" ? (
                    <>
                      <TilePill text="Nook Miles+" tone="amber" />
                      <TilePill text={`${(selected.item.tasks ?? []).length} tasks`} />
                    </>
                  ) : null}
                </View>
              </View>
            </View>

            <Pressable
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          <View className="mt-6">
            <SectionLabel>Description</SectionLabel>
            <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Text className="text-white/70 text-[13px] leading-5">
                {selected?.kind === "achievement"
                  ? (selected.item.description ? safeText(selected.item.description) : "Achievement tiers and rewards.")
                  : "Daily rotating tasks to earn bonus Nook Miles."
                }
              </Text>
            </View>
          </View>

          {selected?.kind === "achievement" && (
            <View className="mt-6">
              <SectionLabel>Tiers</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <View style={{ gap: 10 }}>
                  {(selected.item.tiers ?? []).map((t, idx) => {
                    const tierNames = (((t as any).tierNames ?? []) as string[])
                      .map((x) => safeText(x).replace(/\s+/g, " ").trim())
                      .filter(Boolean);

                    return (
                      <View key={`${t.task}::${t.miles}::${idx}`} className="flex-row items-start justify-between" style={{ gap: 12 }}>
                        <View className="flex-1">
                          {tierNames.length ? (
                            <View className="flex-row flex-wrap" style={{ gap: 6, marginBottom: 4 }}>
                              {tierNames.slice(0, 3).map((name, i) => (
                                <TilePill key={`${name}::${i}`} text={name} />
                              ))}
                            </View>
                          ) : null}
                          <Text className="text-[12px] text-white/85" numberOfLines={2}>
                            {safeText(t.task) || "—"}
                          </Text>
                        </View>
                        <View className="flex-row items-center" style={{ gap: 6, paddingTop: tierNames.length ? 1 : 0 }}>
                          <Text className="text-[12px] text-white font-semibold">{fmtMiles(t.miles)}</Text>
                          <Text className="text-[10px] text-white/45">mi</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {selected?.kind === "plus" && (
            <View className="mt-6">
              <SectionLabel>Tasks</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <View style={{ gap: 10 }}>
                  {(selected.item.tasks ?? []).map((t, idx) => (
                    <View key={`${t.title}::${t.miles}::${idx}`} className="flex-row items-center justify-between" style={{ gap: 12 }}>
                      <Text className="text-[12px] text-white/85 flex-1" numberOfLines={2}>
                        {safeText(t.title) || "—"}
                      </Text>
                      <View className="flex-row items-center" style={{ gap: 6 }}>
                        <Text className="text-[12px] text-white font-semibold">{fmtMiles(t.miles)}</Text>
                        <Text className="text-[10px] text-white/45">mi</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
