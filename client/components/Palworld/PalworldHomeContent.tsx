// components/Palworld/PalworldHomeContent.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import PageWrapper from "@/components/PageWrapper";
import MapCard from "@/components/MapCard";

import { fetchPalList, type PalListItem } from "@/lib/palworld/paldbDeck";

import { PalpagosIslandsMapModal } from "./PalworldMap";
import PalworldBreedingCalculatorModal from "./PalworldBreedingCalculatorModal";
import PaldeckGrid, { type PalDexFilter } from "@/components/Palworld/PaldeckGrid";

import PalworldItemsGrid from "@/components/Palworld/PalworldItemsGrid";
import PalworldConstructionGrid from "@/components/Palworld/PalworldConstructionGrid";
import PalworldUpgradesGrid from "@/components/Palworld/PalworldUpgradesGrid";

import { fetchSphereList, type SphereListItem } from "@/lib/palworld/items/paldbSpheres";
import { fetchAmmoIndex, type AmmoIndexItem } from "@/lib/palworld/items/paldbAmmo";
import { fetchMaterialIndex, type MaterialIndexItem } from "@/lib/palworld/items/paldbMaterial";
import { fetchWeaponIndex, type WeaponIndexItem } from "@/lib/palworld/items/paldbWeapon";
import { fetchConsumableIndex, type ConsumableIndexItem } from "@/lib/palworld/items/paldbConsumable";
import { fetchIngredientIndex, type IngredientIndexItem } from "@/lib/palworld/items/paldbIngredient";
import { fetchSphereModuleIndex, type SphereModuleIndexItem } from "@/lib/palworld/items/paldbSphereModule";
import { fetchGliderIndex, type GliderIndexItem } from "@/lib/palworld/items/paldbGlider";
import { fetchKeyItemIndex, type KeyItemIndexItem } from "@/lib/palworld/items/paldbKeyItems";
import { fetchSchematicList, type SchematicIndexItem } from "@/lib/palworld/items/paldbSchematic";
import { fetchAccessoryIndex, type AccessoryIndexItem } from "@/lib/palworld/items/paldbAccessory";
import { fetchArmorIndex, type ArmorIndexItem } from "@/lib/palworld/items/paldbArmor";

import { fetchMountIndex, type PalMountIndexItem } from "@/lib/palworld/paldbMounts";
import { fetchPassiveSkillIndex, type PassiveSkillRow } from "@/lib/palworld/paldbPassiveSkills";
import { fetchTechnologies, type TechnologyItem } from "@/lib/palworld/paldbTechnologies";
import { fetchJournalIndex, type JournalIndexItem } from "@/lib/palworld/paldbJournal";
import { fetchMissionIndex, type MissionIndexItem } from "@/lib/palworld/paldbMissions";
import { fetchBaseLevels, type BaseIndex } from "@/lib/palworld/paldbBase";
import { fetchMerchantOffers, type MerchantOfferRow } from "@/lib/palworld/paldbMerchants";

import { fetchStorageList, type StorageIndexItem } from "@/lib/palworld/construction/paldbStorage";
import { fetchFoundationsList, type FoundationsIndexItem } from "@/lib/palworld/construction/paldbFoundations";
import { fetchFurnitureList, type FurnitureIndexItem } from "@/lib/palworld/construction/paldbFurniture";
import { fetchDefensesList, type DefensesIndexItem } from "@/lib/palworld/construction/paldbDefenses";
import { fetchFoodList, type FoodIndexItem } from "@/lib/palworld/construction/paldbFood";
import { fetchInfrastructureList, type InfrastructureIndexItem } from "@/lib/palworld/construction/paldbInfrastructure";
import { fetchLightingList, type LightingIndexItem } from "@/lib/palworld/construction/paldbLighting";
import { fetchProductionList, type ProductionIndexItem } from "@/lib/palworld/construction/paldbProduction";
import { fetchPalConstructionList, type PalConstructionIndexItem } from "@/lib/palworld/construction/paldbPal";
import { fetchOtherList, type OtherIndexItem } from "@/lib/palworld/construction/paldbOther";

