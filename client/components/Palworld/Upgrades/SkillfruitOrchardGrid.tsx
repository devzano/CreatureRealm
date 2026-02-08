// components/Palworld/Upgrades/SkillfruitOrchardGrid.tsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { SkillFruitOrchardRow, SkillFruitDetail } from "@/lib/palworld/upgrades/paldbSkillFruits";
import { fetchSkillFruitDetail } from "@/lib/palworld/upgrades/paldbSkillFruits";

import { safeNum, safeText, clamp } from "../Construction/palGridKit";

import {
  SheetSectionLabel,
  KeyValueRows,
  DroppedBySection,
  TreasureBoxSection,
  WanderingMerchantSection,
} from "@/components/Palworld/PalDetailSections";

type SkillfruitOrchardGridProps = {
  items: SkillFruitOrchardRow[];
  onPressItem?: (item: SkillFruitOrchardRow) => void;

  emptyText?: string;
  numColumns?: number; // default 3
  prefetchIcons?: boolean; // default true
};

function fmtPct(v: any) {
  const n = safeNum(v);
  if (n == null) return "—";
  const s = Number.isFinite(n) ? (Math.round(n * 10) / 10).toString() : "—";
  return `${s}%`;
}

function pctBucketRing(pct: number | null) {
  // purely cosmetic, matches your subtle ring style
  if (pct == null) return "border-white/10";
  if (pct >= 5) return "border-emerald-400/40";
  if (pct >= 2) return "border-sky-400/40";
  return "border-amber-400/40";
}

function toKeyValueRows(list: any): Array<{ key?: string | null; valueText?: string | null }> {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((r: any) => ({
    key: safeText(r?.key) || "—",
    valueText: safeText(r?.value) || "—",
  }));
}

function toDroppedByRows(list: any) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((r: any) => {
    const name = safeText(r?.sourceName) || "—";
    const slug = safeText(r?.sourceSlug) || name;
    const iconUrl = safeText(r?.sourceIconUrl) || null;

    return {
      pal: { slug, name, iconUrl },
      qtyText: safeText(r?.qtyText) || "—",
      probabilityText: safeText(r?.probabilityText) || "—",
    };
  });
}

function toMerchantRows(list: any, fallbackIconUrl: string | null) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((r: any) => {
    const name = safeText(r?.sourceName) || "—";
    const slug = safeText(r?.sourceSlug) || name;

    return {
      item: {
        slug,
        name,
        iconUrl: fallbackIconUrl,
      },
      sourceText: null as any,
    };
  });
}

function toTreasureRows(list: any, fallbackIconUrl: string | null) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((r: any) => {
    const name = safeText(r?.sourceName) || "—";
    const slug = safeText(r?.sourceSlug) || name;
    return {
      item: {
        slug,
        name,
        iconUrl: fallbackIconUrl,
      },
      qtyText: safeText(r?.qtyText) || null,
      sourceText: safeText(r?.probabilityText) || null,
    };
  });
}

