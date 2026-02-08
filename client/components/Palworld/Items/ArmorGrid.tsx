// components/palworld/ArmorGrid.tsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  type ArmorIndexItem,
  type ArmorDetail,
  fetchArmorDetail,
  armorVariantKeyFromIndex,
} from "@/lib/palworld/items/paldbArmor";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { filterOutWorkFromRecipeRows } from "@/lib/palworld/paldbDetailKit";

import {
  safeNum,
  slugToKind,
  prettyRarity,
  rarityRing,
  SheetSectionLabel,
  KeyValueRows,
  ProducedAtSection,
  RecipeSection,
  DroppedBySection,
  TreasureBoxSection,
  WanderingMerchantSection,
  TreantSection,
  EffectsSection,
  QuickRecipeSection,
  nonZeroNum,
} from "@/components/Palworld/PalDetailSections";
import { clamp } from "../Construction/palGridKit";

type ArmorGridProps = {
  items: ArmorIndexItem[];
  onPressItem?: (item: ArmorIndexItem) => void;

  emptyText?: string;
  showUnavailable?: boolean; // default false
  numColumns?: number; // default 3

  prefetchIcons?: boolean; // default true
};

function StatPill({ label, value }: { label: string; value: number | null }) {
  if (value == null || value === 0) return null;

  return (
    <View className="items-center">
      <Text className="text-[10px] text-white/60">{label}</Text>
      <View className="mt-1 px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
        <Text className="text-[10px] text-white/85">{String(value)}</Text>
      </View>
    </View>
  );
}

function stripTrailingArmor(name: string) {
  const s = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  return s.replace(/\s*armor\s*$/i, "").trim();
}

function buildTwoLineTitle(nameRaw: string) {
  const base = stripTrailingArmor(nameRaw);
  const line1 = base || "Armor";
  const line2 = "Armor";
  return { line1, line2 };
}

type MiniStat = { label: "Shield" | "Defense" | "Health" | "Tech"; value: number | null };

function pickTileStats(args: {
  shield: number | null;
  defense: number | null;
  health: number | null;
  tech: number | null;
}): { primary: MiniStat | null; secondary: MiniStat | null } {
  const shield = nonZeroNum(args.shield);
  const defense = nonZeroNum(args.defense);
  const health = nonZeroNum(args.health);
  const tech = nonZeroNum(args.tech);

  const primary: MiniStat | null =
    shield != null ? { label: "Shield", value: shield } : defense != null ? { label: "Defense", value: defense } : health != null ? { label: "Health", value: health } : null;

  let secondary: MiniStat | null = null;

  if (tech != null) secondary = { label: "Tech", value: tech };
  else if (health != null) secondary = { label: "Health", value: health };
  else if (defense != null) secondary = { label: "Defense", value: defense };
  else if (shield != null) secondary = { label: "Shield", value: shield };

  if (primary && secondary && primary.label === secondary.label) {
    if (primary.label === "Health") secondary = defense != null ? { label: "Defense", value: defense } : shield != null ? { label: "Shield", value: shield } : null;
    else if (primary.label === "Defense") secondary = health != null ? { label: "Health", value: health } : shield != null ? { label: "Shield", value: shield } : null;
    else if (primary.label === "Shield") secondary = health != null ? { label: "Health", value: health } : defense != null ? { label: "Defense", value: defense } : null;
    else if (primary.label === "Tech") secondary = health != null ? { label: "Health", value: health } : defense != null ? { label: "Defense", value: defense } : shield != null ? { label: "Shield", value: shield } : null;
  }

  return { primary, secondary };
}

function buildSheetSubtitle(args: {
  shield: number | null;
  defense: number | null;
  health: number | null;
  tech: number | null;
}): string {
  const shield = nonZeroNum(args.shield);
  const defense = nonZeroNum(args.defense);
  const health = nonZeroNum(args.health);
  const tech = nonZeroNum(args.tech);

  const parts: string[] = [];
  if (shield != null) parts.push(`Shield ${shield}`);
  if (defense != null) parts.push(`Defense ${defense}`);
  if (health != null) parts.push(`Health ${health}`);
  if (tech != null) parts.push(`Tech ${tech}`);

  return parts.join(" • ");
}

