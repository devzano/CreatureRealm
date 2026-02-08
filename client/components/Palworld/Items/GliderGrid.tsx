// components/Palworld/Items/GliderGrid.tsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { GliderIndexItem } from "@/lib/palworld/items/paldbGlider";

import { SheetSectionLabel } from "@/components/Palworld/PalDetailSections";
import { safeNum, safeName, clamp } from "../Construction/palGridKit";

type GliderGridProps = {
  items: GliderIndexItem[];
  onPressItem?: (item: GliderIndexItem) => void;
  emptyText?: string;
  showUnavailable?: boolean;
  numColumns?: number;
  prefetchIcons?: boolean;
};

function rarityRingFromNumber(r?: number | null) {
  if (r === 3) return "border-fuchsia-400/70"; // epic
  if (r === 2) return "border-sky-400/70"; // rare
  if (r === 1) return "border-emerald-400/70"; // uncommon
  return "border-white/10"; // common/unknown
}

function prettyRarity(rText?: string | null, rNum?: number | null) {
  const s = String(rText ?? "").trim();
  if (s) return s;
  if (rNum === 3) return "Epic";
  if (rNum === 2) return "Rare";
  if (rNum === 1) return "Uncommon";
  return "Common";
}

function stripTrailingGlider(name: string) {
  const s = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  return s.replace(/\s*glider\s*$/i, "").trim();
}

function buildTwoLineTitle(nameRaw: string, isPartner: boolean) {
  const base = stripTrailingGlider(nameRaw);
  const line1 = base || "Glider";
  const line2 = isPartner ? "Partner Glider" : "Glider";
  return { line1, line2 };
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

function DescriptionSection({ text }: { text: string | null | undefined }) {
  const s = String(text ?? "").trim();
  if (!s) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Description</SheetSectionLabel>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <Text className="text-white/80 text-[12px] leading-5">{s}</Text>
      </View>
    </View>
  );
}