type PalworldHomeContentProps = {
  onBackToCollections: () => void;
};

type ActiveTab = "dex" | "tools" | "items" | "construction" | "upgrades";

type PalMapGroupKey = "world";
type PalToolGroupKey = "tools";

type MapCardConfig = React.ComponentProps<typeof MapCard> & {
  id: string;
  groupKey: PalMapGroupKey;
};

type ToolCardConfig = React.ComponentProps<typeof MapCard> & {
  id: string;
  groupKey: PalToolGroupKey;
};

const PalworldHomeContent: React.FC<PalworldHomeContentProps> = ({ onBackToCollections }) => {
  const toolsScrollRef = useRef<ScrollView | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("dex");
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const [dexFilter, setDexFilter] = useState<PalDexFilter>("all");
  const [showPalpagosMap, setShowPalpagosMap] = useState(false);
  const [showBreedingCalc, setShowBreedingCalc] = useState(false);

  const setTab = useCallback((t: ActiveTab) => {
    setActiveTab(t);
  }, []);

  // Dex
  const [dexLoading, setDexLoading] = useState(false);
  const [dexError, setDexError] = useState<string | null>(null);
  const [pals, setPals] = useState<PalListItem[]>([]);

  // Items tab state
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Construction tab state
  const [constructionLoading, setConstructionLoading] = useState(false);
  const [constructionError, setConstructionError] = useState<string | null>(null);

  // Upgrades tab state
  const [upgradesLoading, setUpgradesLoading] = useState(false);
  const [upgradesError, setUpgradesError] = useState<string | null>(null);

  // Items data
  const [spheres, setSpheres] = useState<SphereListItem[]>([]);
  const [ammo, setAmmo] = useState<AmmoIndexItem[]>([]);
  const [materials, setMaterials] = useState<MaterialIndexItem[]>([]);
  const [weapons, setWeapons] = useState<WeaponIndexItem[]>([]);
  const [consumables, setConsumables] = useState<ConsumableIndexItem[]>([]);
  const [ingredients, setIngredients] = useState<IngredientIndexItem[]>([]);
  const [sphereModules, setSphereModules] = useState<SphereModuleIndexItem[]>([]);
  const [gliders, setGliders] = useState<GliderIndexItem[]>([]);
  const [mounts, setMounts] = useState<PalMountIndexItem[]>([]);
  const [keyItems, setKeyItems] = useState<KeyItemIndexItem[]>([]);
  const [schematics, setSchematics] = useState<SchematicIndexItem[]>([]);
  const [accessories, setAccessories] = useState<AccessoryIndexItem[]>([]);
  const [armor, setArmor] = useState<ArmorIndexItem[]>([]);

  // Upgrades data
  const [passiveSkills, setPassiveSkills] = useState<PassiveSkillRow[]>([]);
  const [technologies, setTechnologies] = useState<TechnologyItem[]>([]);
  const [journals, setJournals] = useState<JournalIndexItem[]>([]);
  const [missionsMain, setMissionsMain] = useState<MissionIndexItem[]>([]);
  const [missionsSub, setMissionsSub] = useState<MissionIndexItem[]>([]);
  const [base, setBase] = useState<BaseIndex | null>(null);
  const [merchantOffers, setMerchantOffers] = useState<MerchantOfferRow[]>([]);

  // Construction data
  const [storage, setStorage] = useState<StorageIndexItem[]>([]);
  const [foundations, setFoundations] = useState<FoundationsIndexItem[]>([]);
  const [furniture, setFurniture] = useState<FurnitureIndexItem[]>([]);
  const [defenses, setDefenses] = useState<DefensesIndexItem[]>([]);
  const [food, setFood] = useState<FoodIndexItem[]>([]);
  const [infrastructure, setInfrastructure] = useState<InfrastructureIndexItem[]>([]);
  const [lighting, setLighting] = useState<LightingIndexItem[]>([]);
  const [production, setProduction] = useState<ProductionIndexItem[]>([]);
  const [palConstruction, setPalConstruction] = useState<PalConstructionIndexItem[]>([]);
  const [otherConstruction, setOtherConstruction] = useState<OtherIndexItem[]>([]);

  const [didLoadItemsOnce, setDidLoadItemsOnce] = useState(false);
  const [didLoadConstructionOnce, setDidLoadConstructionOnce] = useState(false);
  const [didLoadUpgradesOnce, setDidLoadUpgradesOnce] = useState(false);

  // Initial dex load
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setDexError(null);
        setDexLoading(true);

        const list = await fetchPalList();
        if (cancelled) return;

        setPals(list);
      } catch (e) {
        console.warn("Failed to fetch paldb pals list:", e);
        if (!cancelled) setDexError("Failed to load Paldeck from paldb.cc");
      } finally {
        if (!cancelled) setDexLoading(false);

        // Optional background prefetch for Building (so it feels instant later)
        if (!cancelled && !didLoadConstructionOnce) {
          setTimeout(() => {
            loadConstructionData({ markDidLoad: true }).catch(() => {});
          }, 600);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadItemsData(opts?: { markDidLoad?: boolean }) {
    const markDidLoad = opts?.markDidLoad ?? true;

    try {
      setItemsError(null);
      setItemsLoading(true);

      const [
        materialList,
        sphereList,
        ammoList,
        weaponList,
        consumableList,
        ingredientList,
        sphereModuleList,
        gliderIndex,
        mountIndex,
        keyItemList,
        schematicList,
        accessoryList,
        armorList,
      ] = await Promise.all([
        fetchMaterialIndex(),
        fetchSphereList(),
        fetchAmmoIndex(),
        fetchWeaponIndex(),
        fetchConsumableIndex(),
        fetchIngredientIndex(),
        fetchSphereModuleIndex(),
        fetchGliderIndex(),
        fetchMountIndex(),
        fetchKeyItemIndex(),
        fetchSchematicList(),
        fetchAccessoryIndex(),
        fetchArmorIndex(),
      ]);

      setMaterials(materialList);
      setSpheres(sphereList);
      setAmmo(ammoList);
      setWeapons(weaponList);
      setConsumables(consumableList);
      setIngredients(ingredientList);
      setSphereModules(sphereModuleList);
      setGliders(gliderIndex?.merged ?? []);
      setMounts(mountIndex?.all ?? []);
      setKeyItems(keyItemList);
      setSchematics(schematicList);
      setAccessories(accessoryList);
      setArmor(armorList);

      if (markDidLoad) setDidLoadItemsOnce(true);
    } catch (e) {
      console.warn("Failed to fetch paldb items:", e);
      setItemsError("Failed to load Items from paldb.cc");
    } finally {
      setItemsLoading(false);
    }
  }

  async function loadConstructionData(opts?: { markDidLoad?: boolean }) {
    const markDidLoad = opts?.markDidLoad ?? true;

    try {
      setConstructionError(null);
      setConstructionLoading(true);

      const [
        storageList,
        foundationsList,
        furnitureList,
        defensesList,
        foodList,
        infrastructureList,
        lightingList,
        productionList,
        palConstructionList,
        otherConstructionList,
      ] = await Promise.all([
        fetchStorageList(),
        fetchFoundationsList(),
        fetchFurnitureList(),
        fetchDefensesList(),
        fetchFoodList(),
        fetchInfrastructureList(),
        fetchLightingList(),
        fetchProductionList(),
        fetchPalConstructionList(),
        fetchOtherList(),
      ]);

      setStorage(storageList ?? []);
      setFoundations(foundationsList ?? []);
      setFurniture(furnitureList ?? []);
      setDefenses(defensesList ?? []);
      setFood(foodList ?? []);
      setInfrastructure(infrastructureList ?? []);
      setLighting(lightingList ?? []);
      setProduction(productionList ?? []);
      setPalConstruction(palConstructionList ?? []);
      setOtherConstruction(otherConstructionList ?? []);

      if (markDidLoad) setDidLoadConstructionOnce(true);
    } catch (e) {
      console.warn("Failed to fetch paldb construction:", e);
      setConstructionError("Failed to load Building Items from paldb.cc");
    } finally {
      setConstructionLoading(false);
    }
  }

  async function loadUpgradesData(opts?: { markDidLoad?: boolean }) {
    const markDidLoad = opts?.markDidLoad ?? true;

    try {
      setUpgradesError(null);
      setUpgradesLoading(true);

      const [passiveSkillIndex, technologyList, journalIndex, missionIndex, baseIndex, merchantOfferList] =
        await Promise.all([
          fetchPassiveSkillIndex(),
          fetchTechnologies(),
          fetchJournalIndex(),
          fetchMissionIndex(),
          fetchBaseLevels(),
          fetchMerchantOffers(),
        ]);

      setPassiveSkills(passiveSkillIndex?.items ?? []);
      setTechnologies(technologyList ?? []);
      setJournals(journalIndex?.items ?? (journalIndex as any) ?? []);
      setMissionsMain(missionIndex?.main ?? []);
      setMissionsSub(missionIndex?.sub ?? []);
      setBase(baseIndex ?? null);
      setMerchantOffers(merchantOfferList ?? []);

      if (markDidLoad) setDidLoadUpgradesOnce(true);
    } catch (e) {
      console.warn("Failed to fetch paldb upgrades:", e);
      setUpgradesError("Failed to load Upgrades from paldb.cc");
    } finally {
      setUpgradesLoading(false);
    }
  }

  // Lazy-load per tab
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;

      if (activeTab === "items") {
        if (!didLoadItemsOnce) await loadItemsData({ markDidLoad: true });
        return;
      }

      if (activeTab === "construction") {
        if (!didLoadConstructionOnce) await loadConstructionData({ markDidLoad: true });
        return;
      }

      if (activeTab === "upgrades") {
        if (!didLoadUpgradesOnce) await loadUpgradesData({ markDidLoad: true });
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, didLoadItemsOnce, didLoadConstructionOnce, didLoadUpgradesOnce]);

  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case "dex":
        return "Paldeck";
      case "tools":
        return "Tools";
      case "items":
        return "Items";
      case "construction":
        return "Construction";
      case "upgrades":
        return "Upgrades";
      default:
        return "Palworld";
    }
  }, [activeTab]);

  const pageSubtitle = useMemo(() => {
    switch (activeTab) {
      case "dex":
        return "Your Palworld dex — track caught, lucky, and alpha pals.";
      case "tools":
        return "Maps, breeding, and utility tools.";
      case "items":
        return "Browse key items — materials, spheres, ammo, and more.";
      case "construction":
        return "Build pieces — storage, foundations, furniture, defenses, and more.";
      case "upgrades":
        return "Progression — skills, tech, journals, missions, base, merchants.";
      default:
        return "";
    }
  }, [activeTab]);

  const mapCards: MapCardConfig[] = [
    {
      id: "palpagos-world",
      groupKey: "world",
      onPress: () => setShowPalpagosMap(true),
      title: "Palpagos Islands – World Map",
      subtitle: "Full-screen map for Palworld.",
      tagLabel: "Region",
      tagValue: "Palpagos • World",
      iconType: "mci",
      iconName: "map",
      iconColor: "#f97316",
      iconSize: 22,
      borderColorClass: "border-orange-700/70",
      iconBgClass: "bg-orange-500/15 border-orange-500/50",
      infoIconName: "map-search-outline",
      infoText: "Explore biomes, landmarks, and key locations.",
      badgeBgClass: "bg-orange-500/15",
      badgeBorderClass: "border-orange-500/60",
      badgeTextClass: "text-orange-200",
    },
  ];

  const toolCards: ToolCardConfig[] = [
    {
      id: "palworld-breeding-calculator",
      groupKey: "tools",
      onPress: () => setShowBreedingCalc(true),
      title: "Breeding Calculator",
      subtitle: "Combine pals and discover offspring results.",
      tagLabel: "Tool",
      tagValue: "Palworld.gg • Breeding",
      iconType: "mci",
      iconName: "dna",
      iconColor: "#f97316",
      iconSize: 22,
      borderColorClass: "border-orange-700/70",
      iconBgClass: "bg-orange-500/15 border-orange-500/50",
      infoIconName: "calculator-variant-outline",
      infoText: "Open the full breeding calculator in-app (WebView).",
      badgeBgClass: "bg-orange-500/15",
      badgeBorderClass: "border-orange-500/60",
      badgeTextClass: "text-orange-200",
    },
  ];

  const filteredMapCards = useMemo(() => {
    if (!normalizedSearch) return mapCards;

    return mapCards.filter((card) => {
      const haystack = (
        card.title +
        " " +
        (card.subtitle ?? "") +
        " " +
        (card.tagLabel ?? "") +
        " " +
        (card.tagValue ?? "") +
        " " +
        (card.infoText ?? "")
      ).toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, mapCards]);

  const filteredToolCards = useMemo(() => {
    if (!normalizedSearch) return toolCards;

    return toolCards.filter((card) => {
      const haystack = (
        card.title +
        " " +
        (card.subtitle ?? "") +
        " " +
        (card.tagLabel ?? "") +
        " " +
        (card.tagValue ?? "") +
        " " +
        (card.infoText ?? "")
      ).toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, toolCards]);

  const itemsAreEmpty =
    materials.length === 0 &&
    spheres.length === 0 &&
    ammo.length === 0 &&
    weapons.length === 0 &&
    consumables.length === 0 &&
    ingredients.length === 0 &&
    sphereModules.length === 0 &&
    gliders.length === 0 &&
    mounts.length === 0 &&
    keyItems.length === 0 &&
    schematics.length === 0 &&
    accessories.length === 0 &&
    armor.length === 0;

  const constructionAreEmpty =
    storage.length === 0 &&
    foundations.length === 0 &&
    furniture.length === 0 &&
    defenses.length === 0 &&
    food.length === 0 &&
    infrastructure.length === 0 &&
    lighting.length === 0 &&
    production.length === 0 &&
    palConstruction.length === 0 &&
    otherConstruction.length === 0;

  const upgradesAreEmpty =
    passiveSkills.length === 0 &&
    technologies.length === 0 &&
    journals.length === 0 &&
    missionsMain.length === 0 &&
    missionsSub.length === 0 &&
    base == null &&
    merchantOffers.length === 0;

  return (
    <>
      <PageWrapper
        scroll={false}
        hideBackButton
        title={pageTitle}
        subtitle={pageSubtitle}
        leftActions={<Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Palworld</Text>}
        rightActions={
          <Pressable onPress={onBackToCollections} className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700">
            <Text className="text-[11px] text-slate-300 font-semibold">Change Collection</Text>
          </Pressable>
        }
      >
        {/* Shared search bar */}
        <View className="mt-4 mb-2">
          <View className="flex-row items-center rounded-2xl bg-slate-900 px-3 py-2 border border-slate-800">
            <Feather name="search" size={18} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={
                activeTab === "tools"
                  ? "Search field guide (maps, breeding…)"
                  : activeTab === "items"
                  ? "Search items (materials, spheres, ammo, rarity, tech…)"
                  : activeTab === "construction"
                  ? "Search construction (storage, foundations, furniture, tech…)"
                  : activeTab === "upgrades"
                  ? "Search upgrades (skills, tech, journals, missions, merchants…)"
                  : "Search pals (name, number, element…)"
              }
              placeholderTextColor="#6B7280"
              className="flex-1 ml-2 text-[13px] text-slate-100"
            />

            {search.trim().length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={10} className="ml-1 rounded-full p-1 bg-slate-800/80">
                <Feather name="x" size={14} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Sub-tabs */}
          <View className="flex-row items-center rounded-full bg-slate-900/80 border border-slate-700 p-1 mt-2">
            <Pressable
              onPress={() => setTab("tools")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
                activeTab === "tools" ? "bg-slate-800" : ""
              }`}
            >
              <Text className={`text-[11px] font-semibold ${activeTab === "tools" ? "text-slate-50" : "text-slate-400"}`}>
                Tools
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("items")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
                activeTab === "items" ? "bg-slate-800" : ""
              }`}
            >
              <Text className={`text-[11px] font-semibold ${activeTab === "items" ? "text-slate-50" : "text-slate-400"}`}>
                Items
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("dex")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
                activeTab === "dex" ? "bg-slate-800" : ""
              }`}
            >
              <Text className={`text-[11px] font-semibold ${activeTab === "dex" ? "text-slate-50" : "text-slate-400"}`}>
                Paldeck
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("construction")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
                activeTab === "construction" ? "bg-slate-800" : ""
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  activeTab === "construction" ? "text-slate-50" : "text-slate-400"
                }`}
              >
                Building
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("upgrades")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
                activeTab === "upgrades" ? "bg-slate-800" : ""
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  activeTab === "upgrades" ? "text-slate-50" : "text-slate-400"
                }`}
              >
                Upgrades
              </Text>
            </Pressable>
          </View>
        </View>

        <View key={activeTab} className="flex-1">
          {activeTab === "tools" && (
            <View className="flex-1" style={{ position: "relative" }}>
              <ScrollView
                ref={toolsScrollRef}
                contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 70 }}
                keyboardShouldPersistTaps="handled"
              >
                <View className="w-full">
                  {/* Maps */}
                  {filteredMapCards.length === 0 ? null : (
                    <View className="mb-3">
                      <View className="flex-row items-center mb-1 px-1 mt-2">
                        <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
                        <View className="flex-1">
                          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Palpagos Islands
                          </Text>
                          <Text className="text-[11px] text-slate-500 mt-0.5">
                            World Overview
                          </Text>
                        </View>
                      </View>

                      {filteredMapCards.map((card) => (
                        <MapCard key={card.id} {...card} />
                      ))}
                    </View>
                  )}

                  {/* Tools */}
                  {filteredToolCards.length === 0 ? null : (
                    <View className="mb-3">
                      <View className="flex-row items-center mb-1 px-1 mt-2">
                        <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
                        <View className="flex-1">
                          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Palworld Utilities
                          </Text>
                          <Text className="text-[11px] text-slate-500 mt-0.5">
                            Breeding • Calculators
                          </Text>
                        </View>
                      </View>

                      {filteredToolCards.map((card) => (
                        <MapCard key={card.id} {...card} />
                      ))}
                    </View>
                  )}

                  {filteredMapCards.length === 0 && filteredToolCards.length === 0 ? (
                    <View className="mt-6 items-center">
                      <Text className="text-sm text-slate-400 text-center px-4">
                        No field guide items match this search yet.
                      </Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ITEMS TAB */}
          {activeTab === "items" && (
            <View className="flex-1">
              {itemsLoading && itemsAreEmpty ? (
                <View className="flex-1 items-center justify-center mt-4">
                  <ActivityIndicator />
                  <Text className="mt-2 text-sm text-slate-300">Loading Items…</Text>
                </View>
              ) : itemsError ? (
                <View className="flex-1 items-center justify-center mt-4 px-4">
                  <Text className="text-sm text-rose-300 text-center">{itemsError}</Text>

                  <Pressable
                    onPress={() => loadItemsData({ markDidLoad: true })}
                    className="mt-3 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700"
                  >
                    <Text className="text-[12px] text-slate-100 font-semibold">Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <PalworldItemsGrid
                  search={search}
                  materials={materials}
                  spheres={spheres}
                  ammo={ammo}
                  weapons={weapons}
                  consumables={consumables}
                  ingredients={ingredients}
                  sphereModules={sphereModules}
                  gliders={gliders}
                  mounts={mounts}
                  keyItems={keyItems}
                  schematics={schematics}
                  accessories={accessories}
                  armor={armor}
                />
              )}
            </View>
          )}

          {/* CONSTRUCTION TAB */}
          {activeTab === "construction" && (
            <View className="flex-1">
              {constructionLoading && constructionAreEmpty ? (
                <View className="flex-1 items-center justify-center mt-4">
                  <ActivityIndicator />
                  <Text className="mt-2 text-sm text-slate-300">Loading Building Items</Text>
                </View>
              ) : constructionError ? (
                <View className="flex-1 items-center justify-center mt-4 px-4">
                  <Text className="text-sm text-rose-300 text-center">{constructionError}</Text>

                  <Pressable
                    onPress={() => loadConstructionData({ markDidLoad: true })}
                    className="mt-3 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700"
                  >
                    <Text className="text-[12px] text-slate-100 font-semibold">Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <PalworldConstructionGrid
                  search={search}
                  storage={storage}
                  foundations={foundations}
                  furniture={furniture}
                  defenses={defenses}
                  food={food}
                  infrastructure={infrastructure}
                  lighting={lighting}
                  production={production}
                  palConstruction={palConstruction}
                  otherConstruction={otherConstruction}
                />
              )}
            </View>
          )}

          {/* UPGRADES TAB */}
          {activeTab === "upgrades" && (
            <View className="flex-1">
              {upgradesLoading && upgradesAreEmpty ? (
                <View className="flex-1 items-center justify-center mt-4">
                  <ActivityIndicator />
                  <Text className="mt-2 text-sm text-slate-300">Loading Upgrades…</Text>
                </View>
              ) : upgradesError ? (
                <View className="flex-1 items-center justify-center mt-4 px-4">
                  <Text className="text-sm text-rose-300 text-center">{upgradesError}</Text>

                  <Pressable
                    onPress={() => loadUpgradesData({ markDidLoad: true })}
                    className="mt-3 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700"
                  >
                    <Text className="text-[12px] text-slate-100 font-semibold">Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <PalworldUpgradesGrid
                  search={search}
                  passiveSkills={passiveSkills}
                  technologies={technologies}
                  journals={journals}
                  missionsMain={missionsMain}
                  missionsSub={missionsSub}
                  base={base}
                  merchantOffers={merchantOffers}
                />
              )}
            </View>
          )}

          {/* PALDECK TAB */}
          {activeTab === "dex" && (
            <View className="flex-1">
              {dexLoading && pals.length === 0 ? (
                <View className="flex-1 items-center justify-center mt-4">
                  <ActivityIndicator />
                  <Text className="mt-2 text-sm text-slate-300">Loading Paldeck…</Text>
                </View>
              ) : dexError ? (
                <View className="flex-1 items-center justify-center mt-4 px-4">
                  <Text className="text-sm text-rose-300 text-center">{dexError}</Text>

                  <Pressable
                    onPress={async () => {
                      try {
                        setDexError(null);
                        setDexLoading(true);
                        const list = await fetchPalList();
                        setPals(list);
                      } catch (e) {
                        console.warn(e);
                        setDexError("Failed to load Paldeck from paldb.cc");
                      } finally {
                        setDexLoading(false);
                      }
                    }}
                    className="mt-3 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700"
                  >
                    <Text className="text-[12px] text-slate-100 font-semibold">Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <PaldeckGrid
                  pals={pals}
                  search={search}
                  dexFilter={dexFilter}
                  onChangeDexFilter={setDexFilter}
                />
              )}
            </View>
          )}
        </View>
      </PageWrapper>

      <PalpagosIslandsMapModal visible={showPalpagosMap} onClose={() => setShowPalpagosMap(false)} />
      <PalworldBreedingCalculatorModal visible={showBreedingCalc} onClose={() => setShowBreedingCalc(false)} />
    </>
  );
};

export default PalworldHomeContent;
