// components/Palworld/PalMissionGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { MissionIndexItem, MissionEntityRef, MissionReward, MissionCoord, MissionKind } from "@/lib/palworld/upgrades/paldbMissions";
import { usePalworldCollectionStore } from "@/store/palworldCollectionStore";
import { safeNum, safeText, clamp } from "../Construction/palGridKit";

type PalMissionGridProps = {
  main: MissionIndexItem[];
  sub: MissionIndexItem[];
  emptyText?: string;
  numColumns?: number;
  defaultTab?: MissionKind;
};

function tileKey(it: MissionIndexItem) {
  return safeText(it.id) || safeText(it.title) || Math.random().toString(36).slice(2);
}

function kindLabel(kind: MissionKind) {
  return kind === "main" ? "Main" : "Sub";
}

function kindPillClasses(kind: MissionKind) {
  return kind === "main"
    ? "border-sky-500/30 bg-sky-500/10"
    : "border-violet-500/30 bg-violet-500/10";
}

function kindTextClasses(kind: MissionKind) {
  return kind === "main" ? "text-sky-200" : "text-violet-200";
}

function entityIconFallback(type: MissionEntityRef["type"]) {
  switch (type) {
    case "item":
      return "cube-outline";
    case "pal":
      return "paw-outline";
    case "skill":
      return "sparkles-outline";
    case "npc":
      return "person-outline";
    default:
      return "ellipse-outline";
  }
}

