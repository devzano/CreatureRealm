// components/Pokemon/PokemonDetails/PokedexEntryStrip.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { games, type CreatureRealmGame } from "@/lib/pokemon/gameFilters";
import { usePokemonCollectionStore } from "@/store/pokemonCollectionStore";
import Section from "@/components/Section";
import AppImages from "@/constants/images";

type OwnershipEntry = {
  caught?: boolean;
  shiny?: boolean;
  alpha?: boolean;
};

const EMPTY_ENTRY: OwnershipEntry = Object.freeze({
  caught: false,
  shiny: false,
  alpha: false,
});

const ALPHA_GAMES = new Set<string>(["legends-arceus", "legends-za"]);

type PokedexEntryStripProps = {
  speciesId: number;
  gameFilterIds?: string[] | null;
};

const PokedexEntryStrip: React.FC<PokedexEntryStripProps> = ({ speciesId, gameFilterIds }) => {
  const toggleCaught = usePokemonCollectionStore((s) => s.toggleCaught);
  const toggleShiny = usePokemonCollectionStore((s) => s.toggleShiny);
  const toggleAlpha = usePokemonCollectionStore((s) => s.toggleAlpha);

  const visibleGames: CreatureRealmGame[] = useMemo(() => {
    if (!gameFilterIds || gameFilterIds.length === 0) return [];
    const allowed = new Set(gameFilterIds);
    return games.filter((g) => allowed.has(g.id));
  }, [gameFilterIds]);

  const columns = useMemo(() => {
    const cols: CreatureRealmGame[][] = [];
    for (let i = 0; i < visibleGames.length; i += 2) {
      cols.push(visibleGames.slice(i, i + 2));
    }
    return cols;
  }, [visibleGames]);

  if (visibleGames.length === 0) return null;

  return (
    <View className="mb-3">
      <Section
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="clipboard-check-outline" size={14} color="#9ca3af" />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pokédeck Entries
            </Text>
          </View>
        }
        rightText="swipe for more games"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 4, paddingVertical: 1 }}
        >
          {columns.map((column, columnIndex) => (
            <View
              key={`pokedexentry-col-${columnIndex}`}
              className="mr-2"
              style={{ width: 142 }}
            >
              {column.map((game) => (
                <View key={game.id} className="mb-1.5">
                  <OwnershipGameCard
                    game={game}
                    speciesId={speciesId}
                    onToggleCaught={toggleCaught}
                    onToggleShiny={toggleShiny}
                    onToggleAlpha={toggleAlpha}
                  />
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </Section>
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
  const entry = usePokemonCollectionStore((s) => {
    const key = `${game.id}:${speciesId}`;
    return (s.entries[key] as OwnershipEntry | undefined) ?? EMPTY_ENTRY;
  });

  const caught = !!entry.caught;
  const shiny = !!entry.shiny;
  const supportsAlpha = ALPHA_GAMES.has(game.id);
  const alpha = supportsAlpha && !!entry.alpha;
  const hasAny = caught || shiny || alpha;

  const accent = game.accentColor?.[0] ?? "#38bdf8";

  const CAUGHT_COLOR = accent;
  const SHINY_COLOR = "#facc15";
  const ALPHA_COLOR = "#ef4444";

  const buttons: Array<{
    key: string;
    active: boolean;
    activeColor: string;
    icon: string;
    imageSource?: any;
    onPress: () => void;
  }> = [
      {
        key: "caught",
        active: caught,
        activeColor: CAUGHT_COLOR,
        icon: "pokeball",
        onPress: () => onToggleCaught(game.id, speciesId),
      },
      {
        key: "shiny",
        active: shiny,
        activeColor: SHINY_COLOR,
        icon: "star-four-points",
        imageSource: AppImages.shinyPokemonIcon,
        onPress: () => onToggleShiny(game.id, speciesId),
      },
    ];

  if (supportsAlpha) {
    buttons.push({
      key: "alpha",
      active: alpha,
      activeColor: ALPHA_COLOR,
      icon: "alpha-a-circle",
      imageSource: AppImages.alphaPokemonIcon,
      onPress: () => onToggleAlpha(game.id, speciesId),
    });
  }

  const CARD_W = 136;
  const ICON_W = 46;

  return (
    <View
      className="rounded-2xl border overflow-hidden"
      style={{
        width: CARD_W,
        borderColor: hasAny ? accent : "#1f2937",
        backgroundColor: hasAny ? `${accent}22` : "#020617",
      }}
    >
      <View className="absolute top-2 right-2">
        <MaterialCommunityIcons
          name={hasAny ? "check-circle" : "circle-outline"}
          size={14}
          color={hasAny ? accent : "rgba(75,85,99,0.9)"}
        />
      </View>

      <View className="flex-row items-center px-2.5 pt-2.5">
        {game.coverImageUrl ? (
          <Image
            source={{ uri: game.coverImageUrl }}
            style={{
              width: ICON_W,
              height: ICON_W,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.03)",
              marginRight: 8,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: ICON_W,
              height: ICON_W,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.03)",
              marginRight: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="image-off-outline" size={18} color="rgba(148,163,184,0.7)" />
          </View>
        )}

        <View className="flex-1 pr-4">
          <Text className="text-[12px] font-bold" style={{ color: accent }} numberOfLines={2}>
            {game.title}
          </Text>

          {game.releaseYear ? (
            <Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={1}>
              {game.releaseYear}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="px-2.5 pb-2.5 pt-2">
        <View className="flex-row items-center justify-center">
          {buttons.map((b) => (
            <View key={b.key} style={{ marginHorizontal: buttons.length === 3 ? 6 : 8 }}>
              <IconToggle
                active={b.active}
                activeColor={b.activeColor}
                icon={b.icon}
                imageSource={b.imageSource}
                onPress={b.onPress}
                size={26}
                iconSize={13}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

type IconToggleProps = {
  active: boolean;
  activeColor: string;
  icon: string;
  imageSource?: any;
  onPress: () => void;
  size?: number;
  iconSize?: number;
};

const IconToggle: React.FC<IconToggleProps> = ({
  active,
  activeColor,
  icon,
  imageSource,
  onPress,
  size = 28,
  iconSize = 14,
}) => {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <View
        className="rounded-full border items-center justify-center"
        style={{
          width: size,
          height: size,
          borderColor: active ? `${activeColor}99` : "rgba(55,65,81,0.8)",
          backgroundColor: active ? `${activeColor}22` : "rgba(15,23,42,0.40)",
        }}
      >
        {imageSource ? (
          <Image
            source={imageSource}
            style={{
              width: iconSize,
              height: iconSize,
              tintColor: active ? activeColor : "#9ca3af",
              opacity: active ? 1 : 0.9,
            }}
            resizeMode="contain"
          />
        ) : (
          <MaterialCommunityIcons name={icon as any} size={iconSize} color={active ? activeColor : "#9ca3af"} />
        )}
      </View>
    </Pressable>
  );
};

export default PokedexEntryStrip;
