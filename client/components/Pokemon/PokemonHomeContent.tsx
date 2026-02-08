// components/Pokemon/PokemonHomeContent.tsx
import React, { useMemo, useState, useRef } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import PokemonNationalDex, { type DexViewMode } from "@/components/Pokemon/PokemonNationalDex";
import { games } from "@/lib/pokemon/gameFilters";
import LiquidGlass from "../ui/LiquidGlass";

import PokemonMapsTab from "@/components/Pokemon/PokemonMapsTab";

type PokemonHomeContentProps = {
  onBackToCollections: () => void;
};

const NATIONAL_VIEW_MODE: DexViewMode = "national";

type ActiveTab = "dex" | "maps" | "games";

const PokemonHomeContent: React.FC<PokemonHomeContentProps> = ({ onBackToCollections }) => {
  const router = useRouter();

  const gamesScrollRef = useRef<ScrollView | null>(null);
  const generationOffsetsRef = useRef<Record<number, number>>({});

  const [activeTab, setActiveTab] = useState<ActiveTab>("dex");
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
        return "Pokémon";
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

  // Games list, filtered by search
  const filteredGames = useMemo(() => {
    if (!normalizedSearch) return games;

    return games.filter((game) => {
      const haystack = (
        game.title +
        " " +
        (game.subtitle ?? "") +
        " " +
        `generation ${(game as any).generationId}` +
        " " +
        (Array.isArray((game as any).shortCode) ? (game as any).shortCode.join(" ") : (game as any).shortCode ?? "")
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
      gamesScrollRef.current.scrollTo({ y: Math.max(y - 40, 0), animated: true });
    }
  };

  return (
    <PageWrapper
      hideBackButton
      title={pageTitle}
      subtitle={pageSubtitle}
      leftActions={
        <LiquidGlass
          glassEffectStyle="clear"
          interactive={false}
          tinted
          tintColor="rgba(239,68,68,0.22)"
          showFallbackBackground
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.14)",
          }}
        >
          <View style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Pokémon</Text>
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
              activeTab === "maps"
                ? "Search maps (region, area, town…)"
                : activeTab === "games"
                ? "Search games (title, gen, short code…)"
                : "Search Pokémon (name or number…)"
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

        {/* Sub-tabs: Maps / Games / Dex */}
        <View className="flex-row items-center rounded-full bg-slate-900/80 border border-slate-700 p-1 mt-2">
          <Pressable
            onPress={() => setActiveTab("maps")}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${activeTab === "maps" ? "bg-slate-800" : ""}`}
          >
            <Text className={`text-[11px] font-semibold ${activeTab === "maps" ? "text-slate-50" : "text-slate-400"}`}>
              Maps
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("dex")}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${activeTab === "dex" ? "bg-slate-800" : ""}`}
          >
            <Text className={`text-[11px] font-semibold ${activeTab === "dex" ? "text-slate-50" : "text-slate-400"}`}>
              Full Dex
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("games")}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${activeTab === "games" ? "bg-slate-800" : ""}`}
          >
            <Text className={`text-[11px] font-semibold ${activeTab === "games" ? "text-slate-50" : "text-slate-400"}`}>
              Games
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === "maps" && <PokemonMapsTab search={search} />}

      {activeTab === "games" && (
        <View className="flex-1" style={{ position: "relative" }}>
          <ScrollView ref={gamesScrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 70 }}>
            <View className="w-full">
              <View className="mt-1 mb-1 px-1" />

              {filteredGames.length === 0 ? (
                <View className="mt-6 items-center">
                  <Text className="text-sm text-slate-400 text-center px-4">
                    No games match this search. Try searching by title, generation, or short code.
                  </Text>
                </View>
              ) : (
                generationSections.map((section) => (
                  <View
                    key={section.generation}
                    onLayout={(e) => {
                      generationOffsetsRef.current[section.generation] = e.nativeEvent.layout.y;
                    }}
                    className="mb-2"
                  >
                    <View className="flex-row items-center mb-1 px-1 mt-2">
                      <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Generation {section.generation}
                      </Text>
                    </View>

                    {section.games.map((game: any) => {
                      const accent = Array.isArray(game.accentColor) ? game.accentColor[0] : game.accentColor ?? "#38bdf8";
                      const speciesCount = game.speciesCount ?? undefined;
                      const coverUrl: string | undefined = typeof game.coverImageUrl === "string" ? game.coverImageUrl : undefined;

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
                          style={{ borderColor: accent }}
                        >
                          {/* Top row: cover + title + CTA */}
                          <View className="flex-row items-center px-4 pt-3 pb-2">
                            {/* ✅ Game cover thumbnail (expo-image) */}
                            {coverUrl ? (
                              <ExpoImage
                                source={{ uri: coverUrl }}
                                contentFit="cover"
                                transition={120}
                                style={{
                                  width: 54,
                                  height: 72,
                                  borderRadius: 14,
                                  marginRight: 12,
                                  backgroundColor: "rgba(2,6,23,0.7)",
                                  borderWidth: 1,
                                  borderColor: "rgba(51,65,85,0.6)",
                                }}
                              />
                            ) : (
                              <View
                                style={{
                                  width: 54,
                                  height: 72,
                                  borderRadius: 14,
                                  marginRight: 12,
                                  backgroundColor: "rgba(2,6,23,0.7)",
                                  borderWidth: 1,
                                  borderColor: "rgba(51,65,85,0.6)",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Feather name="image" size={16} color="#64748B" />
                              </View>
                            )}

                            <View className="flex-1">
                              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Gen {game.generationId}
                              </Text>
                              <Text className="text-[15px] font-semibold text-slate-50 mt-0.5">{game.title}</Text>
                              {game.subtitle ? <Text className="text-[12px] text-slate-400 mt-0.5">{game.subtitle}</Text> : null}
                            </View>

                            <View className="items-end ml-3">
                              <View className="flex-row items-center px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700">
                                <Text className="text-[10px] font-semibold text-slate-200 mr-1">View Pokédex</Text>
                                <Feather name="chevron-right" size={14} color="#E5E7EB" />
                              </View>
                              {speciesCount ? <Text className="text-[11px] text-slate-400 mt-1">{speciesCount} species</Text> : null}
                            </View>
                          </View>

                          {/* Meta + tags row */}
                          <View className="px-4 pb-3 pt-1 border-t border-slate-800/80 bg-slate-950/80">
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center">
                                <View className="w-1.5 h-6 rounded-full mr-2" style={{ backgroundColor: accent }} />
                                <Text className="text-[11px] text-slate-400">
                                  Generation <Text className="text-slate-200 font-semibold">{game.generationId}</Text>
                                  {speciesCount ? (
                                    <>
                                      {" • "}
                                      <Text className="text-slate-200 font-semibold">{speciesCount}</Text> species
                                    </>
                                  ) : null}
                                </Text>
                              </View>
                            </View>

                            {Array.isArray(game.shortCode) && game.shortCode.length > 0 ? (
                              <View className="flex-row flex-wrap mt-2 -mr-1">
                                {game.shortCode.map((code: string) => (
                                  <View key={code} className="px-2 py-1 rounded-full bg-slate-900/90 border border-slate-700 mr-2 mt-1">
                                    <Text className="text-[10px] text-slate-300">{code}</Text>
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
            <View pointerEvents="box-none" style={{ position: "absolute", right: 0, top: 4, bottom: 16, justifyContent: "center", paddingRight: 2 }}>
              <View
                style={{
                  alignSelf: "flex-end",
                  paddingVertical: 4,
                  paddingHorizontal: 4,
                  borderRadius: 999,
                  backgroundColor: "rgba(15,23,42,0.96)",
                  borderWidth: 1,
                  borderColor: "rgba(51,65,85,1)",
                }}
              >
                {generationSections.map((section) => (
                  <Pressable
                    key={section.generation}
                    onPress={() => scrollToGeneration(section.generation)}
                    style={{ paddingVertical: 4, paddingHorizontal: 6, alignItems: "center" }}
                  >
                    <Text className="text-[13px] text-slate-400">{section.generation}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {activeTab === "dex" && (
        <View className="flex-1 mt-2">
          <PokemonNationalDex search={search} from={undefined} to={undefined} viewMode={NATIONAL_VIEW_MODE} />
        </View>
      )}
    </PageWrapper>
  );
};

export default PokemonHomeContent;