function renderEntityRow(e: MissionEntityRef, idx: number) {
  if (e.type === "text") {
    const t = safeText(e.text);
    if (!t) return null;
    return (
      <View key={`t-${idx}`} className="flex-row">
        <Text className="text-white/70 text-[12px] leading-5">{t}</Text>
      </View>
    );
  }

  const name = safeText((e as any).name);
  const icon = safeText((e as any).icon);
  const qty = safeNum((e as any).qty);
  const isAlpha = !!(e as any).isAlpha;

  return (
    <View key={`e-${idx}`} className="flex-row items-center" style={{ gap: 10 }}>
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
          <Ionicons name={entityIconFallback(e.type) as any} size={14} color="white" />
        </View>
      )}

      <View className="flex-1">
        <Text numberOfLines={2} className="text-white/80 text-[12px] leading-5">
          {name || "—"}
          {e.type === "pal" && isAlpha ? <Text className="text-red-200">  (Alpha)</Text> : null}
        </Text>
      </View>

      {e.type === "item" && qty != null ? (
        <View className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
          <Text className="text-white/70 text-[11px]">x{qty}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function MissionTile({
  it,
  cols,
  tileH,
  onPressOpen,
  isCollected,
  onToggleCollected,
}: {
  it: MissionIndexItem;
  cols: number;
  tileH: number;
  onPressOpen: (it: MissionIndexItem) => void;
  isCollected: boolean;
  onToggleCollected: () => void;
}) {
  const title = safeText(it.title) || "Mission";
  const desc = safeText(it.description);

  return (
    <View key={tileKey(it)} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
      <Pressable
        onPress={() => onPressOpen(it)}
        className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden active:opacity-90"
        style={{ height: tileH }}
      >
        <View className="flex-1 px-3 pt-3 pb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className={["px-2 py-0.5 rounded-full border", kindPillClasses(it.kind)].join(" ")}>
              <Text className={["text-[10px] font-semibold", kindTextClasses(it.kind)].join(" ")}>
                {kindLabel(it.kind)}
              </Text>
            </View>
            <Ionicons name="flag-outline" size={14} color="rgba(255,255,255,0.3)" />
          </View>

          <View className="flex-row items-center" style={{ gap: 10 }}>
            {it.icon ? (
              <RemoteIcon
                uri={it.icon}
                size={36}
                roundedClassName="rounded-lg"
                placeholderClassName="bg-white/5 border border-white/10"
                contentFit="cover"
              />
            ) : (
              <View className="h-[36px] w-[36px] rounded-lg border border-white/10 bg-white/[0.04] items-center justify-center">
                <Ionicons name="flag-outline" size={16} color="white" />
              </View>
            )}
            <View className="flex-1">
              <Text numberOfLines={2} className="text-white text-[13px] font-bold leading-4">
                {title}
              </Text>
            </View>
          </View>

          <View className="mt-2">
            <Text numberOfLines={3} className="text-white/50 text-[11px] leading-4">
              {desc || "Tap to view mission details..."}
            </Text>
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

function CoordPill({ c }: { c: MissionCoord }) {
  const x = safeNum(c.x);
  const y = safeNum(c.y);
  if (x == null || y == null) return null;

  return (
    <View className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04]">
      <Text className="text-white/70 text-[11px]">
        {x}, {y}
      </Text>
    </View>
  );
}

function RewardBlock({ rewards }: { rewards?: MissionReward }) {
  const exp = safeNum(rewards?.exp);
  const items = (Array.isArray(rewards?.items) ? rewards!.items! : []).filter((e) => e.type !== "text");

  const hasAny = exp != null || items.length > 0;
  if (!hasAny) return null;

  return (
    <View style={{ gap: 10 }}>
      {exp != null ? (
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="h-[26px] w-[26px] rounded-lg items-center justify-center">
            <Ionicons name="sparkles" size={14} color="white" />
          </View>
          <Text className="text-white/75 text-[12px]">Exp +{exp.toLocaleString()}</Text>
        </View>
      ) : null}

      {items.length ? (
        <View style={{ gap: 8 }}>
          {items.map((e, idx) => renderEntityRow(e, idx))}
        </View>
      ) : null}
    </View>
  );
}

export default function PalMissionGrid({
  main,
  sub,
  emptyText = "No missions found.",
  numColumns = 2,
}: PalMissionGridProps) {
  const cols = clamp(numColumns, 1, 3);
  const TILE_H = 170;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<MissionIndexItem | null>(null);

  const list = useMemo(() => {
    const a = Array.isArray(main) ? main : [];
    const b = Array.isArray(sub) ? sub : [];
    return [...a, ...b];
  }, [main, sub]);

  const openSheet = useCallback((it: MissionIndexItem) => {
    setSelected(it);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const storeSnap = usePalworldCollectionStore((s) => s);
  const toggleMission = usePalworldCollectionStore((s) => (s as any).toggleMission);

  if (!list.length) {
    return (
      <View className="py-10 items-center px-6">
        <Text className="text-white/70 text-sm text-center">{emptyText}</Text>
      </View>
    );
  }

  const sel = selected;

  const missionKey = sel ? `mission:${safeText(sel.id)}` : "";
  const collected = missionKey ? (storeSnap as any).getEntry(missionKey)?.mission : false;

  const descText = safeText(sel?.description);

  const objectivesRaw = Array.isArray(sel?.objectives) ? (sel!.objectives as MissionEntityRef[]) : [];
  const objectives = objectivesRaw.filter((e) => (e.type === "text" ? !!safeText((e as any).text) : true));
  const hasObjectives = objectives.some((e) =>
    e.type === "text" ? !!safeText((e as any).text) : !!safeText((e as any).name)
  );

  const rewards = sel?.rewards;
  const rewardExp = safeNum(rewards?.exp);
  const rewardItems = (Array.isArray(rewards?.items) ? rewards!.items! : []).filter((e) => e.type !== "text");
  const hasRewards = rewardExp != null || rewardItems.length > 0;

  const coordsRaw = Array.isArray(sel?.coords) ? (sel!.coords as MissionCoord[]) : [];
  const coords = coordsRaw
    .map((c) => ({ x: safeNum((c as any).x), y: safeNum((c as any).y), href: (c as any).href }))
    .filter((c) => c.x != null && c.y != null) as any[];
  const hasCoords = coords.length > 0;

  const nextTitle = safeText(sel?.nextTitle);
  const hasNext = !!nextTitle;

  const hasDesc = !!descText;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {list.map((it) => {
            const id = safeText(it.id);
            const key = id ? `mission:${id}` : "";
            const isCollected = key ? (storeSnap as any).getEntry(key)?.mission : false;

            return (
              <MissionTile
                key={tileKey(it)}
                it={it}
                cols={cols}
                tileH={TILE_H}
                onPressOpen={openSheet}
                isCollected={!!isCollected}
                onToggleCollected={() => {
                  if (!key) return;
                  toggleMission?.(key);
                }}
              />
            );
          })}
        </View>
      </View>

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3" style={{ gap: 12 }}>
              {sel?.icon ? (
                <RemoteIcon
                  uri={sel.icon}
                  size={56}
                  roundedClassName="rounded-xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                  contentFit="cover"
                />
              ) : (
                <View className="h-[56px] w-[56px] rounded-xl border border-white/10 bg-white/[0.04] items-center justify-center">
                  <Ionicons name="flag-outline" size={22} color="white" />
                </View>
              )}

              <View className="flex-1">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  {sel?.kind ? (
                    <View className={["px-2 py-0.5 rounded-full border", kindPillClasses(sel.kind)].join(" ")}>
                      <Text className={["text-[10px] font-semibold", kindTextClasses(sel.kind)].join(" ")}>
                        {kindLabel(sel.kind)} Mission
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text className="text-white text-[16px] font-semibold mt-1" numberOfLines={2}>
                  {safeText(sel?.title) || "Mission"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={2}>
                  {safeText(sel?.label) || "Mission"}
                </Text>

                {missionKey ? (
                  <View className="mt-2 flex-row">
                    <Pressable
                      onPress={() => toggleMission?.(missionKey)}
                      className={[
                        "px-3 py-1.5 rounded-full border",
                        collected ? "border-emerald-500/40 bg-emerald-500/15" : "border-white/10 bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <Text
                        className={[
                          "text-[11px] font-semibold",
                          collected ? "text-emerald-200" : "text-white/75",
                        ].join(" ")}
                      >
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

          {hasDesc ? (
            <View className="mt-5">
              <SectionLabel>Description</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Text className="text-white/75 text-[12px] leading-5">{descText}</Text>
              </View>
            </View>
          ) : null}

          {hasObjectives ? (
            <View className="mt-4">
              <SectionLabel>Objective</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3" style={{ gap: 10 }}>
                {objectives.map((e, idx) => renderEntityRow(e, idx))}
              </View>
            </View>
          ) : null}

          {hasRewards ? (
            <View className="mt-4">
              <SectionLabel>Reward</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <RewardBlock rewards={{ exp: rewardExp ?? undefined, items: rewardItems }} />
              </View>
            </View>
          ) : null}

          {hasCoords ? (
            <View className="mt-4">
              <SectionLabel>Map Coordinates</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {coords.map((c: any, idx: number) => (
                    <CoordPill key={`c-${idx}`} c={{ x: c.x, y: c.y, href: c.href } as any} />
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {hasNext ? (
            <View className="mt-4">
              <SectionLabel>Next</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <Text className="text-white/75 text-[12px] leading-5">{nextTitle}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
