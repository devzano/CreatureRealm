// components/Pokemon/PokemonDetails/PokedexEntryStrip.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { games, type CreatureRealmGame } from "@/lib/pokemon/gameFilters";
import { usePokemonCollectionStore } from "@/store/pokemonCollectionStore";

type OwnershipEntry = {
  caught?: boolean;
  shiny?: boolean;
  alpha?: boolean;
};

// Stable default to avoid new object each subscription
const EMPTY_ENTRY: OwnershipEntry = Object.freeze({
  caught: false,
  shiny: false,
  alpha: false,
});

// Only these games support Alpha Pokémon
const ALPHA_GAMES = new Set<string>(["legends-arceus", "legends-za"]);

type PokedexEntryStripProps = {
  speciesId: number;
  /**
   * Explicit list of game IDs to show.
   * - undefined / null  → show NOTHING
   * - [] (empty array)  → show NOTHING
   */
  gameFilterIds?: string[] | null;
};

const PokedexEntryStrip: React.FC<PokedexEntryStripProps> = ({
  speciesId,
  gameFilterIds,
}) => {
  // Subscribe to actions only
  const toggleCaught = usePokemonCollectionStore((s) => s.toggleCaught);
  const toggleShiny = usePokemonCollectionStore((s) => s.toggleShiny);
  const toggleAlpha = usePokemonCollectionStore((s) => s.toggleAlpha);

  const visibleGames: CreatureRealmGame[] = useMemo(() => {
    if (!gameFilterIds || gameFilterIds.length === 0) return [];
    const allowed = new Set(gameFilterIds);
    return games.filter((g) => allowed.has(g.id));
  }, [gameFilterIds]);

  if (visibleGames.length === 0) return null;

  const columns = useMemo(() => {
    const cols: CreatureRealmGame[][] = [];
    for (let i = 0; i < visibleGames.length; i += 2) {
      cols.push(visibleGames.slice(i, i + 2));
    }
    return cols;
  }, [visibleGames]);

  return (
    <View className="mt-3 mb-3 rounded-3xl bg-slate-950/90 border border-slate-800 px-3 py-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="clipboard-list-outline"
            size={14}
            color="#9ca3af"
          />
          <Text className="ml-1.5 text-xs font-semibold text-slate-200">
            Pokédex Entries
          </Text>
        </View>
        <Text className="text-[10px] text-slate-500">
          Tap to update • Swipe to view
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8, paddingVertical: 2 }}
      >
        {columns.map((column, columnIndex) => (
          <View
            key={`pokedexentry-col-${columnIndex}`}
            className="mr-3"
            style={{ width: 150 }}
          >
            {column[0] && (
              <OwnershipGameCard
                game={column[0]}
                speciesId={speciesId}
                onToggleCaught={toggleCaught}
                onToggleShiny={toggleShiny}
                onToggleAlpha={toggleAlpha}
              />
            )}
            {column[1] && (
              <OwnershipGameCard
                game={column[1]}
                speciesId={speciesId}
                onToggleCaught={toggleCaught}
                onToggleShiny={toggleShiny}
                onToggleAlpha={toggleAlpha}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

type OwnershipGameCardProps = {
  game: CreatureRealmGame;
  speciesId: number;
  onToggleCaught: (gameId: string, speciesId: number) => void;
  onToggleShiny: (gameId: string, speciesId: number) => void;
  onToggleAlpha: (gameId: string, speciesId: number) => void;
};

const OwnershipGameCard: React.FC<OwnershipGameCardProps> = ({
  game,
  speciesId,
  onToggleCaught,
  onToggleShiny,
  onToggleAlpha,
}) => {
  // Subscribe to just this game+species entry
  const entry = usePokemonCollectionStore((s) => {
    const key = `${game.id}:${speciesId}`;
    // NOTE: we return the SAME EMPTY_ENTRY reference when missing
    return (s.entries[key] as OwnershipEntry | undefined) ?? EMPTY_ENTRY;
  });

  const caught = !!entry.caught;
  const shiny = !!entry.shiny;

  const supportsAlpha = ALPHA_GAMES.has(game.id);
  const alpha = supportsAlpha && !!entry.alpha;

  const hasAny = caught || shiny || alpha;

  return (
    <View
      className="rounded-2xl px-2.5 py-2 mb-2 border bg-slate-950"
      style={{
        borderColor: hasAny ? game.accentColor[0] : "#1f2937",
        backgroundColor: hasAny ? `${game.accentColor[0]}22` : "#020617",
      }}
    >
      {/* Header: cover art + game code + status icon */}
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center flex-1 mr-2">
          {game.coverImageUrl && (
            <Image
              source={{ uri: game.coverImageUrl }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                marginRight: 6,
              }}
              resizeMode="cover"
            />
          )}

          <View className="flex-1">
            <Text
              className="text-[11px] font-semibold"
              style={{ color: game.accentColor[0] }}
              numberOfLines={1}
            >
              {game.shortCode}
            </Text>
            {game.releaseYear && (
              <Text className="text-[9px] text-slate-400" numberOfLines={1}>
                {game.releaseYear}
              </Text>
            )}
          </View>
        </View>

        <MaterialCommunityIcons
          name={hasAny ? "check-circle" : "circle-outline"}
          size={14}
          color={hasAny ? game.accentColor[0] : "#4b5563"}
        />
      </View>

      {/* Divider */}
      <View className="h-px bg-slate-800/80 mb-1.5" />

      {/* Status pills */}
      <View className="flex-row flex-wrap">
        {/* Caught */}
        <StatusPill
          icon="pokeball"
          label="Caught"
          active={caught}
          activeColor="#f97316"
          onPress={() => onToggleCaught(game.id, speciesId)}
        />

        {/* Shiny */}
        <StatusPill
          icon={shiny ? "star-four-points" : "star-four-points-outline"}
          label="Shiny"
          active={shiny}
          activeColor="#facc15"
          onPress={() => onToggleShiny(game.id, speciesId)}
        />

        {/* Alpha – only for supported games */}
        {supportsAlpha && (
          <StatusPill
            icon={alpha ? "alpha-a-circle" : "alpha-a-circle-outline"}
            label="Alpha"
            active={alpha}
            activeColor="#38bdf8"
            onPress={() => onToggleAlpha(game.id, speciesId)}
          />
        )}
      </View>
    </View>
  );
};

type StatusPillProps = {
  icon: string;
  label: string;
  active: boolean;
  activeColor: string;
  onPress?: () => void;
};

const StatusPill: React.FC<StatusPillProps> = ({
  icon,
  label,
  active,
  activeColor,
  onPress,
}) => {
  const content = (
    <View
      className="flex-row items-center mr-1.5 mb-1 px-1.5 py-0.5 rounded-full border"
      style={{
        borderColor: active ? activeColor : "rgba(55,65,81,0.9)",
        backgroundColor: active ? `${activeColor}22` : "rgba(15,23,42,0.9)",
      }}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={12}
        color={active ? activeColor : "#6b7280"}
      />
      <Text className="ml-1 text-[9px] text-slate-300" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {content}
    </Pressable>
  );
};

export default PokedexEntryStrip;
