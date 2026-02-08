// components/Palworld/PalworldItemsGrid.tsx
import React, { useMemo, useCallback, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PalworldDashboardGrid, { type DashboardCategory } from "@/components/Palworld/PalworldDashboardGrid";
import { usePalworldDashboardOrderStore } from "@/store/palworldDashboardOrderStore";

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
import type { PalMountIndexItem } from "@/lib/palworld/items/paldbMounts";
import PalMountsGrid from "./Items/MountsGrid";

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
    return { icon: "road-variant" as const };
  }
  if (kind === "flying") {
    return { icon: "weather-windy" as const };
  }
  return { icon: "waves" as const };
}

const DEFAULT_CATEGORY_ORDER: CategoryKey[] = [
  "materials",
  "ingredients",
  "consumables",
  "weapons",
  "travel",
  "accessories",
  "armor",
  "spheres",
  "keyItems",
  "schematics",
];

type TravelIndexKey = "gliders" | MountKindLite;

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

  const travelOffsetsRef = useRef<Record<TravelIndexKey, number>>({
    gliders: 0,
    ground: 0,
    flying: 0,
    water: 0,
  });

  const mountsStartYRef = useRef(0);

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

  const categories: DashboardCategory<CategoryKey>[] = useMemo(() => {
    return [
      {
        key: "materials",
        title: "Materials",
        subtitle: "Crafting + Drops",
        shown: filteredMaterials.length,
        total: materials?.length ?? 0,
        items: filteredMaterials as any[],
        previewItems: filteredMaterials as any[],
        render: (items) => (
          <MaterialGrid items={items as any} numColumns={3} showUnavailable={true} emptyText="No materials found. Try a different search." />
        ),
      },
      {
        key: "ingredients",
        title: "Ingredients",
        subtitle: "Food + Cooking",
        shown: filteredIngredients.length,
        total: ingredients?.length ?? 0,
        items: filteredIngredients as any[],
        previewItems: filteredIngredients as any[],
        render: (items) => (
          <IngredientGrid items={items as any} numColumns={3} showUnavailable={true} emptyText="No ingredients found. Try a different search." />
        ),
      },
      {
        key: "consumables",
        title: "Consumables",
        subtitle: "Food + Medicine",
        shown: filteredConsumables.length,
        total: consumables?.length ?? 0,
        items: filteredConsumables as any[],
        previewItems: filteredConsumables as any[],
        render: (items) => (
          <ConsumableGrid items={items as any} numColumns={3} showUnavailable={true} emptyText="No consumables found. Try a different search." />
        ),
      },
      {
        key: "weapons",
        title: "Weapons",
        subtitle: "Ammo + Weapons",
        shown: filteredAmmo.length + filteredWeapons.length,
        total: (weapons?.length ?? 0) + (ammo?.length ?? 0),
        items: [] as any[],
        previewItems: [
          ...toPreviewItems(filteredAmmo, 3).map((x) => ({ name: `Ammo • ${x.name}` })),
          ...toPreviewItems(filteredWeapons, 3).map((x) => ({ name: `Weapon • ${x.name}` })),
        ],
        render: () => (
          <View>
            <View className="px-4 mt-6 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Ammo</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredAmmo.length} / {ammo?.length ?? 0}
              </Text>
            </View>

            <AmmoGrid items={filteredAmmo} numColumns={3} showUnavailable={true} emptyText="No ammo found. Try a different search." />

            <View className="px-4 mt-2 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Weapons</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredWeapons.length} / {weapons?.length ?? 0}
              </Text>
            </View>

            <WeaponGrid items={filteredWeapons} numColumns={3} showUnavailable={true} emptyText="No weapons found. Try a different search." />
          </View>
        ),
      },
      {
        key: "travel",
        title: "Travel",
        subtitle: "Gliders + Mounts",
        shown: filteredGliders.length + filteredMounts.length,
        total: (gliders?.length ?? 0) + (mounts?.length ?? 0),
        items: [] as any[],
        previewItems: [
          ...toPreviewItems(filteredGliders, 3).map((x) => ({ name: `Glider • ${x.name}` })),
          ...toPreviewItems(filteredMounts, 3).map((x) => ({ name: `Mount • ${x.name}` })),
        ],
        render: (_items, ctx) => {
          const scrollToTravelIndex = (k: TravelIndexKey) => {
            const y = travelOffsetsRef.current[k];
            if (y != null) {
              // keep same feel as before
              ctx.scrollTo(Math.max(y - 46, 0), true);
            }
          };

          return (
            <View style={{ position: "relative" }}>
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

              {(filteredGliders.length > 0 || mountSections.length > 0) && (
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
        },
      },
      {
        key: "accessories",
        title: "Accessories",
        subtitle: "Wearables",
        shown: filteredAccessories.length,
        total: accessories?.length ?? 0,
        items: filteredAccessories as any[],
        previewItems: filteredAccessories as any[],
        render: (items) => (
          <AccessoryGrid items={items as any} numColumns={3} showUnavailable={true} emptyText="No accessories found. Try a different search." />
        ),
      },
      {
        key: "armor",
        title: "Armor",
        subtitle: "Protection Gear",
        shown: filteredArmor.length,
        total: armor?.length ?? 0,
        items: filteredArmor as any[],
        previewItems: filteredArmor as any[],
        render: (items) => (
          <ArmorGrid items={items as any} numColumns={3} showUnavailable={true} emptyText="No armor found. Try a different search." />
        ),
      },
      {
        key: "spheres",
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
        key: "keyItems",
        title: "Key Items",
        subtitle: "Special Items",
        shown: filteredKeyItems.length,
        total: keyItems?.length ?? 0,
        items: filteredKeyItems as any[],
        previewItems: filteredKeyItems as any[],
        render: (items) => (
          <KeyItemsGrid items={items as any} numColumns={3} showUnavailable={true} emptyText="No key items found. Try a different search." />
        ),
      },
      {
        key: "schematics",
        title: "Schematics",
        subtitle: "Blueprints",
        shown: filteredSchematics.length,
        total: schematics?.length ?? 0,
        items: filteredSchematics as any[],
        previewItems: filteredSchematics as any[],
        render: (items) => (
          <SchematicGrid items={items as any} numColumns={3} showUnavailable={true} emptyText="No schematics found. Try a different search." />
        ),
      },
    ];
  }, [
    filteredMaterials,
    filteredIngredients,
    filteredConsumables,
    filteredWeapons,
    filteredAmmo,
    filteredGliders,
    filteredMounts,
    filteredAccessories,
    filteredArmor,
    filteredSpheres,
    filteredSphereModules,
    filteredKeyItems,
    filteredSchematics,

    materials,
    ingredients,
    consumables,
    weapons,
    ammo,
    gliders,
    mounts,
    accessories,
    armor,
    spheres,
    sphereModules,
    keyItems,
    schematics,

    mountSections,
  ]);

  const orderKey = "palworld.items" as const;
  const storedOrder = usePalworldDashboardOrderStore((s) => s.orders[orderKey]);
  const saveOrder = usePalworldDashboardOrderStore((s) => s.setOrder);
  const effectiveOrder = (storedOrder?.length ? storedOrder : DEFAULT_CATEGORY_ORDER) as CategoryKey[];

  return (
    <PalworldDashboardGrid<CategoryKey>
      search={search}
      totalShown={totalShown}
      totalAll={totalAll}
      categories={categories}
      reorderEnabled={true}
      defaultOrder={DEFAULT_CATEGORY_ORDER}
      order={effectiveOrder}
      onOrderChange={(next) => saveOrder(orderKey, next as string[])}
      previewMax={3}
    />
  );
};

export default PalworldItemsGrid;
