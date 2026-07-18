// components/Palworld/PalworldHomeContent.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback, useDeferredValue } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import LiquidGlass from "../ui/LiquidGlass";
import PageWrapper from "@/components/PageWrapper";
import MapCard from "@/components/MapCard";
import { PalpagosIslandsMapModal } from "./PalworldMap";
import PalworldBreedingCalculatorModal from "./PalworldBreedingCalculatorModal";
import PalworldUpdatesSheet from "./PalworldUpdatesSheet";

import PaldeckGrid, { type PalDexFilter } from "@/components/Palworld/PaldeckGrid";
import PalworldItemsGrid from "@/components/Palworld/PalworldItemsGrid";
import PalworldConstructionGrid, {
  type ConstructionCategoryKey,
  type ConstructionCategoryStatus,
} from "@/components/Palworld/PalworldConstructionGrid";
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
import { fetchWorkPriority, type WorkPriorityItem } from "@/lib/palworld/upgrades/paldbWorkPriority";

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
import { yieldToUI } from "@/lib/palworld/construction/shared";
import {
  fetchExpeditionStationBundle,
  fetchExpeditionStationList,
  fetchFishingPondBundle,
  fetchFishingPondList,
  fetchFishingShadows,
  fetchPalExpeditions,
  type ExpeditionStationBundle,
  type FishingPondDetailBundle,
  type FishingShadowEntry,
  type PalExpeditionEntry,
  type SpecialConstructionIndexItem,
} from "@/lib/palworld/construction/paldbSpecialStructures";
import {
  fetchPaldbHomeUpdates,
  fetchPaldbUpdateDetail,
  type PaldbHomeUpdates,
  type PaldbUpdateCategory,
  type PaldbUpdateDetail,
  type PaldbUpdateListItem,
} from "@/lib/palworld/paldbUpdates";

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

type ConstructionCategoryItemsMap = {
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
  other: OtherIndexItem[];
};

const CONSTRUCTION_LOAD_KEYS: ConstructionCategoryKey[] = [
  "storage",
  "defenses",
  "food",
  "infrastructure",
  "lighting",
  "production",
  "palConstruction",
  "expeditionStation",
  "fishingPond",
  "other",
  "foundations",
  "furniture",
];

const CONSTRUCTION_MAX_CONCURRENT = 3;

function createInitialConstructionStatus(): Record<ConstructionCategoryKey, ConstructionCategoryStatus> {
  return {
    storage: { loading: false, loaded: false, error: null },
    foundations: { loading: false, loaded: false, error: null },
    furniture: { loading: false, loaded: false, error: null },
    defenses: { loading: false, loaded: false, error: null },
    food: { loading: false, loaded: false, error: null },
    infrastructure: { loading: false, loaded: false, error: null },
    lighting: { loading: false, loaded: false, error: null },
    production: { loading: false, loaded: false, error: null },
    palConstruction: { loading: false, loaded: false, error: null },
    expeditionStation: { loading: false, loaded: false, error: null },
    palExpeditions: { loading: false, loaded: false, error: null },
    fishingPond: { loading: false, loaded: false, error: null },
    fishingShadows: { loading: false, loaded: false, error: null },
    other: { loading: false, loaded: false, error: null },
  };
}

function setConstructionStatusesForKeys(
  prev: Record<ConstructionCategoryKey, ConstructionCategoryStatus>,
  keys: ConstructionCategoryKey[],
  next: Partial<ConstructionCategoryStatus> | ((current: ConstructionCategoryStatus) => ConstructionCategoryStatus)
): Record<ConstructionCategoryKey, ConstructionCategoryStatus> {
  const updated = { ...prev };
  for (const key of keys) {
    const current = prev[key];
    updated[key] = typeof next === "function" ? next(current) : { ...current, ...next };
  }
  return updated;
}

