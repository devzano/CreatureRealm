// components/Palworld/PalworldHomeContent.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback, useDeferredValue } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, InteractionManager } from "react-native";
import { Feather } from "@expo/vector-icons";
import LiquidGlass from "../ui/LiquidGlass";
import PageWrapper from "@/components/PageWrapper";
import MapCard from "@/components/MapCard";
import { PalpagosIslandsMapModal } from "./PalworldMap";
import PalworldBreedingCalculatorModal from "./PalworldBreedingCalculatorModal";

import PaldeckGrid, { type PalDexFilter } from "@/components/Palworld/PaldeckGrid";
import PalworldItemsGrid from "@/components/Palworld/PalworldItemsGrid";
import PalworldConstructionGrid from "@/components/Palworld/PalworldConstructionGrid";
import PalworldUpgradesGrid from "@/components/Palworld/PalworldUpgradesGrid";

import { fetchPalList, type PalListItem } from "@/lib/palworld/paldbDeck";
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

import { fetchMountIndex, type PalMountIndexItem } from "@/lib/palworld/items/paldbMounts";
import { fetchPassiveSkillIndex, type PassiveSkillRow } from "@/lib/palworld/upgrades/paldbPassiveSkills";
import { fetchTechnologies, type TechnologyItem } from "@/lib/palworld/upgrades/paldbTechnologies";
import { fetchJournalIndex, type JournalIndexItem } from "@/lib/palworld/upgrades/paldbJournal";
import { fetchMissionIndex, type MissionIndexItem } from "@/lib/palworld/upgrades/paldbMissions";
import { fetchBaseLevels, type BaseIndex } from "@/lib/palworld/upgrades/paldbBase";
import { fetchMerchantOffers, type MerchantOfferRow } from "@/lib/palworld/upgrades/paldbMerchants";
import { fetchTowerBosses, type TowerBossRow } from "@/lib/palworld/upgrades/paldbTowerBosses";
import { fetchRaidIndex, fetchSummoningAltarIndex, type SummoningAltarBoss, type RaidEvent } from "@/lib/palworld/upgrades/paldbSummonsRaid";
import { fetchDungeonWithPals, type DungeonWithPals } from "@/lib/palworld/upgrades/paldbDungeonsPals";
import { fetchEggsIndex, type EggRow } from "@/lib/palworld/upgrades/paldbEggPals";
import { listWorkSuitabilities, type WorkSuitabilityItem } from "@/lib/palworld/upgrades/paldbWorkSuitability";
import { fetchSkillfruitOrchard, type SkillFruitOrchardRow } from "@/lib/palworld/upgrades/paldbSkillFruits";

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

  const [activeTabUI, setActiveTabUI] = useState<ActiveTab>("dex");
  const [activeTabContent, setActiveTabContent] = useState<ActiveTab>("dex");

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = (deferredSearch ?? "").trim().toLowerCase();

  const [dexFilter, setDexFilter] = useState<PalDexFilter>("all");
  const [showPalpagosMap, setShowPalpagosMap] = useState(false);
  const [showBreedingCalc, setShowBreedingCalc] = useState(false);

  const tabRef = useRef<ActiveTab>("dex");
  useEffect(() => {
    tabRef.current = activeTabUI;
  }, [activeTabUI]);

  const setTab = useCallback((t: ActiveTab) => {
    setActiveTabUI(t);

    InteractionManager.runAfterInteractions(() => {
      setActiveTabContent(t);
    });
  }, []);

  const [dexLoading, setDexLoading] = useState(false);
  const [dexError, setDexError] = useState<string | null>(null);
  const [pals, setPals] = useState<PalListItem[]>([]);

  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [constructionLoading, setConstructionLoading] = useState(false);
  const [constructionError, setConstructionError] = useState<string | null>(null);

  const [upgradesLoading, setUpgradesLoading] = useState(false);
  const [upgradesError, setUpgradesError] = useState<string | null>(null);

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

  const [passiveSkills, setPassiveSkills] = useState<PassiveSkillRow[]>([]);
  const [technologies, setTechnologies] = useState<TechnologyItem[]>([]);
  const [journals, setJournals] = useState<JournalIndexItem[]>([]);
  const [missionsMain, setMissionsMain] = useState<MissionIndexItem[]>([]);
  const [missionsSub, setMissionsSub] = useState<MissionIndexItem[]>([]);
  const [base, setBase] = useState<BaseIndex | null>(null);
  const [merchantOffers, setMerchantOffers] = useState<MerchantOfferRow[]>([]);
  const [towerBosses, setTowerBosses] = useState<TowerBossRow[]>([]);
  const [summons, setSummons] = useState<SummoningAltarBoss[]>([]);
  const [raids, setRaids] = useState<RaidEvent[]>([]);
  const [dungeonPals, setDungeonPals] = useState<DungeonWithPals[]>([]);
  const [eggs, setEggs] = useState<EggRow[]>([]);
  const [workSuitability, setWorkSuitability] = useState<WorkSuitabilityItem[]>([]);
  const [skillfruits, setSkillfruits] = useState<SkillFruitOrchardRow[]>([]);

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
        if (!cancelled) setDexError("Failed to load Paldeck");
      } finally {
        if (!cancelled) setDexLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadItemsData(opts?: { markDidLoad?: boolean; }) {
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

  async function loadConstructionData(opts?: { markDidLoad?: boolean; }) {
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

  async function loadUpgradesData(opts?: { markDidLoad?: boolean; }) {
    const markDidLoad = opts?.markDidLoad ?? true;

    try {
      setUpgradesError(null);
      setUpgradesLoading(true);

      const [
        passiveSkillIndex,
        technologyList,
        journalIndex,
        missionIndex,
        baseIndex,
        merchantOfferList,
        towerBossList,
        raidIndex,
        summoningAltarIndex,
        dungeonWithPalsList,
        eggsIndex,
        skillfruitList,
      ] = await Promise.all([
        fetchPassiveSkillIndex(),
        fetchTechnologies(),
        fetchJournalIndex(),
        fetchMissionIndex(),
        fetchBaseLevels(),
        fetchMerchantOffers(),
        fetchTowerBosses(),
        fetchRaidIndex(),
        fetchSummoningAltarIndex(),
        fetchDungeonWithPals(),
        fetchEggsIndex(),
        fetchSkillfruitOrchard(),
      ]);

      setPassiveSkills(passiveSkillIndex?.items ?? []);
      setTechnologies(technologyList ?? []);
      setJournals(journalIndex?.items ?? (journalIndex as any) ?? []);
      setMissionsMain(missionIndex?.main ?? []);
      setMissionsSub(missionIndex?.sub ?? []);
      setBase(baseIndex ?? null);
      setMerchantOffers(merchantOfferList ?? []);
      setTowerBosses(towerBossList ?? []);
      setRaids(raidIndex ?? []);
      setSummons(summoningAltarIndex ?? []);
      setDungeonPals(dungeonWithPalsList ?? []);
      setEggs(eggsIndex?.rows ?? []);
      const workSuitabilityIndex = listWorkSuitabilities();
      setWorkSuitability(workSuitabilityIndex);
      setSkillfruits(skillfruitList ?? []);

      if (markDidLoad) setDidLoadUpgradesOnce(true);
    } catch (e) {
      console.warn("Failed to fetch paldb upgrades:", e);
      setUpgradesError("Failed to load Upgrades from paldb.cc");
    } finally {
      setUpgradesLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled) return;

      if (activeTabContent === "items") {
        if (!didLoadItemsOnce) loadItemsData({ markDidLoad: true }).catch(() => { });
        return;
      }

      if (activeTabContent === "construction") {
        if (!didLoadConstructionOnce) loadConstructionData({ markDidLoad: true }).catch(() => { });
        return;
      }

      if (activeTabContent === "upgrades") {
        if (!didLoadUpgradesOnce) loadUpgradesData({ markDidLoad: true }).catch(() => { });
        return;
      }
    };

    InteractionManager.runAfterInteractions(run);

    return () => {
      cancelled = true;
    };
  }, [activeTabContent, didLoadItemsOnce, didLoadConstructionOnce, didLoadUpgradesOnce]);

  const pageTitle = useMemo(() => {
    switch (activeTabUI) {
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
  }, [activeTabUI]);

  const pageSubtitle = useMemo(() => {
    switch (activeTabUI) {
      case "dex":
        return "Your Palpedia — track caught, lucky, and alpha pals.";
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
  }, [activeTabUI]);

  const mapCards: MapCardConfig[] = useMemo(
    () => [
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
    ],
    []
  );

  const toolCards: ToolCardConfig[] = useMemo(
    () => [
      {
        id: "palworld-breeding-calculator",
        groupKey: "tools",
        onPress: () => setShowBreedingCalc(true),
        title: "Breeding Calculator",
        subtitle: "Combine pals and discover offspring results.",
        tagLabel: "Tool",
        tagValue: "Breeding",
        iconType: "mci",
        iconName: "dna",
        iconColor: "#f97316",
        iconSize: 22,
        borderColorClass: "border-orange-700/70",
        iconBgClass: "bg-orange-500/15 border-orange-500/50",
        infoIconName: "calculator-variant-outline",
        infoText: "Breeding Calculator",
        badgeBgClass: "bg-orange-500/15",
        badgeBorderClass: "border-orange-500/60",
        badgeTextClass: "text-orange-200",
      },
    ],
    []
  );

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
    merchantOffers.length === 0 &&
    towerBosses.length === 0 &&
    summons.length === 0 &&
    raids.length === 0 &&
    dungeonPals.length === 0 &&
    eggs.length === 0 &&
    workSuitability.length === 0 &&
    skillfruits.length === 0;

  return (
    <>
      <PageWrapper
        scroll={false}
        hideBackButton
        title={pageTitle}
        subtitle={pageSubtitle}
        leftActions={
          <LiquidGlass
            glassEffectStyle="clear"
            interactive={false}
            tinted
            tintColor="rgba(56,189,248,0.22)"
            showFallbackBackground
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.14)",
            }}
          >
            <View style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Palworld</Text>
            </View>
          </LiquidGlass>
        }
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
                activeTabUI === "tools"
                  ? "Search field guide (maps, breeding…)"
                  : activeTabUI === "items"
                    ? "Search items (materials, spheres, ammo, rarity, tech…)"
                    : activeTabUI === "construction"
                      ? "Search construction (storage, foundations, furniture, tech…)"
                      : activeTabUI === "upgrades"
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
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${activeTabUI === "tools" ? "bg-slate-800" : ""
                }`}
            >
              <Text className={`text-[11px] font-semibold ${activeTabUI === "tools" ? "text-slate-50" : "text-slate-400"}`}>
                Tools
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("items")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${activeTabUI === "items" ? "bg-slate-800" : ""
                }`}
            >
              <Text className={`text-[11px] font-semibold ${activeTabUI === "items" ? "text-slate-50" : "text-slate-400"}`}>
                Items
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("dex")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${activeTabUI === "dex" ? "bg-slate-800" : ""
                }`}
            >
              <Text className={`text-[11px] font-semibold ${activeTabUI === "dex" ? "text-slate-50" : "text-slate-400"}`}>
                Palpedia
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("construction")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${activeTabUI === "construction" ? "bg-slate-800" : ""
                }`}
            >
              <Text
                className={`text-[11px] font-semibold ${activeTabUI === "construction" ? "text-slate-50" : "text-slate-400"
                  }`}
              >
                Building
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTab("upgrades")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${activeTabUI === "upgrades" ? "bg-slate-800" : ""
                }`}
            >
              <Text className={`text-[11px] font-semibold ${activeTabUI === "upgrades" ? "text-slate-50" : "text-slate-400"}`}>
                Upgrades
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-1">
          {activeTabContent === "tools" && (
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
                          <Text className="text-[11px] text-slate-500 mt-0.5">World Overview</Text>
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
                          <Text className="text-[11px] text-slate-500 mt-0.5">Breeding Calculators</Text>
                        </View>
                      </View>

                      {filteredToolCards.map((card) => (
                        <MapCard
                          key={card.id}
                          {...card}
                          poweredBy="Palworld.gg"
                          badgeLabel="WEB"
                        />
                      ))}
                    </View>
                  )}

                  {filteredMapCards.length === 0 && filteredToolCards.length === 0 ? (
                    <View className="mt-6 items-center">
                      <Text className="text-sm text-slate-400 text-center px-4">No field guide items match this search yet.</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ITEMS TAB */}
          {activeTabContent === "items" && (
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
                  search={deferredSearch}
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
          {activeTabContent === "construction" && (
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
                  search={deferredSearch}
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
          {activeTabContent === "upgrades" && (
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
                  search={deferredSearch}
                  passiveSkills={passiveSkills}
                  technologies={technologies}
                  journals={journals}
                  missionsMain={missionsMain}
                  missionsSub={missionsSub}
                  base={base}
                  merchantOffers={merchantOffers}
                  towerBosses={towerBosses}
                  summons={summons}
                  raids={raids}
                  dungeonPals={dungeonPals}
                  eggs={eggs}
                  workSuitability={workSuitability}
                  skillfruits={skillfruits}
                />
              )}
            </View>
          )}

          {/* PALDECK TAB */}
          {activeTabContent === "dex" && (
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
                        setDexError("Failed to load Paldeck");
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
                <PaldeckGrid pals={pals} search={deferredSearch} dexFilter={dexFilter} onChangeDexFilter={setDexFilter} />
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
