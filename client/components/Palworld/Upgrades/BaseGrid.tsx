// components/Palworld/PalBaseGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { BaseIndex, BaseLevelRow, BaseTask, BaseRewardKV, BaseItemRef } from "@/lib/palworld/upgrades/paldbBase";
import { usePalworldCollectionStore } from "@/store/palworldCollectionStore";
import { safeNum, safeText, clamp } from "../Construction/palGridKit";

type PalBaseGridProps = {
  index: BaseIndex | null | undefined;
  emptyText?: string;
  numColumns?: number;
};

function tileKey(it: BaseLevelRow) {
  return `base:${safeNum(it.level) ?? 0}`;
}

function levelPillClasses(level: number) {
  if (level >= 25) return "border-amber-500/30 bg-amber-500/10";
  if (level >= 15) return "border-sky-500/30 bg-sky-500/10";
  if (level >= 5) return "border-emerald-500/30 bg-emerald-500/10";
  return "border-white/10 bg-white/[0.04]";
}

function levelTextClasses(level: number) {
  if (level >= 25) return "text-amber-200";
  if (level >= 15) return "text-sky-200";
  if (level >= 5) return "text-emerald-200";
  return "text-white/80";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function renderTaskRow(t: BaseTask, idx: number) {
  if (t.kind === "pals") {
    const n = safeNum((t as any).count);
    if (n == null) return null;

    return (
      <View key={`p-${idx}`} className="flex-row items-center" style={{ gap: 10 }}>
        <View className="h-[26px] w-[26px] rounded-lg border border-white/10 bg-white/[0.04] items-center justify-center">
          <Ionicons name="paw-outline" size={14} color="white" />
        </View>

        <View className="flex-1">
          <Text className="text-white/80 text-[12px] leading-5">Pals x{n}</Text>
        </View>
      </View>
    );
  }

  if (t.kind === "build") {
    const item = (t as any).item as BaseItemRef | null;
    const qty = safeNum((t as any).qty);
    const text = safeText((t as any).text);

    const icon = safeText(item?.iconUrl);
    const name = safeText(item?.name) || text.replace(/^Build\s+/i, "").replace(/\.\s*x\s*\d+\s*$/i, "").trim();

    if (!name && qty == null) return null;

    return (
      <View key={`b-${idx}`} className="flex-row items-center" style={{ gap: 10 }}>
        {icon ? (
          <RemoteIcon
            uri={icon}
            size={26}
            roundedClassName="rounded-lg"
            placeholderClassName="bg-white/5 border border-white/10"
            contentFit="cover"
          />
        ) : (
          <View className="h-[26px] w-[26px] rounded-lg border border-white/10 bg-white/[0.04] items-center justify-center">
            <Ionicons name="hammer-outline" size={14} color="white" />
          </View>
        )}

        <View className="flex-1">
          <Text numberOfLines={2} className="text-white/80 text-[12px] leading-5">
            Build {name || "—"}
          </Text>
        </View>

        {qty != null ? (
          <View className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
            <Text className="text-white/70 text-[11px]">x{qty}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const txt = safeText((t as any).text);
  if (!txt) return null;

  return (
    <View key={`t-${idx}`} className="flex-row items-center" style={{ gap: 10 }}>
      <View className="h-[26px] w-[26px] rounded-lg border border-white/10 bg-white/[0.04] items-center justify-center">
        <Ionicons name="document-text-outline" size={14} color="white" />
      </View>
      <View className="flex-1">
        <Text className="text-white/70 text-[12px] leading-5">{txt}</Text>
      </View>
    </View>
  );
}

function renderRewardRow(r: BaseRewardKV, idx: number) {
  const key = safeText(r.key);
  const val = safeText(r.valueText);

  if (!key && !val) return null;

  return (
    <View key={`r-${idx}`} className="flex-row items-center justify-between" style={{ gap: 10 }}>
      <Text className="text-white/75 text-[12px]">{key || "—"}</Text>
      <Text className="text-white/60 text-[12px]">{val || "—"}</Text>
    </View>
  );
}

function BaseTile({
  it,
  cols,
  tileH,
  onPressOpen,
  isCollected,
  onToggleCollected,
}: {
  it: BaseLevelRow;
  cols: number;
  tileH: number;
  onPressOpen: (it: BaseLevelRow) => void;
  isCollected: boolean;
  onToggleCollected: () => void;
}) {
  const lv = safeNum(it.level) ?? 0;

  const tasks = Array.isArray(it.tasks) ? it.tasks : [];
  const previewLines = tasks
    .map((t) => safeText((t as any).text) || (t.kind === "pals" ? `Pals x${safeNum((t as any).count) ?? "—"}` : ""))
    .filter(Boolean)
    .slice(0, 2);

  return (
    <View key={tileKey(it)} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
      <Pressable
        onPress={() => onPressOpen(it)}
        className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden active:opacity-90"
        style={{ height: tileH }}
      >
        <View className="flex-1 px-3 pt-3 pb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className={["px-2 py-0.5 rounded-full border", levelPillClasses(lv)].join(" ")}>
              <Text className={["text-[10px] font-semibold", levelTextClasses(lv)].join(" ")}>
                Base Lv {lv}
              </Text>
            </View>

            <Ionicons name="home-outline" size={14} color="rgba(255,255,255,0.3)" />
          </View>

          <View className="flex-row items-center" style={{ gap: 10 }}>
            <View className="h-[36px] w-[36px] rounded-lg border border-white/10 bg-white/[0.04] items-center justify-center">
              <Ionicons name="construct-outline" size={16} color="white" />
            </View>

            <View className="flex-1">
              <Text numberOfLines={1} className="text-white text-[13px] font-bold leading-4">
                Level {lv}
              </Text>
              <Text numberOfLines={1} className="text-white/50 text-[11px]">
                {tasks.length ? `${tasks.length} requirement${tasks.length === 1 ? "" : "s"}` : "Tap to view details…"}
              </Text>
            </View>
          </View>

          <View className="mt-2" style={{ gap: 6 }}>
            {previewLines.length ? (
              previewLines.map((line, i) => (
                <Text key={`p-${i}`} numberOfLines={1} className="text-white/55 text-[11px]">
                  • {line}
                </Text>
              ))
            ) : (
              <Text numberOfLines={2} className="text-white/45 text-[11px] leading-4">
                Tap to view base level requirements and rewards…
              </Text>
            )}
          </View>

          <View className="flex-1" />

          <View className="mt-2 flex-row items-center justify-center" style={{ gap: 10 }}>
            <Pressable
              onPress={() => onPressOpen(it)}
              className="h-9 flex-1 rounded-xl border border-white/10 bg-white/[0.04] items-center justify-center active:opacity-80"
            >
              <Ionicons name="open-outline" size={16} color="white" />
            </Pressable>

            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                onToggleCollected();
              }}
              className={[
                "h-9 flex-1 rounded-xl border items-center justify-center active:opacity-80",
                isCollected ? "border-emerald-500/40 bg-emerald-500/15" : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <Ionicons
                name={isCollected ? "checkbox" : "checkbox-outline"}
                size={16}
                color={isCollected ? "#6EE7B7" : "white"}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function PalBaseGrid({
  index,
  emptyText = "No base levels found.",
  numColumns = 2,
}: PalBaseGridProps) {
  const cols = clamp(numColumns, 1, 3);
  const TILE_H = 170;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<BaseLevelRow | null>(null);

  const items = useMemo(() => {
    const base = Array.isArray(index?.items) ? (index!.items as BaseLevelRow[]) : [];
    return base;
  }, [index]);

  const openSheet = useCallback((it: BaseLevelRow) => {
    setSelected(it);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const storeSnap = usePalworldCollectionStore((s) => s);
  const toggleBase = usePalworldCollectionStore((s) => s.toggleBase);

  if (!items.length) {
    return (
      <View className="py-10 items-center px-6">
        <Text className="text-white/70 text-sm text-center">{emptyText}</Text>
      </View>
    );
  }

  const sel = selected;
  const selLevel = safeNum(sel?.level) ?? null;

  const baseKey = selLevel != null ? `base:${selLevel}` : "";
  const collected = baseKey ? storeSnap.getEntry(baseKey).base : false;

  const tasksRaw = Array.isArray(sel?.tasks) ? (sel!.tasks as BaseTask[]) : [];
  const tasks = tasksRaw.filter((t) => {
    if (!t) return false;
    if ((t as any).kind === "pals") return safeNum((t as any).count) != null;
    const text = safeText((t as any).text);
    return !!text;
  });
  const hasTasks = tasks.length > 0;

  const rewardsRaw = Array.isArray(sel?.rewards) ? (sel!.rewards as BaseRewardKV[]) : [];
  const rewards = rewardsRaw.filter((r) => !!(safeText(r.key) || safeText(r.valueText)));
  const hasRewards = rewards.length > 0;

  return (
    <>
      {/* Grid */}
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {items.map((it) => {
            const lv = safeNum(it.level);
            const key = lv != null ? `base:${lv}` : "";
            const isCollected = key ? storeSnap.getEntry(key).base : false;

            return (
              <BaseTile
                key={tileKey(it)}
                it={it}
                cols={cols}
                tileH={TILE_H}
                onPressOpen={openSheet}
                isCollected={!!isCollected}
                onToggleCollected={() => {
                  if (!key) return;
                  toggleBase(key);
                }}
              />
            );
          })}
        </View>
      </View>

      {/* BottomSheet */}
      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3" style={{ gap: 12 }}>
              <View className="h-[56px] w-[56px] rounded-xl border border-white/10 bg-white/[0.04] items-center justify-center">
                <Ionicons name="home-outline" size={22} color="white" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  {selLevel != null ? (
                    <View className={["px-2 py-0.5 rounded-full border", levelPillClasses(selLevel)].join(" ")}>
                      <Text className={["text-[10px] font-semibold", levelTextClasses(selLevel)].join(" ")}>
                        Base Lv {selLevel}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text className="text-white text-[16px] font-semibold mt-1" numberOfLines={2}>
                  {selLevel != null ? `Base Level ${selLevel}` : "Base Level"}
                </Text>

                {baseKey ? (
                  <View className="mt-2 flex-row">
                    <Pressable
                      onPress={() => {
                        if (!baseKey) return;
                        toggleBase(baseKey);
                      }}
                      className={[
                        "px-3 py-1.5 rounded-full border",
                        collected ? "border-emerald-500/40 bg-emerald-500/15" : "border-white/10 bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <Text className={["text-[11px] font-semibold", collected ? "text-emerald-200" : "text-white/75"].join(" ")}>
                        {collected ? "Completed ✓" : "Mark Completed"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>

            <Pressable
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {hasTasks ? (
            <View className="mt-5">
              <SectionLabel>Requirements</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3" style={{ gap: 10 }}>
                {tasks.map((t, idx) => renderTaskRow(t, idx))}
              </View>
            </View>
          ) : null}

          {hasRewards ? (
            <View className="mt-4">
              <SectionLabel>Rewards</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <View style={{ gap: 8 }}>
                  {rewards.map((r, idx) => renderRewardRow(r, idx))}
                </View>
              </View>
            </View>
          ) : null}

          {safeText((sel as any)?.rawText) ? (
            <View className="mt-4">
              <SectionLabel>Notes</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Text className="text-white/65 text-[12px] leading-5">{safeText((sel as any).rawText)}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
