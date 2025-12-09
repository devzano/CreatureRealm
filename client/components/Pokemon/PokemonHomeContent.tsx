// components/Pokemon/PokemonHomeContent.tsx
import React, { useMemo, useState, useRef } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import PageWrapper from "@/components/PageWrapper";

// Map modals (barrel export)
import {
  LumioseMapModal,
  ObsidianFieldlandsMapModal,
  CobaltCoastlandsMapModal,
  CrimsonMirelandsMapModal,
  AncientRetreatMapModal,
  JubilifeVillageMapModal,
  AlabasterIcelandsMapModal,
  CoronetHighlandsMapModal,
  PaldeaRegionMapModal,
  KitakamiRegionMapModal,
  IndigoDiskMapModal,
  TorchlitLabyrinthMapModal,
  ChargestoneCavernMapModal,
  GrandUndergroundMapModal,
} from "@/components/Pokemon/PokemonMaps";

// National Dex content
import PokemonNationalDex, {
  type DexViewMode,
} from "@/components/Pokemon/PokemonNationalDex";

import MapCard from "./PokemonMaps/MapCard";
import { games } from "@/lib/data/pokemon/gameFilters";

type PokemonHomeContentProps = {
  onBackToCollections: () => void;
};

const NATIONAL_VIEW_MODE: DexViewMode = "national";

type MapGameKey = "za" | "la" | "sv" | "bdsp";

type MapCardConfig = React.ComponentProps<typeof MapCard> & {
  id: string;
  gameKey: MapGameKey;
};

type ActiveTab = "dex" | "maps" | "games";

