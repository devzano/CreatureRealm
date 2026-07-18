// components/Palworld/PalworldConstructionGrid.tsx
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import PalworldDashboardGrid, { type DashboardCategory } from "@/components/Palworld/PalworldDashboardGrid";
import { usePalworldDashboardOrderStore } from "@/store/palworldDashboardOrderStore";

import type { StorageIndexItem } from "@/lib/palworld/construction/paldbStorage";
import StorageGrid from "@/components/Palworld/Construction/StorageGrid";
import type { FoundationsIndexItem } from "@/lib/palworld/construction/paldbFoundations";
import FoundationGrid from "@/components/Palworld/Construction/FoundationsGrid";
import type { FurnitureIndexItem } from "@/lib/palworld/construction/paldbFurniture";
import FurnitureGrid from "@/components/Palworld/Construction/FurnitureGrid";
import type { DefensesIndexItem } from "@/lib/palworld/construction/paldbDefenses";
import DefensesGrid from "@/components/Palworld/Construction/DefensesGrid";
import type { FoodIndexItem } from "@/lib/palworld/construction/paldbFood";
import FoodGrid from "@/components/Palworld/Construction/FoodGrid";
import type { InfrastructureIndexItem } from "@/lib/palworld/construction/paldbInfrastructure";
import InfrastructureGrid from "@/components/Palworld/Construction/InfrastructureGrid";
import type { LightingIndexItem } from "@/lib/palworld/construction/paldbLighting";
import LightingGrid from "@/components/Palworld/Construction/LightingGrid";
import type { ProductionIndexItem } from "@/lib/palworld/construction/paldbProduction";
import ProductionGrid from "@/components/Palworld/Construction/ProductionGrid";
import type { PalConstructionIndexItem } from "@/lib/palworld/construction/paldbPal";
import PalGrid from "@/components/Palworld/Construction/PalGrid";
import type { OtherIndexItem } from "@/lib/palworld/construction/paldbOther";
import OtherGrid from "@/components/Palworld/Construction/OtherGrid";
import SpecialConstructionGrid from "@/components/Palworld/Construction/SpecialConstructionGrid";
import PalExpeditionsGrid from "@/components/Palworld/Construction/PalExpeditionsGrid";
import FishingShadowsGrid from "@/components/Palworld/Construction/FishingShadowsGrid";
import {
  fetchExpeditionStationDetail,
  fetchFishingPondDetail,
  type FishingShadowEntry,
  type PalExpeditionEntry,
  type SpecialConstructionIndexItem,
} from "@/lib/palworld/construction/paldbSpecialStructures";

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
  expeditionStation: SpecialConstructionIndexItem[];
  palExpeditions: PalExpeditionEntry[];
  fishingPond: SpecialConstructionIndexItem[];
  fishingShadows: FishingShadowEntry[];
  otherConstruction: OtherIndexItem[];

  search: string;
  categoryStatus: Record<ConstructionCategoryKey, ConstructionCategoryStatus>;
  onRetryCategory?: (key: ConstructionCategoryKey) => void;
  onRetryFailed?: () => void;
};

export type ConstructionCategoryKey =
  | "storage"
  | "foundations"
  | "furniture"
  | "defenses"
  | "food"
  | "infrastructure"
  | "lighting"
  | "production"
  | "palConstruction"
  | "expeditionStation"
  | "palExpeditions"
  | "fishingPond"
  | "fishingShadows"
  | "other";

