// app/game/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

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
import GameDexTile from "@/components/Pokemon/GameDex/gameDexTile";
import GameDexContent from "@/components/Pokemon/GameDex/GameDexContent";
import { capitalize } from "@/components/Pokemon/GameDex/gameDexHelpers";
import PalworldDashboardGrid, { type DashboardCategory } from "@/components/Palworld/PalworldDashboardGrid";
import PokopiaCollectiblesContent from "@/components/Pokemon/PokopiaGame/PokopiaCollectiblesContent";
import PokopiaBuildingsContent from "@/components/Pokemon/PokopiaGame/PokopiaBuildingsContent";
import PokopiaHabitatsContent from "@/components/Pokemon/PokopiaGame/PokopiaHabitatsContent";
import PokopiaInfoContent from "@/components/Pokemon/PokopiaGame/PokopiaInfoContent";
import PokopiaItemsContent from "@/components/Pokemon/PokopiaGame/PokopiaItemsContent";
import PokopiaPlannerContent from "@/components/Pokemon/PokopiaGame/PokopiaPlannerContent";
import PokopiaRecipesContent from "@/components/Pokemon/PokopiaGame/PokopiaRecipesContent";
import PokopiaThemesContent from "@/components/Pokemon/PokopiaGame/PokopiaThemesContent";
import PokopiaTraitsContent from "@/components/Pokemon/PokopiaGame/PokopiaTraitsContent";
import PokopiaDailyChecklist from "@/components/Pokemon/PokopiaGame/PokopiaDailyChecklist";
import BuildPokopiaDashboardCategories from "@/components/Pokemon/PokopiaGame/BuildPokopiaDashboardCategories";
import usePokopiaGameData from "@/components/Pokemon/PokopiaGame/usePokopiaGameData";
import {
  POKOPIA_EFFECTS,
  POKOPIA_FAVORITES,
  POKOPIA_SECTION_CARDS,
  type PokopiaSection,
} from "@/components/Pokemon/PokopiaGame/config";
import { fetchPokopiaPokedex, type PokopiaPokedexEntry } from "@/lib/pokemon/pokopia/pokedex";
import { usePokopiaPlannerStore } from "@/store/pokopiaPlannerStore";
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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
    (state) => state.orders["pokopia.dashboard"] as string[] | undefined
  );
  const setPokopiaDashboardOrder = usePokopiaDashboardOrderStore((state) => state.setOrder);

  const {
    habitats,
    pokopiaItems,
    recipes,
    abilities,
    specialties,
    buildings,
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
  } = usePokopiaGameData({
    isPokopia,
    gameId: game?.id,
    items,
    plannerZones,
  });

  useEffect(() => {
    setStatusFilter("all");
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

  const themePreviewItems = useMemo(
    () => [
      ...POKOPIA_FAVORITES.map((favorite) => ({ name: favorite.label })),
      ...POKOPIA_EFFECTS.map((effect) => ({ name: effect.label })),
      ...((foodPage?.flavors ?? []).map((flavor) => ({ name: flavor.label }))),
    ],
    [foodPage]
  );

  const normalizedPokopiaDashboardOrder = !pokopiaDashboardOrder?.length
    ? undefined
    : Array.from(
        new Set(
          pokopiaDashboardOrder.flatMap((key) => {
            if (key === "favorites" || key === "food") return ["themes"];
            if (key === "abilities" || key === "specialties") return ["traits"];
            return [key];
          })
        )
      ).filter((key): key is PokopiaSection =>
        POKOPIA_SECTION_CARDS.some((section) => section.id === key)
      );

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

  const renderThemesContent = () => (
    <PokopiaThemesContent
      foodPage={foodPage}
      foodLoading={foodLoading}
      foodError={foodError}
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

  const renderTraitsContent = () => (
    <PokopiaTraitsContent
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

  const pokopiaCategories: DashboardCategory<PokopiaSection>[] = !isPokopia
    ? []
    : BuildPokopiaDashboardCategories({
        filteredItems: filteredItems.map((item) => ({ ...item, name: capitalize(item.name) })),
        habitats,
        themeItems: themePreviewItems,
        pokopiaItems,
        recipes,
        traitItems: [...abilities, ...specialties],
        buildings,
        collectibles,
        totalMon: items.length,
        renderDexContent: () => (
          <GameDexContent
            game={game}
            isPokopia={isPokopia}
            supportsShiny={supportsShiny}
            supportsAlpha={supportsAlpha}
            loading={loading}
            loadError={loadError}
            items={items}
            filteredItems={filteredItems}
            completion={completion}
            statusFilter={statusFilter}
            onChangeStatusFilter={setStatusFilter}
            renderItem={renderItem}
            nestedInDashboard
          />
        ),
        renderHabitatsContent,
        renderThemesContent,
        renderItemsContent,
        renderRecipesContent,
        renderTraitsContent,
        renderBuildingsContent,
        renderCollectiblesContent,
        renderInfoContent,
        renderPlannerContent,
      });

  const pokopiaDashboardLoading =
    loading ||
    habitatsLoading ||
    foodLoading ||
    pokopiaItemsLoading ||
    recipesLoading ||
    abilitiesLoading ||
    specialtiesLoading ||
    buildingsLoading ||
    collectiblesLoading ||
    dreamIslandsLoading ||
    cloudIslandsLoading ||
    eventsLoading ||
    guidesLoading;

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
          isLoading={pokopiaDashboardLoading}
          loadingLabel="Loading Pokopia sections…"
          reorderEnabled
          order={normalizedPokopiaDashboardOrder}
          defaultOrder={POKOPIA_SECTION_CARDS.map((section) => section.id)}
          onOrderChange={(order) => setPokopiaDashboardOrder("pokopia.dashboard", order)}
          topContent={<PokopiaDailyChecklist />}
        />
      ) : (
        <GameDexContent
          game={game}
          isPokopia={isPokopia}
          supportsShiny={supportsShiny}
          supportsAlpha={supportsAlpha}
          loading={loading}
          loadError={loadError}
          items={items}
          filteredItems={filteredItems}
          completion={completion}
          statusFilter={statusFilter}
          onChangeStatusFilter={setStatusFilter}
          renderItem={renderItem}
        />
      )}
    </PageWrapper>
  );
}
