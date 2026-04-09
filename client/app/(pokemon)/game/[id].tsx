// app/game/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, Pressable } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  getPokemonList,
  extractPokemonIdFromUrl,
  fetchGameDexIds,
  type PokemonListResult,
  type PokemonListResponse,
  type GameId,
} from "@/lib/pokemon";

import { usePokemonCollectionStore } from "@/store/pokemonCollectionStore";
import PageWrapper from "@/components/PageWrapper";
import { getGameById } from "@/lib/pokemon/gameFilters";
import AppImages from "@/constants/images";
import LocalIcon from "@/components/LocalIcon";
import GameDexTile from "@/components/Pokemon/GameDex/gameDexTile";
import { capitalize, getCoverArtStyle } from "@/components/Pokemon/GameDex/gameDexHelpers";
import PalworldDashboardGrid, { type DashboardCategory } from "@/components/Palworld/PalworldDashboardGrid";
import PokopiaCollectiblesContent from "@/components/Pokemon/PokopiaGame/pokopiaCollectiblesContent";
import PokopiaAbilitiesContent from "@/components/Pokemon/PokopiaGame/pokopiaAbilitiesContent";
import PokopiaBuildingsContent from "@/components/Pokemon/PokopiaGame/pokopiaBuildingsContent";
import PokopiaHabitatsContent from "@/components/Pokemon/PokopiaGame/pokopiaHabitatsContent";
import PokopiaInfoContent from "@/components/Pokemon/PokopiaGame/pokopiaInfoContent";
import PokopiaItemsContent from "@/components/Pokemon/PokopiaGame/pokopiaItemsContent";
import PokopiaPlannerContent from "@/components/Pokemon/PokopiaGame/pokopiaPlannerContent";
import PokopiaRecipesContent from "@/components/Pokemon/PokopiaGame/pokopiaRecipesContent";
import PokopiaSpecialtiesContent from "@/components/Pokemon/PokopiaGame/pokopiaSpecialtiesContent";
import {
  ARTIFACT_COLLECTIBLE_SUBCATEGORY_FILTERS,
  POKOPIA_INFO_CARDS,
  POKOPIA_PLANNER_ZONES,
  POKOPIA_SECTION_CARDS,
  RECORD_COLLECTIBLE_SUBCATEGORY_FILTERS,
  type CollectibleCategoryFilter,
  type CollectibleSubcategoryFilter,
  type ItemCategoryFilter,
  type PlannerBuildingPickerTab,
  type PlannerPickerTarget,
  type PokopiaInfoSection,
  type PokopiaSection,
  type RecipeCategoryFilter,
} from "@/components/Pokemon/PokopiaGame/config";
import { fetchPokopiaHabitats, type PokopiaHabitat } from "@/lib/pokemon/pokopia/habitats";
import { fetchPokopiaHabitatDetail, type PokopiaHabitatDetail } from "@/lib/pokemon/pokopia/habitatDetail";
import { fetchPokopiaPokedex, type PokopiaPokedexEntry } from "@/lib/pokemon/pokopia/pokedex";
import { fetchPokopiaItems, type PokopiaItem } from "@/lib/pokemon/pokopia/items";
import { fetchPokopiaItemDetail, type PokopiaItemDetail } from "@/lib/pokemon/pokopia/itemDetail";
import { fetchPokopiaRecipes, type PokopiaRecipe } from "@/lib/pokemon/pokopia/recipes";
import { fetchPokopiaAbilities, type PokopiaAbility } from "@/lib/pokemon/pokopia/abilities";
import { fetchPokopiaAbilityDetail, type PokopiaAbilityDetail } from "@/lib/pokemon/pokopia/abilityDetail";
import { fetchPokopiaSpecialties, type PokopiaSpecialty } from "@/lib/pokemon/pokopia/specialties";
import { fetchPokopiaSpecialtyDetail, type PokopiaSpecialtyDetail } from "@/lib/pokemon/pokopia/specialtyDetail";
import { fetchPokopiaBuildings, type PokopiaBuilding } from "@/lib/pokemon/pokopia/buildings";
import { fetchPokopiaBuildingDetail, type PokopiaBuildingDetail } from "@/lib/pokemon/pokopia/buildingDetail";
import { fetchPokopiaCollectibles, type PokopiaCollectible } from "@/lib/pokemon/pokopia/collectibles";
import { fetchPokopiaCollectibleDetail, type PokopiaCollectibleDetail } from "@/lib/pokemon/pokopia/collectibleDetail";
import { fetchPokopiaCloudIslands, type PokopiaCloudIslandsPage } from "@/lib/pokemon/pokopia/cloudIslands";
import { fetchPokopiaDreamIslands, type PokopiaDreamIslandsPage } from "@/lib/pokemon/pokopia/dreamIslands";
import { fetchPokopiaEvents, type PokopiaEventsPage } from "@/lib/pokemon/pokopia/events";
import { fetchPokopiaGuides, type PokopiaGuidesPage } from "@/lib/pokemon/pokopia/guides";
import { fetchPokopiaDreamIslandDetail, type PokopiaDreamIslandDetail } from "@/lib/pokemon/pokopia/dreamIslandDetail";
import { fetchPokopiaEventDetail, type PokopiaEventDetail } from "@/lib/pokemon/pokopia/eventDetail";
import { fetchPokopiaGuideDetail, type PokopiaGuideDetail } from "@/lib/pokemon/pokopia/guideDetail";
import {
  fetchPokopiaPlannerBuildings,
  type PokopiaPlannerCatalogBuilding,
} from "@/lib/pokemon/pokopia/planner";
import {
  usePokopiaPlannerStore,
  type PokopiaPlannerZoneId,
} from "@/store/pokopiaPlannerStore";
import { usePokopiaDashboardOrderStore } from "@/store/pokopiaDashboardOrderStore";

type ListItem = {
  id: number;
  name: string;
  gameDexNumber: number;
  slug?: string;
  imageUrl?: string;
  description?: string;
  groupLabel?: string;
  badges?: PokopiaPokedexEntry["badges"];
};