const PokemonHomeContent: React.FC<PokemonHomeContentProps> = ({
  onBackToCollections,
}) => {
  const router = useRouter();

  // Scroll + index refs for Games tab
  const gamesScrollRef = useRef<ScrollView | null>(null);
  const generationOffsetsRef = useRef<Record<number, number>>({});

  // Scroll + index refs for Maps tab
  const mapsScrollRef = useRef<ScrollView | null>(null);
  const mapGroupOffsetsRef = useRef<Record<string, number>>({});

  const [activeTab, setActiveTab] = useState<ActiveTab>("dex");

  // Map modal visibility
  const [showLumioseMap, setShowLumioseMap] = useState(false);
  const [showObsidianMap, setShowObsidianMap] = useState(false);
  const [showCobaltMap, setShowCobaltMap] = useState(false);
  const [showCrimsonMap, setShowCrimsonMap] = useState(false);
  const [showAncientRetreatMap, setShowAncientRetreatMap] = useState(false);
  const [showJubilifeMap, setShowJubilifeMap] = useState(false);
  const [showAlabasterMap, setShowAlabasterMap] = useState(false);
  const [showCoronetMap, setShowCoronetMap] = useState(false);

  const [showPaldeaMap, setShowPaldeaMap] = useState(false);
  const [showKitakamiMap, setShowKitakamiMap] = useState(false);
  const [showIndigoDiskMap, setShowIndigoDiskMap] = useState(false);
  const [showTorchlitLabyrinthMap, setShowTorchlitLabyrinthMap] =
    useState(false);
  const [showChargestoneCavernMap, setShowChargestoneCavernMap] =
    useState(false);
  const [showGrandUndergroundMap, setShowGrandUndergroundMap] =
    useState(false);

  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case "dex":
        return "National Pokédex";
      case "maps":
        return "Interactive Maps";
      case "games":
        return "Game Pokédexes";
      default:
        return "CreatureRealm • Pokémon";
    }
  }, [activeTab]);

  const pageSubtitle = useMemo(() => {
    switch (activeTab) {
      case "dex":
        return "Browse every Pokémon by National Dex number.";
      case "maps":
        return "Explore full region maps powered by GamerGuides.com.";
      case "games":
        return "Pick a specific game to view its in-game Pokédex and completion.";
      default:
        return "";
    }
  }, [activeTab]);

  // All map cards defined as data so search can filter & group them
  const mapCards: MapCardConfig[] = [
    // --- Kalos / Z-A ---
    {
      id: "lumiose",
      gameKey: "za",
      onPress: () => setShowLumioseMap(true),
      title: "Lumiose City – Interactive Map",
      subtitle: "Full-screen web map for Pokémon Legends: Z-A.",
      tagLabel: "Region",
      tagValue: "Kalos • Lumiose City",
      iconType: "mci",
      iconName: "city-variant-outline",
      iconColor: "#38bdf8",
      iconSize: 22,
      borderColorClass: "border-sky-700/70",
      iconBgClass: "bg-sky-500/20 border-sky-500/60",
      infoIconName: "map-search-outline",
      infoText:
        "Explore districts, landmarks, and key story locations across Lumiose City.",
      badgeBgClass: "bg-sky-500/15",
      badgeBorderClass: "border-sky-500/60",
      badgeTextClass: "text-sky-300",
    },

    // --- Hisui (Legends: Arceus) ---
    {
      id: "obsidian",
      gameKey: "la",
      onPress: () => setShowObsidianMap(true),
      title: "Obsidian Fieldlands – Interactive Map",
      subtitle: "Full-screen web map for Pokémon Legends: Arceus.",
      tagLabel: "Region",
      tagValue: "Hisui • Obsidian Fieldlands",
      iconType: "mci",
      iconName: "map",
      iconColor: "#34d399",
      iconSize: 22,
      borderColorClass: "border-emerald-700/70",
      iconBgClass: "bg-emerald-500/15 border-emerald-500/50",
      infoIconName: "pine-tree",
      infoText:
        "Track alpha spawns, research points, and key locations in the Obsidian Fieldlands.",
      badgeBgClass: "bg-emerald-500/15",
      badgeBorderClass: "border-emerald-500/60",
      badgeTextClass: "text-emerald-300",
    },
    {
      id: "cobalt",
      gameKey: "la",
      onPress: () => setShowCobaltMap(true),
      title: "Cobalt Coastlands – Interactive Map",
      subtitle: "Full-screen web map for Pokémon Legends: Arceus.",
      tagLabel: "Region",
      tagValue: "Hisui • Cobalt Coastlands",
      iconType: "mci",
      iconName: "waves",
      iconColor: "#38bdf8",
      iconSize: 22,
      borderColorClass: "border-sky-700/70",
      iconBgClass: "bg-sky-500/15 border-sky-500/50",
      infoIconName: "map-search-outline",
      infoText:
        "Explore coastal caves, beaches, and sea-side encounter spots.",
      badgeBgClass: "bg-sky-500/15",
      badgeBorderClass: "border-sky-500/60",
      badgeTextClass: "text-sky-300",
    },
    {
      id: "crimson",
      gameKey: "la",
      onPress: () => setShowCrimsonMap(true),
      title: "Crimson Mirelands – Interactive Map",
      subtitle: "Full-screen web map for Pokémon Legends: Arceus.",
      tagLabel: "Region",
      tagValue: "Hisui • Crimson Mirelands",
      iconType: "mci",
      iconName: "water",
      iconColor: "#fb7185",
      iconSize: 22,
      borderColorClass: "border-rose-700/70",
      iconBgClass: "bg-rose-500/15 border-rose-500/50",
      infoIconName: "water-outline",
      infoText:
        "Navigate marshlands, poison swamps, and rare spawn areas.",
      badgeBgClass: "bg-rose-500/15",
      badgeBorderClass: "border-rose-500/60",
      badgeTextClass: "text-rose-300",
    },
    {
      id: "coronet",
      gameKey: "la",
      onPress: () => setShowCoronetMap(true),
      title: "Coronet Highlands – Interactive Map",
      subtitle: "Full-screen web map for Pokémon Legends: Arceus.",
      tagLabel: "Region",
      tagValue: "Hisui • Coronet Highlands",
      iconType: "fa6",
      iconName: "mountain-city",
      iconColor: "#a5b4fc",
      iconSize: 19,
      borderColorClass: "border-indigo-700/70",
      iconBgClass: "bg-indigo-500/15 border-indigo-500/50",
      infoIconName: "map-marker-path",
      infoText:
        "Plan routes through cliffs, caves, and summit paths.",
      badgeBgClass: "bg-indigo-500/15",
      badgeBorderClass: "border-indigo-500/60",
      badgeTextClass: "text-indigo-200",
    },
    {
      id: "alabaster",
      gameKey: "la",
      onPress: () => setShowAlabasterMap(true),
      title: "Alabaster Icelands – Interactive Map",
      subtitle: "Full-screen web map for Pokémon Legends: Arceus.",
      tagLabel: "Region",
      tagValue: "Hisui • Alabaster Icelands",
      iconType: "mci",
      iconName: "snowflake",
      iconColor: "#67e8f9",
      iconSize: 22,
      borderColorClass: "border-cyan-700/70",
      iconBgClass: "bg-cyan-500/15 border-cyan-500/50",
      infoIconName: "map-legend",
      infoText:
        "Locate icy caves, frozen lakes, and rare icy encounter spots.",
      badgeBgClass: "bg-cyan-500/15",
      badgeBorderClass: "border-cyan-500/60",
      badgeTextClass: "text-cyan-200",
    },
    {
      id: "jubilife",
      gameKey: "la",
      onPress: () => setShowJubilifeMap(true),
      title: "Jubilife Village – Interactive Map",
      subtitle: "Full-screen web map for Pokémon Legends: Arceus.",
      tagLabel: "Hub",
      tagValue: "Hisui • Jubilife Village",
      iconType: "mci",
      iconName: "home-city-outline",
      iconColor: "#fbbf24",
      iconSize: 22,
      borderColorClass: "border-amber-700/70",
      iconBgClass: "bg-amber-500/15 border-amber-500/50",
      infoIconName: "storefront",
      infoText:
        "Quickly find shops, facilities, and key NPC locations in the village hub.",
      badgeBgClass: "bg-amber-500/15",
      badgeBorderClass: "border-amber-500/60",
      badgeTextClass: "text-amber-200",
    },
    // Ancient Retreat exists as a modal; you can add a card later when you want.

    // --- Paldea: Scarlet & Violet base game ---
    {
      id: "paldea-region",
      gameKey: "sv",
      onPress: () => setShowPaldeaMap(true),
      title: "Paldea Region – Interactive Map",
      subtitle: "Pokémon Scarlet & Violet",
      tagLabel: "Region",
      tagValue: "Paldea • Mainland Region",
      iconType: "mci",
      iconName: "map-legend",
      iconColor: "#c4b5fd",
      iconSize: 22,
      borderColorClass: "border-violet-700/70",
      iconBgClass: "bg-violet-500/15 border-violet-500/50",
      infoIconName: "map-search-outline",
      infoText:
        "Zoom across Paldea to find story paths, gyms, Titan routes, and key landmarks.",
      badgeBgClass: "bg-violet-500/15",
      badgeBorderClass: "border-violet-500/60",
      badgeTextClass: "text-violet-200",
    },

    // --- The Teal Mask DLC: Kitakami ---
    {
      id: "kitakami-region",
      gameKey: "sv",
      onPress: () => setShowKitakamiMap(true),
      title: "Kitakami Region – Interactive Map",
      subtitle: "The Teal Mask DLC • Pokémon Scarlet & Violet",
      tagLabel: "Region",
      tagValue: "Kitakami • Oni Mountain & beyond",
      iconType: "mci",
      iconName: "pine-tree",
      iconColor: "#4ade80",
      iconSize: 22,
      borderColorClass: "border-emerald-700/70",
      iconBgClass: "bg-emerald-500/15 border-emerald-500/50",
      infoIconName: "map-marker-path",
      infoText:
        "Track Kitakami landmarks, encounters, and key story locations from The Teal Mask DLC.",
      badgeBgClass: "bg-emerald-500/15",
      badgeBorderClass: "border-emerald-500/60",
      badgeTextClass: "text-emerald-300",
    },

    // --- The Indigo Disk DLC: Blueberry Academy ---
    {
      id: "indigo-disk",
      gameKey: "sv",
      onPress: () => setShowIndigoDiskMap(true),
      title: "Blueberry Academy Region – Interactive Map",
      subtitle: "The Indigo Disk DLC • Pokémon Scarlet & Violet",
      tagLabel: "Region",
      tagValue: "Blueberry Academy • Terarium",
      iconType: "mci",
      iconName: "school-outline",
      iconColor: "#38bdf8",
      iconSize: 22,
      borderColorClass: "border-sky-700/70",
      iconBgClass: "bg-sky-500/15 border-sky-500/50",
      infoIconName: "map-search-outline",
      infoText:
        "Explore the Terarium’s themed biomes, facilities, and Indigo Disk side content.",
      badgeBgClass: "bg-sky-500/15",
      badgeBorderClass: "border-sky-500/60",
      badgeTextClass: "text-sky-300",
    },

    // --- Paldea side areas ---
    {
      id: "torchlit-labyrinth",
      gameKey: "sv",
      onPress: () => setShowTorchlitLabyrinthMap(true),
      title: "Torchlit Labyrinth – Interactive Map",
      subtitle: "Pokémon Scarlet & Violet",
      tagLabel: "Area",
      tagValue: "Paldea • Torchlit Labyrinth",
      iconType: "mci",
      iconName: "torch",
      iconColor: "#f97316",
      iconSize: 22,
      borderColorClass: "border-orange-700/70",
      iconBgClass: "bg-orange-500/15 border-orange-500/50",
      infoIconName: "map-marker-path",
      infoText:
        "Navigate the Torchlit Labyrinth and keep track of side paths and hidden spots.",
      badgeBgClass: "bg-orange-500/15",
      badgeBorderClass: "border-orange-500/60",
      badgeTextClass: "text-orange-200",
    },
    {
      id: "chargestone-cavern",
      gameKey: "sv",
      onPress: () => setShowChargestoneCavernMap(true),
      title: "Chargestone Cavern – Interactive Map",
      subtitle: "Pokémon Scarlet & Violet",
      tagLabel: "Area",
      tagValue: "Paldea • Chargestone Cavern",
      iconType: "mci",
      iconName: "flash",
      iconColor: "#facc15",
      iconSize: 22,
      borderColorClass: "border-yellow-700/70",
      iconBgClass: "bg-yellow-500/15 border-yellow-500/50",
      infoIconName: "map",
      infoText:
        "Plan your route through Chargestone Cavern, tracking items, trainers, and encounters.",
      badgeBgClass: "bg-yellow-500/15",
      badgeBorderClass: "border-yellow-500/60",
      badgeTextClass: "text-yellow-200",
    },

    // --- Sinnoh: BDSP Grand Underground ---
    {
      id: "grand-underground",
      gameKey: "bdsp",
      onPress: () => setShowGrandUndergroundMap(true),
      title: "Grand Underground – Interactive Map",
      subtitle: "Pokémon Brilliant Diamond & Shining Pearl",
      tagLabel: "Region",
      tagValue: "Sinnoh • Grand Underground",
      iconType: "mci",
      iconName: "tunnel-outline",
      iconColor: "#f472b6",
      iconSize: 22,
      borderColorClass: "border-pink-700/70",
      iconBgClass: "bg-pink-500/15 border-pink-500/50",
      infoIconName: "map-search-outline",
      infoText:
        "Explore hideaways, tunnels, and digging spots across the Grand Underground.",
      badgeBgClass: "bg-pink-500/15",
      badgeBorderClass: "border-pink-500/60",
      badgeTextClass: "text-pink-200",
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
  }, [mapCards, normalizedSearch]);

  // Maps grouped by game for sections + right index
  const mapSections = useMemo(() => {
    const groups: Record<MapGameKey, MapCardConfig[]> = {
      za: [],
      la: [],
      sv: [],
      bdsp: [],
    };

    filteredMapCards.forEach((card) => {
      groups[card.gameKey].push(card);
    });

    const meta: Record<
      MapGameKey,
      { title: string; subtitle: string; shortLabel: string }
    > = {
      za: {
        title: "Pokémon Legends: Z-A",
        subtitle: "Kalos • Lumiose City",
        shortLabel: "Z-A",
      },
      la: {
        title: "Pokémon Legends: Arceus",
        subtitle: "Hisui • Fieldlands, Highlands, Village & more",
        shortLabel: "PLA",
      },
      sv: {
        title: "Pokémon Scarlet & Violet",
        subtitle: "Paldea • Mainland, Kitakami, Terarium & side areas",
        shortLabel: "SV",
      },
      bdsp: {
        title: "Brilliant Diamond & Shining Pearl",
        subtitle: "Sinnoh • Grand Underground",
        shortLabel: "BDSP",
      },
    };

    const order: MapGameKey[] = ["za", "la", "sv", "bdsp"];

    return order
      .filter((key) => groups[key].length > 0)
      .map((key) => ({
        key,
        title: meta[key].title,
        subtitle: meta[key].subtitle,
        shortLabel: meta[key].shortLabel,
        cards: groups[key],
      }));
  }, [filteredMapCards]);

  // Games list, filtered by search
  const filteredGames = useMemo(() => {
    if (!normalizedSearch) return games;

    return games.filter((game) => {
      const haystack = (
        game.title +
        " " +
        (game.subtitle ?? "") +
        " " +
        `generation ${game.generationId}` +
        " " +
        (Array.isArray(game.shortCode)
          ? game.shortCode.join(" ")
          : game.shortCode ?? "")
      )
        .toString()
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch]);

  // Group filtered games into sections by generation for the index
  const generationSections = useMemo(() => {
    const map: Record<string, any[]> = {};

    filteredGames.forEach((game) => {
      const genKey = String((game as any).generationId ?? "0");
      if (!map[genKey]) map[genKey] = [];
      map[genKey].push(game);
    });

    return Object.entries(map)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([gen, sectionGames]) => ({
        generation: Number(gen),
        games: sectionGames,
      }));
  }, [filteredGames]);

  const scrollToGeneration = (generation: number) => {
    const y = generationOffsetsRef.current[generation];
    if (y != null && gamesScrollRef.current) {
      gamesScrollRef.current.scrollTo({
        y: Math.max(y - 40, 0),
        animated: true,
      });
    }
  };

  const scrollToMapGroup = (groupKey: MapGameKey) => {
    const y = mapGroupOffsetsRef.current[groupKey];
    if (y != null && mapsScrollRef.current) {
      mapsScrollRef.current.scrollTo({
        y: Math.max(y - 40, 0),
        animated: true,
      });
    }
  };

  return (
    <>
      <PageWrapper
        hideBackButton
        title={pageTitle}
        subtitle={pageSubtitle}
        leftActions={
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            CreatureRealm • Pokémon
          </Text>
        }
        rightActions={
          <Pressable
            onPress={onBackToCollections}
            className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700"
          >
            <Text className="text-[11px] text-slate-300 font-semibold">
              Change Collection
            </Text>
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
                activeTab === "maps"
                  ? "Search maps (region, area, town…)"
                  : activeTab === "games"
                  ? "Search games (title, gen, short code…)"
                  : "Search Pokémon (name or number…)"
              }
              placeholderTextColor="#6B7280"
              className="flex-1 ml-2 text-[13px] text-slate-100"
            />

            {/* Clear (X) button inside search bar */}
            {search.trim().length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                hitSlop={10}
                className="ml-1 rounded-full p-1 bg-slate-800/80"
              >
                <Feather name="x" size={14} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Sub-tabs: Maps / Games / Dex */}
          <View className="flex-row items-center rounded-full bg-slate-900/80 border border-slate-700 p-1 mt-2">
            {/* <Pressable
              onPress={() => setActiveTab("maps")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
                activeTab === "maps" ? "bg-slate-800" : ""
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  activeTab === "maps" ? "text-slate-50" : "text-slate-400"
                }`}
              >
                Maps
              </Text>
            </Pressable> */}

            <Pressable
              onPress={() => setActiveTab("dex")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
                activeTab === "dex" ? "bg-slate-800" : ""
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  activeTab === "dex" ? "text-slate-50" : "text-slate-400"
                }`}
              >
                Full Dex
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("games")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
                activeTab === "games" ? "bg-slate-800" : ""
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  activeTab === "games" ? "text-slate-50" : "text-slate-400"
                }`}
              >
                Games
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content by sub-tab */}
        {activeTab === "maps" && (
          <View className="flex-1" style={{ position: "relative" }}>
            <ScrollView
              ref={mapsScrollRef}
              contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 70 }}
            >
              <View className="w-full">
                {filteredMapCards.length === 0 ? (
                  <View className="mt-6 items-center">
                    <Text className="text-sm text-slate-400 text-center px-4">
                      No maps match this search yet. Try searching by region,
                      game, or area name.
                    </Text>
                  </View>
                ) : (
                  mapSections.map((section) => (
                    <View
                      key={section.key}
                      onLayout={(e) => {
                        mapGroupOffsetsRef.current[section.key] =
                          e.nativeEvent.layout.y;
                      }}
                      className="mb-3"
                    >
                      {/* Section header */}
                      <View className="flex-row items-center mb-1 px-1 mt-2">
                        <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
                        <View className="flex-1">
                          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {section.title}
                          </Text>
                          <Text className="text-[11px] text-slate-500 mt-0.5">
                            {section.subtitle}
                          </Text>
                        </View>
                      </View>

                      {section.cards.map((card) => (
                        <MapCard key={card.id} {...card} />
                      ))}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Map game index on the right side */}
            {mapSections.length > 0 && (
              <View
                pointerEvents="box-none"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 4,
                  bottom: 16,
                  justifyContent: "center",
                  paddingRight: 2,
                }}
              >
                <View
                  style={{
                    alignSelf: "flex-end",
                    paddingVertical: 4,
                    paddingHorizontal: 4,
                    borderRadius: 999,
                    backgroundColor: "rgba(15,23,42,0.96)", // slate-900-ish
                    borderWidth: 1,
                    borderColor: "rgba(51,65,85,1)", // slate-600
                  }}
                >
                  {mapSections.map((section) => (
                    <Pressable
                      key={section.key}
                      onPress={() =>
                        scrollToMapGroup(section.key as MapGameKey)
                      }
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 6,
                        alignItems: "center",
                      }}
                    >
                      <Text className="text-[10px] text-slate-400">
                        {section.shortLabel}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === "games" && (
          <View className="flex-1" style={{ position: "relative" }}>
            <ScrollView
              ref={gamesScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 70 }}
            >
              <View className="w-full">
                {/* Tiny spacer/header row (kept minimal now that X is in the search bar) */}
                <View className="mt-1 mb-1 px-1" />

                {filteredGames.length === 0 ? (
                  <View className="mt-6 items-center">
                    <Text className="text-sm text-slate-400 text-center px-4">
                      No games match this search. Try searching by title,
                      generation, or short code.
                    </Text>
                  </View>
                ) : (
                  generationSections.map((section) => (
                    <View
                      key={section.generation}
                      // Capture Y-offset for this generation section
                      onLayout={(e) => {
                        generationOffsetsRef.current[section.generation] =
                          e.nativeEvent.layout.y;
                      }}
                      className="mb-2"
                    >
                      {/* Section header */}
                      <View className="flex-row items-center mb-1 px-1 mt-2">
                        <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
                        <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Generation {section.generation}
                        </Text>
                      </View>

                      {section.games.map((game: any) => {
                        const accent = Array.isArray(game.accentColor)
                          ? game.accentColor[0]
                          : game.accentColor ?? "#38bdf8";

                        const speciesCount =
                          (game as any).speciesCount ?? undefined;

                        return (
                          <Pressable
                            key={game.id}
                            onPress={() =>
                              router.push({
                                pathname: "/game/[id]",
                                params: { id: game.id },
                              })
                            }
                            className="rounded-3xl bg-slate-950/80 border mb-3 overflow-hidden"
                            style={{
                              borderColor: accent,
                            }}
                          >
                            {/* Top row: title + CTA */}
                            <View className="flex-row items-center px-4 pt-3 pb-2">
                              <View className="flex-1">
                                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  Gen {game.generationId}
                                </Text>
                                <Text className="text-[15px] font-semibold text-slate-50 mt-0.5">
                                  {game.title}
                                </Text>
                                {game.subtitle ? (
                                  <Text className="text-[12px] text-slate-400 mt-0.5">
                                    {game.subtitle}
                                  </Text>
                                ) : null}
                              </View>

                              <View className="items-end ml-3">
                                <View className="flex-row items-center px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700">
                                  <Text className="text-[10px] font-semibold text-slate-200 mr-1">
                                    View Pokédex
                                  </Text>
                                  <Feather
                                    name="chevron-right"
                                    size={14}
                                    color="#E5E7EB"
                                  />
                                </View>
                                {speciesCount ? (
                                  <Text className="text-[11px] text-slate-400 mt-1">
                                    {speciesCount} species
                                  </Text>
                                ) : null}
                              </View>
                            </View>

                            {/* Meta + tags row */}
                            <View className="px-4 pb-3 pt-1 border-t border-slate-800/80 bg-slate-950/80">
                              <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                  <View
                                    className="w-1.5 h-6 rounded-full mr-2"
                                    style={{ backgroundColor: accent }}
                                  />
                                  <Text className="text-[11px] text-slate-400">
                                    Generation{" "}
                                    <Text className="text-slate-200 font-semibold">
                                      {game.generationId}
                                    </Text>
                                    {speciesCount ? (
                                      <>
                                        {" • "}
                                        <Text className="text-slate-200 font-semibold">
                                          {speciesCount}
                                        </Text>{" "}
                                        species
                                      </>
                                    ) : null}
                                  </Text>
                                </View>
                              </View>

                              {Array.isArray(game.shortCode) &&
                              game.shortCode.length > 0 ? (
                                <View className="flex-row flex-wrap mt-2 -mr-1">
                                  {game.shortCode.map((code: string) => (
                                    <View
                                      key={code}
                                      className="px-2 py-1 rounded-full bg-slate-900/90 border border-slate-700 mr-2 mt-1"
                                    >
                                      <Text className="text-[10px] text-slate-300">
                                        {code}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Generation index on the right side */}
            {generationSections.length > 0 && (
              <View
                pointerEvents="box-none"
                style={{
                  position: "absolute",
                  right: 0,
                  top: 4,
                  bottom: 16,
                  justifyContent: "center",
                  paddingRight: 2,
                }}
              >
                <View
                  style={{
                    alignSelf: "flex-end",
                    paddingVertical: 4,
                    paddingHorizontal: 4,
                    borderRadius: 999,
                    backgroundColor: "rgba(15,23,42,0.96)", // slate-900-ish
                    borderWidth: 1,
                    borderColor: "rgba(51,65,85,1)", // slate-600
                  }}
                >
                  {generationSections.map((section) => (
                    <Pressable
                      key={section.generation}
                      onPress={() => scrollToGeneration(section.generation)}
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 6,
                        alignItems: "center",
                      }}
                    >
                      <Text className="text-[10px] text-slate-400">
                        {section.generation}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === "dex" && (
          <View className="flex-1 mt-2">
            <PokemonNationalDex
              search={search}
              from={undefined}
              to={undefined}
              viewMode={NATIONAL_VIEW_MODE}
            />
          </View>
        )}
      </PageWrapper>

      {/* Map modals */}
      <LumioseMapModal
        visible={showLumioseMap}
        onClose={() => setShowLumioseMap(false)}
      />
      <ObsidianFieldlandsMapModal
        visible={showObsidianMap}
        onClose={() => setShowObsidianMap(false)}
      />
      <CobaltCoastlandsMapModal
        visible={showCobaltMap}
        onClose={() => setShowCobaltMap(false)}
      />
      <CrimsonMirelandsMapModal
        visible={showCrimsonMap}
        onClose={() => setShowCrimsonMap(false)}
      />
      <CoronetHighlandsMapModal
        visible={showCoronetMap}
        onClose={() => setShowCoronetMap(false)}
      />
      <AlabasterIcelandsMapModal
        visible={showAlabasterMap}
        onClose={() => setShowAlabasterMap(false)}
      />
      <JubilifeVillageMapModal
        visible={showJubilifeMap}
        onClose={() => setShowJubilifeMap(false)}
      />
      <AncientRetreatMapModal
        visible={showAncientRetreatMap}
        onClose={() => setShowAncientRetreatMap(false)}
      />

      <PaldeaRegionMapModal
        visible={showPaldeaMap}
        onClose={() => setShowPaldeaMap(false)}
      />
      <KitakamiRegionMapModal
        visible={showKitakamiMap}
        onClose={() => setShowKitakamiMap(false)}
      />
      <IndigoDiskMapModal
        visible={showIndigoDiskMap}
        onClose={() => setShowIndigoDiskMap(false)}
      />
      <TorchlitLabyrinthMapModal
        visible={showTorchlitLabyrinthMap}
        onClose={() => setShowTorchlitLabyrinthMap(false)}
      />
      <ChargestoneCavernMapModal
        visible={showChargestoneCavernMap}
        onClose={() => setShowChargestoneCavernMap(false)}
      />
      <GrandUndergroundMapModal
        visible={showGrandUndergroundMap}
        onClose={() => setShowGrandUndergroundMap(false)}
      />
    </>
  );
};

export default PokemonHomeContent;