export type ConstructionCategoryStatus = {
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

type PreviewItem = { name: string };

function buildHaystack(parts: any[]) {
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

const DEFAULT_CATEGORY_ORDER: ConstructionCategoryKey[] = [
  "storage",
  "foundations",
  "furniture",
  "defenses",
  "food",
  "infrastructure",
  "lighting",
  "production",
  "palConstruction",
  "expeditionStation",
  "fishingPond",
  "other",
];

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
  expeditionStation,
  palExpeditions,
  fishingPond,
  fishingShadows,
  otherConstruction,
  search,
  categoryStatus,
  onRetryCategory,
  onRetryFailed,
}) => {
  const normalizedSearch = (search ?? "").trim().toLowerCase();

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

  const filteredExpeditionStation = useMemo(
    () =>
      filterList(expeditionStation, normalizedSearch, (x) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.workSuitability?.name,
          x.workSuitability?.level,
          (x.recipe ?? []).map((r) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
          (x.detailRows ?? []).map((row) => `${row.label} ${row.value}`).join(" "),
        ])
      ),
    [expeditionStation, normalizedSearch]
  );

  const filteredPalExpeditions = useMemo(
    () =>
      filterList(palExpeditions, normalizedSearch, (entry) =>
        buildHaystack([
          entry.name,
          entry.slug,
          entry.objective,
          entry.risk,
          entry.duration,
          entry.recommendedFirepower,
          entry.requiredType,
          entry.rewards.map((reward) => `${reward.name} ${reward.quantityText ?? ""} ${reward.chanceText ?? ""}`).join(" "),
        ])
      ),
    [palExpeditions, normalizedSearch]
  );

  const filteredFishingPond = useMemo(
    () =>
      filterList(fishingPond, normalizedSearch, (x) =>
        buildHaystack([
          x.name,
          x.slug,
          x.categoryText,
          x.technologyLevel,
          x.description,
          x.workSuitability?.name,
          x.workSuitability?.level,
          (x.recipe ?? []).map((r) => `${r.name} ${r.slug} ${r.qty}`).join(" "),
          (x.detailRows ?? []).map((row) => `${row.label} ${row.value}`).join(" "),
        ])
      ),
    [fishingPond, normalizedSearch]
  );

  const filteredFishingShadows = useMemo(
    () =>
      filterList(fishingShadows, normalizedSearch, (entry) =>
        buildHaystack([
          entry.shadowSize,
          entry.kind,
          entry.name,
          entry.slug,
          entry.levelText,
          entry.quantityText,
          entry.chanceText,
          entry.isAlpha ? "alpha" : "",
        ])
      ),
    [fishingShadows, normalizedSearch]
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
    filteredExpeditionStation.length +
    filteredPalExpeditions.length +
    filteredFishingPond.length +
    filteredFishingShadows.length +
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
    (expeditionStation?.length ?? 0) +
    (palExpeditions?.length ?? 0) +
    (fishingPond?.length ?? 0) +
    (fishingShadows?.length ?? 0) +
    (otherConstruction?.length ?? 0);

  const categories: DashboardCategory<ConstructionCategoryKey>[] = useMemo(() => {
    return [
      {
        key: "storage",
        title: "Storage",
        subtitle: "Chests + Containers",
        shown: filteredStorage.length,
        total: storage?.length ?? 0,
        items: filteredStorage as any[],
        previewItems: toPreviewItems(filteredStorage, 6),
        isLoading: categoryStatus.storage.loading,
        isLoaded: categoryStatus.storage.loaded,
        error: categoryStatus.storage.error,
        onRetry: onRetryCategory ? () => onRetryCategory("storage") : null,
        render: (items) => (
          <StorageGrid items={items as any} numColumns={3} emptyText="No storage found. Try a different search." />
        ),
      },
      {
        key: "foundations",
        title: "Foundations",
        subtitle: "Floors + Walls + Structure",
        shown: filteredFoundations.length,
        total: foundations?.length ?? 0,
        items: filteredFoundations as any[],
        previewItems: toPreviewItems(filteredFoundations, 6),
        isLoading: categoryStatus.foundations.loading,
        isLoaded: categoryStatus.foundations.loaded,
        error: categoryStatus.foundations.error,
        onRetry: onRetryCategory ? () => onRetryCategory("foundations") : null,
        render: (items) => (
          <FoundationGrid items={items as any} numColumns={3} emptyText="No foundations found. Try a different search." />
        ),
      },
      {
        key: "furniture",
        title: "Furniture",
        subtitle: "Beds + Decor + Comfort",
        shown: filteredFurniture.length,
        total: furniture?.length ?? 0,
        items: filteredFurniture as any[],
        previewItems: toPreviewItems(filteredFurniture, 6),
        isLoading: categoryStatus.furniture.loading,
        isLoaded: categoryStatus.furniture.loaded,
        error: categoryStatus.furniture.error,
        onRetry: onRetryCategory ? () => onRetryCategory("furniture") : null,
        render: (items) => (
          <FurnitureGrid items={items as any} numColumns={3} emptyText="No furniture found. Try a different search." />
        ),
      },
      {
        key: "defenses",
        title: "Defenses",
        subtitle: "Traps + Turrets + Protection",
        shown: filteredDefenses.length,
        total: defenses?.length ?? 0,
        items: filteredDefenses as any[],
        previewItems: toPreviewItems(filteredDefenses, 6),
        isLoading: categoryStatus.defenses.loading,
        isLoaded: categoryStatus.defenses.loaded,
        error: categoryStatus.defenses.error,
        onRetry: onRetryCategory ? () => onRetryCategory("defenses") : null,
        render: (items) => (
          <DefensesGrid items={items as any} numColumns={3} emptyText="No defenses found. Try a different search." />
        ),
      },
      {
        key: "food",
        title: "Food",
        subtitle: "Feeding + Cooking Stations",
        shown: filteredFood.length,
        total: food?.length ?? 0,
        items: filteredFood as any[],
        previewItems: toPreviewItems(filteredFood, 6),
        isLoading: categoryStatus.food.loading,
        isLoaded: categoryStatus.food.loaded,
        error: categoryStatus.food.error,
        onRetry: onRetryCategory ? () => onRetryCategory("food") : null,
        render: (items) => <FoodGrid items={items as any} numColumns={3} emptyText="No food found. Try a different search." />,
      },
      {
        key: "infrastructure",
        title: "Infrastructure",
        subtitle: "Power + Utility",
        shown: filteredInfrastructure.length,
        total: infrastructure?.length ?? 0,
        items: filteredInfrastructure as any[],
        previewItems: toPreviewItems(filteredInfrastructure, 6),
        isLoading: categoryStatus.infrastructure.loading,
        isLoaded: categoryStatus.infrastructure.loaded,
        error: categoryStatus.infrastructure.error,
        onRetry: onRetryCategory ? () => onRetryCategory("infrastructure") : null,
        render: (items) => (
          <InfrastructureGrid items={items as any} numColumns={3} emptyText="No infrastructure found. Try a different search." />
        ),
      },
      {
        key: "lighting",
        title: "Lighting",
        subtitle: "Lamps + Brightness",
        shown: filteredLighting.length,
        total: lighting?.length ?? 0,
        items: filteredLighting as any[],
        previewItems: toPreviewItems(filteredLighting, 6),
        isLoading: categoryStatus.lighting.loading,
        isLoaded: categoryStatus.lighting.loaded,
        error: categoryStatus.lighting.error,
        onRetry: onRetryCategory ? () => onRetryCategory("lighting") : null,
        render: (items) => (
          <LightingGrid items={items as any} numColumns={3} emptyText="No lighting found. Try a different search." />
        ),
      },
      {
        key: "production",
        title: "Production",
        subtitle: "Workstations + Crafting",
        shown: filteredProduction.length,
        total: production?.length ?? 0,
        items: filteredProduction as any[],
        previewItems: toPreviewItems(filteredProduction, 6),
        isLoading: categoryStatus.production.loading,
        isLoaded: categoryStatus.production.loaded,
        error: categoryStatus.production.error,
        onRetry: onRetryCategory ? () => onRetryCategory("production") : null,
        render: (items) => (
          <ProductionGrid items={items as any} numColumns={3} emptyText="No production found. Try a different search." />
        ),
      },
      {
        key: "palConstruction",
        title: "Pal",
        subtitle: "Pal-related Structures",
        shown: filteredPalConstruction.length,
        total: palConstruction?.length ?? 0,
        items: filteredPalConstruction as any[],
        previewItems: toPreviewItems(filteredPalConstruction, 6),
        isLoading: categoryStatus.palConstruction.loading,
        isLoaded: categoryStatus.palConstruction.loaded,
        error: categoryStatus.palConstruction.error,
        onRetry: onRetryCategory ? () => onRetryCategory("palConstruction") : null,
        render: (items) => <PalGrid items={items as any} numColumns={3} emptyText="No pal construction found. Try a different search." />,
      },
      {
        key: "expeditionStation",
        title: "Expeditions",
        subtitle: "Station + Routes",
        shown: filteredExpeditionStation.length + filteredPalExpeditions.length,
        total: (expeditionStation?.length ?? 0) + (palExpeditions?.length ?? 0),
        items: [...filteredExpeditionStation, ...filteredPalExpeditions] as any[],
        previewItems: [
          ...toPreviewItems(filteredExpeditionStation, 2),
          ...toPreviewItems(filteredPalExpeditions, 4),
        ],
        isLoading: categoryStatus.expeditionStation.loading || categoryStatus.palExpeditions.loading,
        isLoaded: categoryStatus.expeditionStation.loaded && categoryStatus.palExpeditions.loaded,
        error: categoryStatus.expeditionStation.error ?? categoryStatus.palExpeditions.error,
        onRetry: onRetryCategory
          ? () => {
              onRetryCategory("expeditionStation");
              onRetryCategory("palExpeditions");
            }
          : null,
        render: () => (
          <View>
            <View className="px-4 mt-2 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Pal Expedition Station</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredExpeditionStation.length} / {expeditionStation?.length ?? 0}
              </Text>
            </View>
            <SpecialConstructionGrid
              items={filteredExpeditionStation}
              fetchDetail={fetchExpeditionStationDetail}
              typeLabel="Pal Station"
              numColumns={2}
              emptyText="No expedition station data found. Try a different search."
            />

            <View className="px-4 mt-6 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Pal Expeditions</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredPalExpeditions.length} / {palExpeditions?.length ?? 0}
              </Text>
            </View>
            <PalExpeditionsGrid
              items={filteredPalExpeditions}
              numColumns={2}
              emptyText="No expedition routes found. Try a different search."
            />
          </View>
        ),
      },
      {
        key: "fishingPond",
        title: "Fishing",
        subtitle: "Pond + Shadows",
        shown: filteredFishingPond.length + filteredFishingShadows.length,
        total: (fishingPond?.length ?? 0) + (fishingShadows?.length ?? 0),
        items: [...filteredFishingPond, ...filteredFishingShadows] as any[],
        previewItems: [
          ...toPreviewItems(filteredFishingPond, 2),
          ...toPreviewItems(filteredFishingShadows, 4),
        ],
        isLoading: categoryStatus.fishingPond.loading || categoryStatus.fishingShadows.loading,
        isLoaded: categoryStatus.fishingPond.loaded && categoryStatus.fishingShadows.loaded,
        error: categoryStatus.fishingPond.error ?? categoryStatus.fishingShadows.error,
        onRetry: onRetryCategory
          ? () => {
              onRetryCategory("fishingPond");
              onRetryCategory("fishingShadows");
            }
          : null,
        render: () => (
          <View>
            <View className="px-4 mt-2 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Fishing Pond</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredFishingPond.length} / {fishingPond?.length ?? 0}
              </Text>
            </View>
            <SpecialConstructionGrid
              items={filteredFishingPond}
              fetchDetail={fetchFishingPondDetail}
              typeLabel="Fishing"
              numColumns={2}
              emptyText="No fishing pond data found. Try a different search."
            />

            <View className="px-4 mt-6 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Fishing Shadows</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredFishingShadows.length} / {fishingShadows?.length ?? 0}
              </Text>
            </View>
            <FishingShadowsGrid
              items={filteredFishingShadows}
              numColumns={3}
              emptyText="No fishing shadow data found. Try a different search."
            />
          </View>
        ),
      },
      {
        key: "other",
        title: "Other",
        subtitle: "Misc Construction",
        shown: filteredOther.length,
        total: otherConstruction?.length ?? 0,
        items: filteredOther as any[],
        previewItems: toPreviewItems(filteredOther, 6),
        isLoading: categoryStatus.other.loading,
        isLoaded: categoryStatus.other.loaded,
        error: categoryStatus.other.error,
        onRetry: onRetryCategory ? () => onRetryCategory("other") : null,
        render: (items) => <OtherGrid items={items as any} numColumns={3} emptyText="No other construction found. Try a different search." />,
      },
    ];
  }, [
    categoryStatus,
    filteredStorage,
    filteredFoundations,
    filteredFurniture,
    filteredDefenses,
    filteredFood,
    filteredInfrastructure,
    filteredLighting,
    filteredProduction,
    filteredPalConstruction,
    filteredExpeditionStation,
    filteredPalExpeditions,
    filteredFishingPond,
    filteredFishingShadows,
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
    expeditionStation,
    palExpeditions,
    fishingPond,
    fishingShadows,
    otherConstruction,
    onRetryCategory,
  ]);

  const totalCategoryCount = categories.length;
  const loadedCategoryCount = categories.filter((category) => !!category.isLoaded).length;
  const loadingCategoryCount = categories.filter((category) => !!category.isLoading).length;
  const failedCategoryCount = categories.filter((category) => !!category.error).length;
  const hasSettledAll = loadedCategoryCount + failedCategoryCount === totalCategoryCount;
  const showProgress = loadingCategoryCount > 0 || failedCategoryCount > 0;
  const progressLabel = loadingCategoryCount > 0
    ? `Loading Building data — ${loadedCategoryCount} of ${totalCategoryCount} categories ready`
    : failedCategoryCount > 0
      ? `${loadedCategoryCount} of ${totalCategoryCount} categories loaded • ${failedCategoryCount} unavailable`
      : null;

  const topContent = showProgress && progressLabel ? (
    <View
      className="rounded-3xl border px-3.5 py-3"
      style={{ borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.04)" }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center">
            {loadingCategoryCount > 0 ? <ActivityIndicator size="small" /> : null}
            <Text className="text-[12px] font-semibold text-white/85 ml-2">{progressLabel}</Text>
          </View>
          <Text className="text-[11px] text-white/45 mt-1">
            {hasSettledAll
              ? "Loaded categories stay interactive even if some sources fail."
              : "Loaded categories are ready now. Remaining categories continue in the background."}
          </Text>
        </View>

        {failedCategoryCount > 0 && onRetryFailed ? (
          <Pressable
            onPress={onRetryFailed}
            className="px-3 py-2 rounded-2xl border border-white/10 bg-white/[0.04] active:opacity-90"
          >
            <Text className="text-[11px] font-semibold text-white/80">Retry Failed</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  ) : null;

  const orderKey = "palworld.construction" as const;
  const storedOrder = usePalworldDashboardOrderStore((s) => s.orders[orderKey]) as ConstructionCategoryKey[] | undefined;
  const saveOrder = usePalworldDashboardOrderStore((s) => s.setOrder);
  const reorderEnabled = !normalizedSearch;
  const effectiveOrder = (storedOrder?.length ? storedOrder : DEFAULT_CATEGORY_ORDER) as ConstructionCategoryKey[];

  return (
    <PalworldDashboardGrid<ConstructionCategoryKey>
      search={search}
      totalShown={totalShown}
      totalAll={totalAll}
      categories={categories}
      isLoading={loadingCategoryCount > 0}
      loadingLabel="Loading construction categories…"
      reorderEnabled={reorderEnabled}
      defaultOrder={DEFAULT_CATEGORY_ORDER}
      order={effectiveOrder}
      onOrderChange={(next) => saveOrder(orderKey, next as string[])}
      previewMax={3}
      topContent={topContent}
    />
  );
};

export default PalworldConstructionGrid;
