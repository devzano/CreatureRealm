// app/(tabs)/collection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";

import PageWrapper from "@/components/PageWrapper";
import { usePokemonCollectionStore } from "@/store/collectionStore";
import { games, type CreatureRealmGame } from "@/lib/data/pokemon/gameFilters";

type SeriesId = "pokemon" | "acnh" | "palworld";

type IconLib = "mci" | "fa5";

type SeriesConfig = {
  id: SeriesId;
  label: string;
  badge?: string;
  iconLib: IconLib;
  iconName:
    | React.ComponentProps<typeof MaterialCommunityIcons>["name"]
    | React.ComponentProps<typeof FontAwesome5>["name"];
  color: string;
  available: boolean;
};

const SERIES_CONFIG: SeriesConfig[] = [
  {
    id: "pokemon",
    label: "Pokémon",
    iconLib: "mci",
    iconName: "pokeball",
    color: "#38bdf8",
    available: true,
  },
  {
    id: "acnh",
    label: "Animal Crossing",
    badge: "SOON",
    iconLib: "mci",
    iconName: "sprout",
    color: "#4ade80",
    available: false,
  },
  {
    id: "palworld",
    label: "Palworld",
    badge: "SOON",
    iconLib: "mci",
    iconName: "sword-cross",
    color: "#f97316",
    available: false,
  },
];