function PartnerLevelsSection({
  levels,
  slug,
}: {
  levels: Array<{ level?: number | null; maxSpeed?: any; gravityScale?: any; staminaDrain?: any }>;
  slug: string;
}) {
  if (!levels?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Partner Levels</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {levels.map((lv, idx) => (
          <View
            key={`${slug}-lv-${lv.level ?? idx}`}
            className={[
              "flex-row items-center justify-between py-2 px-3",
              idx !== levels.length - 1 ? "border-b border-white/5" : "",
            ].join(" ")}
          >
            <Text className="text-white/85 text-[12px] font-semibold" numberOfLines={1}>
              Lv. {lv.level ?? "—"}
            </Text>

            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Text className="text-white/60 text-[12px]">Max {lv.maxSpeed ?? "—"}</Text>
              <Text className="text-white/60 text-[12px]">Grav {lv.gravityScale ?? "—"}</Text>
              <Text className="text-white/60 text-[12px]">Sta {lv.staminaDrain ?? "—"}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function RecipeSection({
  rows,
}: {
  rows: Array<{ slug: string; name: string; iconUrl: string | null; qty: any }>;
}) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Recipe</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((r, idx) => (
          <View
            key={r.slug}
            className={[
              "flex-row items-center justify-between py-2 px-3",
              idx !== rows.length - 1 ? "border-b border-white/5" : "",
            ].join(" ")}
          >
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={r.iconUrl ?? null}
                size={28}
                roundedClassName="rounded-lg"
                placeholderClassName="bg-white/5 border border-white/10"
              />
              <Text className="ml-3 text-white/90 text-[13px]" numberOfLines={1}>
                {r.name}
              </Text>
            </View>

            <Text className="text-white/70 text-[13px] ml-3">{r.qty != null ? `x${r.qty}` : "—"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function GliderGrid({
  items,
  onPressItem,
  emptyText = "No gliders found.",
  showUnavailable = false,
  numColumns = 3,
  prefetchIcons = true,
}: GliderGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    if (showUnavailable) return arr;
    return arr.filter((x) => !(x as any).notAvailable);
  }, [items, showUnavailable]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<GliderIndexItem | null>(null);

  const openSheet = useCallback(
    (it: GliderIndexItem) => {
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

  const TILE_H = 154;

  const sel = selected;
  const selLevels = sel?.levels ?? [];
  const selRecipes = sel?.recipes ?? [];

  const selRarity = prettyRarity(sel?.rarityText ?? null, sel?.rarity ?? null);
  const selTech = safeNum(sel?.technologyLevel);

  const isPartner = selLevels.length > 0;

  const selLv1 =
    isPartner
      ? selLevels.find((x) => x?.level === 1) ??
        [...selLevels].sort((a, b) => (a.level ?? 999) - (b.level ?? 999))[0] ??
        null
      : null;

  const selSpeed = isPartner ? safeNum(selLv1?.maxSpeed) : safeNum(sel?.speed);
  const selStamina = isPartner ? safeNum(selLv1?.staminaDrain) : safeNum(sel?.staminaDrain);

  const notAvailable = !!(sel as any)?.notAvailable;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {filtered.map((it) => {
            const disabled = !!(it as any).notAvailable;
            const ring = rarityRingFromNumber(it.rarity ?? null);

            const isPartnerGlider = (it.levels?.length ?? 0) > 0;
            const levels = it.levels ?? [];
            const lv1 =
              isPartnerGlider
                ? levels.find((x) => x?.level === 1) ??
                  [...levels].sort((a, b) => (a.level ?? 999) - (b.level ?? 999))[0] ??
                  null
                : null;

            const lvSpeed = safeNum(lv1?.maxSpeed);
            const lvStam = safeNum(lv1?.staminaDrain);

            const tech = safeNum(it.technologyLevel);
            const speed = safeNum(it.speed);

            const leftLabel = isPartnerGlider ? "Speed" : "Tech";
            const leftValue = isPartnerGlider ? lvSpeed : tech;

            const rightLabel = isPartnerGlider ? "Stam" : "Speed";
            const rightValue = isPartnerGlider ? lvStam : speed;

            const title = buildTwoLineTitle(safeName(it), isPartnerGlider);

            return (
              <View key={it.slug} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
                <Pressable
                  onPress={() => openSheet(it)}
                  disabled={disabled}
                  className={[
                    "rounded-2xl border bg-white/[0.03] overflow-hidden",
                    ring,
                    disabled ? "opacity-50" : "opacity-100",
                  ].join(" ")}
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
                        />

                        {disabled && (
                          <View className="absolute -top-1 -right-1 px-2 py-[2px] rounded-full border bg-red-500/15 border-red-500/35">
                            <Text className="text-red-200 text-[10px] font-semibold">N/A</Text>
                          </View>
                        )}

                        {isPartnerGlider && !disabled && (
                          <View className="absolute -top-1 -right-1 px-2 py-[2px] rounded-full border bg-white/5 border-white/10">
                            <Text className="text-white/80 text-[10px] font-semibold">
                              {lv1?.level != null ? `Lv${lv1.level}` : "Lv"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="mt-2 items-center">
                      <Text numberOfLines={1} className="text-white text-[12px] leading-4 text-center">
                        {title.line1}
                      </Text>
                      <Text numberOfLines={1} className="text-white/50 text-[10px] text-center mt-0.5">
                        {title.line2}
                      </Text>
                    </View>

                    <View className="flex-1" />

                    <View className="flex-row items-end justify-between mt-2">
                      <View className="flex-1 items-center">
                        <Text className="text-[10px] text-white/60">{leftLabel}</Text>
                        <View className="mt-1 px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
                          <Text
                            className="text-[10px] text-white/85"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                          >
                            {formatPillNumber(leftValue)}
                          </Text>
                        </View>
                      </View>

                      <View className="w-2" />

                      <View className="flex-1 items-center">
                        <Text className="text-[10px] text-white/60">{rightLabel}</Text>
                        <View className="mt-1 px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
                          <Text
                            className="text-[10px] text-white/85"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                          >
                            {formatPillNumber(rightValue)}
                          </Text>
                        </View>
                      </View>
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
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={sel?.iconUrl ?? null}
                size={56}
                roundedClassName="rounded-xl"
                placeholderClassName="bg-white/5 border border-white/10"
              />

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {sel?.name ?? "—"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={1}>
                  Tech {selTech != null ? formatPillNumber(selTech) : "—"} <Text className="text-white/40">•</Text>{" "}
                  Speed {selSpeed != null ? formatPillNumber(selSpeed) : "—"} <Text className="text-white/40">•</Text>{" "}
                  Stamina {selStamina != null ? formatPillNumber(selStamina) : "—"}
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

          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Rarity: <Text className="text-white">{selRarity}</Text>
              </Text>
            </View>

            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Type: <Text className="text-white">{isPartner ? "Partner" : "Item"}</Text>
              </Text>
            </View>

            {notAvailable ? (
              <View className="px-3 py-2 rounded-full border border-red-500/30 bg-red-500/10">
                <Text className="text-red-200 text-[12px]">Not available</Text>
              </View>
            ) : null}
          </View>

          <DescriptionSection text={sel?.description ?? null} />
          <PartnerLevelsSection levels={selLevels as any} slug={String(sel?.slug ?? "glider")} />
          <RecipeSection rows={selRecipes as any} />
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