function getConstructionGroupedRetryKeys(status: Record<ConstructionCategoryKey, ConstructionCategoryStatus>): ConstructionCategoryKey[] {
  const keys = new Set<ConstructionCategoryKey>();

  for (const key of CONSTRUCTION_LOAD_KEYS) {
    if (key === "expeditionStation") {
      if (status.expeditionStation.error || status.palExpeditions.error) keys.add("expeditionStation");
      continue;
    }

    if (key === "fishingPond") {
      if (status.fishingPond.error || status.fishingShadows.error) keys.add("fishingPond");
      continue;
    }

    if (status[key].error) keys.add(key);
  }

  return Array.from(keys);
}

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
  const [showPaldbUpdatesSheet, setShowPaldbUpdatesSheet] = useState(false);
  const [selectedPaldbCategory, setSelectedPaldbCategory] = useState<PaldbUpdateCategory | null>(null);
  const [selectedPaldbItem, setSelectedPaldbItem] = useState<PaldbUpdateListItem | null>(null);
  const [selectedPaldbDetail, setSelectedPaldbDetail] = useState<PaldbUpdateDetail | null>(null);
  const [paldbUpdatesLoading, setPaldbUpdatesLoading] = useState(false);
  const [paldbUpdatesError, setPaldbUpdatesError] = useState<string | null>(null);
  const [paldbUpdatesDetailLoading, setPaldbUpdatesDetailLoading] = useState(false);
  const [paldbUpdatesDetailError, setPaldbUpdatesDetailError] = useState<string | null>(null);
  const [paldbUpdates, setPaldbUpdates] = useState<PaldbHomeUpdates>({
    versionChanges: [],
    contentUpdates: [],
    patchNotes: [],
  });

  const tabRef = useRef<ActiveTab>("dex");
  useEffect(() => {
    tabRef.current = activeTabUI;
  }, [activeTabUI]);

  const setTab = useCallback((t: ActiveTab) => {
    setActiveTabUI(t);
    setActiveTabContent(t);
  }, []);

  const [dexLoading, setDexLoading] = useState(false);
  const [dexError, setDexError] = useState<string | null>(null);
  const [pals, setPals] = useState<PalListItem[]>([]);

  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [constructionCategoryStatus, setConstructionCategoryStatus] = useState<Record<ConstructionCategoryKey, ConstructionCategoryStatus>>(
    () => createInitialConstructionStatus()
  );

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
  const [workPriority, setWorkPriority] = useState<WorkPriorityItem[]>([]);
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
  const [expeditionStation, setExpeditionStation] = useState<SpecialConstructionIndexItem[]>([]);
  const [palExpeditions, setPalExpeditions] = useState<PalExpeditionEntry[]>([]);
  const [fishingPond, setFishingPond] = useState<SpecialConstructionIndexItem[]>([]);
  const [fishingShadows, setFishingShadows] = useState<FishingShadowEntry[]>([]);
  const [otherConstruction, setOtherConstruction] = useState<OtherIndexItem[]>([]);

  const [didLoadItemsOnce, setDidLoadItemsOnce] = useState(false);
  const [didLoadUpgradesOnce, setDidLoadUpgradesOnce] = useState(false);
  const [didLoadPaldbUpdatesOnce, setDidLoadPaldbUpdatesOnce] = useState(false);

  const constructionMountedRef = useRef(true);
  const constructionLoadStartedRef = useRef(false);
  const constructionHasLoadedRef = useRef(false);
  const constructionCategoryRequestIdRef = useRef<Record<ConstructionCategoryKey, number>>({
    storage: 0,
    foundations: 0,
    furniture: 0,
    defenses: 0,
    food: 0,
    infrastructure: 0,
    lighting: 0,
    production: 0,
    palConstruction: 0,
    expeditionStation: 0,
    palExpeditions: 0,
    fishingPond: 0,
    fishingShadows: 0,
    other: 0,
  });

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
  }, []);

  useEffect(() => {
    constructionMountedRef.current = true;
    return () => {
      constructionMountedRef.current = false;
    };
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

  const loadConstructionCategory = useCallback(
    async (key: ConstructionCategoryKey) => {
      const startedAt = Date.now();
      const linkedKeys: ConstructionCategoryKey[] =
        key === "expeditionStation" || key === "palExpeditions"
          ? ["expeditionStation", "palExpeditions"]
          : key === "fishingPond" || key === "fishingShadows"
            ? ["fishingPond", "fishingShadows"]
            : [key];

      const requestId = (constructionCategoryRequestIdRef.current[key] ?? 0) + 1;
      for (const linkedKey of linkedKeys) {
        constructionCategoryRequestIdRef.current[linkedKey] = requestId;
      }

      if (__DEV__) {
        console.log(`[Construction] ${key} started`);
      }

      setConstructionCategoryStatus((prev) =>
        setConstructionStatusesForKeys(prev, linkedKeys, (current) => ({
          loading: true,
          loaded: current.loaded,
          error: null,
        }))
      );

      const isCurrentRequest = () =>
        constructionMountedRef.current &&
        linkedKeys.every((linkedKey) => constructionCategoryRequestIdRef.current[linkedKey] === requestId);

      const fetcherMap: { [K in ConstructionCategoryKey]: () => Promise<ConstructionCategoryItemsMap[K]> } = {
        storage: async () => (await fetchStorageList()) ?? [],
        foundations: async () => (await fetchFoundationsList()) ?? [],
        furniture: async () => (await fetchFurnitureList()) ?? [],
        defenses: async () => (await fetchDefensesList()) ?? [],
        food: async () => (await fetchFoodList()) ?? [],
        infrastructure: async () => (await fetchInfrastructureList()) ?? [],
        lighting: async () => (await fetchLightingList()) ?? [],
        production: async () => (await fetchProductionList()) ?? [],
        palConstruction: async () => (await fetchPalConstructionList()) ?? [],
        expeditionStation: async () => (await fetchExpeditionStationList()) ?? [],
        palExpeditions: async () => (await fetchPalExpeditions()) ?? [],
        fishingPond: async () => (await fetchFishingPondList()) ?? [],
        fishingShadows: async () => (await fetchFishingShadows()) ?? [],
        other: async () => (await fetchOtherList()) ?? [],
      };

      try {
        if (key === "expeditionStation" || key === "palExpeditions") {
          const bundle: ExpeditionStationBundle = await fetchExpeditionStationBundle();
          if (!isCurrentRequest()) return;

          setExpeditionStation([bundle.construction]);
          setPalExpeditions(bundle.expeditions);
          setConstructionCategoryStatus((prev) =>
            setConstructionStatusesForKeys(prev, linkedKeys, {
              loading: false,
              loaded: true,
              error: null,
            })
          );

          if (__DEV__) {
            console.log(
              `[Construction] expeditionStation completed in ${Date.now() - startedAt}ms (${1 + bundle.expeditions.length} entries)`
            );
          }
          return;
        }

        if (key === "fishingPond" || key === "fishingShadows") {
          const bundle: FishingPondDetailBundle = await fetchFishingPondBundle();
          if (!isCurrentRequest()) return;

          setFishingPond([bundle.construction]);
          setFishingShadows(bundle.shadows);
          setConstructionCategoryStatus((prev) =>
            setConstructionStatusesForKeys(prev, linkedKeys, {
              loading: false,
              loaded: true,
              error: null,
            })
          );

          if (__DEV__) {
            console.log(
              `[Construction] fishingPond completed in ${Date.now() - startedAt}ms (${1 + bundle.shadows.length} entries)`
            );
          }
          return;
        }

        const items = await fetcherMap[key]();
        if (!isCurrentRequest()) return;

        switch (key) {
          case "storage":
            setStorage(items as ConstructionCategoryItemsMap["storage"]);
            break;
          case "foundations":
            setFoundations(items as ConstructionCategoryItemsMap["foundations"]);
            break;
          case "furniture":
            setFurniture(items as ConstructionCategoryItemsMap["furniture"]);
            break;
          case "defenses":
            setDefenses(items as ConstructionCategoryItemsMap["defenses"]);
            break;
          case "food":
            setFood(items as ConstructionCategoryItemsMap["food"]);
            break;
          case "infrastructure":
            setInfrastructure(items as ConstructionCategoryItemsMap["infrastructure"]);
            break;
          case "lighting":
            setLighting(items as ConstructionCategoryItemsMap["lighting"]);
            break;
          case "production":
            setProduction(items as ConstructionCategoryItemsMap["production"]);
            break;
          case "palConstruction":
            setPalConstruction(items as ConstructionCategoryItemsMap["palConstruction"]);
            break;
          case "other":
            setOtherConstruction(items as ConstructionCategoryItemsMap["other"]);
            break;
          default:
            break;
        }

        setConstructionCategoryStatus((prev) =>
          setConstructionStatusesForKeys(prev, linkedKeys, {
            loading: false,
            loaded: true,
            error: null,
          })
        );

        if (__DEV__) {
          console.log(`[Construction] ${key} completed in ${Date.now() - startedAt}ms (${items.length} items)`);
        }
      } catch (error) {
        if (__DEV__) {
          console.log(`[Construction] ${key} failed in ${Date.now() - startedAt}ms`, error);
        }

        if (!isCurrentRequest()) return;

        const message = error instanceof Error ? error.message : "Failed to load this category.";
        setConstructionCategoryStatus((prev) =>
          setConstructionStatusesForKeys(prev, linkedKeys, (current) => ({
            loading: false,
            loaded: current.loaded,
            error: message,
          }))
        );
      }
    },
    []
  );

  const loadConstructionData = useCallback(
    async (opts?: { keys?: ConstructionCategoryKey[]; force?: boolean }) => {
      const requestedKeys = opts?.keys?.length ? opts.keys : CONSTRUCTION_LOAD_KEYS;
      const dedupedKeys = Array.from(
        new Set(
          requestedKeys.map((key) => {
            if (key === "palExpeditions") return "expeditionStation";
            if (key === "fishingShadows") return "fishingPond";
            return key;
          })
        )
      ) as ConstructionCategoryKey[];

      if (!dedupedKeys.length) return;

      constructionLoadStartedRef.current = true;
      const batchStartedAt = Date.now();

      const runQueue = async () => {
        let nextIndex = 0;

        const worker = async () => {
          while (nextIndex < dedupedKeys.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            const key = dedupedKeys[currentIndex];
            await loadConstructionCategory(key);
            await yieldToUI();
          }
        };

        const workerCount = Math.max(1, Math.min(CONSTRUCTION_MAX_CONCURRENT, dedupedKeys.length));
        await Promise.allSettled(Array.from({ length: workerCount }, () => worker()));
      };

      void runQueue().then(() => {
        if (!constructionMountedRef.current) return;
        constructionHasLoadedRef.current = true;

        if (__DEV__) {
          const failedKeys = getConstructionGroupedRetryKeys(constructionCategoryStatus);
          console.log(
            `[Construction] batch settled in ${Date.now() - batchStartedAt}ms (${dedupedKeys.length - failedKeys.length}/${dedupedKeys.length} succeeded)`
          );
        }
      });
    },
    [constructionCategoryStatus, loadConstructionCategory]
  );

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
        workPriorityIndex,
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
        fetchWorkPriority(),
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
      setWorkPriority(workPriorityIndex ?? []);
      setSkillfruits(skillfruitList ?? []);

      if (markDidLoad) setDidLoadUpgradesOnce(true);
    } catch (e) {
      console.warn("Failed to fetch paldb upgrades:", e);
      setUpgradesError("Failed to load Upgrades from paldb.cc");
    } finally {
      setUpgradesLoading(false);
    }
  }

  const loadPaldbUpdatesData = useCallback(async (opts?: { markDidLoad?: boolean; force?: boolean }) => {
    const markDidLoad = opts?.markDidLoad ?? true;

    try {
      setPaldbUpdatesError(null);
      setPaldbUpdatesLoading(true);

      const next = await fetchPaldbHomeUpdates({ force: !!opts?.force });
      setPaldbUpdates(next);

      if (markDidLoad) setDidLoadPaldbUpdatesOnce(true);
    } catch (e) {
      console.warn("Failed to fetch paldb home updates:", e);
      setPaldbUpdatesError("Failed to load PalDB updates from paldb.cc");
    } finally {
      setPaldbUpdatesLoading(false);
    }
  }, []);

  const openPaldbCategory = useCallback(
    async (category: PaldbUpdateCategory) => {
      setSelectedPaldbCategory(category);
      setSelectedPaldbItem(null);
      setSelectedPaldbDetail(null);
      setPaldbUpdatesDetailError(null);
      setShowPaldbUpdatesSheet(true);

      if (!didLoadPaldbUpdatesOnce && !paldbUpdatesLoading) {
        await loadPaldbUpdatesData({ markDidLoad: true }).catch(() => { });
      }
    },
    [didLoadPaldbUpdatesOnce, loadPaldbUpdatesData, paldbUpdatesLoading]
  );

  const closePaldbSheet = useCallback(() => {
    setShowPaldbUpdatesSheet(false);
    setSelectedPaldbCategory(null);
    setSelectedPaldbItem(null);
    setSelectedPaldbDetail(null);
    setPaldbUpdatesDetailError(null);
    setPaldbUpdatesDetailLoading(false);
  }, []);

  const handleSelectPaldbItem = useCallback(async (item: PaldbUpdateListItem) => {
    setSelectedPaldbItem(item);
    setSelectedPaldbDetail(item.prefetchedDetail ?? null);
    setPaldbUpdatesDetailError(null);

    if (!item.url || !item.url.startsWith("https://paldb.cc/")) {
      return;
    }

    try {
      setPaldbUpdatesDetailLoading(true);
      const detail = await fetchPaldbUpdateDetail(item);
      setSelectedPaldbDetail(detail);
    } catch (e) {
      console.warn("Failed to fetch paldb update detail:", e);
      setPaldbUpdatesDetailError("Failed to load the full update detail.");
    } finally {
      setPaldbUpdatesDetailLoading(false);
    }
  }, []);

  const retryConstructionCategory = useCallback(
    (key: ConstructionCategoryKey) => {
      const retryKey = key === "palExpeditions" ? "expeditionStation" : key === "fishingShadows" ? "fishingPond" : key;
      loadConstructionData({ keys: [retryKey] }).catch(() => { });
    },
    [loadConstructionData]
  );

  const retryFailedConstructionCategories = useCallback(() => {
    const failedKeys = getConstructionGroupedRetryKeys(constructionCategoryStatus);
    if (!failedKeys.length) return;
    loadConstructionData({ keys: failedKeys }).catch(() => { });
  }, [constructionCategoryStatus, loadConstructionData]);

  useEffect(() => {
    if (activeTabContent === "items") {
      if (!didLoadItemsOnce) loadItemsData({ markDidLoad: true }).catch(() => { });
      return;
    }

    if (activeTabContent === "construction") {
      if (!constructionLoadStartedRef.current && !constructionHasLoadedRef.current) {
        loadConstructionData().catch(() => { });
      }
      return;
    }

    if (activeTabContent === "upgrades") {
      if (!didLoadUpgradesOnce) loadUpgradesData({ markDidLoad: true }).catch(() => { });
      return;
    }

    if (activeTabContent === "tools" && !didLoadPaldbUpdatesOnce) {
      loadPaldbUpdatesData({ markDidLoad: true }).catch(() => { });
    }
  }, [activeTabContent, didLoadItemsOnce, didLoadPaldbUpdatesOnce, didLoadUpgradesOnce, loadConstructionData, loadPaldbUpdatesData]);

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
      {
        id: "palworld-version-changes",
        groupKey: "tools",
        onPress: () => openPaldbCategory("versionChanges"),
        title: "Version Changes",
        subtitle: "Core version notes, balance adjustments, and fixes.",
        tagLabel: "Updates",
        tagValue:
          paldbUpdatesLoading && paldbUpdates.versionChanges.length === 0
            ? "Syncing…"
            : `${paldbUpdates.versionChanges.length} entries`,
        iconType: "mci",
        iconName: "history",
        iconColor: "#fb923c",
        iconSize: 22,
        borderColorClass: "border-amber-700/70",
        iconBgClass: "bg-amber-500/15 border-amber-500/50",
        infoIconName: "file-document-edit-outline",
        infoText: paldbUpdates.versionChanges[0]?.title ?? "Latest version changes from paldb.cc",
        badgeBgClass: "bg-amber-500/15",
        badgeBorderClass: "border-amber-500/60",
        badgeTextClass: "text-amber-200",
        poweredBy: "PalDB.cc",
        badgeLabel: "WEB UPDATES",
      },
      {
        id: "palworld-content-updates",
        groupKey: "tools",
        onPress: () => openPaldbCategory("contentUpdates"),
        title: "Content Updates",
        subtitle: "Major feature drops, collabs, and expansion updates.",
        tagLabel: "Updates",
        tagValue:
          paldbUpdatesLoading && paldbUpdates.contentUpdates.length === 0
            ? "Syncing…"
            : `${paldbUpdates.contentUpdates.length} entries`,
        iconType: "mci",
        iconName: "rocket-launch-outline",
        iconColor: "#f59e0b",
        iconSize: 22,
        borderColorClass: "border-yellow-700/70",
        iconBgClass: "bg-yellow-500/15 border-yellow-500/50",
        infoIconName: "new-box",
        infoText: paldbUpdates.contentUpdates[0]?.title ?? "Major content drops from paldb.cc",
        badgeBgClass: "bg-yellow-500/15",
        badgeBorderClass: "border-yellow-500/60",
        badgeTextClass: "text-yellow-200",
        poweredBy: "PalDB.cc",
        badgeLabel: "WEB UPDATES",
      },
      {
        id: "palworld-patch-notes",
        groupKey: "tools",
        onPress: () => openPaldbCategory("patchNotes"),
        title: "Patch Notes",
        subtitle: "Recent patch updates, patch news, and post-release fixes.",
        tagLabel: "Updates",
        tagValue:
          paldbUpdatesLoading && paldbUpdates.patchNotes.length === 0
            ? "Syncing…"
            : `${paldbUpdates.patchNotes.length} entries`,
        iconType: "mci",
        iconName: "newspaper-variant-outline",
        iconColor: "#f97316",
        iconSize: 22,
        borderColorClass: "border-orange-700/70",
        iconBgClass: "bg-orange-500/15 border-orange-500/50",
        infoIconName: "wrench-cog-outline",
        infoText: paldbUpdates.patchNotes[0]?.title ?? "Patch note archive from paldb.cc",
        badgeBgClass: "bg-orange-500/15",
        badgeBorderClass: "border-orange-500/60",
        badgeTextClass: "text-orange-200",
        poweredBy: "PalDB.cc",
        badgeLabel: "WEB UPDATES",
      },
    ],
    [openPaldbCategory, paldbUpdates, paldbUpdatesLoading]
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
    expeditionStation.length === 0 &&
    palExpeditions.length === 0 &&
    fishingPond.length === 0 &&
    fishingShadows.length === 0 &&
    otherConstruction.length === 0;

  const constructionStatusEntries = useMemo(
    () =>
      CONSTRUCTION_LOAD_KEYS.map((key) => {
        if (key === "expeditionStation") {
          return {
            key,
            status: {
              loading: constructionCategoryStatus.expeditionStation.loading || constructionCategoryStatus.palExpeditions.loading,
              loaded: constructionCategoryStatus.expeditionStation.loaded && constructionCategoryStatus.palExpeditions.loaded,
              error: constructionCategoryStatus.expeditionStation.error ?? constructionCategoryStatus.palExpeditions.error,
            },
          };
        }

        if (key === "fishingPond") {
          return {
            key,
            status: {
              loading: constructionCategoryStatus.fishingPond.loading || constructionCategoryStatus.fishingShadows.loading,
              loaded: constructionCategoryStatus.fishingPond.loaded && constructionCategoryStatus.fishingShadows.loaded,
              error: constructionCategoryStatus.fishingPond.error ?? constructionCategoryStatus.fishingShadows.error,
            },
          };
        }

        return { key, status: constructionCategoryStatus[key] };
      }),
    [constructionCategoryStatus]
  );
  const constructionErrorCount = constructionStatusEntries.filter(({ status }) => !!status.error).length;
  const constructionError =
    constructionErrorCount === CONSTRUCTION_LOAD_KEYS.length && constructionAreEmpty
      ? "Failed to load Building Items from paldb.cc"
      : null;

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
    workPriority.length === 0 &&
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
                  isLoading={itemsLoading}
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
              {constructionError ? (
                <View className="px-4 mt-4 mb-2">
                  <View className="rounded-3xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
                    <Text className="text-sm text-rose-200 font-semibold">Building data unavailable</Text>
                    <Text className="mt-1 text-[12px] text-rose-100/80">
                      All construction categories failed to load. You can retry failed categories below without leaving the tab.
                    </Text>
                  </View>
                </View>
              ) : null}

              <PalworldConstructionGrid
                search={deferredSearch}
                categoryStatus={constructionCategoryStatus}
                onRetryCategory={retryConstructionCategory}
                onRetryFailed={constructionErrorCount > 0 ? retryFailedConstructionCategories : undefined}
                storage={storage}
                foundations={foundations}
                furniture={furniture}
                defenses={defenses}
                food={food}
                infrastructure={infrastructure}
                lighting={lighting}
                production={production}
                palConstruction={palConstruction}
                expeditionStation={expeditionStation}
                palExpeditions={palExpeditions}
                fishingPond={fishingPond}
                fishingShadows={fishingShadows}
                otherConstruction={otherConstruction}
              />
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
                  isLoading={upgradesLoading}
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
                  workPriority={workPriority}
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
      <PalworldUpdatesSheet
        visible={showPaldbUpdatesSheet}
        category={selectedPaldbCategory}
        items={
          selectedPaldbCategory === "versionChanges"
            ? paldbUpdates.versionChanges
            : selectedPaldbCategory === "contentUpdates"
              ? paldbUpdates.contentUpdates
              : selectedPaldbCategory === "patchNotes"
                ? paldbUpdates.patchNotes
                : []
        }
        loading={paldbUpdatesLoading}
        error={paldbUpdatesError}
        selectedItem={selectedPaldbItem}
        selectedDetail={selectedPaldbDetail}
        detailLoading={paldbUpdatesDetailLoading}
        detailError={paldbUpdatesDetailError}
        onClose={closePaldbSheet}
        onSelectItem={handleSelectPaldbItem}
        onBackToList={() => {
          setSelectedPaldbItem(null);
          setSelectedPaldbDetail(null);
          setPaldbUpdatesDetailError(null);
          setPaldbUpdatesDetailLoading(false);
        }}
        onRetryCategory={() => {
          loadPaldbUpdatesData({ markDidLoad: true, force: true }).catch(() => { });
        }}
        onRetryDetail={() => {
          if (!selectedPaldbItem) return;
          handleSelectPaldbItem(selectedPaldbItem).catch(() => { });
        }}
      />
    </>
  );
};

export default PalworldHomeContent;
