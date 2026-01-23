// components/Palworld/PalworldItemsGrid.tsx
import React, { useMemo, useCallback, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, LayoutChangeEvent } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { SphereListItem } from "@/lib/palworld/items/paldbSpheres";
import SphereGrid from "@/components/Palworld/Items/SphereGrid";

import type { AmmoIndexItem } from "@/lib/palworld/items/paldbAmmo";
import AmmoGrid from "@/components/Palworld/Items/AmmoGrid";

import type { MaterialIndexItem } from "@/lib/palworld/items/paldbMaterial";
import MaterialGrid from "@/components/Palworld/Items/MaterialGrid";

import type { WeaponIndexItem } from "@/lib/palworld/items/paldbWeapon";
import WeaponGrid from "@/components/Palworld/Items/WeaponGrid";

import type { ConsumableIndexItem } from "@/lib/palworld/items/paldbConsumable";
import ConsumableGrid from "@/components/Palworld/Items/ConsumableGrid";

import type { IngredientIndexItem } from "@/lib/palworld/items/paldbIngredient";
import IngredientGrid from "@/components/Palworld/Items/IngredientGrid";

import type { SphereModuleIndexItem } from "@/lib/palworld/items/paldbSphereModule";
import SphereModuleGrid from "@/components/Palworld/Items/SphereModuleGrid";

import type { KeyItemIndexItem } from "@/lib/palworld/items/paldbKeyItems";
import KeyItemsGrid from "@/components/Palworld/Items/KeyItemsGrid";

import type { SchematicIndexItem } from "@/lib/palworld/items/paldbSchematic";
import SchematicGrid from "@/components/Palworld/Items/SchematicGrid";

import type { AccessoryIndexItem } from "@/lib/palworld/items/paldbAccessory";
import AccessoryGrid from "@/components/Palworld/Items/AccessoryGrid";

import type { ArmorIndexItem } from "@/lib/palworld/items/paldbArmor";
import ArmorGrid from "@/components/Palworld/Items/ArmorGrid";

import type { GliderIndexItem } from "@/lib/palworld/items/paldbGlider";
import GliderGrid from "@/components/Palworld/Items/GliderGrid";

import type { PalMountIndexItem } from "@/lib/palworld/paldbMounts";
import PalMountsGrid from "./PalworldDetails/PalMountsGrid";

type PalworldItemsGridProps = {
  spheres: SphereListItem[];
  ammo: AmmoIndexItem[];
  materials: MaterialIndexItem[];
  weapons: WeaponIndexItem[];
  consumables: ConsumableIndexItem[];
  ingredients: IngredientIndexItem[];
  sphereModules: SphereModuleIndexItem[];
  gliders: GliderIndexItem[];
  mounts: PalMountIndexItem[];
  keyItems: KeyItemIndexItem[];
  schematics: SchematicIndexItem[];
  accessories: AccessoryIndexItem[];
  armor: ArmorIndexItem[];

  search: string;
};

type CategoryKey =
  | "all"
  | "materials"
  | "ingredients"
  | "consumables"
  | "weapons"
  | "spheres"
  | "travel"
  | "keyItems"
  | "schematics"
  | "accessories"
  | "armor";

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
  const name = String(x?.name ?? "").trim() || String(x?.title ?? "").trim() || String(x?.label ?? "").trim();
  if (name) return name;

  const slug = String(x?.slug ?? "").trim();
  return slug ? slug.replace(/_/g, " ").trim() : "Unknown";
}

function toPreviewItems(list: any[], max = 6): PreviewItem[] {
  const arr = Array.isArray(list) ? list : [];
  const out: PreviewItem[] = [];
  for (const it of arr) {
    const name = String(it?.name ?? "").trim();
    if (!name) continue;
    out.push({ name });
    if (out.length >= max) break;
  }
  return out;
}

type MountKindLite = "ground" | "flying" | "water";

function mountMeta(kind: MountKindLite) {
  if (kind === "ground") {
    return {
      title: "Ground",
      subtitle: "Land Travel",
      icon: "road-variant" as const,
      ring: "border-emerald-400/30",
      dot: "bg-emerald-500/25",
    };
  }
  if (kind === "flying") {
    return {
      title: "Flying",
      subtitle: "Air Travel",
      icon: "weather-windy" as const,
      ring: "border-sky-400/30",
      dot: "bg-sky-500/25",
    };
  }
  return {
    title: "Water",
    subtitle: "Sea Travel",
    icon: "waves" as const,
    ring: "border-cyan-400/30",
    dot: "bg-cyan-500/25",
  };
}

