// components/Palworld/PalworldConstructionGrid.tsx
import React, { useMemo, useCallback, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

import type { StorageIndexItem } from "@/lib/palworld/construction/paldbStorage";
import StorageGrid from "@/components/Palworld/Construction/PalStorageGrid";
import type { FoundationsIndexItem } from "@/lib/palworld/construction/paldbFoundations";
import FoundationGrid from "@/components/Palworld/Construction/PalFoundationsGrid";
import type { FurnitureIndexItem } from "@/lib/palworld/construction/paldbFurniture";
import FurnitureGrid from "@/components/Palworld/Construction/PalFurnitureGrid";
import type { DefensesIndexItem } from "@/lib/palworld/construction/paldbDefenses";
import DefensesGrid from "@/components/Palworld/Construction/PalDefensesGrid";
import type { FoodIndexItem } from "@/lib/palworld/construction/paldbFood";
import FoodGrid from "@/components/Palworld/Construction/PalFoodGrid";
import type { InfrastructureIndexItem } from "@/lib/palworld/construction/paldbInfrastructure";
import InfrastructureGrid from "@/components/Palworld/Construction/PalInfrastructureGrid";
import type { LightingIndexItem } from "@/lib/palworld/construction/paldbLighting";
import LightingGrid from "@/components/Palworld/Construction/PalLightingGrid";
import type { ProductionIndexItem } from "@/lib/palworld/construction/paldbProduction";
import ProductionGrid from "@/components/Palworld/Construction/PalProductionGrid";
import type { PalConstructionIndexItem } from "@/lib/palworld/construction/paldbPal";
import PalGrid from "@/components/Palworld/Construction/PalPalGrid";
import type { OtherIndexItem } from "@/lib/palworld/construction/paldbOther";
import OtherGrid from "@/components/Palworld/Construction/PalOtherGrid";

type PalworldConstructionGridProps = {
  storage: StorageIndexItem[];
  foundations: FoundationsIndexItem[];
  furniture: FurnitureIndexItem[];
  defenses: DefensesIndexItem[];
  food: FoodIndexItem[];
  infrastructure: InfrastructureIndexItem[];
  lighting: LightingIndexItem[];
  production: ProductionIndexItem[];
  palConstruction: PalConstructionIndexItem[];
  otherConstruction: OtherIndexItem[];

  search: string;
};

type CategoryKey =
  | "all"
  | "storage"
  | "foundations"
  | "furniture"
  | "defenses"
  | "food"
  | "infrastructure"
  | "lighting"
  | "production"
  | "palConstruction"
  | "other";

type PreviewItem = { name: string; };

function buildHaystack(parts: Array<any>) {
  return parts
    .map((x) => (x == null ? "" : String(x)))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function filterList<T>(items: T[] | undefined, search: string, build: (it: T) => string): T[] {
  const arr = Array.isArray(items) ? items : [];
  const s = (search ?? "").trim().toLowerCase();
  if (!s) return arr;
  return arr.filter((it) => build(it).includes(s));
}

function safeName(x: any): string {
  const name =
    String(x?.name ?? "").trim() ||
    String(x?.title ?? "").trim() ||
    String(x?.label ?? "").trim() ||
    String(x?.categoryText ?? "").trim();
  if (name) return name;

  const slug = String(x?.slug ?? "").trim();
  return slug ? slug.replace(/_/g, " ").trim() : "Unknown";
}

function toPreviewItems(list: any[], max = 6): PreviewItem[] {
  const arr = Array.isArray(list) ? list : [];
  const out: PreviewItem[] = [];
  for (const it of arr) {
    const n = safeName(it);
    if (!n) continue;
    out.push({ name: n });
    if (out.length >= max) break;
  }
  return out;
}

const PalworldConstructionGrid: React.FC<PalworldConstructionGridProps> = ({
  storage,
  foundations,
  furniture,
  defenses,
  food,
  infrastructure,
  lighting,
  production,
  palConstruction,
  otherConstruction,
  search,
}) => {
  const normalizedSearch = (search ?? "").trim().toLowerCase();

  const scrollRef = useRef<ScrollView | null>(null);

  const filteredStorage = useMemo(
    () =>
      filterList(storage, normalizedSearch, (s) =>
        buildHaystack([
          s.name,
          s.slug,
          s.categoryText,
          s.technologyLevel,
          s.slots,
          s.workSuitability?.name,
          s.workSuitability?.level,
          s.description,
          (s.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [storage, normalizedSearch]
  );

  const filteredFoundations = useMemo(
    () =>
      filterList(foundations, normalizedSearch, (x: any) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.health,
          (x.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [foundations, normalizedSearch]
  );

  const filteredFurniture = useMemo(
    () =>
      filterList(furniture, normalizedSearch, (x: any) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.comfort,
          x.durability,
          (x.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [furniture, normalizedSearch]
  );

  const filteredDefenses = useMemo(
    () =>
      filterList(defenses, normalizedSearch, (x: any) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.health,
          x.attack,
          x.range,
          (x.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [defenses, normalizedSearch]
  );

  const filteredFood = useMemo(
    () =>
      filterList(food, normalizedSearch, (x: any) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.nutrition,
          x.sanity,
          (x.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [food, normalizedSearch]
  );

  const filteredInfrastructure = useMemo(
    () =>
      filterList(infrastructure, normalizedSearch, (x: any) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.power,
          x.workSuitability?.name,
          x.workSuitability?.level,
          (x.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [infrastructure, normalizedSearch]
  );

  const filteredLighting = useMemo(
    () =>
      filterList(lighting, normalizedSearch, (x: any) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.power,
          x.brightness,
          (x.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [lighting, normalizedSearch]
  );

  const filteredProduction = useMemo(
    () =>
      filterList(production, normalizedSearch, (x: any) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.workSuitability?.name,
          x.workSuitability?.level,
          x.power,
          (x.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [production, normalizedSearch]
  );

  const filteredPalConstruction = useMemo(
    () =>
      filterList(palConstruction, normalizedSearch, (x: any) =>
        buildHaystack([x.name, x.slug, x.categoryText, x.technologyLevel, x.description, x.palName, x.palSlug])
      ),
    [palConstruction, normalizedSearch]
  );

  const filteredOther = useMemo(
    () =>
      filterList(otherConstruction, normalizedSearch, (x: any) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          (x.recipe ?? []).map((r: any) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
        ])
      ),
    [otherConstruction, normalizedSearch]
  );

  const totalShown =
    filteredStorage.length +
    filteredFoundations.length +
    filteredFurniture.length +
    filteredDefenses.length +
    filteredFood.length +
    filteredInfrastructure.length +
    filteredLighting.length +
    filteredProduction.length +
    filteredPalConstruction.length +
    filteredOther.length;

  const totalAll =
    (storage?.length ?? 0) +
    (foundations?.length ?? 0) +
    (furniture?.length ?? 0) +
    (defenses?.length ?? 0) +
    (food?.length ?? 0) +
    (infrastructure?.length ?? 0) +
    (lighting?.length ?? 0) +
    (production?.length ?? 0) +
    (palConstruction?.length ?? 0) +
    (otherConstruction?.length ?? 0);

  const [selected, setSelected] = useState<CategoryKey>("all");

  const categories = useMemo(() => {
    return [
      {
        key: "storage" as const,
        title: "Storage",
        subtitle: "Chests + Containers",
        shown: filteredStorage.length,
        total: storage?.length ?? 0,
        items: filteredStorage as any[],
        previewItems: toPreviewItems(filteredStorage, 6),
        render: (items: StorageIndexItem[]) => (
          <StorageGrid items={items} numColumns={3} emptyText="No storage found. Try a different search." />
        ),
      },

      {
        key: "foundations" as const,
        title: "Foundations",
        subtitle: "Floors + Walls + Structure",
        shown: filteredFoundations.length,
        total: foundations?.length ?? 0,
        items: filteredFoundations as any[],
        previewItems: toPreviewItems(filteredFoundations, 6),
        render: (items: FoundationsIndexItem[]) => (
          <FoundationGrid items={items} numColumns={3} emptyText="No foundations found. Try a different search." />
        ),
      },

      {
        key: "furniture" as const,
        title: "Furniture",
        subtitle: "Beds + Decor + Comfort",
        shown: filteredFurniture.length,
        total: furniture?.length ?? 0,
        items: filteredFurniture as any[],
        previewItems: toPreviewItems(filteredFurniture, 6),
        render: (items: FurnitureIndexItem[]) => (
          <FurnitureGrid items={items} numColumns={3} emptyText="No furniture found. Try a different search." />
        ),
      },

      {
        key: "defenses" as const,
        title: "Defenses",
        subtitle: "Traps + Turrets + Protection",
        shown: filteredDefenses.length,
        total: defenses?.length ?? 0,
        items: filteredDefenses as any[],
        previewItems: toPreviewItems(filteredDefenses, 6),
        render: (items: DefensesIndexItem[]) => (
          <DefensesGrid items={items} numColumns={3} emptyText="No defenses found. Try a different search." />
        ),
      },

      {
        key: "food" as const,
        title: "Food",
        subtitle: "Feeding + Cooking Stations",
        shown: filteredFood.length,
        total: food?.length ?? 0,
        items: filteredFood as any[],
        previewItems: toPreviewItems(filteredFood, 6),
        render: (items: FoodIndexItem[]) => (
          <FoodGrid items={items} numColumns={3} emptyText="No food found. Try a different search." />
        ),
      },

      {
        key: "infrastructure" as const,
        title: "Infrastructure",
        subtitle: "Power + Utility",
        shown: filteredInfrastructure.length,
        total: infrastructure?.length ?? 0,
        items: filteredInfrastructure as any[],
        previewItems: toPreviewItems(filteredInfrastructure, 6),
        render: (items: InfrastructureIndexItem[]) => (
          <InfrastructureGrid items={items} numColumns={3} emptyText="No infrastructure found. Try a different search." />
        ),
      },

      {
        key: "lighting" as const,
        title: "Lighting",
        subtitle: "Lamps + Brightness",
        shown: filteredLighting.length,
        total: lighting?.length ?? 0,
        items: filteredLighting as any[],
        previewItems: toPreviewItems(filteredLighting, 6),
        render: (items: LightingIndexItem[]) => (
          <LightingGrid items={items} numColumns={3} emptyText="No lighting found. Try a different search." />
        ),
      },

      {
        key: "production" as const,
        title: "Production",
        subtitle: "Workstations + Crafting",
        shown: filteredProduction.length,
        total: production?.length ?? 0,
        items: filteredProduction as any[],
        previewItems: toPreviewItems(filteredProduction, 6),
        render: (items: ProductionIndexItem[]) => (
          <ProductionGrid items={items} numColumns={3} emptyText="No production found. Try a different search." />
        ),
      },

      {
        key: "palConstruction" as const,
        title: "Pal",
        subtitle: "Pal-related Structures",
        shown: filteredPalConstruction.length,
        total: palConstruction?.length ?? 0,
        items: filteredPalConstruction as any[],
        previewItems: toPreviewItems(filteredPalConstruction, 6),
        render: (items: PalConstructionIndexItem[]) => (
          <PalGrid items={items} numColumns={3} emptyText="No pal construction found. Try a different search." />
        ),
      },

      {
        key: "other" as const,
        title: "Other",
        subtitle: "Misc Construction",
        shown: filteredOther.length,
        total: otherConstruction?.length ?? 0,
        items: filteredOther as any[],
        previewItems: toPreviewItems(filteredOther, 6),
        render: (items: OtherIndexItem[]) => (
          <OtherGrid items={items} numColumns={3} emptyText="No other construction found. Try a different search." />
        ),
      },
    ] as const;
  }, [
    filteredStorage,
    filteredFoundations,
    filteredFurniture,
    filteredDefenses,
    filteredFood,
    filteredInfrastructure,
    filteredLighting,
    filteredProduction,
    filteredPalConstruction,
    filteredOther,

    storage,
    foundations,
    furniture,
    defenses,
    food,
    infrastructure,
    lighting,
    production,
    palConstruction,
    otherConstruction,
  ]);

  const visibleCards = useMemo(() => {
    if (!normalizedSearch) return categories;
    return categories.filter((c) => c.shown > 0);
  }, [categories, normalizedSearch]);

  const renderCategoryHeader = useCallback(
    (title: string, subtitle: string, shown: number, total: number) => (
      <View className="px-4 mt-4 mb-2">
        <View className="flex-row items-center">
          <View className="w-1.5 h-5 rounded-full mr-2 bg-white/10" />
          <View className="flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{title}</Text>
            <Text className="text-[11px] text-white/45 mt-0.5">
              {subtitle} • {shown} / {total}
            </Text>
          </View>

          <Pressable
            onPress={() => setSelected("all")}
            className="ml-2 px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] active:opacity-90"
          >
            <Text className="text-[10px] text-white/60">Back</Text>
          </Pressable>
        </View>
      </View>
    ),
    []
  );

  const renderSingleCategory = useCallback(() => {
    const cat = categories.find((c) => c.key === selected);
    if (!cat) return null;

    const isEmpty = cat.shown === 0;

    return (
      <View>
        {renderCategoryHeader(cat.title, cat.subtitle, cat.shown, cat.total)}

        {isEmpty ? (
          <View className="px-4">
            <EmptyState
              title={`No ${cat.title.toLowerCase()} found`}
              subtitle={normalizedSearch ? "Try a different search." : "Nothing in this category yet."}
            />
          </View>
        ) : (
          (cat.render as any)(cat.items as any)
        )}

        <View className="h-10" />
      </View>
    );
  }, [categories, selected, normalizedSearch, renderCategoryHeader]);

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 44 }}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        <View className="px-4 pt-2 pb-3 bg-black/60 border-b border-white/10">
          <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <Text className="text-[11px] text-white/60">
              Showing <Text className="text-white/85 font-semibold">{totalShown}</Text> /{" "}
              <Text className="text-white/75">{totalAll}</Text> items
            </Text>

            {!!normalizedSearch && (
              <Text className="text-[11px] text-white/40 mt-0.5" numberOfLines={1}>
                Search: “{(search ?? "").trim()}”
              </Text>
            )}

            <View className="mt-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Pill label="Dashboard" count={totalShown} active={selected === "all"} onPress={() => setSelected("all")} />
                {categories.map((c) => (
                  <Pill
                    key={c.key}
                    label={c.title}
                    count={c.shown}
                    active={selected === (c.key as any)}
                    onPress={() => setSelected(c.key as any)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {selected !== "all" ? (
          <View>{renderSingleCategory()}</View>
        ) : (
          <View className="px-4 pt-4">
            {visibleCards.length === 0 ? (
              <EmptyState title="No results" subtitle={normalizedSearch ? "Try a different search." : "No items available."} />
            ) : (
              <>
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {visibleCards.map((c) => {
                    const source = (c as any).previewItems ?? (c as any).items ?? [];
                    const topNames = source.slice(0, 3).map((x: any) => (x?.name ? String(x.name) : safeName(x)));
                    const hasMore = c.shown > 3;

                    return (
                      <Pressable
                        key={c.key}
                        onPress={() => setSelected(c.key as any)}
                        className="rounded-3xl border border-white/10 bg-white/[0.03] active:opacity-90"
                        style={{ width: "48%" }}
                      >
                        <View className="p-3">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-[12px] text-white/85 font-semibold">{c.title}</Text>
                            <View className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.04]">
                              <Text className="text-[10px] text-white/60">{c.shown}</Text>
                            </View>
                          </View>

                          <Text className="text-[11px] text-white/45 mt-0.5" numberOfLines={1}>
                            {c.subtitle}
                          </Text>

                          <View className="mt-3">
                            {topNames.length === 0 ? (
                              <Text className="text-[11px] text-white/35">Nothing here yet</Text>
                            ) : (
                              <View style={{ gap: 4 }}>
                                {topNames.map((n: string, idx: number) => (
                                  <Text key={`${c.key}-n-${idx}`} className="text-[11px] text-white/60" numberOfLines={1}>
                                    • {n}
                                  </Text>
                                ))}
                                {hasMore && (
                                  <Text className="text-[11px] text-white/35" numberOfLines={1}>
                                    + {c.shown - 3} more
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>

                          <View className="mt-3">
                            <View className="rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
                              <Text className="text-[11px] text-white/70">Open {c.title}</Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="h-10" />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default PalworldConstructionGrid;

function Pill(props: { label: string; count: number; active: boolean; onPress: () => void; }) {
  const { label, count, active, onPress } = props;

  return (
    <Pressable
      onPress={onPress}
      className={[
        "px-3 py-1.5 rounded-full border",
        active ? "border-white/25 bg-white/[0.08]" : "border-white/10 bg-white/[0.04]",
      ].join(" ")}
    >
      <Text className={["text-[11px]", active ? "text-white/85 font-semibold" : "text-white/60"].join(" ")}>
        {label} <Text className="text-white/35">({count})</Text>
      </Text>
    </Pressable>
  );
}

function EmptyState(props: { title: string; subtitle?: string; }) {
  const { title, subtitle } = props;
  return (
    <View className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <Text className="text-[12px] text-white/80 font-semibold">{title}</Text>
      {!!subtitle && <Text className="text-[11px] text-white/45 mt-1">{subtitle}</Text>}
    </View>
  );
}
