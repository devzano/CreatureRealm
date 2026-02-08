// components/Pokemon/PokemonMapsTab.tsx
import React, { useMemo, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import MapCard from "../MapCard";
import { Image as ExpoImage } from "expo-image";
import LocalIcon from "@/components/LocalIcon";

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
import AppImages from "@/constants/images";

type MapGameKey = "za" | "la" | "sv" | "bdsp";

type MapCardConfig = React.ComponentProps<typeof MapCard> & {
  id: string;
  gameKey: MapGameKey;
};

type PokemonMapsTabProps = {
  search: string;
};

export default function PokemonMapsTab({ search }: PokemonMapsTabProps) {
  const mapsScrollRef = useRef<ScrollView | null>(null);
  const mapGroupOffsetsRef = useRef<Record<string, number>>({});

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
  const [showTorchlitLabyrinthMap, setShowTorchlitLabyrinthMap] = useState(false);
  const [showChargestoneCavernMap, setShowChargestoneCavernMap] = useState(false);
  const [showGrandUndergroundMap, setShowGrandUndergroundMap] = useState(false);

  const normalizedSearch = (search ?? "").trim().toLowerCase();

  const mapCards: MapCardConfig[] = useMemo(
    () => [
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
        infoText: "Explore districts, landmarks, and key story locations across Lumiose City.",
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
        infoText: "Track alpha spawns, research points, and key locations in the Obsidian Fieldlands.",
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
        infoText: "Explore coastal caves, beaches, and sea-side encounter spots.",
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
        infoText: "Navigate marshlands, poison swamps, and rare spawn areas.",
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
        infoText: "Plan routes through cliffs, caves, and summit paths.",
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
        infoText: "Locate icy caves, frozen lakes, and rare icy encounter spots.",
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
        infoText: "Quickly find shops, facilities, and key NPC locations in the village hub.",
        badgeBgClass: "bg-amber-500/15",
        badgeBorderClass: "border-amber-500/60",
        badgeTextClass: "text-amber-200",
      },

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
        infoText: "Zoom across Paldea to find story paths, gyms, Titan routes, and key landmarks.",
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
        infoText: "Track Kitakami landmarks, encounters, and key story locations from The Teal Mask DLC.",
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
        infoText: "Explore the Terarium’s themed biomes, facilities, and Indigo Disk side content.",
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
        infoText: "Navigate the Torchlit Labyrinth and keep track of side paths and hidden spots.",
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
        infoText: "Plan your route through Chargestone Cavern, tracking items, trainers, and encounters.",
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
        infoText: "Explore hideaways, tunnels, and digging spots across the Grand Underground.",
        badgeBgClass: "bg-pink-500/15",
        badgeBorderClass: "border-pink-500/60",
        badgeTextClass: "text-pink-200",
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
  }, [mapCards, normalizedSearch]);

  const mapSections = useMemo(() => {
    const groups: Record<MapGameKey, MapCardConfig[]> = { za: [], la: [], sv: [], bdsp: [] };

    filteredMapCards.forEach((card) => {
      groups[card.gameKey].push(card);
    });

    const meta: Record<MapGameKey, { title: string; subtitle: string; shortLabel: string; rightIndexIcon?: any }> = {
      za: {
        title: "Pokémon Legends: Z-A",
        subtitle: "Kalos • Lumiose City",
        shortLabel: "Z-A",
        rightIndexIcon: AppImages.zaPokemonLogo,
      },
      la: {
        title: "Pokémon Legends: Arceus",
        subtitle: "Hisui • Fieldlands, Highlands, Village & more",
        shortLabel: "PLA",
        rightIndexIcon: AppImages.arceusPokemonLogo,
      },
      sv: {
        title: "Pokémon Scarlet & Violet",
        subtitle: "Paldea • Mainland, Kitakami, Terarium & side areas",
        shortLabel: "SV",
        rightIndexIcon: AppImages.svPokemonLogo,
      },
      bdsp: {
        title: "Brilliant Diamond & Shining Pearl",
        subtitle: "Sinnoh • Grand Underground",
        shortLabel: "BDSP",
        rightIndexIcon: AppImages.bdspPokemonLogo,
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
        rightIndexIcon: meta[key].rightIndexIcon,
        cards: groups[key],
      }));
  }, [filteredMapCards]);

  const scrollToMapGroup = useCallback((groupKey: MapGameKey) => {
    const y = mapGroupOffsetsRef.current[groupKey];
    if (y != null && mapsScrollRef.current) {
      mapsScrollRef.current.scrollTo({ y: Math.max(y - 40, 0), animated: true });
    }
  }, []);

  return (
    <>
      <View className="flex-1" style={{ position: "relative" }}>
        <ScrollView ref={mapsScrollRef} contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 70 }}>
          <View className="w-full">
            {filteredMapCards.length === 0 ? (
              <View className="mt-6 items-center">
                <Text className="text-sm text-slate-400 text-center px-4">
                  No maps match this search yet. Try searching by region, game, or area name.
                </Text>
              </View>
            ) : (
              mapSections.map((section) => (
                <View
                  key={section.key}
                  onLayout={(e) => {
                    mapGroupOffsetsRef.current[section.key] = e.nativeEvent.layout.y;
                  }}
                  className="mb-3"
                >
                  <View className="flex-row items-center mb-1 px-1 mt-2">
                    <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {section.title}
                      </Text>
                      <Text className="text-[11px] text-slate-500 mt-0.5">{section.subtitle}</Text>
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
                paddingVertical: 6,
                paddingHorizontal: 6,
                borderRadius: 999,
                backgroundColor: "rgba(15,23,42,0.96)",
                borderWidth: 1,
                borderColor: "rgba(51,65,85,1)",
                gap: 6,
              }}
            >
              {mapSections.map((section) => {
                const iconSize = section.key === "la" || section.key === "bdsp" ? 26 : 22;

                return (
                  <Pressable
                    key={section.key}
                    onPress={() => scrollToMapGroup(section.key as MapGameKey)}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {section.rightIndexIcon ? (
                      <LocalIcon
                        source={section.rightIndexIcon}
                        size={iconSize}
                        style={{
                          borderRadius: 6,
                          opacity: 0.95,
                        }}
                        contentFit="contain"
                      />
                    ) : (
                      <Text className="text-[10px] text-slate-400">{section.shortLabel}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <LumioseMapModal visible={showLumioseMap} onClose={() => setShowLumioseMap(false)} />
      <ObsidianFieldlandsMapModal visible={showObsidianMap} onClose={() => setShowObsidianMap(false)} />
      <CobaltCoastlandsMapModal visible={showCobaltMap} onClose={() => setShowCobaltMap(false)} />
      <CrimsonMirelandsMapModal visible={showCrimsonMap} onClose={() => setShowCrimsonMap(false)} />
      <CoronetHighlandsMapModal visible={showCoronetMap} onClose={() => setShowCoronetMap(false)} />
      <AlabasterIcelandsMapModal visible={showAlabasterMap} onClose={() => setShowAlabasterMap(false)} />
      <JubilifeVillageMapModal visible={showJubilifeMap} onClose={() => setShowJubilifeMap(false)} />
      <AncientRetreatMapModal visible={showAncientRetreatMap} onClose={() => setShowAncientRetreatMap(false)} />
      <PaldeaRegionMapModal visible={showPaldeaMap} onClose={() => setShowPaldeaMap(false)} />
      <KitakamiRegionMapModal visible={showKitakamiMap} onClose={() => setShowKitakamiMap(false)} />
      <IndigoDiskMapModal visible={showIndigoDiskMap} onClose={() => setShowIndigoDiskMap(false)} />
      <TorchlitLabyrinthMapModal visible={showTorchlitLabyrinthMap} onClose={() => setShowTorchlitLabyrinthMap(false)} />
      <ChargestoneCavernMapModal visible={showChargestoneCavernMap} onClose={() => setShowChargestoneCavernMap(false)} />
      <GrandUndergroundMapModal visible={showGrandUndergroundMap} onClose={() => setShowGrandUndergroundMap(false)} />
    </>
  );
}
