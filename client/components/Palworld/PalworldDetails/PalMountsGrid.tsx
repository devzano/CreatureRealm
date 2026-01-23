// components/Palworld/Items/MountsGrid.tsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import type { GroundMountRow, FlyingMountRow, WaterMountRow, MountKind, PalMountIndexItem } from "@/lib/palworld/paldbMounts";

type PalMountsGridProps = {
  items: PalMountIndexItem[];
  onPressItem?: (item: PalMountIndexItem) => void;
  emptyText?: string;
  numColumns?: number; // default 3
  prefetchIcons?: boolean; // default true
  kind?: MountKind | "all"; // default "all"
  onSectionLayout?: (kind: MountKind, y: number) => void;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeName(x: any): string {
  const s = String(x?.name ?? "").trim();
  return s || "Unknown";
}

function formatPillNumber(v: any): string {
  const n = safeNum(v);
  if (n == null) return "—";

  const abs = Math.abs(n);
  if (abs < 1000) {
    const isInt = Math.abs(n - Math.trunc(n)) < 1e-9;
    return isInt ? String(Math.trunc(n)) : String(Number(n.toFixed(2)));
  }

  const k = n / 1000;
  const txt = Math.abs(k) >= 10 ? k.toFixed(0) : k.toFixed(1);
  return `${txt.replace(/\.0$/, "")}k`;
}

function kindBadge(kind: MountKind) {
  if (kind === "ground") return { label: "Ground", icon: "road-variant" as const };
  if (kind === "flying") return { label: "Flying", icon: "weather-windy" as const };
  return { label: "Water", icon: "waves" as const };
}

function tileRing(kind: MountKind) {
  if (kind === "flying") return "border-sky-400/60";
  if (kind === "water") return "border-cyan-400/60";
  return "border-emerald-400/60";
}

/** ---------------- Sheet helpers (NO EMPTY SECTIONS) ---------------- */

function SheetLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function StatRow({ label, value }: { label: string; value: any }) {
  const txt = formatPillNumber(value);
  return (
    <View className="flex-row items-center justify-between py-2 px-3">
      <Text className="text-white/70 text-[12px]">{label}</Text>
      <View className="px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
        <Text className="text-[11px] text-white/85" numberOfLines={1}>
          {txt}
        </Text>
      </View>
    </View>
  );
}

function StatsSection({ item }: { item: PalMountIndexItem | null }) {
  if (!item) return null;

  const isWater = item.kind === "water";
  const rows: Array<{ label: string; value: any }> = [];

  rows.push({ label: "Technology", value: (item as any).techLevel });
  rows.push({ label: "Stamina", value: (item as any).stamina });

  if (isWater) {
    rows.push({ label: "Swim Speed", value: (item as WaterMountRow).swimSpeed });
    rows.push({ label: "Swim Dash Speed", value: (item as WaterMountRow).swimDashSpeed });
  } else {
    const gf = item as GroundMountRow | FlyingMountRow;
    rows.push({ label: "Run Speed", value: gf.runSpeed });
    rows.push({ label: "Ride Sprint Speed", value: gf.rideSprintSpeed });
    rows.push({ label: "Gravity Scale", value: gf.gravityScale });
    rows.push({ label: "Jump Z Velocity", value: gf.jumpZVelocity });
  }

  const hasAny = rows.some((r) => safeNum(r.value) != null);
  if (!hasAny) return null;

  return (
    <View className="mt-5">
      <SheetLabel>Stats</SheetLabel>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((r, idx) => (
          <View key={r.label} className={idx !== rows.length - 1 ? "border-b border-white/5" : ""}>
            <StatRow label={r.label} value={r.value} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** ---------------- tile ---------------- */

function MountTile({
  it,
  cols,
  tileH,
  onPress,
}: {
  it: PalMountIndexItem;
  cols: number;
  tileH: number;
  onPress: (it: PalMountIndexItem) => void;
}) {
  const ring = tileRing(it.kind);
  const badgeLocal = kindBadge(it.kind);

  const tech = safeNum((it as any).techLevel);
  const stam = safeNum((it as any).stamina);

  const leftLabel = "Tech";
  const leftValue = tech;

  const rightLabel = it.kind === "water" ? "Swim" : "Run";
  const rightValue =
    it.kind === "water"
      ? safeNum((it as WaterMountRow).swimSpeed)
      : safeNum((it as GroundMountRow | FlyingMountRow).runSpeed);

  return (
    <View key={`${it.kind}-${it.slug}`} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
      <Pressable
        onPress={() => onPress(it)}
        className={["rounded-2xl border bg-white/[0.03] overflow-hidden active:opacity-90", ring].join(" ")}
        style={{ height: tileH }}
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

              <View className="absolute -top-1 -right-1 px-2 py-[2px] rounded-full border bg-white/5 border-white/10 flex-row items-center">
                <MaterialCommunityIcons name={badgeLocal.icon} size={12} color="white" />
                <Text className="ml-1 text-white/80 text-[10px] font-semibold">{badgeLocal.label}</Text>
              </View>
            </View>
          </View>

          <View className="mt-2 items-center">
            <Text numberOfLines={1} className="text-white text-[12px] leading-4 text-center">
              {safeName(it)}
            </Text>
            <Text numberOfLines={1} className="text-white/50 text-[10px] text-center mt-0.5">
              Stamina {stam != null ? formatPillNumber(stam) : "—"}
            </Text>
          </View>

          <View className="flex-1" />

          <View className="flex-row items-end justify-between mt-2">
            <View className="flex-1 items-center">
              <Text className="text-[10px] text-white/60">{leftLabel}</Text>
              <View className="mt-1 px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
                <Text className="text-[10px] text-white/85" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatPillNumber(leftValue)}
                </Text>
              </View>
            </View>

            <View className="w-2" />

            <View className="flex-1 items-center">
              <Text className="text-[10px] text-white/60">{rightLabel}</Text>
              <View className="mt-1 px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
                <Text className="text-[10px] text-white/85" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatPillNumber(rightValue)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

/** ---------------- Component ---------------- */

export default function MountsGrid({
  items,
  onPressItem,
  emptyText = "No mounts found.",
  numColumns = 3,
  prefetchIcons = true,
  kind = "all",
  onSectionLayout,
}: PalMountsGridProps) {
  const cols = clamp(numColumns, 2, 4);
  const TILE_H = 154;

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    if (kind === "all") return arr;
    return arr.filter((x) => x.kind === kind);
  }, [items, kind]);

  const sections = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const ground = arr.filter((x) => x.kind === "ground");
    const flying = arr.filter((x) => x.kind === "flying");
    const water = arr.filter((x) => x.kind === "water");

    const meta: Array<{ key: MountKind; title: string; subtitle: string; icon: any; items: PalMountIndexItem[] }> = [
      { key: "ground", title: "Ground", subtitle: "Land Travel", icon: "road-variant", items: ground },
      { key: "flying", title: "Flying", subtitle: "Air Travel", icon: "weather-windy", items: flying },
      { key: "water", title: "Water", subtitle: "Sea Travel", icon: "waves", items: water },
    ];

    return meta.filter((s) => s.items.length > 0);
  }, [items]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<PalMountIndexItem | null>(null);

  const openSheet = useCallback(
    (it: PalMountIndexItem) => {
      onPressItem?.(it);
      setSelected(it);
      setSheetVisible(true);
    },
    [onPressItem]
  );

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  useEffect(() => {
    if (!prefetchIcons) return;
    prefetchRemoteIcons(filtered.map((x) => x.iconUrl));
  }, [prefetchIcons, filtered]);

  if (!filtered.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const sel = selected;
  const badge = sel ? kindBadge(sel.kind) : null;

  const selTech = safeNum((sel as any)?.techLevel);
  const selStam = safeNum((sel as any)?.stamina);

  const selPrimary =
    sel?.kind === "water"
      ? safeNum((sel as WaterMountRow)?.swimSpeed)
      : safeNum((sel as GroundMountRow | FlyingMountRow)?.runSpeed);

  const selPrimaryLabel = sel?.kind === "water" ? "Swim" : "Run";

  const selSecondary =
    sel?.kind === "water"
      ? safeNum((sel as WaterMountRow)?.swimDashSpeed)
      : safeNum((sel as GroundMountRow | FlyingMountRow)?.rideSprintSpeed);

  const selSecondaryLabel = sel?.kind === "water" ? "Dash" : "Sprint";

  return (
    <>
      {kind === "all" ? (
        <View>
          {sections.map((section) => (
            <View
              key={section.key}
              onLayout={(e) => {
                onSectionLayout?.(section.key, e.nativeEvent.layout.y);
              }}
            >
              {/* Section header */}
              <View className="px-4 mt-3 mb-2">
                <View className="flex-row items-center">
                  <View className="w-1.5 h-5 rounded-full mr-2 bg-white/10" />
                  <View className="flex-1">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {section.title}
                    </Text>
                    <Text className="text-[11px] text-white/40 mt-0.5">{section.subtitle}</Text>
                  </View>

                  <View className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] flex-row items-center">
                    <MaterialCommunityIcons name={section.icon} size={14} color="white" />
                    <Text className="ml-1 text-[10px] text-white/70">{section.items.length}</Text>
                  </View>
                </View>
              </View>

              {/* Grid */}
              <View className="px-4">
                <View className="flex-row flex-wrap -mx-2">
                  {section.items.map((it) => (
                    <MountTile key={`${it.kind}-${it.slug}`} it={it} cols={cols} tileH={TILE_H} onPress={openSheet} />
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        // flat (single kind)
        <View className="px-4">
          <View className="flex-row flex-wrap -mx-2">
            {filtered.map((it) => (
              <MountTile key={`${it.kind}-${it.slug}`} it={it} cols={cols} tileH={TILE_H} onPress={openSheet} />
            ))}
          </View>
        </View>
      )}

      {/* Bottom sheet */}
      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
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
                  {sel?.name ?? "—"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={1}>
                  Tech {selTech != null ? formatPillNumber(selTech) : "—"} <Text className="text-white/40">•</Text>{" "}
                  Stamina {selStam != null ? formatPillNumber(selStam) : "—"} <Text className="text-white/40">•</Text>{" "}
                  {selPrimaryLabel} {selPrimary != null ? formatPillNumber(selPrimary) : "—"}{" "}
                  <Text className="text-white/40">•</Text> {selSecondaryLabel}{" "}
                  {selSecondary != null ? formatPillNumber(selSecondary) : "—"}
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
          {sel ? (
            <View className="mt-4 flex-row flex-wrap gap-2">
              <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5 flex-row items-center">
                <MaterialCommunityIcons name={badge?.icon ?? "help-circle-outline"} size={14} color="white" />
                <Text className="ml-2 text-white/80 text-[12px]">
                  Type: <Text className="text-white">{badge?.label ?? "—"}</Text>
                </Text>
              </View>

              <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
                <Text className="text-white/80 text-[12px]">
                  Slug: <Text className="text-white">{String(sel.slug ?? "—")}</Text>
                </Text>
              </View>
            </View>
          ) : null}

          <StatsSection item={sel} />
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
