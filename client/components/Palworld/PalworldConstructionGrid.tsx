// components/Palworld/PalworldConstructionGrid.tsx
import React, { useMemo } from "react";

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

type PreviewItem = { name: string };

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

const DEFAULT_CATEGORY_ORDER: CategoryKey[] = [
  "storage",
  "foundations",
  "furniture",
  "defenses",
  "food",
  "infrastructure",
  "lighting",
  "production",
  "palConstruction",
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
  otherConstruction,
  search,
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

  const categories: DashboardCategory<CategoryKey>[] = useMemo(() => {
    return [
      {
        key: "storage",
        title: "Storage",
        subtitle: "Chests + Containers",
        shown: filteredStorage.length,
        total: storage?.length ?? 0,
        items: filteredStorage as any[],
        previewItems: toPreviewItems(filteredStorage, 6),
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
        render: (items) => <PalGrid items={items as any} numColumns={3} emptyText="No pal construction found. Try a different search." />,
      },
      {
        key: "other",
        title: "Other",
        subtitle: "Misc Construction",
        shown: filteredOther.length,
        total: otherConstruction?.length ?? 0,
        items: filteredOther as any[],
        previewItems: toPreviewItems(filteredOther, 6),
        render: (items) => <OtherGrid items={items as any} numColumns={3} emptyText="No other construction found. Try a different search." />,
      },
    ];
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

  const orderKey = "palworld.construction" as const;
  const storedOrder = usePalworldDashboardOrderStore((s) => s.orders[orderKey]) as CategoryKey[] | undefined;
  const saveOrder = usePalworldDashboardOrderStore((s) => s.setOrder);
  const reorderEnabled = !normalizedSearch;
  const effectiveOrder = (storedOrder?.length ? storedOrder : DEFAULT_CATEGORY_ORDER) as CategoryKey[];

  return (
    <PalworldDashboardGrid<CategoryKey>
      search={search}
      totalShown={totalShown}
      totalAll={totalAll}
      categories={categories}
      reorderEnabled={reorderEnabled}
      defaultOrder={DEFAULT_CATEGORY_ORDER}
      order={effectiveOrder}
      onOrderChange={(next) => saveOrder(orderKey, next as string[])}
      previewMax={3}
    />
  );
};

export default PalworldConstructionGrid;