export default function SkillfruitOrchardGrid({
  items,
  onPressItem,
  emptyText = "No skillfruits found.",
  numColumns = 3,
  prefetchIcons = true,
}: SkillfruitOrchardGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const list = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr;
  }, [items]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<SkillFruitOrchardRow | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SkillFruitDetail | null>(null);

  // ignore stale fetches when tapping quickly
  const fetchSeqRef = useRef(0);

  const openSheet = useCallback(
    async (it: SkillFruitOrchardRow) => {
      onPressItem?.(it);

      setSelected(it);
      setSheetVisible(true);

      setDetail(null);
      setDetailError(null);

      const slug = safeText(it.slug);
      if (!slug) return;

      const seq = ++fetchSeqRef.current;

      try {
        setDetailLoading(true);
        const d = await fetchSkillFruitDetail(slug);
        if (fetchSeqRef.current !== seq) return;
        setDetail(d);
      } catch (e) {
        console.warn("fetchSkillFruitDetail failed:", e);
        if (fetchSeqRef.current !== seq) return;
        setDetailError("Failed to load detail page.");
      } finally {
        if (fetchSeqRef.current === seq) setDetailLoading(false);
      }
    },
    [onPressItem]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSelected(null);

    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);

    fetchSeqRef.current += 1;
  }, []);

  useEffect(() => {
    if (!prefetchIcons) return;
    prefetchRemoteIcons(list.map((x) => x.iconUrl));
  }, [prefetchIcons, list]);

  if (!list.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const TILE_H = 114;

  const sel = selected;
  const selName = safeText(sel?.name) || "—";
  const selPct = safeNum(sel?.sameElementPct);
  const selPctText = fmtPct(selPct ?? sel?.sameElementText);

  const selectionIconUrl = useMemo(() => {
    return sel?.iconUrl ?? detail?.iconUrl ?? null;
  }, [sel, detail]);

  const statsRows = useMemo(() => toKeyValueRows(detail?.stats), [detail]);
  const otherRows = useMemo(() => toKeyValueRows(detail?.others), [detail]);
  const droppedRows = useMemo(() => toDroppedByRows(detail?.droppedBy), [detail]);

  const merchantRows = useMemo(
    () => toMerchantRows(detail?.merchants, selectionIconUrl),
    [detail, selectionIconUrl]
  );

  const treasureRows = useMemo(
    () => toTreasureRows(detail?.treasures, selectionIconUrl),
    [detail, selectionIconUrl]
  );

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {list.map((it) => {
            const title = safeText(it.name) || "Skill Fruit";
            const pct = safeNum(it.sameElementPct);
            const ring = pctBucketRing(pct);

            return (
              <View
                key={safeText(it.key) || `${it.slug}:${title}`}
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
                      <View className="relative">
                        <RemoteIcon
                          uri={it.iconUrl ?? null}
                          size={58}
                          roundedClassName="rounded-xl"
                          placeholderClassName="bg-white/5 border border-white/10"
                          contentFit="contain"
                        />

                        <View className="absolute -top-1 -right-1 px-2 py-[2px] rounded-full border border-white/10 bg-black/70">
                          <Text className="text-[10px] text-white/90 font-semibold">
                            {fmtPct(pct ?? it.sameElementText)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="mt-2 items-center">
                      <Text numberOfLines={2} className="text-white text-[12px] leading-4 text-center">
                        {title}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

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
                uri={detail?.iconUrl ?? sel?.iconUrl ?? null}
                size={56}
                roundedClassName="rounded-xl"
                placeholderClassName="bg-white/5 border border-white/10"
                contentFit="contain"
              />

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {safeText(detail?.name) || selName}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={1}>
                  Skillfruit Orchard
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

          {/* Pills */}
          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Probability: <Text className="text-white font-semibold">{selPctText}</Text>
              </Text>
            </View>
          </View>

          <View className="mt-4">
            {detailLoading ? (
              <View className="flex-row items-center py-2">
                <ActivityIndicator />
                <Text className="ml-2 text-white/70 text-[12px]">Loading details…</Text>
              </View>
            ) : detailError ? (
              <Text className="text-rose-300 text-[12px]">{detailError}</Text>
            ) : detail ? (
              <>
                {safeText(detail?.description) ? (
                  <View className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                    <Text className="text-white/85 text-[13px] leading-5">{safeText(detail?.description)}</Text>
                  </View>
                ) : null}

                <View className="mt-5">
                  <SheetSectionLabel>Stats</SheetSectionLabel>
                  <KeyValueRows rows={statsRows as any} />
                </View>
                <DroppedBySection rows={droppedRows as any} />
                <WanderingMerchantSection rows={merchantRows as any} />
                <TreasureBoxSection rows={treasureRows as any} />
                <View className="mt-5">
                  <SheetSectionLabel>Others</SheetSectionLabel>
                  <KeyValueRows rows={otherRows as any} />
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