export default function ArmorGrid({
  items,
  onPressItem,
  emptyText = "No armor found.",
  showUnavailable = false,
  numColumns = 3,
  prefetchIcons = true,
}: ArmorGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return showUnavailable ? arr : arr.filter((x) => x.isAvailable);
  }, [items, showUnavailable]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<ArmorIndexItem | null>(null);

  const detailCache = useRef<Map<string, ArmorDetail>>(new Map());
  const [detail, setDetail] = useState<ArmorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [treantView, setTreantView] = useState<"tree" | "list">("tree");

  const openSheet = useCallback(
    async (it: ArmorIndexItem) => {
      onPressItem?.(it);

      setSelected(it);
      setTreantView("tree");
      setSheetVisible(true);
      setDetailError(null);

      const variantKey = armorVariantKeyFromIndex(it);

      const cached = detailCache.current.get(variantKey);
      if (cached) {
        setDetail(cached);
        return;
      }

      setDetail(null);
      setDetailLoading(true);
      try {
        const d = await fetchArmorDetail(variantKey);
        detailCache.current.set(variantKey, d);
        setDetail(d);
      } catch (e: any) {
        setDetailError(e?.message ? String(e.message) : "Failed to load details.");
      } finally {
        setDetailLoading(false);
      }
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

  const sheetKind = selected ? slugToKind(selected.slug) : "—";
  const sheetRarity = selected ? prettyRarity(selected.rarity) : "—";
  const sheetShield = nonZeroNum((detail as any)?.shield ?? selected?.shield);
  const sheetDefense = nonZeroNum((detail as any)?.defense ?? selected?.defense);
  const sheetHealth = nonZeroNum((detail as any)?.health ?? selected?.health);
  const sheetTech = nonZeroNum((detail as any)?.technology ?? selected?.technology);

  const sheetSubtitle = buildSheetSubtitle({
    shield: sheetShield,
    defense: sheetDefense,
    health: sheetHealth,
    tech: sheetTech,
  });

  const TILE_H = 154;

  const description = String((detail as any)?.description ?? selected?.description ?? "").trim();
  const hasDesc = !!description;

  const effects = (detail as any)?.effects ?? [];
  const stats = (detail as any)?.stats ?? [];
  const others = (detail as any)?.others ?? [];
  const treant = (detail as any)?.treant ?? null;

  const producedAt = (detail as any)?.producedAt ?? [];
  const production = useMemo(() => filterOutWorkFromRecipeRows((detail as any)?.production ?? []), [detail]);
  const craftingMaterials = useMemo(
    () => filterOutWorkFromRecipeRows((detail as any)?.craftingMaterials ?? []),
    [detail]
  );

  const droppedBy = (detail as any)?.droppedBy ?? [];
  const treasureBox = (detail as any)?.treasureBox ?? [];
  const wanderingMerchant = (detail as any)?.wanderingMerchant ?? [];

  const quickRecipe = (detail as any)?.recipes ?? (selected as any)?.recipes ?? [];

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {filtered.map((it) => {
            const disabled = !it.isAvailable;
            const ring = rarityRing(it.rarity);

            const shield = nonZeroNum((it as any).shield);
            const defense = nonZeroNum((it as any).defense);
            const health = nonZeroNum((it as any).health);
            const tech = nonZeroNum(it.technology);

            const { primary, secondary } = pickTileStats({ shield, defense, health, tech });

            const title = buildTwoLineTitle(it.name);
            const rowKey = armorVariantKeyFromIndex(it);

            return (
              <View key={rowKey} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
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
                          uri={it.iconUrl}
                          size={58}
                          roundedClassName="rounded-xl"
                          placeholderClassName="bg-white/5 border border-white/10"
                        />

                        {!it.isAvailable && (
                          <View className="absolute -top-1 -right-1 px-2 py-[2px] rounded-full border bg-red-500/15 border-red-500/35">
                            <Text className="text-red-200 text-[10px] font-semibold">N/A</Text>
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

                    <View className="mt-2">
                      <View className="flex-row justify-center gap-2">
                        {primary ? <StatPill label={primary.label} value={primary.value} /> : null}
                        {secondary ? <StatPill label={secondary.label} value={secondary.value} /> : null}
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
                uri={selected?.iconUrl ?? null}
                size={56}
                roundedClassName="rounded-xl"
                placeholderClassName="bg-white/5 border border-white/10"
              />

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {selected?.name ?? "—"}
                </Text>
                {sheetSubtitle ? (
                  <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={2}>
                    {sheetSubtitle}
                  </Text>
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

          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Kind: <Text className="text-white">{sheetKind}</Text>
              </Text>
            </View>

            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Rarity: <Text className="text-white">{sheetRarity}</Text>
              </Text>
            </View>

            {!selected?.isAvailable ? (
              <View className="px-3 py-2 rounded-full border border-red-500/30 bg-red-500/10">
                <Text className="text-red-200 text-[12px]">Not available</Text>
              </View>
            ) : null}
          </View>
          {detailLoading ? (
            <View className="mt-5 items-center">
              <ActivityIndicator />
              <Text className="text-white/60 text-[12px] mt-2">Loading details…</Text>
            </View>
          ) : detailError ? (
            <View className="mt-5">
              <Text className="text-red-200 text-[12px]">{detailError}</Text>
            </View>
          ) : null}
          {hasDesc ? (
            <View className="mt-5">
              <SheetSectionLabel>About</SheetSectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <Text className="text-white/80 text-[13px] leading-5">{description}</Text>
              </View>
            </View>
          ) : null}
          <EffectsSection effects={effects as any[]} />
          <QuickRecipeSection rows={quickRecipe as any} />
          {!!stats?.length ? (
            <View className="mt-5">
              <SheetSectionLabel>Stats</SheetSectionLabel>
              <KeyValueRows rows={stats as any} />
            </View>
          ) : null}
          {!!treant ? (
            <View className="mt-5">
              <TreantSection treant={treant as any} view={treantView} onViewChange={setTreantView} />
            </View>
          ) : null}
          <ProducedAtSection rows={producedAt as any} />
          <RecipeSection title="Production" rows={production as any} />
          <RecipeSection title="Crafting Materials" rows={craftingMaterials as any} />
          <DroppedBySection rows={droppedBy as any} />
          <TreasureBoxSection rows={treasureBox as any} />
          <WanderingMerchantSection rows={wanderingMerchant as any} />
          {!!others?.length ? (
            <View className="mt-5">
              <SheetSectionLabel>Others</SheetSectionLabel>
              <KeyValueRows rows={others as any} />
            </View>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
