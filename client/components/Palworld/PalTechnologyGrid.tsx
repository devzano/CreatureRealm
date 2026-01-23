// components/Palworld/Items/TechnologyGrid.tsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import {
  type TechnologyItem,
  warmTechnologies,
  getTechnologyPointTotals,
  fetchTechnologyHoverDetails,
} from "@/lib/palworld/paldbTechnologies";

type TechnologyGridProps = {
  items: TechnologyItem[];
  onPressItem?: (item: TechnologyItem) => void;

  emptyText?: string;
  numColumns?: number; // default 3
  prefetchIcons?: boolean; // default true
};

const ANCIENT_COLOR = "#A042FD";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeStr(v: any): string {
  const s = String(v ?? "").trim();
  return s;
}

function prettySlug(v: any): string {
  const s = safeStr(v);
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function formatLevelPill(level: any): string {
  const n = safeNum(level);
  if (n == null || n <= 0) return "—";
  return `${n}`;
}

function ringClass(it: TechnologyItem) {
  if (it.isBoss) return "border-violet-400/70";

  const cat = safeStr(it.category).toLowerCase();
  if (cat.includes("structure")) return "border-sky-400/60";
  if (cat.includes("item")) return "border-emerald-400/60";
  return "border-white/10";
}

function SheetLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function SlugSection({ slug }: { slug: string | null }) {
  const raw = safeStr(slug);
  if (!raw) return null;

  const pretty = prettySlug(raw);

  return (
    <View className="mt-5">
      <SheetLabel>Slug</SheetLabel>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <Text className="text-white/80 text-[12px] leading-5">{pretty}</Text>
      </View>
    </View>
  );
}

function CostPills({
  techPoints,
  ancientPoints,
}: {
  techPoints: number | null;
  ancientPoints: number | null;
}) {
  if (!techPoints && !ancientPoints) return null;

  return (
    <View className="mt-4 flex-row flex-wrap" style={{ gap: 8 }}>
      {techPoints ? (
        <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
          <Text className="text-white/80 text-[12px]">
            Tech Points: <Text className="text-white font-semibold">{String(techPoints)}</Text>
          </Text>
        </View>
      ) : null}

      {ancientPoints ? (
        <View
          className="px-3 py-2 rounded-full border"
          style={{ backgroundColor: "rgba(160,66,253,0.12)", borderColor: "rgba(160,66,253,0.40)" }}
        >
          <Text style={{ color: ANCIENT_COLOR }} className="text-[12px] font-semibold">
            Ancient Points: {String(ancientPoints)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TechnologyGrid({
  items,
  onPressItem,
  emptyText = "No technologies found.",
  numColumns = 3,
  prefetchIcons = true,
}: TechnologyGridProps) {
  const cols = clamp(numColumns, 2, 4);
  const list = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr;
  }, [items]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<TechnologyItem | null>(null);

  const openSheet = useCallback(
    (it: TechnologyItem) => {
      onPressItem?.(it);
      setSelected(it);
      setSheetVisible(true);
    },
    [onPressItem]
  );

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  useEffect(() => {
    if (!prefetchIcons) return;
    prefetchRemoteIcons(list.map((x) => x.iconUrl));
  }, [prefetchIcons, list]);

  const [totals, setTotals] = useState<{ technologyPoints: number | null; ancientTechnologyPoints: number | null } | null>(
    () => getTechnologyPointTotals()
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await warmTechnologies();
        if (cancelled) return;
        setTotals(getTechnologyPointTotals());
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- hover details state (per selected tech) ---
  const [hoverLoading, setHoverLoading] = useState(false);
  const [hoverErr, setHoverErr] = useState<string | null>(null);
  const [hoverDetails, setHoverDetails] = useState<{
    level: number | null;
    technologyPoints: number | null;
    ancientTechnologyPoints: number | null;
    description: string | null;
  } | null>(null);

  // When a tech is selected, fetch its hover details
  useEffect(() => {
    let cancelled = false;

    const slug = safeStr(selected?.slug);
    if (!slug || !sheetVisible) {
      setHoverDetails(null);
      setHoverErr(null);
      setHoverLoading(false);
      return;
    }

    setHoverLoading(true);
    setHoverErr(null);

    (async () => {
      try {
        const d = await fetchTechnologyHoverDetails(slug, { force: false });
        if (cancelled) return;

        setHoverDetails({
          level: d.level,
          technologyPoints: d.technologyPoints,
          ancientTechnologyPoints: d.ancientTechnologyPoints,
          description: d.description,
        });
      } catch (e: any) {
        if (cancelled) return;
        setHoverErr(String(e?.message ?? "Failed to load details"));
        setHoverDetails(null);
      } finally {
        if (!cancelled) setHoverLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.slug, sheetVisible]);

  if (!list.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const TILE_H = 114;

  const sel = selected;
  const selName = safeStr(sel?.name) || "—";
  const selCategory = safeStr(sel?.category) || "Unknown";
  const selLevelList = safeNum(sel?.level);
  const selSlug = safeStr(sel?.slug) || null;
  const selBoss = !!sel?.isBoss;

  const hoverLevel = safeNum(hoverDetails?.level);
  const hoverTechPts = safeNum(hoverDetails?.technologyPoints);
  const hoverAncientPts = safeNum(hoverDetails?.ancientTechnologyPoints);
  const hoverDesc = safeStr(hoverDetails?.description);
  const displayLevel = hoverLevel ?? selLevelList ?? null;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {totals ? (
            <View className="px-2 mb-3" style={{ width: "100%" }}>
              <View className="flex-row flex-wrap justify-center" style={{ gap: 8 }}>
                <View className="flex-row items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                  <View className="px-2 py-1 bg-black/50">
                    <Text className="text-[10px] text-white/70 font-semibold">Technology Points</Text>
                  </View>
                  <View className="px-2 py-1 border-l border-white/10">
                    <Text className="text-[10px] text-white/85 font-semibold">
                      {totals.technologyPoints != null ? String(totals.technologyPoints) : "—"}
                    </Text>
                  </View>
                </View>

                <View
                  className="flex-row items-center overflow-hidden rounded-xl border"
                  style={{ borderColor: "rgba(160,66,253,0.35)", backgroundColor: "rgba(160,66,253,0.08)" }}
                >
                  <View className="px-2 py-1" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
                    <Text className="text-[10px] font-semibold" style={{ color: ANCIENT_COLOR }}>
                      Ancient Technology Points
                    </Text>
                  </View>
                  <View className="px-2 py-1 border-l" style={{ borderLeftColor: "rgba(160,66,253,0.25)" }}>
                    <Text className="text-[10px] font-semibold" style={{ color: ANCIENT_COLOR }}>
                      {totals.ancientTechnologyPoints != null ? String(totals.ancientTechnologyPoints) : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          {list.map((it) => {
            const title = safeStr(it.name) || "Technology";
            const subtitle = safeStr(it.category) || "—";
            const ring = ringClass(it);

            return (
              <View
                key={`${it.slug}:${it.level}:${it.name}`}
                className="px-2 mb-4"
                style={{ width: `${100 / cols}%` as any }}
              >
                <Pressable
                  onPress={() => openSheet(it)}
                  className={["rounded-2xl border bg-white/[0.03] overflow-hidden", ring].join(" ")}
                  style={{ height: TILE_H }}
                >
                  <View className="flex-1 px-3 pt-3 pb-3">
                    <View className="items-center justify-center">
                      {/* Icon wrapper so we can place the Lv pill on top-right */}
                      <View className="relative">
                        <RemoteIcon
                          uri={it.iconUrl ?? null}
                          size={58}
                          roundedClassName="rounded-xl"
                          placeholderClassName="bg-white/5 border border-white/10"
                          contentFit="contain"
                        />

                        {/* Lv pill (top-right of image) */}
                        <View className="absolute -top-1 -right-1 px-2 py-[2px] rounded-full border border-white/10 bg-black/70">
                          <Text className="text-[10px] text-white/90 font-semibold">
                            Lvl {formatLevelPill(it.level)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="mt-2 items-center">
                      <Text numberOfLines={1} className="text-white text-[12px] leading-4 text-center">
                        {title}
                      </Text>
                      <Text numberOfLines={1} className="text-white/50 text-[10px] text-center mt-0.5">
                        {subtitle}
                      </Text>
                    </View>

                    <View className="flex-1" />
                    {/* no bottom Lv pills anymore */}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {/* Bottom sheet */}
      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 260, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={sel?.iconUrl ?? null}
                size={56}
                roundedClassName="rounded-xl"
                placeholderClassName="bg-white/5 border border-white/10"
                contentFit="contain"
              />

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {selName}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={1}>
                  {displayLevel != null ? `Level ${displayLevel}` : "Level —"}{" "}
                  <Text className="text-white/40">•</Text> {selCategory}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {/* Loading / error */}
          {hoverLoading ? (
            <View className="mt-4 flex-row items-center" style={{ gap: 10 }}>
              <ActivityIndicator />
              <Text className="text-white/60 text-[12px]">Loading tech details…</Text>
            </View>
          ) : null}

          {hoverErr ? (
            <View className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <Text className="text-white/70 text-[12px]">Couldn’t load hover details.</Text>
              <Text className="text-white/40 text-[11px] mt-1">{hoverErr}</Text>
            </View>
          ) : null}

          {/* Pills */}
          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Level: <Text className="text-white">{displayLevel != null ? String(displayLevel) : "—"}</Text>
              </Text>
            </View>

            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Category: <Text className="text-white">{selCategory}</Text>
              </Text>
            </View>

            {selBoss ? (
              <View
                className="px-3 py-2 rounded-full border"
                style={{ backgroundColor: "rgba(160,66,253,0.12)", borderColor: "rgba(160,66,253,0.40)" }}
              >
                <Text style={{ color: ANCIENT_COLOR }} className="text-[12px] font-semibold">
                  Ancient Technology
                </Text>
              </View>
            ) : null}
          </View>

          {/* Cost pills (from hover) */}
          <CostPills techPoints={hoverTechPts} ancientPoints={hoverAncientPts} />

          {/* Description (from hover) */}
          {hoverDesc ? (
            <View className="mt-4">
              <SheetLabel>Description</SheetLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Text className="text-white/75 text-[12px] leading-5">{hoverDesc}</Text>
              </View>
            </View>
          ) : null}

          <SlugSection slug={selSlug} />
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