const PalworldItemsGrid: React.FC<PalworldItemsGridProps> = ({
  spheres,
  ammo,
  materials,
  weapons,
  consumables,
  ingredients,
  sphereModules,
  gliders,
  mounts,
  keyItems,
  schematics,
  accessories,
  armor,
  search,
}) => {
  const normalizedSearch = (search ?? "").trim().toLowerCase();

  const scrollRef = useRef<ScrollView | null>(null);
  const headerHRef = useRef(0);

  type TravelIndexKey = "gliders" | MountKindLite;

  const travelOffsetsRef = useRef<Record<TravelIndexKey, number>>({
    gliders: 0,
    ground: 0,
    flying: 0,
    water: 0,
  });

  const mountsStartYRef = useRef(0);

  const scrollToTravelIndex = useCallback((k: TravelIndexKey) => {
    const y = travelOffsetsRef.current[k];
    if (y != null && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(y - 46, 0), animated: true });
    }
  }, []);

  const filteredMaterials = useMemo(
    () =>
      filterList(materials, normalizedSearch, (m) =>
        buildHaystack([m.name, (m as any).slug, (m as any).rarity, (m as any).technology, (m as any).description])
      ),
    [materials, normalizedSearch]
  );

  const filteredAmmo = useMemo(
    () =>
      filterList(ammo, normalizedSearch, (a) =>
        buildHaystack([a.name, (a as any).slug, (a as any).rarity, (a as any).technology, (a as any).description])
      ),
    [ammo, normalizedSearch]
  );

  const filteredSpheres = useMemo(
    () =>
      filterList(spheres, normalizedSearch, (s) =>
        buildHaystack([
          s.name,
          (s as any).slug,
          (s as any).rarity,
          (s as any).technology,
          (s as any).capturePower,
          (s as any).description,
        ])
      ),
    [spheres, normalizedSearch]
  );

  const filteredWeapons = useMemo(
    () =>
      filterList(weapons, normalizedSearch, (w) =>
        buildHaystack([w.name, (w as any).slug, (w as any).rarity, (w as any).technology, (w as any).description])
      ),
    [weapons, normalizedSearch]
  );

  const filteredConsumables = useMemo(
    () =>
      filterList(consumables, normalizedSearch, (c) =>
        buildHaystack([c.name, (c as any).slug, (c as any).rarity, (c as any).technology, (c as any).description])
      ),
    [consumables, normalizedSearch]
  );

  const filteredIngredients = useMemo(
    () =>
      filterList(ingredients, normalizedSearch, (i) =>
        buildHaystack([i.name, (i as any).slug, (i as any).rarity, (i as any).technology, (i as any).description])
      ),
    [ingredients, normalizedSearch]
  );

  const filteredSphereModules = useMemo(
    () =>
      filterList(sphereModules, normalizedSearch, (m) =>
        buildHaystack([m.name, (m as any).slug, (m as any).rarity, (m as any).technology, (m as any).description])
      ),
    [sphereModules, normalizedSearch]
  );

  const filteredGliders = useMemo(
    () =>
      filterList(gliders, normalizedSearch, (g) =>
        buildHaystack([
          g.name,
          (g as any).slug,
          (g as any).rarity,
          (g as any).rarityText,
          (g as any).technologyLevel,
          (g as any).speed,
          (g as any).staminaDrain,
          (g as any).description,
          (g as any).levels?.map?.((x: any) => `lv${x.level} ${x.maxSpeed} ${x.gravityScale} ${x.staminaDrain}`).join(" "),
        ])
      ),
    [gliders, normalizedSearch]
  );

  const filteredMounts = useMemo(
    () =>
      filterList(mounts, normalizedSearch, (m) =>
        buildHaystack([
          m.name,
          (m as any).slug,
          (m as any).kind,
          (m as any).techLevel,
          (m as any).stamina,
          (m as any).runSpeed,
          (m as any).rideSprintSpeed,
          (m as any).jumpZVelocity,
          (m as any).gravityScale,
          (m as any).swimSpeed,
          (m as any).swimDashSpeed,
        ])
      ),
    [mounts, normalizedSearch]
  );

  const filteredKeyItems = useMemo(
    () =>
      filterList(keyItems, normalizedSearch, (k) =>
        buildHaystack([k.name, (k as any).slug, (k as any).rarity, (k as any).technology, (k as any).description])
      ),
    [keyItems, normalizedSearch]
  );

  const filteredSchematics = useMemo(
    () =>
      filterList(schematics, normalizedSearch, (s) =>
        buildHaystack([s.name, (s as any).slug, (s as any).rarity, (s as any).technology, (s as any).description])
      ),
    [schematics, normalizedSearch]
  );

  const filteredAccessories = useMemo(
    () =>
      filterList(accessories, normalizedSearch, (a) =>
        buildHaystack([a.name, (a as any).slug, (a as any).rarity, (a as any).technology, (a as any).description])
      ),
    [accessories, normalizedSearch]
  );

  const filteredArmor = useMemo(
    () =>
      filterList(armor, normalizedSearch, (a) =>
        buildHaystack([a.name, (a as any).slug, (a as any).rarity, (a as any).technology, (a as any).description])
      ),
    [armor, normalizedSearch]
  );

  const totalShown =
    filteredMaterials.length +
    filteredWeapons.length +
    filteredAmmo.length +
    filteredSpheres.length +
    filteredSphereModules.length +
    filteredConsumables.length +
    filteredIngredients.length +
    filteredGliders.length +
    filteredMounts.length +
    filteredKeyItems.length +
    filteredSchematics.length +
    filteredAccessories.length +
    filteredArmor.length;

  const totalAll =
    (materials?.length ?? 0) +
    (weapons?.length ?? 0) +
    (ammo?.length ?? 0) +
    (spheres?.length ?? 0) +
    (sphereModules?.length ?? 0) +
    (consumables?.length ?? 0) +
    (ingredients?.length ?? 0) +
    (gliders?.length ?? 0) +
    (mounts?.length ?? 0) +
    (keyItems?.length ?? 0) +
    (schematics?.length ?? 0) +
    (accessories?.length ?? 0) +
    (armor?.length ?? 0);

  const [selected, setSelected] = useState<CategoryKey>("all");

  const mountSections = useMemo(() => {
    const ground = filteredMounts.filter((x: any) => String((x as any)?.kind) === "ground");
    const flying = filteredMounts.filter((x: any) => String((x as any)?.kind) === "flying");
    const water = filteredMounts.filter((x: any) => String((x as any)?.kind) === "water");

    const out: Array<{ key: MountKindLite; count: number; }> = [
      { key: "ground", count: ground.length },
      { key: "flying", count: flying.length },
      { key: "water", count: water.length },
    ];

    return out.filter((s) => s.count > 0);
  }, [filteredMounts]);

  const categories = useMemo(() => {
    return [
      {
        key: "materials" as const,
        title: "Materials",
        subtitle: "Crafting + Drops",
        shown: filteredMaterials.length,
        total: materials?.length ?? 0,
        items: filteredMaterials as any[],
        previewItems: filteredMaterials as any[],
        render: (items: MaterialIndexItem[]) => (
          <MaterialGrid items={items} numColumns={3} showUnavailable={true} emptyText="No materials found. Try a different search." />
        ),
      },
      {
        key: "ingredients" as const,
        title: "Ingredients",
        subtitle: "Food + Cooking",
        shown: filteredIngredients.length,
        total: ingredients?.length ?? 0,
        items: filteredIngredients as any[],
        previewItems: filteredIngredients as any[],
        render: (items: IngredientIndexItem[]) => (
          <IngredientGrid items={items} numColumns={3} showUnavailable={true} emptyText="No ingredients found. Try a different search." />
        ),
      },
      {
        key: "consumables" as const,
        title: "Consumables",
        subtitle: "Food + Medicine",
        shown: filteredConsumables.length,
        total: consumables?.length ?? 0,
        items: filteredConsumables as any[],
        previewItems: filteredConsumables as any[],
        render: (items: ConsumableIndexItem[]) => (
          <ConsumableGrid items={items} numColumns={3} showUnavailable={true} emptyText="No consumables found. Try a different search." />
        ),
      },
      {
        key: "weapons" as const,
        title: "Weapons",
        subtitle: "Weapons + Ammo",
        shown: filteredWeapons.length + filteredAmmo.length,
        total: (weapons?.length ?? 0) + (ammo?.length ?? 0),
        items: [] as any[],
        previewItems: [
          ...toPreviewItems(filteredWeapons, 3).map((x) => ({ name: `Weapon • ${x.name}` })),
          ...toPreviewItems(filteredAmmo, 3).map((x) => ({ name: `Ammo • ${x.name}` })),
        ],
        render: () => (
          <View>
            <View className="px-4 mt-2 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Weapons</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredWeapons.length} / {weapons?.length ?? 0}
              </Text>
            </View>

            <WeaponGrid items={filteredWeapons} numColumns={3} showUnavailable={true} emptyText="No weapons found. Try a different search." />

            <View className="px-4 mt-6 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Ammo</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredAmmo.length} / {ammo?.length ?? 0}
              </Text>
            </View>

            <AmmoGrid items={filteredAmmo} numColumns={3} showUnavailable={true} emptyText="No ammo found. Try a different search." />
          </View>
        ),
      },

      {
        key: "travel" as const,
        title: "Travel",
        subtitle: "Gliders + Mounts",
        shown: filteredGliders.length + filteredMounts.length,
        total: (gliders?.length ?? 0) + (mounts?.length ?? 0),
        items: [] as any[],
        previewItems: [
          ...toPreviewItems(filteredGliders, 3).map((x) => ({ name: `Glider • ${x.name}` })),
          ...toPreviewItems(filteredMounts, 3).map((x) => ({ name: `Mount • ${x.name}` })),
        ],
        render: () => (
          <View>
            <View
              onLayout={(e) => {
                travelOffsetsRef.current.gliders = e.nativeEvent.layout.y || 0;
              }}
              className="px-4 mt-2 mb-2"
            >
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Gliders</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredGliders.length} / {gliders?.length ?? 0}
              </Text>
            </View>

            <GliderGrid items={filteredGliders} numColumns={3} showUnavailable={true} emptyText="No gliders found. Try a different search." />

            <View
              onLayout={(e) => {
                mountsStartYRef.current = e.nativeEvent.layout.y || 0;
              }}
              className="px-4 mt-6 mb-2"
            >
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Mounts</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredMounts.length} / {mounts?.length ?? 0}
              </Text>
            </View>

            <PalMountsGrid
              items={filteredMounts}
              numColumns={3}
              emptyText="No mounts found. Try a different search."
              kind="all"
              onSectionLayout={(kind: any, y: number) => {
                const k = kind as MountKindLite;
                const base = mountsStartYRef.current || 0;
                travelOffsetsRef.current[k] = base + (y || 0);
              }}
            />
          </View>
        ),
      },

      {
        key: "accessories" as const,
        title: "Accessories",
        subtitle: "Wearables",
        shown: filteredAccessories.length,
        total: accessories?.length ?? 0,
        items: filteredAccessories as any[],
        previewItems: filteredAccessories as any[],
        render: (items: AccessoryIndexItem[]) => (
          <AccessoryGrid items={items} numColumns={3} showUnavailable={true} emptyText="No accessories found. Try a different search." />
        ),
      },
      {
        key: "armor" as const,
        title: "Armor",
        subtitle: "Protection Gear",
        shown: filteredArmor.length,
        total: armor?.length ?? 0,
        items: filteredArmor as any[],
        previewItems: filteredArmor as any[],
        render: (items: ArmorIndexItem[]) => (
          <ArmorGrid items={items} numColumns={3} showUnavailable={true} emptyText="No armor found. Try a different search." />
        ),
      },
      {
        key: "spheres" as const,
        title: "Spheres",
        subtitle: "Spheres + Modules",
        shown: filteredSpheres.length + filteredSphereModules.length,
        total: (spheres?.length ?? 0) + (sphereModules?.length ?? 0),
        items: [] as any[],
        previewItems: [
          ...toPreviewItems(filteredSpheres, 3).map((x) => ({ name: `Sphere • ${x.name}` })),
          ...toPreviewItems(filteredSphereModules, 3).map((x) => ({ name: `Module • ${x.name}` })),
        ],
        render: () => (
          <View>
            <View className="px-4 mt-2 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Spheres</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredSpheres.length} / {spheres?.length ?? 0}
              </Text>
            </View>

            <SphereGrid items={filteredSpheres} numColumns={3} showUnavailable={true} emptyText="No spheres found. Try a different search." />

            <View className="px-4 mt-6 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Sphere Modules</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredSphereModules.length} / {sphereModules?.length ?? 0}
              </Text>
            </View>

            <SphereModuleGrid
              items={filteredSphereModules}
              numColumns={3}
              showUnavailable={true}
              emptyText="No sphere modules found. Try a different search."
            />
          </View>
        ),
      },
      {
        key: "keyItems" as const,
        title: "Key Items",
        subtitle: "Special Items",
        shown: filteredKeyItems.length,
        total: keyItems?.length ?? 0,
        items: filteredKeyItems as any[],
        previewItems: filteredKeyItems as any[],
        render: (items: KeyItemIndexItem[]) => (
          <KeyItemsGrid items={items} numColumns={3} showUnavailable={true} emptyText="No key items found. Try a different search." />
        ),
      },
      {
        key: "schematics" as const,
        title: "Schematics",
        subtitle: "Blueprints",
        shown: filteredSchematics.length,
        total: schematics?.length ?? 0,
        items: filteredSchematics as any[],
        previewItems: filteredSchematics as any[],
        render: (items: SchematicIndexItem[]) => (
          <SchematicGrid items={items} numColumns={3} showUnavailable={true} emptyText="No schematics found. Try a different search." />
        ),
      },
    ] as const;
  }, [
    filteredMaterials,
    filteredIngredients,
    filteredConsumables,
    filteredWeapons,
    filteredAmmo,
    filteredSpheres,
    filteredSphereModules,
    filteredGliders,
    filteredMounts,
    filteredKeyItems,
    filteredSchematics,
    filteredAccessories,
    filteredArmor,

    materials,
    ingredients,
    consumables,
    weapons,
    ammo,
    spheres,
    sphereModules,
    gliders,
    mounts,
    keyItems,
    schematics,
    accessories,
    armor,
  ]);

  const visibleCards = useMemo(() => {
    if (!normalizedSearch) return categories;
    return categories.filter((c) => c.shown > 0);
  }, [categories, normalizedSearch]);

  const onStickyHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    headerHRef.current = e.nativeEvent.layout.height || 0;
  }, []);

  const handlePillPress = useCallback((key: CategoryKey) => {
    if (key === "all") {
      setSelected("all");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setSelected(key);

    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 0);
  }, []);

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
            onPress={() => {
              setSelected("all");
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
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
        <View onLayout={onStickyHeaderLayout} className="px-4 pt-2 pb-3 bg-black/60 border-b border-white/10">
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
                <Pill label="Dashboard" count={totalShown} active={selected === "all"} onPress={() => handlePillPress("all")} />

                {categories.map((c) => (
                  <Pill
                    key={c.key}
                    label={c.title}
                    count={c.shown}
                    active={selected === (c.key as any)}
                    onPress={() => handlePillPress(c.key as any)}
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
                    const topNames = source.slice(0, 3).map(safeName);
                    const hasMore = c.shown > 3;

                    return (
                      <Pressable
                        key={c.key}
                        onPress={() => {
                          setSelected(c.key as any);
                          setTimeout(() => {
                            scrollRef.current?.scrollTo({ y: 0, animated: true });
                          }, 0);
                        }}
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

      {selected === "travel" && (filteredGliders.length > 0 || mountSections.length > 0) && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 0,
            top: 6,
            bottom: 10,
            justifyContent: "center",
            paddingRight: 2,
          }}
        >
          <View
            style={{
              alignSelf: "flex-end",
              paddingVertical: 6,
              paddingHorizontal: 6,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.72)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            {filteredGliders.length > 0 && (
              <Pressable
                onPress={() => scrollToTravelIndex("gliders")}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View className="h-[28px] w-[28px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <MaterialCommunityIcons name="parachute" size={16} color="white" />
                </View>
              </Pressable>
            )}

            {mountSections.map((s) => {
              const meta = mountMeta(s.key);

              return (
                <Pressable
                  key={s.key}
                  onPress={() => scrollToTravelIndex(s.key)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 6,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View className="h-[28px] w-[28px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <MaterialCommunityIcons name={meta.icon} size={16} color="white" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

export default PalworldItemsGrid;

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
