import React from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { CreatureRealmGame } from "@/lib/pokemon/gameFilters";
import AppImages from "@/constants/images";
import LocalIcon from "@/components/LocalIcon";
import { getCoverArtStyle } from "./gameDexHelpers";

type StatusFilter = "all" | "caught" | "shiny" | "alpha";

type Completion = {
  caught: number;
  shiny: number;
  alpha: number;
  caughtPct: number;
  shinyPct: number;
  alphaPct: number;
};

type ListItem = {
  id: number;
  name: string;
};

type Props<T extends ListItem> = {
  game: CreatureRealmGame;
  isPokopia: boolean;
  supportsShiny: boolean;
  supportsAlpha: boolean;
  loading: boolean;
  loadError: string | null;
  items: T[];
  filteredItems: T[];
  completion: Completion;
  statusFilter: StatusFilter;
  onChangeStatusFilter: (value: StatusFilter) => void;
  renderItem: ({ item }: { item: T }) => React.ReactElement;
  nestedInDashboard?: boolean;
};

function StatusChip({
  label,
  value,
  activeValue,
  supportsAlpha,
  game,
  onPress,
}: {
  label: string;
  value: StatusFilter;
  activeValue: StatusFilter;
  supportsAlpha: boolean;
  game: CreatureRealmGame;
  onPress: (value: StatusFilter) => void;
}) {
  const active = activeValue === value;

  const config = {
    caught: { color: game.accentColor[0], icon: "pokeball" },
    shiny: { color: "#facc15", icon: AppImages.shinyPokemonIcon },
    alpha: { color: "#ef4444", icon: AppImages.alphaPokemonIcon },
    all: { color: "#94a3b8", icon: null },
  }[value] || { color: "#94a3b8", icon: null };

  if (value === "alpha" && !supportsAlpha) return null;

  return (
    <Pressable
      onPress={() => onPress(value)}
      className="h-8 px-3 rounded-lg mr-2 mb-2 flex-row items-center border"
      style={{
        backgroundColor: active ? `${config.color}20` : "transparent",
        borderColor: active ? config.color : "rgba(255,255,255,0.1)",
      }}
    >
      {value === "caught" ? (
        <MaterialCommunityIcons name="pokeball" size={14} color={config.color} />
      ) : null}
      {(value === "shiny" || value === "alpha") && config.icon ? (
        <LocalIcon
          source={config.icon as any}
          size={14}
          tintColor={config.color}
          roundedClassName="rounded-none"
          placeholderClassName="bg-transparent border-0"
        />
      ) : null}

      <Text
        className={`text-[12px] font-medium ${value !== "all" ? "ml-1.5" : ""}`}
        style={{ color: active ? "#fff" : "rgba(255,255,255,0.6)" }}
      >
        {label}
      </Text>

      {active ? (
        <View className="w-1 h-1 rounded-full ml-1.5" style={{ backgroundColor: config.color }} />
      ) : null}
    </Pressable>
  );
}

function StatBar({
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
}) {
  return (
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
}

export default function GameDexContent<T extends ListItem>({
  game,
  isPokopia,
  supportsShiny,
  supportsAlpha,
  loading,
  loadError,
  items,
  filteredItems,
  completion,
  statusFilter,
  onChangeStatusFilter,
  renderItem,
  nestedInDashboard,
}: Props<T>) {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="text-slate-300 mt-2 text-sm">Loading {game.title} Pokédex…</Text>
      </View>
    );
  }

  const totalMon = items.length;
  const descriptionText = isPokopia
    ? "Explore Pokopia's custom sections and track dex progress."
    : supportsAlpha
      ? `Track your ${game.title} Pokédex completion by caught, shiny, and alpha forms.`
      : `Track your ${game.title} Pokédex completion by caught and shiny forms.`;

  const coverStyle = getCoverArtStyle(game);

  const tiles = (
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

  return (
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

                {game.releaseYear ? (
                  <View className="px-2 py-0.5 rounded-full mr-1 mb-1 bg-slate-900 border border-slate-700">
                    <Text className="text-[10px] text-slate-300">{game.releaseYear}</Text>
                  </View>
                ) : null}

                {typeof game.speciesCount === "number" ? (
                  <View className="px-2 py-0.5 rounded-full mr-1 mb-1 bg-slate-900 border border-slate-700">
                    <Text className="text-[10px] text-slate-300">{game.speciesCount} species</Text>
                  </View>
                ) : null}
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
              {supportsAlpha ? (
                <StatBar label="Alpha" value={completion.alpha} total={totalMon} pct={completion.alphaPct} barColor="#38bdf8" />
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap justify-center items-center">
        <StatusChip
          label="All"
          value="all"
          activeValue={statusFilter}
          supportsAlpha={supportsAlpha}
          game={game}
          onPress={onChangeStatusFilter}
        />
        <StatusChip
          label="Caught"
          value="caught"
          activeValue={statusFilter}
          supportsAlpha={supportsAlpha}
          game={game}
          onPress={onChangeStatusFilter}
        />
        {supportsShiny ? (
          <StatusChip
            label="Shiny"
            value="shiny"
            activeValue={statusFilter}
            supportsAlpha={supportsAlpha}
            game={game}
            onPress={onChangeStatusFilter}
          />
        ) : null}
        {supportsAlpha ? (
          <StatusChip
            label="Alpha"
            value="alpha"
            activeValue={statusFilter}
            supportsAlpha={supportsAlpha}
            game={game}
            onPress={onChangeStatusFilter}
          />
        ) : null}
      </View>

      {loadError ? (
        <View className="mt-4 mx-2 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-amber-200">Dex roster unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-amber-100/90">{loadError}</Text>
        </View>
      ) : null}

      {nestedInDashboard ? (
        tiles
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
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
}
