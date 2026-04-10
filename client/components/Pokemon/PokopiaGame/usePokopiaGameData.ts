import { useEffect, useMemo, useState } from "react";

import {
  ARTIFACT_COLLECTIBLE_SUBCATEGORY_FILTERS,
  RECORD_COLLECTIBLE_SUBCATEGORY_FILTERS,
  type CollectibleCategoryFilter,
  type CollectibleSubcategoryFilter,
  type ItemCategoryFilter,
  type PlannerBuildingPickerTab,
  type PlannerPickerTarget,
  type PokopiaInfoSection,
  type RecipeCategoryFilter,
} from "./config";
import { fetchPokopiaHabitats, type PokopiaHabitat } from "@/lib/pokemon/pokopia/habitats";
import { fetchPokopiaHabitatDetail, type PokopiaHabitatDetail } from "@/lib/pokemon/pokopia/habitatDetail";
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
import { fetchPokopiaFoodPage, type PokopiaFoodPage } from "@/lib/pokemon/pokopia/food";
import {
  fetchPokopiaPlannerBuildings,
  type PokopiaPlannerCatalogBuilding,
} from "@/lib/pokemon/pokopia/planner";
import type { PokopiaPlannerZoneId, PokopiaPlannerZone } from "@/store/pokopiaPlannerStore";

type ListItem = {
  id: number;
  name: string;
  gameDexNumber: number;
  slug?: string;
  imageUrl?: string;
  description?: string;
  groupLabel?: string;
};

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

type Params = {
  isPokopia: boolean;
  gameId?: string;
  items: ListItem[];
  plannerZones: Record<PokopiaPlannerZoneId, PokopiaPlannerZone>;
};

