// components/palworld/MaterialGrid.tsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  fetchMaterialDetail,
  type MaterialIndexItem,
  type MaterialDetail,
} from "@/lib/palworld/items/paldbMaterial";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { filterOutWorkFromRecipeRows } from "@/lib/palworld/paldbDetailKit";

import {
  rarityRing,
  prettyRarity,
  slugToKind,
  SheetSectionLabel,
  KeyValueRows,
  ProducedAtSection,
  RecipeSection,
  DroppedBySection,
  TreasureBoxSection,
  WanderingMerchantSection,
  TreantSection,
  QuickRecipeSection,
  EffectsSection,
} from "@/components/Palworld/PalDetailSections";
import { clamp } from "../Construction/palGridKit";

type MaterialGridProps = {
  items: MaterialIndexItem[];
  onPressItem?: (item: MaterialIndexItem) => void;
  emptyText?: string;
  showUnavailable?: boolean;
  numColumns?: number;
  prefetchIcons?: boolean;
};

function stripTrailingMaterial(name: string) {
  const s = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  return s.replace(/\s*material\s*$/i, "").trim();
}

function buildTwoLineTitle(nameRaw: string, rarityRaw?: string | null) {
  const base = stripTrailingMaterial(nameRaw);
  const line1 = base || "Material";

  const isEgg = /\begg\b/i.test(base);
  const line2 = isEgg ? prettyRarity(rarityRaw ?? null) : "Material";

  return { line1, line2 };
}

function itemKey(it: Pick<MaterialIndexItem, "slug" | "rarity">) {
  return `${String(it.slug ?? "").trim()}::${String(it.rarity ?? "").trim()}`;
}

type SoulUpgradeRow = {
  material: { slug: string; name: string; iconUrl: string | null; } | null;
  qty: number | null;
  qtyText: string | null;
  rankText: string | null;
};

function SoulUpgradeSection({ rows }: { rows: SoulUpgradeRow[]; }) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Soul Upgrade</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((r, idx) => {
          const mat = r.material;
          const qtyLabel = r.qty != null ? `x${r.qty}` : r.qtyText ? r.qtyText : "—";

          return (
            <View
              key={`${mat?.slug ?? "soul"}:${idx}`}
              className={[
                "flex-row items-center justify-between py-3 px-3",
                idx !== rows.length - 1 ? "border-b border-white/5" : "",
              ].join(" ")}
            >
              <View className="flex-row items-center flex-1 pr-3">
                <RemoteIcon
                  uri={mat?.iconUrl ?? null}
                  size={30}
                  roundedClassName="rounded-xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                />
                <Text className="ml-3 text-white/90 text-[14px]" numberOfLines={1}>
                  {mat?.name ?? "—"}
                </Text>
                <Text className="text-white/60 text-[12px] ml-2" numberOfLines={1}>
                  {qtyLabel}
                </Text>
              </View>

              <Text className="text-white/70 text-[12px]" numberOfLines={1}>
                {r.rankText ?? "—"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function MaterialGrid({
  items,
  onPressItem,
  emptyText = "No materials found.",
  showUnavailable = false,
  numColumns = 3,
  prefetchIcons = true,
}: MaterialGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return showUnavailable ? arr : arr.filter((x) => x.isAvailable);
  }, [items, showUnavailable]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<MaterialIndexItem | null>(null);

  const detailCache = useRef<Map<string, MaterialDetail>>(new Map());
  const [detail, setDetail] = useState<MaterialDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [treantView, setTreantView] = useState<"tree" | "list">("tree");

  const openSheet = useCallback(
    async (it: MaterialIndexItem) => {
      onPressItem?.(it);

      setSelected(it);
      setTreantView("tree");
      setSheetVisible(true);
      setDetailError(null);

      const href = String(it.slug ?? "").trim();
      if (!href) return;

      const cacheKey = itemKey(it);
      const cached = detailCache.current.get(cacheKey);
      if (cached) {
        setDetail(cached);
        return;
      }

      setDetail(null);
      setDetailLoading(true);
      try {
        const d = await fetchMaterialDetail(href);
        detailCache.current.set(cacheKey, d);
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

  const TILE_H = 124;

  const description = String((detail as any)?.description ?? selected?.description ?? "").trim();
  const treant = (detail as any)?.treant ?? null;

  const stats = (detail as any)?.stats ?? [];
  const others = (detail as any)?.others ?? [];

  const producedAt = (detail as any)?.producedAt ?? [];
  const production = useMemo(() => filterOutWorkFromRecipeRows((detail as any)?.production ?? []), [detail]);
  const craftingMaterials = useMemo(
    () => filterOutWorkFromRecipeRows((detail as any)?.craftingMaterials ?? []),
    [detail]
  );

  const droppedBy = (detail as any)?.droppedBy ?? [];
  const treasureBox = (detail as any)?.treasureBox ?? [];
  const wanderingMerchant = (detail as any)?.wanderingMerchant ?? [];

  const soulUpgrade: SoulUpgradeRow[] = (detail as any)?.soulUpgrade ?? [];
  const effects = (detail as any)?.effects ?? [];
  const quickRecipes = (detail as any)?.recipes ?? (selected as any)?.recipes ?? [];

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {filtered.map((it) => {
            const disabled = !it.isAvailable;
            const ring = rarityRing(it.rarity);
            const title = buildTwoLineTitle(it.name, it.rarity);

            return (
              <View key={itemKey(it)} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
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

          {!!description ? (
            <View className="mt-5">
              <SheetSectionLabel>About</SheetSectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <Text className="text-white/80 text-[13px] leading-5">{description}</Text>
              </View>
            </View>
          ) : null}
          <EffectsSection effects={effects as any} />
          <QuickRecipeSection rows={quickRecipes as any} />
          {!!(stats?.length ?? 0) ? (
            <View className="mt-5">
              <SheetSectionLabel>Stats</SheetSectionLabel>
              <KeyValueRows rows={stats as any} />
            </View>
          ) : null}
          <SoulUpgradeSection rows={soulUpgrade} />
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
          {!!(others?.length ?? 0) ? (
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