type StatusFilter = "all" | "caught" | "shiny" | "alpha";

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export default function GameDexScreen() {
  const { id } = useLocalSearchParams<{ id: string; }>();
  const router = useRouter();

  const game = useMemo(() => (id ? getGameById(id) : null), [id]);
  const isPokopia = game?.id === "pokopia";
  const supportsShiny = !isPokopia;

  const supportsAlpha = useMemo(() => {
    if (!game) return false;
    return game.id.toLowerCase().includes("legends");
  }, [game]);

  const [items, setItems] = useState<ListItem[]>([]);
  const [habitats, setHabitats] = useState<PokopiaHabitat[]>([]);
  const [pokopiaItems, setPokopiaItems] = useState<PokopiaItem[]>([]);
  const [recipes, setRecipes] = useState<PokopiaRecipe[]>([]);
  const [abilities, setAbilities] = useState<PokopiaAbility[]>([]);
  const [specialties, setSpecialties] = useState<PokopiaSpecialty[]>([]);
  const [buildings, setBuildings] = useState<PokopiaBuilding[]>([]);
  const [plannerCatalogBuildings, setPlannerCatalogBuildings] = useState<PokopiaPlannerCatalogBuilding[]>([]);
  const [collectibles, setCollectibles] = useState<PokopiaCollectible[]>([]);
  const [cloudIslandsPage, setCloudIslandsPage] = useState<PokopiaCloudIslandsPage | null>(null);
  const [dreamIslandsPage, setDreamIslandsPage] = useState<PokopiaDreamIslandsPage | null>(null);
  const [eventsPage, setEventsPage] = useState<PokopiaEventsPage | null>(null);
  const [guidesPage, setGuidesPage] = useState<PokopiaGuidesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [habitatsLoading, setHabitatsLoading] = useState(false);
  const [habitatsError, setHabitatsError] = useState<string | null>(null);
  const [pokopiaItemsLoading, setPokopiaItemsLoading] = useState(false);
  const [pokopiaItemsError, setPokopiaItemsError] = useState<string | null>(null);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const [abilitiesError, setAbilitiesError] = useState<string | null>(null);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false);
  const [specialtiesError, setSpecialtiesError] = useState<string | null>(null);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [buildingsError, setBuildingsError] = useState<string | null>(null);
  const [collectiblesLoading, setCollectiblesLoading] = useState(false);
  const [collectiblesError, setCollectiblesError] = useState<string | null>(null);
  const [cloudIslandsLoading, setCloudIslandsLoading] = useState(false);
  const [cloudIslandsError, setCloudIslandsError] = useState<string | null>(null);
  const [dreamIslandsLoading, setDreamIslandsLoading] = useState(false);
  const [dreamIslandsError, setDreamIslandsError] = useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [guidesError, setGuidesError] = useState<string | null>(null);
  const [selectedDreamIslandSlug, setSelectedDreamIslandSlug] = useState<string | null>(null);
  const [selectedDreamIslandDetail, setSelectedDreamIslandDetail] = useState<PokopiaDreamIslandDetail | null>(null);
  const [selectedDreamIslandLoading, setSelectedDreamIslandLoading] = useState(false);
  const [selectedDreamIslandError, setSelectedDreamIslandError] = useState<string | null>(null);
  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState<PokopiaEventDetail | null>(null);
  const [selectedEventLoading, setSelectedEventLoading] = useState(false);
  const [selectedEventError, setSelectedEventError] = useState<string | null>(null);
  const [selectedGuideSlug, setSelectedGuideSlug] = useState<string | null>(null);
  const [selectedGuideDetail, setSelectedGuideDetail] = useState<PokopiaGuideDetail | null>(null);
  const [selectedGuideLoading, setSelectedGuideLoading] = useState(false);
  const [selectedGuideError, setSelectedGuideError] = useState<string | null>(null);
  const [selectedHabitat, setSelectedHabitat] = useState<PokopiaHabitat | null>(null);
  const [selectedHabitatDetail, setSelectedHabitatDetail] = useState<PokopiaHabitatDetail | null>(null);
  const [selectedHabitatLoading, setSelectedHabitatLoading] = useState(false);
  const [selectedHabitatError, setSelectedHabitatError] = useState<string | null>(null);
  const [selectedAbilitySlug, setSelectedAbilitySlug] = useState<string | null>(null);
  const [selectedAbilityDetail, setSelectedAbilityDetail] = useState<PokopiaAbilityDetail | null>(null);
  const [selectedAbilityLoading, setSelectedAbilityLoading] = useState(false);
  const [selectedAbilityError, setSelectedAbilityError] = useState<string | null>(null);
  const [selectedSpecialtySlug, setSelectedSpecialtySlug] = useState<string | null>(null);
  const [selectedSpecialtyDetail, setSelectedSpecialtyDetail] = useState<PokopiaSpecialtyDetail | null>(null);
  const [selectedSpecialtyLoading, setSelectedSpecialtyLoading] = useState(false);
  const [selectedSpecialtyError, setSelectedSpecialtyError] = useState<string | null>(null);
  const [selectedItemSlug, setSelectedItemSlug] = useState<string | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<PokopiaItemDetail | null>(null);
  const [selectedItemLoading, setSelectedItemLoading] = useState(false);
  const [selectedItemError, setSelectedItemError] = useState<string | null>(null);
  const [selectedBuildingSlug, setSelectedBuildingSlug] = useState<string | null>(null);
  const [selectedBuildingDetail, setSelectedBuildingDetail] = useState<PokopiaBuildingDetail | null>(null);
  const [selectedBuildingLoading, setSelectedBuildingLoading] = useState(false);
  const [selectedBuildingError, setSelectedBuildingError] = useState<string | null>(null);
  const [selectedCollectible, setSelectedCollectible] = useState<PokopiaCollectible | null>(null);
  const [selectedCollectibleDetail, setSelectedCollectibleDetail] = useState<PokopiaCollectibleDetail | null>(null);
  const [selectedCollectibleItemDetail, setSelectedCollectibleItemDetail] = useState<PokopiaItemDetail | null>(null);
  const [selectedCollectibleLoading, setSelectedCollectibleLoading] = useState(false);
  const [selectedCollectibleError, setSelectedCollectibleError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState<RecipeCategoryFilter>("All");
  const [selectedItemCategory, setSelectedItemCategory] = useState<ItemCategoryFilter>("All");
  const [selectedCollectibleCategory, setSelectedCollectibleCategory] = useState<CollectibleCategoryFilter>("All");
  const [selectedCollectibleSubcategory, setSelectedCollectibleSubcategory] = useState<CollectibleSubcategoryFilter>("All");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [collectibleSearch, setCollectibleSearch] = useState("");
  const [selectedInfoSection, setSelectedInfoSection] = useState<PokopiaInfoSection>("overview");
  const [selectedPlannerZoneId, setSelectedPlannerZoneId] = useState<PokopiaPlannerZoneId | null>(null);
  const [plannerBuildingPickerForId, setPlannerBuildingPickerForId] = useState<string | null>(null);
  const [plannerPokemonPickerTarget, setPlannerPokemonPickerTarget] = useState<PlannerPickerTarget | null>(null);
  const [plannerBuildingPickerTab, setPlannerBuildingPickerTab] = useState<PlannerBuildingPickerTab>("game");
  const [plannerSearch, setPlannerSearch] = useState("");
  const [plannerCustomBuildingName, setPlannerCustomBuildingName] = useState("");
  const [plannerCustomBuildingSlots, setPlannerCustomBuildingSlots] = useState(1);

  const entries = usePokemonCollectionStore((state) => state.entries);
  const getEntry = usePokemonCollectionStore((state) => state.getEntry);
  const toggleCaught = usePokemonCollectionStore((state) => state.toggleCaught);
  const toggleShiny = usePokemonCollectionStore((state) => state.toggleShiny);
  const toggleAlpha = usePokemonCollectionStore((state) => state.toggleAlpha);
  const plannerZones = usePokopiaPlannerStore((state) => state.zones);
  const setPlannerEnvironmentalLevel = usePokopiaPlannerStore((state) => state.setEnvironmentalLevel);
  const addPlannerBuilding = usePokopiaPlannerStore((state) => state.addBuilding);
  const removePlannerBuilding = usePokopiaPlannerStore((state) => state.removeBuilding);
  const setPlannerBuildingCatalogEntry = usePokopiaPlannerStore((state) => state.setBuildingCatalogEntry);
  const addPlannerPokemonToZone = usePokopiaPlannerStore((state) => state.addPokemonToZone);
  const removePlannerPokemonFromZone = usePokopiaPlannerStore((state) => state.removePokemonFromZone);
  const addPlannerPokemonToBuilding = usePokopiaPlannerStore((state) => state.addPokemonToBuilding);
  const removePlannerPokemonFromBuilding = usePokopiaPlannerStore((state) => state.removePokemonFromBuilding);
  const pokopiaDashboardOrder = usePokopiaDashboardOrderStore(
    (state) => state.orders["pokopia.dashboard"] as PokopiaSection[] | undefined
  );
  const setPokopiaDashboardOrder = usePokopiaDashboardOrderStore((state) => state.setOrder);

  useEffect(() => {
    setStatusFilter("all");
    setSelectedRecipeCategory("All");
    setSelectedItemCategory("All");
    setSelectedCollectibleCategory("All");
    setSelectedCollectibleSubcategory("All");
    setRecipeSearch("");
    setItemSearch("");
    setCollectibleSearch("");
    setSelectedInfoSection("overview");
    setSelectedPlannerZoneId(null);
    setPlannerBuildingPickerForId(null);
    setPlannerPokemonPickerTarget(null);
    setPlannerBuildingPickerTab("game");
    setPlannerSearch("");
    setPlannerCustomBuildingName("");
    setPlannerCustomBuildingSlots(1);
  }, [game?.id]);

  const filteredRecipes = useMemo(() => {
    const base =
      selectedRecipeCategory === "All"
        ? recipes
        : recipes.filter((recipe) => (recipe.category || "Other") === selectedRecipeCategory);
    const query = normalizeSearchValue(recipeSearch);
    const searched = !query
      ? base
      : base.filter((recipe) =>
          [recipe.name, recipe.description, recipe.meta, recipe.category, ...recipe.badges]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );

    return [...searched].sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes, selectedRecipeCategory, recipeSearch]);

  const filteredPokopiaItems = useMemo(() => {
    const base =
      selectedItemCategory === "All"
        ? pokopiaItems
        : pokopiaItems.filter((item) => (item.menuCategory || "Other") === selectedItemCategory);
    const query = normalizeSearchValue(itemSearch);
    const searched = !query
      ? base
      : base.filter((item) =>
          [
            item.name,
            item.description,
            item.menuCategory,
            item.sourceGroup,
            item.event,
            item.collectible,
            item.inventoryStatus,
            item.mosslax,
            ...item.sources,
            ...item.tags,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );

    return [...searched].sort((a, b) => a.name.localeCompare(b.name));
  }, [pokopiaItems, selectedItemCategory, itemSearch]);

  const filteredCollectibles = useMemo(() => {
    const normalizeGroup = (value: CollectibleCategoryFilter) => (value === "CDs" ? "Music CDs" : value);
    const byGroup =
      selectedCollectibleCategory === "All"
        ? collectibles
        : collectibles.filter((collectible) => collectible.groupLabel === normalizeGroup(selectedCollectibleCategory));

    const base =
      selectedCollectibleSubcategory === "All"
        ? byGroup
        : byGroup.filter((collectible) => collectible.menuCategory === selectedCollectibleSubcategory);
    const query = normalizeSearchValue(collectibleSearch);
    const searched = !query
      ? base
      : base.filter((collectible) =>
          [
            collectible.name,
            collectible.groupLabel,
            collectible.subgroupLabel,
            collectible.menuCategory,
            collectible.type,
            collectible.zone,
            collectible.unlock,
            collectible.inventoryStatus,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );

    return [...searched].sort((a, b) => a.name.localeCompare(b.name));
  }, [collectibles, selectedCollectibleCategory, selectedCollectibleSubcategory, collectibleSearch]);

  const collectibleSubcategoryFilters = useMemo(() => {
    if (selectedCollectibleCategory === "Artifacts") return ARTIFACT_COLLECTIBLE_SUBCATEGORY_FILTERS;
    if (selectedCollectibleCategory === "Records") return RECORD_COLLECTIBLE_SUBCATEGORY_FILTERS;
    return ["All"] as CollectibleSubcategoryFilter[];
  }, [selectedCollectibleCategory]);

  const selectedPlannerZone = selectedPlannerZoneId ? plannerZones[selectedPlannerZoneId] : null;

  const plannerBuildingResults = useMemo(() => {
    const query = plannerSearch.trim().toLowerCase();
    const base = [...plannerCatalogBuildings].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return base;
    return base.filter((building) => {
      const haystack = `${building.name} ${building.type || ""} ${building.occupants}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [plannerCatalogBuildings, plannerSearch]);

  const plannerPokemonResults = useMemo(() => {
    const query = plannerSearch.trim().toLowerCase();
    const base = [...items].sort((a, b) => a.gameDexNumber - b.gameDexNumber);
    const filtered = !query
      ? base
      : base.filter((pokemon) => {
          const haystack = `${pokemon.name} ${pokemon.gameDexNumber} ${pokemon.description || ""}`.toLowerCase();
          return haystack.includes(query);
        });
    return filtered.slice(0, 40);
  }, [items, plannerSearch]);

  const plannerAssignments = useMemo(() => {
    const assignments = new Map<
      number,
      {
        zoneId: PokopiaPlannerZoneId;
        zoneName: string;
        type: "zone" | "building";
        buildingId?: string;
        label: string;
      }
    >();

    Object.values(plannerZones).forEach((zone) => {
      zone.pokemon.forEach((pokemon) => {
        assignments.set(pokemon.speciesId, {
          zoneId: zone.id,
          zoneName: zone.name,
          type: "zone",
          label: `${zone.name}: No Building`,
        });
      });

      zone.buildings.forEach((building) => {
        building.pokemon.forEach((pokemon) => {
          assignments.set(pokemon.speciesId, {
            zoneId: zone.id,
            zoneName: zone.name,
            type: "building",
            buildingId: building.id,
            label: `${zone.name}: ${building.name}`,
          });
        });
      });
    });

    return assignments;
  }, [plannerZones]);

  useEffect(() => {
    setSelectedHabitat(null);
    setSelectedHabitatDetail(null);
    setSelectedHabitatError(null);
    setSelectedAbilitySlug(null);
    setSelectedAbilityDetail(null);
    setSelectedAbilityError(null);
    setSelectedSpecialtySlug(null);
    setSelectedSpecialtyDetail(null);
    setSelectedSpecialtyError(null);
    setSelectedItemSlug(null);
    setSelectedItemDetail(null);
    setSelectedItemError(null);
    setSelectedBuildingSlug(null);
    setSelectedBuildingDetail(null);
    setSelectedBuildingError(null);
    setSelectedCollectible(null);
    setSelectedCollectibleDetail(null);
    setSelectedCollectibleItemDetail(null);
    setSelectedCollectibleError(null);
  }, [game?.id]);

  useEffect(() => {
    setSelectedCollectibleSubcategory("All");
  }, [selectedCollectibleCategory]);

  useEffect(() => {
    setSelectedDreamIslandSlug(null);
    setSelectedDreamIslandDetail(null);
    setSelectedDreamIslandError(null);
    setSelectedEventSlug(null);
    setSelectedEventDetail(null);
    setSelectedEventError(null);
    setSelectedGuideSlug(null);
    setSelectedGuideDetail(null);
    setSelectedGuideError(null);
  }, [game?.id]);

  useEffect(() => {
    if (!game) return;

    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        if (isPokopia) {
          const pokopiaEntries = await fetchPokopiaPokedex();
          if (!isMounted) return;

          setItems(
            pokopiaEntries.map((entry: PokopiaPokedexEntry) => ({
              id: entry.id,
              name: entry.name,
              gameDexNumber: entry.dexNumber,
              slug: entry.slug,
              imageUrl: entry.imageUrl,
              description: entry.description,
              groupLabel: entry.groupLabel,
              badges: entry.badges,
            }))
          );
          return;
        }

        const ids = await fetchGameDexIds(game.id as GameId);

        const listRes: PokemonListResponse = await getPokemonList(2000, 0);
        const idToName = new Map<number, string>();

        listRes.results.forEach((p: PokemonListResult) => {
          const pid = extractPokemonIdFromUrl(p.url);
          if (pid != null) idToName.set(pid, p.name);
        });

        const mapped: ListItem[] = ids
          .map((pid, index) => {
            const name = idToName.get(pid);
            if (!name) return null;
            return { id: pid, name, gameDexNumber: index + 1 };
          })
          .filter(Boolean) as ListItem[];

        if (!isMounted) return;
        setItems(mapped);
      } catch (e) {
        console.error("Failed to fetch game dex list", e);
        if (isMounted) {
          setItems([]);
          setLoadError(
            e instanceof Error
              ? e.message
              : "Failed to load this game's available Pokemon."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [game, isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setHabitatsLoading(true);
        setHabitatsError(null);

        const nextHabitats = await fetchPokopiaHabitats();
        if (cancelled) return;
        setHabitats(nextHabitats);
      } catch (error) {
        if (cancelled) return;
        setHabitats([]);
        setHabitatsError(
          error instanceof Error
            ? error.message
            : "Failed to load Pokopia habitats."
        );
      } finally {
        if (!cancelled) setHabitatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!selectedDreamIslandSlug) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedDreamIslandLoading(true);
        setSelectedDreamIslandError(null);
        const detail = await fetchPokopiaDreamIslandDetail(selectedDreamIslandSlug);
        if (cancelled) return;
        setSelectedDreamIslandDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedDreamIslandDetail(null);
        setSelectedDreamIslandError(error instanceof Error ? error.message : "Failed to load dream island.");
      } finally {
        if (!cancelled) setSelectedDreamIslandLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDreamIslandSlug]);

  useEffect(() => {
    if (!selectedEventSlug) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedEventLoading(true);
        setSelectedEventError(null);
        const detail = await fetchPokopiaEventDetail(selectedEventSlug);
        if (cancelled) return;
        setSelectedEventDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedEventDetail(null);
        setSelectedEventError(error instanceof Error ? error.message : "Failed to load event.");
      } finally {
        if (!cancelled) setSelectedEventLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedEventSlug]);

  useEffect(() => {
    if (!selectedGuideSlug) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedGuideLoading(true);
        setSelectedGuideError(null);
        const detail = await fetchPokopiaGuideDetail(selectedGuideSlug);
        if (cancelled) return;
        setSelectedGuideDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedGuideDetail(null);
        setSelectedGuideError(error instanceof Error ? error.message : "Failed to load guide.");
      } finally {
        if (!cancelled) setSelectedGuideLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGuideSlug]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);
        const nextPage = await fetchPokopiaEvents();
        if (cancelled) return;
        setEventsPage(nextPage);
      } catch (error) {
        if (cancelled) return;
        setEventsPage(null);
        setEventsError(error instanceof Error ? error.message : "Failed to load events.");
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setGuidesLoading(true);
        setGuidesError(null);
        const nextPage = await fetchPokopiaGuides();
        if (cancelled) return;
        setGuidesPage(nextPage);
      } catch (error) {
        if (cancelled) return;
        setGuidesPage(null);
        setGuidesError(error instanceof Error ? error.message : "Failed to load guides.");
      } finally {
        if (!cancelled) setGuidesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setCloudIslandsLoading(true);
        setCloudIslandsError(null);
        const nextPage = await fetchPokopiaCloudIslands();
        if (cancelled) return;
        setCloudIslandsPage(nextPage);
      } catch (error) {
        if (cancelled) return;
        setCloudIslandsPage(null);
        setCloudIslandsError(error instanceof Error ? error.message : "Failed to load cloud islands.");
      } finally {
        if (!cancelled) setCloudIslandsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setDreamIslandsLoading(true);
        setDreamIslandsError(null);
        const nextPage = await fetchPokopiaDreamIslands();
        if (cancelled) return;
        setDreamIslandsPage(nextPage);
      } catch (error) {
        if (cancelled) return;
        setDreamIslandsPage(null);
        setDreamIslandsError(error instanceof Error ? error.message : "Failed to load dream islands.");
      } finally {
        if (!cancelled) setDreamIslandsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!selectedHabitat) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedHabitatLoading(true);
        setSelectedHabitatError(null);
        const detail = await fetchPokopiaHabitatDetail(selectedHabitat.slug, {
          isEvent: selectedHabitat.groupLabel === "Event Habitats",
        });
        if (cancelled) return;
        setSelectedHabitatDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedHabitatDetail(null);
        setSelectedHabitatError(error instanceof Error ? error.message : "Failed to load habitat.");
      } finally {
        if (!cancelled) setSelectedHabitatLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedHabitat]);

  useEffect(() => {
    if (!selectedAbilitySlug) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedAbilityLoading(true);
        setSelectedAbilityError(null);
        const detail = await fetchPokopiaAbilityDetail(selectedAbilitySlug);
        if (cancelled) return;
        setSelectedAbilityDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedAbilityDetail(null);
        setSelectedAbilityError(error instanceof Error ? error.message : "Failed to load ability.");
      } finally {
        if (!cancelled) setSelectedAbilityLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedAbilitySlug]);

  useEffect(() => {
    if (!selectedSpecialtySlug) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedSpecialtyLoading(true);
        setSelectedSpecialtyError(null);
        const detail = await fetchPokopiaSpecialtyDetail(selectedSpecialtySlug);
        if (cancelled) return;
        setSelectedSpecialtyDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedSpecialtyDetail(null);
        setSelectedSpecialtyError(error instanceof Error ? error.message : "Failed to load specialty.");
      } finally {
        if (!cancelled) setSelectedSpecialtyLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSpecialtySlug]);

  useEffect(() => {
    if (!selectedItemSlug) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedItemLoading(true);
        setSelectedItemError(null);
        const detail = await fetchPokopiaItemDetail(selectedItemSlug);
        if (cancelled) return;
        setSelectedItemDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedItemDetail(null);
        setSelectedItemError(error instanceof Error ? error.message : "Failed to load item.");
      } finally {
        if (!cancelled) setSelectedItemLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedItemSlug]);

  useEffect(() => {
    if (!selectedBuildingSlug) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedBuildingLoading(true);
        setSelectedBuildingError(null);
        const detail = await fetchPokopiaBuildingDetail(selectedBuildingSlug);
        if (cancelled) return;
        setSelectedBuildingDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedBuildingDetail(null);
        setSelectedBuildingError(error instanceof Error ? error.message : "Failed to load building.");
      } finally {
        if (!cancelled) setSelectedBuildingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedBuildingSlug]);

  useEffect(() => {
    if (!selectedCollectible) return;

    let cancelled = false;

    (async () => {
      try {
        setSelectedCollectibleLoading(true);
        setSelectedCollectibleError(null);
        setSelectedCollectibleDetail(null);
        setSelectedCollectibleItemDetail(null);

        if (selectedCollectible.detailKind === "item") {
          const itemSlug = selectedCollectible.detailPath.replace(/^\/items\//, "").split("?")[0];
          const detail = await fetchPokopiaItemDetail(itemSlug);
          if (cancelled) return;
          setSelectedCollectibleItemDetail(detail);
          return;
        }

        const detailSlug = selectedCollectible.detailPath.replace(/^\/collectibles\//, "").split("?")[0] || selectedCollectible.slug;
        const detail = await fetchPokopiaCollectibleDetail(detailSlug);
        if (cancelled) return;
        setSelectedCollectibleDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedCollectibleDetail(null);
        setSelectedCollectibleItemDetail(null);
        setSelectedCollectibleError(error instanceof Error ? error.message : "Failed to load collectible.");
      } finally {
        if (!cancelled) setSelectedCollectibleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCollectible]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setPokopiaItemsLoading(true);
        setPokopiaItemsError(null);

        const nextItems = await fetchPokopiaItems();
        if (cancelled) return;
        setPokopiaItems(nextItems);
      } catch (error) {
        if (cancelled) return;
        setPokopiaItems([]);
        setPokopiaItemsError(
          error instanceof Error
            ? error.message
            : "Failed to load Pokopia items."
        );
      } finally {
        if (!cancelled) setPokopiaItemsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setRecipesLoading(true);
        setRecipesError(null);

        const nextRecipes = await fetchPokopiaRecipes();
        if (cancelled) return;
        setRecipes(nextRecipes);
      } catch (error) {
        if (cancelled) return;
        setRecipes([]);
        setRecipesError(
          error instanceof Error
            ? error.message
            : "Failed to load Pokopia recipes."
        );
      } finally {
        if (!cancelled) setRecipesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setBuildingsLoading(true);
        setBuildingsError(null);

        const [nextBuildings, nextPlannerCatalogBuildings] = await Promise.all([
          fetchPokopiaBuildings(),
          fetchPokopiaPlannerBuildings(),
        ]);
        if (cancelled) return;
        setBuildings(nextBuildings);
        setPlannerCatalogBuildings(nextPlannerCatalogBuildings);
      } catch (error) {
        if (cancelled) return;
        setBuildings([]);
        setPlannerCatalogBuildings([]);
        setBuildingsError(
          error instanceof Error
            ? error.message
            : "Failed to load Pokopia buildings."
        );
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setCollectiblesLoading(true);
        setCollectiblesError(null);

        const nextCollectibles = await fetchPokopiaCollectibles();
        if (cancelled) return;
        setCollectibles(nextCollectibles);
      } catch (error) {
        if (cancelled) return;
        setCollectibles([]);
        setCollectiblesError(
          error instanceof Error
            ? error.message
            : "Failed to load Pokopia collectibles."
        );
      } finally {
        if (!cancelled) setCollectiblesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setAbilitiesLoading(true);
        setAbilitiesError(null);

        const nextAbilities = await fetchPokopiaAbilities();
        if (cancelled) return;
        setAbilities(nextAbilities);
      } catch (error) {
        if (cancelled) return;
        setAbilities([]);
        setAbilitiesError(
          error instanceof Error
            ? error.message
            : "Failed to load Pokopia abilities."
        );
      } finally {
        if (!cancelled) setAbilitiesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  useEffect(() => {
    if (!isPokopia) return;

    let cancelled = false;

    (async () => {
      try {
        setSpecialtiesLoading(true);
        setSpecialtiesError(null);

        const nextSpecialties = await fetchPokopiaSpecialties();
        if (cancelled) return;
        setSpecialties(nextSpecialties);
      } catch (error) {
        if (cancelled) return;
        setSpecialties([]);
        setSpecialtiesError(
          error instanceof Error
            ? error.message
            : "Failed to load Pokopia specialties."
        );
      } finally {
        if (!cancelled) setSpecialtiesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  const completion = useMemo(() => {
    if (!game) return { caught: 0, shiny: 0, alpha: 0, caughtPct: 0, shinyPct: 0, alphaPct: 0 };

    const prefix = `${game.id}:`;
    let caught = 0;
    let shiny = 0;
    let alpha = 0;

    Object.entries(entries).forEach(([key, entry]) => {
      if (!key.startsWith(prefix)) return;
      if (entry.caught) caught++;
      if (supportsShiny && entry.shiny) shiny++;
      if (supportsAlpha && entry.alpha) alpha++;
    });

    const total = items.length || 1;
    const caughtPct = Math.round((caught / total) * 100);
    const shinyPct = supportsShiny ? Math.round((shiny / total) * 100) : 0;
    const alphaPct = supportsAlpha ? Math.round((alpha / total) * 100) : 0;

    return { caught, shiny, alpha, caughtPct, shinyPct, alphaPct };
  }, [entries, game, items.length, supportsAlpha, supportsShiny]);

  const filteredItems = useMemo(() => {
    if (!game) return [];
    if (!supportsAlpha && statusFilter === "alpha") return items;
    if (!supportsShiny && statusFilter === "shiny") return items;
    if (statusFilter === "all") return items;

    return items.filter((item) => {
      const entry = getEntry(game.id, item.id);
      if (statusFilter === "caught") return entry.caught;
      if (statusFilter === "shiny") return supportsShiny && entry.shiny;
      if (statusFilter === "alpha") return supportsAlpha && entry.alpha;
      return true;
    });
  }, [items, statusFilter, game, getEntry, supportsAlpha, supportsShiny]);

  if (!game) {
    return (
      <PageWrapper title="Game Pokédex" headerLayout="inline">
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-200 font-semibold">Unknown game.</Text>
        </View>
      </PageWrapper>
    );
  }

  if (loading) {
    return (
      <PageWrapper
        title={game.title}
        subtitle={game.subtitle}
        headerLayout="inline"
        leftActions={
          <Text className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: game.accentColor[0] }}>
            {game.id === "pokopia" ? "Pokopia" : `Generation ${game.generationId}`}
          </Text>
        }
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="text-slate-300 mt-2 text-sm">Loading {game.title} Pokédex…</Text>
        </View>
      </PageWrapper>
    );
  }

  const renderItem = ({ item }: { item: ListItem; }) => {
    const entry = getEntry(game.id, item.id);

    return (
      <GameDexTile
        item={item}
        game={game}
        isPokopia={isPokopia}
        supportsShiny={supportsShiny}
        supportsAlpha={supportsAlpha}
        entry={entry}
        onOpen={() => {
          router.push({
            pathname: "/pokemon/[id]",
            params: {
              id: String(item.id),
              gameId: game.id,
              ...(isPokopia && item.slug ? { pokopiaSlug: item.slug } : null),
            },
          });
        }}
        onToggleCaught={() => toggleCaught(game.id, item.id)}
        onToggleShiny={() => toggleShiny(game.id, item.id)}
        onToggleAlpha={() => toggleAlpha(game.id, item.id)}
      />
    );
  };

  const StatusChip = ({ label, value }: { label: string; value: StatusFilter; }) => {
    const active = statusFilter === value;

    const config = {
      caught: { color: game.accentColor[0], icon: "pokeball" },
      shiny: { color: "#facc15", icon: AppImages.shinyPokemonIcon },
      alpha: { color: "#ef4444", icon: AppImages.alphaPokemonIcon },
      all: { color: "#94a3b8", icon: null } // Fallback for 'all'
    }[value] || { color: "#94a3b8", icon: null };

    if (value === "alpha" && !supportsAlpha) return null;

    return (
      <Pressable
        onPress={() => setStatusFilter(value)}
        className="h-8 px-3 rounded-lg mr-2 mb-2 flex-row items-center border"
        style={{
          backgroundColor: active ? `${config.color}20` : "transparent",
          borderColor: active ? config.color : "rgba(255,255,255,0.1)",
        }}
      >
        {value === "caught" && (
          <MaterialCommunityIcons name="pokeball" size={14} color={config.color} />
        )}
        {(value === "shiny" || value === "alpha") && (
          <LocalIcon
            source={config.icon as any}
            size={14}
            tintColor={config.color}
            roundedClassName="rounded-none"
            placeholderClassName="bg-transparent border-0"
          />
        )}

        <Text
          className={`text-[12px] font-medium ${value !== 'all' ? 'ml-1.5' : ''}`}
          style={{ color: active ? "#fff" : "rgba(255,255,255,0.6)" }}
        >
          {label}
        </Text>

        {active && (
          <View
            className="w-1 h-1 rounded-full ml-1.5"
            style={{ backgroundColor: config.color }}
          />
        )}
      </Pressable>
    );
  };

  const StatBar = ({
    label,
    value,
    total,
    pct,
    barColor,
  }: {
    label: string;
    value: number;
    total: number;
    pct: number;
    barColor: string;
  }) => (
    <View className="mb-1.5">
      <View className="flex-row justify-between mb-0.5">
        <Text className="text-[11px] text-slate-300">{label}</Text>
        <Text className="text-[11px] text-slate-400">
          {value} / {total} • {pct}%
        </Text>
      </View>
      <View className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
        <View style={{ width: `${pct}%`, backgroundColor: barColor }} className="h-1.5 rounded-full" />
      </View>
    </View>
  );

  const totalMon = items.length;
  const descriptionText = isPokopia
    ? `Explore Pokopia's custom sections and track dex progress.`
    : supportsAlpha
      ? `Track your ${game.title} Pokédex completion by caught, shiny, and alpha forms.`
      : `Track your ${game.title} Pokédex completion by caught and shiny forms.`;

  const coverStyle = getCoverArtStyle(game);
  const renderHabitatsContent = () => (
    <PokopiaHabitatsContent
      habitats={habitats}
      habitatsLoading={habitatsLoading}
      habitatsError={habitatsError}
      selectedHabitat={selectedHabitat}
      selectedHabitatDetail={selectedHabitatDetail}
      selectedHabitatLoading={selectedHabitatLoading}
      selectedHabitatError={selectedHabitatError}
      resolveSpeciesId={(pokemon) => {
        if (pokemon.dexNumber != null) return pokemon.dexNumber;

        const bySlug = items.find((item) => item.slug === pokemon.slug);
        if (bySlug) return bySlug.id;

        const normalizedName = pokemon.name.trim().toLowerCase();
        const byName = items.find((item) => item.name.trim().toLowerCase() === normalizedName);
        if (byName) return byName.id;

        return null;
      }}
      getCaughtState={(speciesId) => getEntry(game.id, speciesId).caught}
      onToggleCaughtPokemon={(speciesId) => toggleCaught(game.id, speciesId)}
      onSelectHabitat={setSelectedHabitat}
      onClearHabitat={() => {
        setSelectedHabitat(null);
        setSelectedHabitatDetail(null);
        setSelectedHabitatError(null);
      }}
    />
  );

  const renderItemsContent = () => (
    <PokopiaItemsContent
      filteredPokopiaItems={filteredPokopiaItems}
      pokopiaItemsLoading={pokopiaItemsLoading}
      pokopiaItemsError={pokopiaItemsError}
      selectedItemSlug={selectedItemSlug}
      selectedItemDetail={selectedItemDetail}
      selectedItemLoading={selectedItemLoading}
      selectedItemError={selectedItemError}
      selectedItemCategory={selectedItemCategory}
      itemSearch={itemSearch}
      onSelectItemCategory={setSelectedItemCategory}
      onChangeItemSearch={setItemSearch}
      onSelectItemSlug={setSelectedItemSlug}
      onClearSelectedItemDetail={() => setSelectedItemDetail(null)}
      onClearSelectedItemError={() => setSelectedItemError(null)}
    />
  );

  const renderCollectiblesContent = () => (
    <PokopiaCollectiblesContent
      filteredCollectibles={filteredCollectibles}
      collectiblesLoading={collectiblesLoading}
      collectiblesError={collectiblesError}
      selectedCollectible={selectedCollectible}
      selectedCollectibleDetail={selectedCollectibleDetail}
      selectedCollectibleItemDetail={selectedCollectibleItemDetail}
      selectedCollectibleLoading={selectedCollectibleLoading}
      selectedCollectibleError={selectedCollectibleError}
      selectedCollectibleCategory={selectedCollectibleCategory}
      selectedCollectibleSubcategory={selectedCollectibleSubcategory}
      collectibleSubcategoryFilters={collectibleSubcategoryFilters}
      collectibleSearch={collectibleSearch}
      onSelectCollectibleCategory={setSelectedCollectibleCategory}
      onSelectCollectibleSubcategory={setSelectedCollectibleSubcategory}
      onChangeCollectibleSearch={setCollectibleSearch}
      onSelectCollectible={setSelectedCollectible}
      onClearSelectedCollectibleDetail={() => setSelectedCollectibleDetail(null)}
      onClearSelectedCollectibleItemDetail={() => setSelectedCollectibleItemDetail(null)}
      onClearSelectedCollectibleError={() => setSelectedCollectibleError(null)}
    />
  );

  const renderInfoContent = () => (
    <PokopiaInfoContent
      selectedInfoSection={selectedInfoSection}
      onSelectInfoSection={setSelectedInfoSection}
      cloudIslandsPage={cloudIslandsPage}
      cloudIslandsLoading={cloudIslandsLoading}
      cloudIslandsError={cloudIslandsError}
      dreamIslandsPage={dreamIslandsPage}
      dreamIslandsLoading={dreamIslandsLoading}
      dreamIslandsError={dreamIslandsError}
      selectedDreamIslandSlug={selectedDreamIslandSlug}
      selectedDreamIslandDetail={selectedDreamIslandDetail}
      selectedDreamIslandLoading={selectedDreamIslandLoading}
      selectedDreamIslandError={selectedDreamIslandError}
      onSelectDreamIsland={setSelectedDreamIslandSlug}
      onClearDreamIsland={() => {
        setSelectedDreamIslandSlug(null);
        setSelectedDreamIslandDetail(null);
        setSelectedDreamIslandError(null);
      }}
      eventsPage={eventsPage}
      eventsLoading={eventsLoading}
      eventsError={eventsError}
      selectedEventSlug={selectedEventSlug}
      selectedEventDetail={selectedEventDetail}
      selectedEventLoading={selectedEventLoading}
      selectedEventError={selectedEventError}
      onSelectEvent={setSelectedEventSlug}
      onClearEvent={() => {
        setSelectedEventSlug(null);
        setSelectedEventDetail(null);
        setSelectedEventError(null);
      }}
      guidesPage={guidesPage}
      guidesLoading={guidesLoading}
      guidesError={guidesError}
      selectedGuideSlug={selectedGuideSlug}
      selectedGuideDetail={selectedGuideDetail}
      selectedGuideLoading={selectedGuideLoading}
      selectedGuideError={selectedGuideError}
      onSelectGuide={setSelectedGuideSlug}
      onClearGuide={() => {
        setSelectedGuideSlug(null);
        setSelectedGuideDetail(null);
        setSelectedGuideError(null);
      }}
    />
  );

  const renderDexTiles = () => (
    <View className="px-2 pt-2">
      <View className="flex-row flex-wrap">
        {filteredItems.map((item) => (
          <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>
        ))}
      </View>

      {filteredItems.length === 0 ? (
        <View className="mt-10 items-center">
          <Text className="text-sm text-slate-400">No Pokémon match this filter yet.</Text>
        </View>
      ) : null}
    </View>
  );

  const renderPlannerContent = () => (
    <PokopiaPlannerContent
      selectedPlannerZoneId={selectedPlannerZoneId}
      selectedPlannerZone={selectedPlannerZone}
      plannerZones={plannerZones}
      plannerBuildingPickerForId={plannerBuildingPickerForId}
      plannerPokemonPickerTarget={plannerPokemonPickerTarget}
      plannerBuildingPickerTab={plannerBuildingPickerTab}
      plannerSearch={plannerSearch}
      plannerCustomBuildingName={plannerCustomBuildingName}
      plannerCustomBuildingSlots={plannerCustomBuildingSlots}
      plannerBuildingResults={plannerBuildingResults}
      plannerPokemonResults={plannerPokemonResults}
      plannerAssignments={plannerAssignments}
      onSelectPlannerZone={setSelectedPlannerZoneId}
      onSetPlannerBuildingPickerForId={setPlannerBuildingPickerForId}
      onSetPlannerPokemonPickerTarget={setPlannerPokemonPickerTarget}
      onSetPlannerBuildingPickerTab={setPlannerBuildingPickerTab}
      onSetPlannerSearch={setPlannerSearch}
      onSetPlannerCustomBuildingName={setPlannerCustomBuildingName}
      onSetPlannerCustomBuildingSlots={setPlannerCustomBuildingSlots}
      setPlannerEnvironmentalLevel={setPlannerEnvironmentalLevel}
      addPlannerBuilding={addPlannerBuilding}
      removePlannerBuilding={removePlannerBuilding}
      setPlannerBuildingCatalogEntry={setPlannerBuildingCatalogEntry}
      addPlannerPokemonToZone={addPlannerPokemonToZone}
      removePlannerPokemonFromZone={removePlannerPokemonFromZone}
      addPlannerPokemonToBuilding={addPlannerPokemonToBuilding}
      removePlannerPokemonFromBuilding={removePlannerPokemonFromBuilding}
    />
  );

  const renderRecipesContent = () => (
    <PokopiaRecipesContent
      filteredRecipes={filteredRecipes}
      recipesLoading={recipesLoading}
      recipesError={recipesError}
      selectedRecipeCategory={selectedRecipeCategory}
      recipeSearch={recipeSearch}
      onSelectRecipeCategory={setSelectedRecipeCategory}
      onChangeRecipeSearch={setRecipeSearch}
    />
  );

  const renderAbilitiesContent = () => (
    <PokopiaAbilitiesContent
      abilities={abilities}
      abilitiesLoading={abilitiesLoading}
      abilitiesError={abilitiesError}
      selectedAbilitySlug={selectedAbilitySlug}
      selectedAbilityDetail={selectedAbilityDetail}
      selectedAbilityLoading={selectedAbilityLoading}
      selectedAbilityError={selectedAbilityError}
      onSelectAbilitySlug={setSelectedAbilitySlug}
      onClearSelectedAbilityDetail={() => setSelectedAbilityDetail(null)}
      onClearSelectedAbilityError={() => setSelectedAbilityError(null)}
    />
  );

  const renderSpecialtiesContent = () => (
    <PokopiaSpecialtiesContent
      specialties={specialties}
      specialtiesLoading={specialtiesLoading}
      specialtiesError={specialtiesError}
      selectedSpecialtySlug={selectedSpecialtySlug}
      selectedSpecialtyDetail={selectedSpecialtyDetail}
      selectedSpecialtyLoading={selectedSpecialtyLoading}
      selectedSpecialtyError={selectedSpecialtyError}
      onSelectSpecialtySlug={setSelectedSpecialtySlug}
      onClearSelectedSpecialtyDetail={() => setSelectedSpecialtyDetail(null)}
      onClearSelectedSpecialtyError={() => setSelectedSpecialtyError(null)}
    />
  );

  const renderBuildingsContent = () => (
    <PokopiaBuildingsContent
      buildings={buildings}
      buildingsLoading={buildingsLoading}
      buildingsError={buildingsError}
      selectedBuildingSlug={selectedBuildingSlug}
      selectedBuildingDetail={selectedBuildingDetail}
      selectedBuildingLoading={selectedBuildingLoading}
      selectedBuildingError={selectedBuildingError}
      onSelectBuildingSlug={setSelectedBuildingSlug}
      onClearSelectedBuildingDetail={() => setSelectedBuildingDetail(null)}
      onClearSelectedBuildingError={() => setSelectedBuildingError(null)}
    />
  );

  const renderDexContent = (options?: { nestedInDashboard?: boolean }) => (
    <View className="flex-1">
      <View className="mt-3 rounded-3xl bg-slate-950/90 border border-slate-800 overflow-hidden">
        <View className="flex-row p-3">
          {game.coverImageUrl ? (
            <View className="mr-3 rounded-2xl overflow-hidden" style={[{ alignSelf: "center" }, coverStyle]}>
              <ExpoImage
                source={{ uri: game.coverImageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                transition={120}
                cachePolicy="disk"
              />
            </View>
          ) : null}

          <View className="flex-1 justify-between">
            <View>
              <View className="flex-row flex-wrap mb-1">
                <View className="px-2 py-0.5 rounded-full mr-1 mb-1" style={{ backgroundColor: `${game.accentColor[0]}22` }}>
                  <Text className="text-[10px] font-semibold tracking-wide" style={{ color: game.accentColor[0] }}>
                    {game.id === "pokopia" ? "POKOPIA" : `GEN ${game.generationId}`}
                  </Text>
                </View>

                {game.releaseYear && (
                  <View className="px-2 py-0.5 rounded-full mr-1 mb-1 bg-slate-900 border border-slate-700">
                    <Text className="text-[10px] text-slate-300">{game.releaseYear}</Text>
                  </View>
                )}

                {typeof game.speciesCount === "number" && (
                  <View className="px-2 py-0.5 rounded-full mr-1 mb-1 bg-slate-900 border border-slate-700">
                    <Text className="text-[10px] text-slate-300">{game.speciesCount} species</Text>
                  </View>
                )}
              </View>

              {game.platforms?.length ? (
                <View className="flex-row flex-wrap mb-1">
                  {game.platforms.map((platform) => (
                    <View
                      key={platform}
                      className="px-2 py-0.5 rounded-full mr-1 mb-1 bg-slate-900/80 border border-slate-700/80"
                    >
                      <Text className="text-[10px] text-slate-300">{platform}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text className="text-[12px] text-slate-300" numberOfLines={2}>
                {descriptionText}
              </Text>
            </View>

            <View className="mt-2">
              <Text className="text-[11px] font-semibold text-slate-300 mb-1">Completion</Text>
              <StatBar label="Caught" value={completion.caught} total={totalMon} pct={completion.caughtPct} barColor={game.accentColor[0]} />
              {supportsShiny ? (
                <StatBar label="Shiny" value={completion.shiny} total={totalMon} pct={completion.shinyPct} barColor="#facc15" />
              ) : null}
              {supportsAlpha && <StatBar label="Alpha" value={completion.alpha} total={totalMon} pct={completion.alphaPct} barColor="#38bdf8" />}
            </View>
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap justify-center items-center">
        <StatusChip label="All" value="all" />
        <StatusChip label="Caught" value="caught" />
        {supportsShiny ? <StatusChip label="Shiny" value="shiny" /> : null}
        {supportsAlpha && <StatusChip label="Alpha" value="alpha" />}
      </View>

      {loadError ? (
        <View className="mt-4 mx-2 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-amber-200">Dex roster unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-amber-100/90">
            {loadError}
          </Text>
        </View>
      ) : null}

      {options?.nestedInDashboard ? (
        renderDexTiles()
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          numColumns={2}
          ListEmptyComponent={
            <View className="mt-10 items-center">
              <Text className="text-sm text-slate-400">No Pokémon match this filter yet.</Text>
            </View>
          }
          contentContainerStyle={{
            paddingHorizontal: 8,
            paddingBottom: 24,
            paddingTop: 8,
          }}
        />
      )}
    </View>
  );

  const pokopiaCategories: DashboardCategory<PokopiaSection>[] = !isPokopia
    ? []
    : POKOPIA_SECTION_CARDS.map((section) => ({
      key: section.id,
      title: section.title,
      subtitle: section.subtitle,
      shown:
        section.id === "dex"
          ? filteredItems.length
          : section.id === "habitats"
            ? habitats.length
            : section.id === "items"
              ? pokopiaItems.length
              : section.id === "recipes"
                ? recipes.length
            : section.id === "abilities"
              ? abilities.length
              : section.id === "specialties"
                ? specialties.length
                : section.id === "buildings"
                  ? buildings.length
                  : section.id === "collectibles"
                    ? collectibles.length
                    : section.id === "info"
                      ? POKOPIA_INFO_CARDS.length
                      : section.id === "planner"
                        ? POKOPIA_PLANNER_ZONES.length
            : section.count,
      total:
        section.id === "dex"
          ? totalMon
          : section.id === "habitats"
            ? habitats.length || section.count
            : section.id === "items"
              ? pokopiaItems.length || section.count
              : section.id === "recipes"
                ? recipes.length || section.count
            : section.id === "abilities"
              ? abilities.length || section.count
              : section.id === "specialties"
                ? specialties.length || section.count
                : section.id === "buildings"
                  ? buildings.length || section.count
                  : section.id === "collectibles"
                    ? collectibles.length || section.count
                    : section.id === "info"
                      ? POKOPIA_INFO_CARDS.length
                      : section.id === "planner"
                        ? POKOPIA_PLANNER_ZONES.length
            : section.count,
      items:
        section.id === "dex"
          ? filteredItems
          : section.id === "habitats"
            ? habitats
            : section.id === "items"
              ? pokopiaItems
              : section.id === "recipes"
                ? recipes
            : section.id === "abilities"
              ? abilities
              : section.id === "specialties"
                ? specialties
                : section.id === "buildings"
                  ? buildings
                  : section.id === "collectibles"
                    ? collectibles
                    : section.id === "info"
                      ? POKOPIA_INFO_CARDS
                      : section.id === "planner"
                        ? POKOPIA_PLANNER_ZONES
            : [
              { name: `${section.title} index` },
              { name: "Browse entries" },
              { name: "Open section" },
            ],
      previewItems:
        section.id === "dex"
          ? filteredItems.slice(0, 6).map((item) => ({ name: capitalize(item.name) }))
          : section.id === "habitats"
            ? habitats.slice(0, 6).map((habitat) => ({ name: habitat.name }))
            : section.id === "items"
              ? pokopiaItems.slice(0, 6).map((item) => ({ name: item.name }))
              : section.id === "recipes"
                ? recipes.slice(0, 6).map((recipe) => ({ name: recipe.name }))
            : section.id === "abilities"
              ? abilities.slice(0, 6).map((ability) => ({ name: ability.name }))
              : section.id === "specialties"
                ? specialties.slice(0, 6).map((specialty) => ({ name: specialty.name }))
                : section.id === "buildings"
                  ? buildings.slice(0, 6).map((building) => ({ name: building.name }))
                  : section.id === "collectibles"
                    ? collectibles.slice(0, 6).map((collectible) => ({ name: collectible.name }))
                    : section.id === "info"
                      ? POKOPIA_INFO_CARDS.map((item) => ({ name: item.title }))
                      : section.id === "planner"
                        ? POKOPIA_PLANNER_ZONES.map((item) => ({ name: item.title }))
            : [
              { name: `${section.title} index` },
              { name: "Browse entries" },
              { name: "Open section" },
            ],
      render: () =>
        section.id === "dex"
          ? renderDexContent({ nestedInDashboard: true })
          : section.id === "habitats"
            ? renderHabitatsContent()
            : section.id === "items"
              ? renderItemsContent()
              : section.id === "recipes"
                ? renderRecipesContent()
            : section.id === "abilities"
              ? renderAbilitiesContent()
              : section.id === "specialties"
                ? renderSpecialtiesContent()
                : section.id === "buildings"
                  ? renderBuildingsContent()
                  : section.id === "collectibles"
                    ? renderCollectiblesContent()
                    : section.id === "info"
                      ? renderInfoContent()
                      : renderPlannerContent(),
    }));

  return (
    <PageWrapper
      title={game.title}
      subtitle={game.subtitle}
      leftActions={
        <Text className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: game.accentColor[0] }}>
          {game.id === "pokopia" ? "Pokopia" : `Generation ${game.generationId}`}
        </Text>
      }
    >
      {isPokopia ? (
        <PalworldDashboardGrid
          search=""
          totalShown={pokopiaCategories.reduce((sum, category) => sum + category.shown, 0)}
          totalAll={pokopiaCategories.reduce((sum, category) => sum + category.total, 0)}
          categories={pokopiaCategories}
          reorderEnabled
          order={pokopiaDashboardOrder}
          defaultOrder={POKOPIA_SECTION_CARDS.map((section) => section.id)}
          onOrderChange={(order) => setPokopiaDashboardOrder("pokopia.dashboard", order)}
        />
      ) : (
        renderDexContent()
      )}
    </PageWrapper>
  );
}