export default function usePokopiaGameData({
  isPokopia,
  gameId,
  items,
  plannerZones,
}: Params) {
  const [habitats, setHabitats] = useState<PokopiaHabitat[]>([]);
  const [pokopiaItems, setPokopiaItems] = useState<PokopiaItem[]>([]);
  const [recipes, setRecipes] = useState<PokopiaRecipe[]>([]);
  const [abilities, setAbilities] = useState<PokopiaAbility[]>([]);
  const [specialties, setSpecialties] = useState<PokopiaSpecialty[]>([]);
  const [buildings, setBuildings] = useState<PokopiaBuilding[]>([]);
  const [plannerCatalogBuildings, setPlannerCatalogBuildings] = useState<PokopiaPlannerCatalogBuilding[]>([]);
  const [collectibles, setCollectibles] = useState<PokopiaCollectible[]>([]);
  const [foodPage, setFoodPage] = useState<PokopiaFoodPage | null>(null);
  const [cloudIslandsPage, setCloudIslandsPage] = useState<PokopiaCloudIslandsPage | null>(null);
  const [dreamIslandsPage, setDreamIslandsPage] = useState<PokopiaDreamIslandsPage | null>(null);
  const [eventsPage, setEventsPage] = useState<PokopiaEventsPage | null>(null);
  const [guidesPage, setGuidesPage] = useState<PokopiaGuidesPage | null>(null);

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
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodError, setFoodError] = useState<string | null>(null);
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
  const [selectedFoodItemSlug, setSelectedFoodItemSlug] = useState<string | null>(null);
  const [selectedFoodItemDetail, setSelectedFoodItemDetail] = useState<PokopiaItemDetail | null>(null);
  const [selectedFoodItemLoading, setSelectedFoodItemLoading] = useState(false);
  const [selectedFoodItemError, setSelectedFoodItemError] = useState<string | null>(null);

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

  useEffect(() => {
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
  }, [gameId]);

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
  }, [gameId]);

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
  }, [gameId]);

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
        setHabitatsError(error instanceof Error ? error.message : "Failed to load Pokopia habitats.");
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
    if (!selectedFoodItemSlug) return;
    let cancelled = false;
    (async () => {
      try {
        setSelectedFoodItemLoading(true);
        setSelectedFoodItemError(null);
        const detail = await fetchPokopiaItemDetail(selectedFoodItemSlug);
        if (cancelled) return;
        setSelectedFoodItemDetail(detail);
      } catch (error) {
        if (cancelled) return;
        setSelectedFoodItemDetail(null);
        setSelectedFoodItemError(error instanceof Error ? error.message : "Failed to load food item.");
      } finally {
        if (!cancelled) setSelectedFoodItemLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFoodItemSlug]);

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

        const detailSlug =
          selectedCollectible.detailPath.replace(/^\/collectibles\//, "").split("?")[0] ||
          selectedCollectible.slug;
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
        setFoodLoading(true);
        setFoodError(null);
        const nextPage = await fetchPokopiaFoodPage();
        if (cancelled) return;
        setFoodPage(nextPage);
      } catch (error) {
        if (cancelled) return;
        setFoodPage(null);
        setFoodError(error instanceof Error ? error.message : "Failed to load Pokopia food.");
      } finally {
        if (!cancelled) setFoodLoading(false);
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
        setPokopiaItemsLoading(true);
        setPokopiaItemsError(null);
        const nextItems = await fetchPokopiaItems();
        if (cancelled) return;
        setPokopiaItems(nextItems);
      } catch (error) {
        if (cancelled) return;
        setPokopiaItems([]);
        setPokopiaItemsError(error instanceof Error ? error.message : "Failed to load Pokopia items.");
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
        setRecipesError(error instanceof Error ? error.message : "Failed to load Pokopia recipes.");
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
        setBuildingsError(error instanceof Error ? error.message : "Failed to load Pokopia buildings.");
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
        setCollectiblesError(error instanceof Error ? error.message : "Failed to load Pokopia collectibles.");
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
        setAbilitiesError(error instanceof Error ? error.message : "Failed to load Pokopia abilities.");
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
        setSpecialtiesError(error instanceof Error ? error.message : "Failed to load Pokopia specialties.");
      } finally {
        if (!cancelled) setSpecialtiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPokopia]);

  return {
    habitats,
    pokopiaItems,
    recipes,
    abilities,
    specialties,
    buildings,
    plannerCatalogBuildings,
    collectibles,
    foodPage,
    cloudIslandsPage,
    dreamIslandsPage,
    eventsPage,
    guidesPage,
    habitatsLoading,
    habitatsError,
    pokopiaItemsLoading,
    pokopiaItemsError,
    recipesLoading,
    recipesError,
    abilitiesLoading,
    abilitiesError,
    specialtiesLoading,
    specialtiesError,
    buildingsLoading,
    buildingsError,
    collectiblesLoading,
    collectiblesError,
    foodLoading,
    foodError,
    cloudIslandsLoading,
    cloudIslandsError,
    dreamIslandsLoading,
    dreamIslandsError,
    eventsLoading,
    eventsError,
    guidesLoading,
    guidesError,
    selectedDreamIslandSlug,
    setSelectedDreamIslandSlug,
    selectedDreamIslandDetail,
    setSelectedDreamIslandDetail,
    selectedDreamIslandLoading,
    selectedDreamIslandError,
    setSelectedDreamIslandError,
    selectedEventSlug,
    setSelectedEventSlug,
    selectedEventDetail,
    setSelectedEventDetail,
    selectedEventLoading,
    selectedEventError,
    setSelectedEventError,
    selectedGuideSlug,
    setSelectedGuideSlug,
    selectedGuideDetail,
    setSelectedGuideDetail,
    selectedGuideLoading,
    selectedGuideError,
    setSelectedGuideError,
    selectedHabitat,
    setSelectedHabitat,
    selectedHabitatDetail,
    setSelectedHabitatDetail,
    selectedHabitatLoading,
    selectedHabitatError,
    setSelectedHabitatError,
    selectedAbilitySlug,
    setSelectedAbilitySlug,
    selectedAbilityDetail,
    setSelectedAbilityDetail,
    selectedAbilityLoading,
    selectedAbilityError,
    setSelectedAbilityError,
    selectedSpecialtySlug,
    setSelectedSpecialtySlug,
    selectedSpecialtyDetail,
    setSelectedSpecialtyDetail,
    selectedSpecialtyLoading,
    selectedSpecialtyError,
    setSelectedSpecialtyError,
    selectedItemSlug,
    setSelectedItemSlug,
    selectedItemDetail,
    setSelectedItemDetail,
    selectedItemLoading,
    selectedItemError,
    setSelectedItemError,
    selectedBuildingSlug,
    setSelectedBuildingSlug,
    selectedBuildingDetail,
    setSelectedBuildingDetail,
    selectedBuildingLoading,
    selectedBuildingError,
    setSelectedBuildingError,
    selectedCollectible,
    setSelectedCollectible,
    selectedCollectibleDetail,
    setSelectedCollectibleDetail,
    selectedCollectibleItemDetail,
    setSelectedCollectibleItemDetail,
    selectedCollectibleLoading,
    selectedCollectibleError,
    setSelectedCollectibleError,
    selectedFoodItemSlug,
    setSelectedFoodItemSlug,
    selectedFoodItemDetail,
    setSelectedFoodItemDetail,
    selectedFoodItemLoading,
    selectedFoodItemError,
    setSelectedFoodItemError,
    selectedRecipeCategory,
    setSelectedRecipeCategory,
    selectedItemCategory,
    setSelectedItemCategory,
    selectedCollectibleCategory,
    setSelectedCollectibleCategory,
    selectedCollectibleSubcategory,
    setSelectedCollectibleSubcategory,
    recipeSearch,
    setRecipeSearch,
    itemSearch,
    setItemSearch,
    collectibleSearch,
    setCollectibleSearch,
    selectedInfoSection,
    setSelectedInfoSection,
    selectedPlannerZoneId,
    setSelectedPlannerZoneId,
    plannerBuildingPickerForId,
    setPlannerBuildingPickerForId,
    plannerPokemonPickerTarget,
    setPlannerPokemonPickerTarget,
    plannerBuildingPickerTab,
    setPlannerBuildingPickerTab,
    plannerSearch,
    setPlannerSearch,
    plannerCustomBuildingName,
    setPlannerCustomBuildingName,
    plannerCustomBuildingSlots,
    setPlannerCustomBuildingSlots,
    filteredRecipes,
    filteredPokopiaItems,
    filteredCollectibles,
    collectibleSubcategoryFilters,
    selectedPlannerZone,
    plannerBuildingResults,
    plannerPokemonResults,
    plannerAssignments,
  };
}
