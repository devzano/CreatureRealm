// components/Palworld/PalworldDetails/PassiveSkillsGrid.tsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { PassiveSkillRow } from "@/lib/palworld/upgrades/paldbPassiveSkills";
import { safeName, clamp } from "../Construction/palGridKit";

type PassiveSkillsGridProps = {
  items: PassiveSkillRow[];
  onPressItem?: (item: PassiveSkillRow) => void;
  emptyText?: string;
  numColumns?: number;
  prefetchIcons?: boolean;
};

function ringForRank(rank: number) {
  if (rank >= 4) return "border-amber-300/60";
  if (rank === 3) return "border-violet-300/60";
  if (rank === 2) return "border-sky-300/60";
  return "border-emerald-300/60";
}

function rankLabel(rank: number) {
  if (rank >= 4) return "Rank 4";
  if (rank === 3) return "Rank 3";
  if (rank === 2) return "Rank 2";
  return "Rank 1";
}

function SkillTile({
  it,
  cols,
  tileH,
  onPress,
}: {
  it: PassiveSkillRow;
  cols: number;
  tileH: number;
  onPress: (it: PassiveSkillRow) => void;
}) {
  const ring = ringForRank(it.rank);

  return (
    <View key={it.name} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
      <Pressable
        onPress={() => onPress(it)}
        className={["rounded-2xl border bg-white/[0.03] overflow-hidden active:opacity-90", ring].join(" ")}
        style={{ height: tileH }}
      >
        <View className="flex-1 px-3 pt-3 pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] text-white/60">{rankLabel(it.rank)}</Text>
            {it.rankArrowIconUrl ? (
              <RemoteIcon
                uri={it.rankArrowIconUrl}
                size={18}
                roundedClassName="rounded-md"
                placeholderClassName="bg-white/5 border border-white/10"
                contentFit="contain"
              />
            ) : (
              <View className="h-[18px] w-[18px] rounded-md border border-white/10 bg-white/[0.04]" />
            )}
          </View>

          <View className="mt-2">
            <Text numberOfLines={2} className="text-white text-[12px] leading-4">
              {safeName(it)}
            </Text>

            <Text numberOfLines={1} className="text-white/50 text-[10px] mt-1">
              {it.weight != null ? `Weight ${it.weight}` : "Weight —"}{" "}
              <Text className="text-white/35">•</Text>{" "}
              {Array.isArray(it.tags) && it.tags.length ? it.tags.join(", ") : "—"}
            </Text>
          </View>

          <View className="flex-1" />

          <Text numberOfLines={3} className="text-white/55 text-[10px] leading-4">
            {String(it.effectsText ?? it.tooltipText ?? "").trim() || "—"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

export default function PassiveSkillsGrid({
  items,
  onPressItem,
  emptyText = "No passive skills found.",
  numColumns = 3,
  prefetchIcons = true,
}: PassiveSkillsGridProps) {
  const cols = clamp(numColumns, 2, 4);
  const TILE_H = 154;

  const arr = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<PassiveSkillRow | null>(null);

  const openSheet = useCallback(
    (it: PassiveSkillRow) => {
      onPressItem?.(it);
      setSelected(it);
      setSheetVisible(true);
    },
    [onPressItem]
  );

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  useEffect(() => {
    if (!prefetchIcons) return;
    prefetchRemoteIcons(arr.map((x) => x.rankArrowIconUrl));
  }, [prefetchIcons, arr]);

  if (!arr.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const sel = selected;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {arr.map((it) => (
            <SkillTile key={it.name} it={it} cols={cols} tileH={TILE_H} onPress={openSheet} />
          ))}
        </View>
      </View>

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 220, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3">
              {sel?.rankArrowIconUrl ? (
                <RemoteIcon
                  uri={sel.rankArrowIconUrl}
                  size={44}
                  roundedClassName="rounded-xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                  contentFit="contain"
                />
              ) : (
                <View className="h-[44px] w-[44px] rounded-xl border border-white/10 bg-white/[0.04]" />
              )}

              <View className="ml-3 flex-1">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {sel?.name ?? "—"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={2}>
                  {sel ? rankLabel(sel.rank) : "—"} <Text className="text-white/40">•</Text>{" "}
                  {sel?.weight != null ? `Weight ${sel.weight}` : "Weight —"} <Text className="text-white/40">•</Text>{" "}
                  {Array.isArray(sel?.tags) && sel!.tags.length ? sel!.tags.join(", ") : "—"}
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

          {!!sel?.effectsText && (
            <View className="mt-5">
              <Text className="text-white/80 text-[12px] mb-2">Effects</Text>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Text className="text-white/75 text-[12px] leading-5">{sel.effectsText}</Text>
              </View>
            </View>
          )}

          {!!sel?.tooltipText && (
            <View className="mt-4">
              <Text className="text-white/80 text-[12px] mb-2">Tooltip</Text>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Text className="text-white/65 text-[12px] leading-5">{sel.tooltipText}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