export default function CollectionScreen() {
  const router = useRouter();

  const [activeSeries, setActiveSeries] = useState<SeriesId>("pokemon");

  const entries = usePokemonCollectionStore((s) => s.entries);
  const favorites = usePokemonCollectionStore((s) => s.favorites);
  const teams = usePokemonCollectionStore((s) => s.teams);
  const createTeam = usePokemonCollectionStore((s) => s.createTeam);
  const toggleFavorite = usePokemonCollectionStore((s) => s.toggleFavorite);
  const removeFromTeam = usePokemonCollectionStore((s) => s.removeFromTeam);
  const deleteTeam = usePokemonCollectionStore((s) => s.deleteTeam);

  const favoriteIds = useMemo(
    () =>
      Object.keys(favorites)
        .map((k) => Number(k))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b),
    [favorites]
  );

  const teamsList = useMemo(() => Object.values(teams), [teams]);

  // Pokémon-wide stats using your entries store
  const pokemonStats = useMemo(() => {
    const values = Object.values(entries);
    let caught = 0;
    let shiny = 0;
    let alpha = 0;
    let activeHunts = 0;
    let notesCount = 0;

    for (const entry of values) {
      if (entry.caught) caught += 1;
      if (entry.shiny) shiny += 1;
      if (entry.alpha) alpha += 1;
      if ((entry.shinyHuntCount || 0) > 0) activeHunts += 1;
      if (entry.notes && entry.notes.trim().length > 0) notesCount += 1;
    }

    return {
      caught,
      shiny,
      alpha,
      favorites: favoriteIds.length,
      activeHunts,
      notesCount,
    };
  }, [entries, favoriteIds.length]);

  // Team helper: total members across all teams
  const totalTeamMembers = useMemo(
    () =>
      teamsList.reduce((sum, team) => {
        return sum + team.memberIds.length;
      }, 0),
    [teamsList]
  );

  // Optionally group teams by game to make multi-team collections clearer
  const teamsByGame = useMemo(
    () => {
      const byGame: Record<string, (typeof teamsList)[number][]> = {};
      for (const team of teamsList) {
        if (!byGame[team.gameId]) byGame[team.gameId] = [];
        byGame[team.gameId].push(team);
      }

      // Return an ordered list by generation
      return Object.entries(byGame)
        .map(([gameId, teamsForGame]) => {
          const game = games.find((g) => g.id === gameId) ?? null;
          return {
            gameId,
            game,
            teams: teamsForGame,
          };
        })
        .sort((a, b) => {
          const genA = a.game?.generationId ?? 99;
          const genB = b.game?.generationId ?? 99;
          return genA - genB;
        });
    },
    [teamsList]
  );

  const handleCreateTeam = () => {
    // v1: still use first game as default; later you can prompt for game
    const firstGame: CreatureRealmGame | undefined = games[0];
    if (!firstGame) return;
    const name = `Team ${Object.keys(teams).length + 1}`;
    createTeam({ id: "", name, gameId: firstGame.id });
  };

  const renderFavorite = ({ item }: { item: number }) => {
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item}.png`;

    return (
      <View className="w-1/3 p-2">
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/pokemon/[id]",
              params: { id: String(item) },
            })
          }
          className="rounded-3xl p-3 bg-slate-900/80 border border-slate-700 items-center relative"
        >
          {/* Unfavorite button */}
          <Pressable
            onPress={() => toggleFavorite(item)}
            className="absolute right-1.5 top-1.5 w-5 h-5 rounded-full bg-slate-900/90 border border-slate-700 items-center justify-center"
          >
            <MaterialCommunityIcons
              name="heart-off"
              size={11}
              color="#fca5a5"
            />
          </Pressable>

          <Image
            source={{ uri: spriteUrl }}
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
          <Text className="text-[11px] text-slate-400 mt-1">
            #{String(item).padStart(3, "0")}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderTeam = ({
    item,
  }: {
    item: (typeof teamsList)[number];
  }) => {
    const game = games.find((g) => g.id === item.gameId) ?? null;

    return (
      <View className="mb-3 rounded-3xl p-3 bg-slate-900/80 border border-slate-800">
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-sm font-semibold text-slate-50">
              {item.name}
            </Text>
            {game && (
              <Text className="text-[11px] text-slate-400 mt-0.5">
                {game.title}
              </Text>
            )}
          </View>

          <View className="flex-row items-center">
            <View className="flex-row items-center mr-2">
              <MaterialCommunityIcons
                name="account-group"
                size={18}
                color="#e5e7eb"
              />
              <Text className="text-[11px] text-slate-300 ml-1">
                {item.memberIds.length}/6
              </Text>
            </View>

            {/* Delete team button */}
            <Pressable
              onPress={() => deleteTeam(item.id)}
              className="ml-1 w-7 h-7 rounded-full bg-slate-900 border border-slate-700 items-center justify-center"
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={14}
                color="#fca5a5"
              />
            </Pressable>
          </View>
        </View>

        {item.memberIds.length > 0 ? (
          <View className="flex-row flex-wrap">
            {item.memberIds.map((id) => {
              const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
              return (
                <View key={id} className="mr-2 mb-2 relative">
                  {/* Open Pokémon detail */}
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/pokemon/[id]",
                        params: { id: String(id), gameId: item.gameId },
                      })
                    }
                    className="w-12 h-12 rounded-2xl bg-slate-800 items-center justify-center"
                  >
                    <Image
                      source={{ uri: spriteUrl }}
                      style={{ width: 36, height: 36 }}
                      resizeMode="contain"
                    />
                  </Pressable>

                  {/* Remove from team */}
                  <Pressable
                    onPress={() => removeFromTeam(item.id, id)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 items-center justify-center"
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={11}
                      color="#e5e7eb"
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <Text className="text-[11px] text-slate-500">
            No members yet. From a Pokémon detail screen in this game, tap
            “Add to team”.
          </Text>
        )}
      </View>
    );
  };

  const activeSeriesConfig = SERIES_CONFIG.find(
    (s) => s.id === activeSeries
  )!;

  return (
    <PageWrapper
      scroll
      hideBackButton
      title="Collection"
      subtitle="Favorites, teams, and progress across your CreatureRealm universes."
      leftActions={
        <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          CreatureRealm
        </Text>
      }
    >
      <View className="px-1">
        {/* Series selector */}
        <View className="mb-3">
          <Text className="text-[11px] font-semibold text-slate-400 px-1 mb-1">
            Realms
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SERIES_CONFIG.map((series) => {
              const isActive = series.id === activeSeries;
              const bgClass = isActive
                ? "bg-slate-900"
                : "bg-slate-900/60";
              const borderClass = isActive
                ? "border-slate-500"
                : "border-slate-800";

              return (
                <Pressable
                  key={series.id}
                  onPress={() => setActiveSeries(series.id)}
                  className={`flex-row items-center rounded-full px-3 py-1.5 border ${bgClass} ${borderClass}`}
                >
                  {series.iconLib === "mci" ? (
                    <MaterialCommunityIcons
                      name={
                        series.iconName as React.ComponentProps<
                          typeof MaterialCommunityIcons
                        >["name"]
                      }
                      size={14}
                      color={series.color}
                    />
                  ) : (
                    <FontAwesome5
                      name={
                        series.iconName as React.ComponentProps<
                          typeof FontAwesome5
                        >["name"]
                      }
                      size={14}
                      color={series.color}
                    />
                  )}

                  <Text
                    className={`ml-1.5 text-[11px] font-semibold ${
                      isActive ? "text-slate-100" : "text-slate-400"
                    }`}
                  >
                    {series.label}
                  </Text>
                  {series.badge && (
                  <View className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-800">
                    <Text className="text-[9px] font-semibold text-slate-300">
                      {series.badge}
                    </Text>
                  </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Active series content */}
        {activeSeries === "pokemon" ? (
          <>
            {/* Overview card */}
            <View className="mb-4 rounded-3xl bg-slate-950/90 border border-sky-900 px-3 py-3">
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Pokémon Overview
                  </Text>
                  <Text className="text-sm font-semibold text-slate-50 mt-0.5">
                    Your franchise-wide progress
                  </Text>
                </View>
                <View className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/60 items-center justify-center">
                  <MaterialCommunityIcons
                    name="pokeball"
                    size={18}
                    color="#38bdf8"
                  />
                </View>
              </View>

              <View className="flex-row mb-2">
                <View className="flex-1 mr-1.5">
                  <Text className="text-[11px] text-slate-400">
                    Caught
                  </Text>
                  <Text className="text-[16px] font-semibold text-slate-50">
                    {pokemonStats.caught}
                  </Text>
                </View>
                <View className="flex-1 mx-1.5">
                  <Text className="text-[11px] text-slate-400">
                    Shiny
                  </Text>
                  <Text className="text-[16px] font-semibold text-slate-50">
                    {pokemonStats.shiny}
                  </Text>
                </View>
                <View className="flex-1 ml-1.5">
                  <Text className="text-[11px] text-slate-400">
                    Alpha
                  </Text>
                  <Text className="text-[16px] font-semibold text-slate-50">
                    {pokemonStats.alpha}
                  </Text>
                </View>
              </View>

              <View className="flex-row mt-1">
                <View className="flex-1 mr-1.5">
                  <Text className="text-[11px] text-slate-400">
                    Favorites
                  </Text>
                  <Text className="text-[13px] font-semibold text-slate-100">
                    {pokemonStats.favorites}
                  </Text>
                </View>
                <View className="flex-1 mx-1.5">
                  <Text className="text-[11px] text-slate-400">
                    Active hunts
                  </Text>
                  <Text className="text-[13px] font-semibold text-slate-100">
                    {pokemonStats.activeHunts}
                  </Text>
                </View>
                <View className="flex-1 ml-1.5">
                  <Text className="text-[11px] text-slate-400">
                    Notes
                  </Text>
                  <Text className="text-[13px] font-semibold text-slate-100">
                    {pokemonStats.notesCount}
                  </Text>
                </View>
              </View>

              {teamsList.length > 0 && (
                <View className="mt-2 pt-2 border-t border-slate-800">
                  <Text className="text-[11px] text-slate-400">
                    Teams
                  </Text>
                  <Text className="text-[12px] text-slate-200">
                    {teamsList.length} teams • {totalTeamMembers} members
                    total
                  </Text>
                </View>
              )}
            </View>

            {/* Favorites */}
            <View className="px-1">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-semibold text-slate-100">
                  Favorites
                </Text>
                <Text className="text-[11px] text-slate-400">
                  {favoriteIds.length} saved
                </Text>
              </View>

              {favoriteIds.length === 0 ? (
                <View className="py-3">
                  <Text className="text-[12px] text-slate-500">
                    Mark favorites from any Pokémon detail page to see
                    them here.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={favoriteIds}
                  keyExtractor={(id) => `fav-${id}`}
                  renderItem={renderFavorite}
                  numColumns={3}
                  scrollEnabled={false}
                  contentContainerStyle={{
                    paddingHorizontal: 2,
                    paddingBottom: 8,
                  }}
                />
              )}
            </View>

            {/* Teams */}
            <View className="px-1 mt-4">
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="text-sm font-semibold text-slate-100">
                    Teams
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    Build squads per game, up to 6 Pokémon each.
                  </Text>
                </View>
                <Pressable
                  onPress={handleCreateTeam}
                  className="px-3 py-1.5 rounded-full bg-slate-800 flex-row items-center"
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={14}
                    color="#e5e7eb"
                  />
                  <Text className="ml-1 text-[11px] font-semibold text-slate-100">
                    New team
                  </Text>
                </Pressable>
              </View>

              {teamsList.length === 0 ? (
                <View className="py-3">
                  <Text className="text-[12px] text-slate-500">
                    Create a team, then add Pokémon from their detail
                    pages.
                  </Text>
                </View>
              ) : (
                <View>
                  {teamsByGame.map(({ game, teams: teamsForGame }) => (
                    <View key={game?.id ?? "unknown"} className="mb-3">
                      <View className="flex-row items-center mb-1">
                        <View className="w-7 h-7 rounded-2xl bg-slate-900 border border-slate-700 items-center justify-center mr-2">
                          <MaterialCommunityIcons
                            name="gamepad-variant"
                            size={14}
                            color="#e5e7eb"
                          />
                        </View>
                        <View>
                          <Text className="text-[12px] font-semibold text-slate-200">
                            {game?.title ?? "Unknown game"}
                          </Text>
                          {game && (
                            <Text className="text-[11px] text-slate-500">
                              Gen {game.generationId}
                            </Text>
                          )}
                        </View>
                      </View>

                      {teamsForGame.map((team) => (
                        <View key={team.id}>
                          {renderTeam({ item: team })}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          // Placeholder for other universes
          <View className="mt-4 rounded-3xl bg-slate-950/90 border border-slate-800 px-3 py-3">
            <View className="flex-row items-center mb-2">
              <View className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-700 items-center justify-center mr-2">
                {activeSeriesConfig.iconLib === "mci" ? (
                  <MaterialCommunityIcons
                    name={
                      activeSeriesConfig.iconName as React.ComponentProps<
                        typeof MaterialCommunityIcons
                      >["name"]
                    }
                    size={18}
                    color={activeSeriesConfig.color}
                  />
                ) : (
                  <FontAwesome5
                    name={
                      activeSeriesConfig.iconName as React.ComponentProps<
                        typeof FontAwesome5
                      >["name"]
                    }
                    size={18}
                    color={activeSeriesConfig.color}
                  />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-50">
                  {activeSeriesConfig.label} collections are coming soon
                </Text>
                <Text className="text-[12px] text-slate-400 mt-0.5">
                  This tab will show favorites, “teams” (layouts / squads),
                  and completion trackers for this universe once you’ve
                  wired its data into CreatureRealm.
                </Text>
              </View>
            </View>

            <View className="mt-2">
              {activeSeries === "acnh" && (
                <Text className="text-[11px] text-slate-400">
                  Ideas: villagers you&apos;ve invited, museum completion,
                  favorite furniture sets, dream island themes, and daily
                  checklists.
                </Text>
              )}
              {activeSeries === "palworld" && (
                <Text className="text-[11px] text-slate-400">
                  Ideas: base defense squads, exploration squads, boss
                  teams, legendary Pal checklist, and breeding projects.
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </PageWrapper>
  );
}
