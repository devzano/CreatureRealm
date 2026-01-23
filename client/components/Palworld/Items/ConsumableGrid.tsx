// components/palworld/ConsumableGrid.tsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  type ConsumableIndexItem,
  type ConsumableDetail,
  type TreantNode,
  type DetailRecipeRow,
  type DroppedByRow,
  type TreasureBoxRow,
  type MerchantRow,
  type KeyValueRow,
  fetchConsumableDetail,
} from "@/lib/palworld/items/paldbConsumable";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

type ConsumableGridProps = {
  items: ConsumableIndexItem[];
  onPressItem?: (item: ConsumableIndexItem) => void;

  emptyText?: string;
  showUnavailable?: boolean;
  numColumns?: number;

  prefetchIcons?: boolean;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function rarityRing(rarityRaw?: string | null) {
  const r = (rarityRaw ?? "").toLowerCase();
  if (r.includes("legend")) return "border-amber-400/70";
  if (r.includes("epic")) return "border-fuchsia-400/70";
  if (r.includes("rare")) return "border-sky-400/70";
  if (r.includes("uncommon")) return "border-emerald-400/70";
  return "border-white/10";
}

function prettyRarity(r?: string | null) {
  const s = (r ?? "").trim();
  return s || "Common";
}

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function slugToKind(slug: string) {
  const s = (slug ?? "").trim();
  if (!s) return "Unknown";

  const last = s.split("/").filter(Boolean).slice(-1)[0] ?? s;
  const base = last.replace(/[#?].*$/, "");

  const decoded = (() => {
    try {
      return decodeURIComponent(base);
    } catch {
      return base;
    }
  })();

  return decoded.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function stripTrailingWord(name: string, word: string) {
  const s = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  const re = new RegExp(`\\s*${word}\\s*$`, "i");
  return s.replace(re, "").trim();
}

// IMPORTANT:
// PalDB can list multiple variants with the same slug/name but different rarity (e.g., Treasure Map).
// Use a composite key so variants don't collide in React keys or our detail cache.
function itemKey(it: Pick<ConsumableIndexItem, "slug" | "rarity">) {
  const slug = String(it.slug ?? "").trim();
  const rarity = String(it.rarity ?? "").trim();
  return `${slug}::${rarity}`;
}

function buildTwoLineTitle(nameRaw: string, rarityRaw?: string | null) {
  const base = stripTrailingWord(nameRaw, "consumable");
  const line1 = base || "Consumable";

  // Make map variants obvious (same name, different rarity)
  const isMap = /\btreasure\s*map\b|\bmap\b/i.test(line1);
  const line2 = isMap ? prettyRarity(rarityRaw) : "Consumable";

  return { line1, line2 };
}

function statFillIconName(key: string): string {
  const k = (key ?? "").toLowerCase().trim();

  if (k.includes("gold") || k.includes("coin") || k.includes("price") || k.includes("sell") || k.includes("buy")) {
    return "cash";
  }

  if (k.includes("rarity")) return "star-circle";
  if (k === "type" || k.includes("category")) return "shape";
  if (k.includes("rank")) return "trophy";
  if (k.includes("code") || k.includes("id")) return "barcode";

  if (k.includes("weight")) return "weight-kilogram";
  if (k.includes("max stack") || k.includes("maxstack") || k.includes("stack")) return "layers";
  if (k.includes("durability")) return "shield";
  if (k.includes("cooldown")) return "timer";
  if (k.includes("work") || k.includes("workload")) return "hammer";
  if (k.includes("attack")) return "sword";
  if (k.includes("defense")) return "shield-star";
  if (k.includes("hp") || k.includes("health")) return "heart";
  if (k.includes("stamina")) return "run-fast";

  if (k.includes("technology") || k.includes("tech")) return "atom";
  if (k.includes("required") || k.includes("needed")) return "clipboard-check";

  return "information";
}

function renderTreant(node: TreantNode, depth: number) {
  const pad = Math.min(22, depth * 12);
  const qtyLabel = node?.qty != null ? `x${node.qty}` : "—";

  return (
    <View key={`${node.slug ?? "node"}:${depth}:${node.iconUrl ?? ""}`} style={{ marginLeft: pad }}>
      <View className="flex-row items-center py-1">
        <RemoteIcon
          uri={node.iconUrl ?? null}
          size={18}
          roundedClassName="rounded-md"
          placeholderClassName="bg-white/5 border border-white/10"
          contentFit="contain"
        />
        <Text className="ml-2 text-white/85 text-[12px]">{qtyLabel}</Text>

        {!!node.slug && (
          <Text className="text-white/35 text-[11px] ml-2" numberOfLines={1}>
            {node.slug}
          </Text>
        )}
      </View>

      {!!node.children?.length && node.children.map((c) => renderTreant(c, depth + 1))}
    </View>
  );
}

function SheetSectionLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function KeyValueRows({ rows }: { rows: KeyValueRow[] }) {
  if (!rows?.length) return null;

  return (
    <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {rows.map((r, idx) => {
        const iconUrl = r?.keyItem?.iconUrl ?? r?.keyIconUrl ?? null;
        const iconName = statFillIconName(String(r?.key ?? ""));

        return (
          <View
            key={`${r?.key ?? "k"}:${idx}`}
            className={[
              "flex-row items-center justify-between py-3 px-3",
              idx !== rows.length - 1 ? "border-b border-white/5" : "",
            ].join(" ")}
          >
            <View className="flex-row items-center flex-1 pr-3">
              {iconUrl ? (
                <RemoteIcon
                  uri={iconUrl}
                  size={22}
                  roundedClassName="rounded-md"
                  placeholderClassName="bg-white/5 border border-white/10"
                  contentFit="contain"
                />
              ) : (
                <View className="w-[22px] h-[22px] items-center justify-center">
                  <MaterialCommunityIcons name={iconName as any} size={18} color="rgba(255,255,255,0.75)" />
                </View>
              )}

              <Text className="ml-3 text-white/85 text-[13px]" numberOfLines={1}>
                {r?.key ?? "—"}
              </Text>
            </View>

            <Text className="text-white/70 text-[13px]" numberOfLines={1}>
              {r?.valueText ?? r?.valueItem?.name ?? "—"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function FoodsSection({ rows }: { rows: KeyValueRow[] }) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Foods</SheetSectionLabel>
      <KeyValueRows rows={rows} />
    </View>
  );
}

function ResearchSection({ rows }: { rows: any[] }) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Research</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((row, idx) => (
          <View
            key={`research:${idx}`}
            className={["py-4 px-3", idx !== rows.length - 1 ? "border-b border-white/5" : ""].join(" ")}
          >
            {!!row.productText && (
              <Text className="text-white/85 text-[13px] font-semibold" numberOfLines={2}>
                {row.productText}
              </Text>
            )}

            {!!row.materials?.length && (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {row.materials.map((m: any) => (
                  <View
                    key={m.slug}
                    className="flex-row items-center px-3 py-2 rounded-full border border-white/10 bg-white/5"
                  >
                    <RemoteIcon
                      uri={m.iconUrl ?? null}
                      size={18}
                      roundedClassName="rounded-md"
                      placeholderClassName="bg-white/5 border border-white/10"
                      contentFit="contain"
                    />
                    <Text className="ml-2 text-white/85 text-[12px]" numberOfLines={1}>
                      {m.name}
                    </Text>

                    {m.qty != null ? (
                      <Text className="text-white/60 text-[12px] ml-2">x{m.qty}</Text>
                    ) : m.qtyText ? (
                      <Text className="text-white/60 text-[12px] ml-2">{m.qtyText}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function RecipeSection({ title, rows }: { title: string; rows: DetailRecipeRow[] }) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>{title}</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((row, idx) => (
          <View
            key={`${row.product?.slug ?? "row"}:${idx}`}
            className={["py-4 px-3", idx !== rows.length - 1 ? "border-b border-white/5" : ""].join(" ")}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <RemoteIcon
                  uri={row.product?.iconUrl ?? null}
                  size={30}
                  roundedClassName="rounded-xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                />
                <Text className="ml-3 text-white/90 text-[14px] font-semibold" numberOfLines={1}>
                  {row.product?.name ?? "—"}
                </Text>

                {row.product?.qty != null ? (
                  <Text className="text-white/60 text-[12px] ml-2">x{row.product.qty}</Text>
                ) : null}
              </View>

              {!!row.schematicText && (
                <Text className="text-white/55 text-[12px] ml-3" numberOfLines={1}>
                  {row.schematicText}
                </Text>
              )}
            </View>

            {!!row.materials?.length && (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {row.materials.map((m) => (
                  <View
                    key={m.slug}
                    className="flex-row items-center px-3 py-2 rounded-full border border-white/10 bg-white/5"
                  >
                    <RemoteIcon
                      uri={m.iconUrl ?? null}
                      size={18}
                      roundedClassName="rounded-md"
                      placeholderClassName="bg-white/5 border border-white/10"
                      contentFit="contain"
                    />
                    <Text className="ml-2 text-white/85 text-[12px]" numberOfLines={1}>
                      {m.name}
                    </Text>

                    {m.qty != null ? (
                      <Text className="text-white/60 text-[12px] ml-2">x{m.qty}</Text>
                    ) : m.qtyText ? (
                      <Text className="text-white/60 text-[12px] ml-2">{m.qtyText}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function ProducedAtSection({ rows }: { rows: { slug: string; name: string; iconUrl: string | null }[] }) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Produced At</SheetSectionLabel>

      <View className="flex-row flex-wrap gap-2">
        {rows.map((p) => (
          <View
            key={p.slug}
            className="flex-row items-center px-3 py-2 rounded-full border border-white/10 bg-white/5"
          >
            <RemoteIcon
              uri={p.iconUrl}
              size={18}
              roundedClassName="rounded-md"
              placeholderClassName="bg-white/5 border border-white/10"
              contentFit="contain"
            />
            <Text className="ml-2 text-white/85 text-[12px]" numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DroppedBySection({ rows }: { rows: DroppedByRow[] }) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Dropped By</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((r, idx) => (
          <View
            key={`${r.pal?.slug ?? "pal"}:${idx}`}
            className={[
              "flex-row items-center justify-between py-3 px-3",
              idx !== rows.length - 1 ? "border-b border-white/5" : "",
            ].join(" ")}
          >
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={r.pal?.iconUrl ?? null}
                size={30}
                roundedClassName="rounded-full"
                placeholderClassName="bg-white/5 border border-white/10"
              />
              <Text className="ml-3 text-white/90 text-[14px]" numberOfLines={1}>
                {r.pal?.name ?? "—"}
              </Text>
            </View>

            <View className="items-end ml-3">
              <Text className="text-white/70 text-[12px]" numberOfLines={1}>
                {r.qtyText ?? "—"}
              </Text>
              <Text className="text-white/45 text-[11px]" numberOfLines={1}>
                {r.probabilityText ?? "—"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function TreasureBoxSection({ rows }: { rows: TreasureBoxRow[] }) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Treasure Box</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((r, idx) => (
          <View
            key={`${r.item?.slug ?? "tb"}:${idx}`}
            className={["py-4 px-3", idx !== rows.length - 1 ? "border-b border-white/5" : ""].join(" ")}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <RemoteIcon
                  uri={r.item?.iconUrl ?? null}
                  size={30}
                  roundedClassName="rounded-xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                />
                <Text className="ml-3 text-white/90 text-[14px]" numberOfLines={1}>
                  {r.item?.name ?? "—"}
                </Text>
                {!!r.qtyText && (
                  <Text className="text-white/60 text-[12px] ml-2" numberOfLines={1}>
                    x{r.qtyText}
                  </Text>
                )}
              </View>
            </View>

            {!!r.sourceText && (
              <Text className="text-white/50 text-[12px] mt-2" numberOfLines={3}>
                {r.sourceText}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function WanderingMerchantSection({ rows }: { rows: MerchantRow[] }) {
  if (!rows?.length) return null;

  return (
    <View className="mt-5">
      <SheetSectionLabel>Wandering Merchant</SheetSectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((r, idx) => (
          <View
            key={`${r.item?.slug ?? "wm"}:${idx}`}
            className={["py-4 px-3", idx !== rows.length - 1 ? "border-b border-white/5" : ""].join(" ")}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <RemoteIcon
                  uri={r.item?.iconUrl ?? null}
                  size={30}
                  roundedClassName="rounded-xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                />
                <Text className="ml-3 text-white/90 text-[14px]" numberOfLines={1}>
                  {r.item?.name ?? "—"}
                </Text>
              </View>
            </View>

            {!!r.sourceText && (
              <Text className="text-white/50 text-[12px] mt-2" numberOfLines={3}>
                {r.sourceText}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ConsumableGrid({
  items,
  onPressItem,
  emptyText = "No consumables found.",
  showUnavailable = false,
  numColumns = 3,
  prefetchIcons = true,
}: ConsumableGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return showUnavailable ? arr : arr.filter((x) => x.isAvailable);
  }, [items, showUnavailable]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<ConsumableIndexItem | null>(null);

  // Cache details per variant (slug::rarity) so map variants don't overwrite each other.
  const detailCache = useRef<Map<string, ConsumableDetail>>(new Map());
  const [detail, setDetail] = useState<ConsumableDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openSheet = useCallback(
    async (it: ConsumableIndexItem) => {
      onPressItem?.(it);

      setSelected(it);
      setSheetVisible(true);
      setDetailError(null);

      const cacheKey = itemKey(it);
      const slugKey = String(it.slug ?? "").trim();
      if (!slugKey) return;

      const cached = detailCache.current.get(cacheKey);
      if (cached) {
        setDetail(cached);
        return;
      }

      setDetail(null);
      setDetailLoading(true);
      try {
        // Detail endpoint is still by slug/href, but we store it under the variant cacheKey.
        const d = await fetchConsumableDetail(slugKey);
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

  // ---- sections (ONLY render if non-empty) ----
  const description = (detail?.description ?? selected?.description ?? "").trim();

  const treant = (detail as any)?.treant ?? null;

  const stats = (detail as any)?.stats ?? [];
  const foods = (detail as any)?.foods ?? [];
  const research = (detail as any)?.research ?? [];

  const producedAt = (detail as any)?.producedAt ?? [];
  const production = (detail as any)?.production ?? [];
  const craftingMaterials = (detail as any)?.craftingMaterials ?? [];

  const droppedBy = (detail as any)?.droppedBy ?? [];
  const treasureBox = (detail as any)?.treasureBox ?? [];
  const wanderingMerchant = (detail as any)?.wanderingMerchant ?? [];

  const others = (detail as any)?.others ?? [];

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {filtered.map((it) => {
            const disabled = !it.isAvailable;
            const ring = rarityRing(it.rarity);
            const title = buildTwoLineTitle(it.name, it.rarity);
            const k = itemKey(it);

            return (
              <View key={k} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
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

          {/* Pills */}
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

          {/* Detail loading/error */}
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

          {/* About */}
          {!!description ? (
            <View className="mt-5">
              <SheetSectionLabel>About</SheetSectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <Text className="text-white/80 text-[13px] leading-5">{description}</Text>
              </View>
            </View>
          ) : null}

          {/* Stats */}
          {!!(stats?.length ?? 0) ? (
            <View className="mt-5">
              <SheetSectionLabel>Stats</SheetSectionLabel>
              <KeyValueRows rows={stats as KeyValueRow[]} />
            </View>
          ) : null}

          {/* Dependency Tree */}
          {!!treant ? (
            <View className="mt-5">
              <SheetSectionLabel>Dependency Tree</SheetSectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="p-3 pr-6">{renderTreant(treant as TreantNode, 0)}</View>
                </ScrollView>
              </View>
              <Text className="text-white/35 text-[11px] mt-2">(Shows ingredient dependency paths.)</Text>
            </View>
          ) : null}

          <FoodsSection rows={foods as KeyValueRow[]} />
          <ResearchSection rows={research as any[]} />

          <ProducedAtSection rows={producedAt as any} />
          <RecipeSection title="Production" rows={production as any} />
          <RecipeSection title="Crafting Materials" rows={craftingMaterials as any} />

          <DroppedBySection rows={droppedBy as any} />
          <TreasureBoxSection rows={treasureBox as any} />
          <WanderingMerchantSection rows={wanderingMerchant as any} />

          {!!(others?.length ?? 0) ? (
            <View className="mt-5">
              <SheetSectionLabel>Others</SheetSectionLabel>
              <KeyValueRows rows={others as KeyValueRow[]} />
            </View>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
