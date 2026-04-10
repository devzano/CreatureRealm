import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

import type { CreatureRealmGame } from "@/lib/pokemon/gameFilters";
import AppImages from "@/constants/images";
import { CircleIconToggle, capitalize } from "./gameDexHelpers";

type GameDexListItem = {
  id: number;
  name: string;
  gameDexNumber: number;
  slug?: string;
  imageUrl?: string;
  description?: string;
  groupLabel?: string;
  badges?: {
    href: string;
    iconUrl: string;
    label?: string;
  }[];
};

type CollectionEntry = {
  caught?: boolean;
  shiny?: boolean;
  alpha?: boolean;
};

type Props = {
  item: GameDexListItem;
  game: CreatureRealmGame;
  isPokopia: boolean;
  supportsShiny: boolean;
  supportsAlpha: boolean;
  entry: CollectionEntry;
  onOpen: () => void;
  onToggleCaught: () => void;
  onToggleShiny: () => void;
  onToggleAlpha: () => void;
};

export default function GameDexTile({
  item,
  game,
  isPokopia,
  supportsShiny,
  supportsAlpha,
  entry,
  onOpen,
  onToggleCaught,
  onToggleShiny,
  onToggleAlpha,
}: Props) {
  const spriteUrl =
    item.imageUrl ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${item.id}.png`;

  const isCaught = !!entry.caught;
  const borderColor = isCaught ? game.accentColor[0] : "#1f2937";
  const bgOpacity = isCaught ? 0.95 : 0.85;

  const CAUGHT_COLOR = game.accentColor[0];
  const SHINY_COLOR = "#facc15";
  const ALPHA_COLOR = "#ef4444";

  return (
    <Pressable onPress={onOpen} className="w-1/2 p-2">
      <View
        className="rounded-3xl p-3 border bg-slate-900"
        style={{
          borderColor,
          backgroundColor: `rgba(15,23,42,${bgOpacity})`,
        }}
      >
        <View className="flex-row justify-between items-center mb-1.5">
          <View className="flex-1 items-start justify-between h-[70px] py-1">
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${game.accentColor[0]}22` }}
            >
              <Text className="text-[10px] font-semibold tracking-wide" style={{ color: game.accentColor[0] }}>
                {item.groupLabel === "Event Pokedex" ? "EVENT" : `#${String(item.gameDexNumber).padStart(3, "0")}`}
              </Text>
            </View>

            {isPokopia && item.badges?.length ? (
              <View className="flex-row gap-1">
                {item.badges.slice(0, 3).map((badge) => (
                  <View
                    key={`${item.id}-${badge.href}`}
                    className="rounded-lg border border-amber-700/60 bg-amber-950/90 p-0.5"
                  >
                    <ExpoImage
                      source={{ uri: badge.iconUrl }}
                      style={{ width: 22, height: 22 }}
                      contentFit="contain"
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <ExpoImage
            source={{ uri: spriteUrl }}
            style={{ width: 70, height: 70 }}
            contentFit="contain"
            transition={120}
            cachePolicy="memory-disk"
          />
        </View>

        {/* Name and Description Section */}
        <View className="mt-1">
          <Text className="text-sm font-semibold text-slate-50" numberOfLines={1}>
            {capitalize(item.name)}
          </Text>
          <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
            {isPokopia
              ? item.groupLabel === "Event Pokedex"
                ? `${item.groupLabel} • ${item.description || `#${String(item.gameDexNumber).padStart(3, "0")}`}`
                : item.description || `Pokopia #${String(item.gameDexNumber).padStart(3, "0")}`
              : `National #${String(item.id).padStart(3, "0")}`}
          </Text>
        </View>

        {/* Bottom Toggles */}
        <View className="flex-row mt-3 justify-between items-center">
          <CircleIconToggle
            active={!!entry.caught}
            activeColor={CAUGHT_COLOR}
            mciName="pokeball"
            onPress={onToggleCaught}
            size={28}
            iconSize={14}
          />

          {supportsShiny && (
            <CircleIconToggle
              active={!!entry.shiny}
              activeColor={SHINY_COLOR}
              imageSource={AppImages.shinyPokemonIcon}
              onPress={onToggleShiny}
              size={28}
              iconSize={14}
            />
          )}

          {supportsAlpha && (
            <CircleIconToggle
              active={!!entry.alpha}
              activeColor={ALPHA_COLOR}
              imageSource={AppImages.alphaPokemonIcon}
              onPress={onToggleAlpha}
              size={28}
              iconSize={14}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}
