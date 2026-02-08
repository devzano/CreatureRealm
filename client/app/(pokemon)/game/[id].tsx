// app/game/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, Pressable } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  getPokemonList,
  extractPokemonIdFromUrl,
  type PokemonListResult,
  type PokemonListResponse,
} from "@/lib/pokemon";

import { usePokemonCollectionStore } from "@/store/pokemonCollectionStore";
import PageWrapper from "@/components/PageWrapper";
import { getGameById, type CreatureRealmGame } from "@/lib/pokemon/gameFilters";
import { fetchGameDexIds, type GameId } from "@/lib/pokemon/index";
import AppImages from "@/constants/images";
import LocalIcon from "@/components/LocalIcon";

type ListItem = {
  id: number;
  name: string;
  gameDexNumber: number;
};

type StatusFilter = "all" | "caught" | "shiny" | "alpha";

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCoverArtStyle(game: CreatureRealmGame | null) {
  const platform = game?.platforms?.[0] ?? "";

  if (platform.includes("Switch")) return { width: 88, aspectRatio: 10 / 17, maxHeight: 150 };
  if (platform.includes("Nintendo 3DS") || platform.includes("Nintendo DS"))
    return { width: 96, aspectRatio: 2 / 3, maxHeight: 150 };
  if (platform.includes("Game Boy Advance")) return { width: 92, aspectRatio: 2 / 3, maxHeight: 145 };
  if (platform.includes("Game Boy Color") || platform.includes("Game Boy"))
    return { width: 88, aspectRatio: 3 / 4, maxHeight: 135 };

  return { width: 96, aspectRatio: 3 / 4, maxHeight: 150 };
}

type CircleIconToggleProps = {
  active: boolean;
  activeColor: string;
  onPress: () => void;
  mciName?: string;
  imageSource?: any;
  size?: number;
  iconSize?: number;
};

function CircleIconToggle({
  active,
  activeColor,
  onPress,
  mciName,
  imageSource,
  size = 28,
  iconSize = 14,
}: CircleIconToggleProps) {
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
          <LocalIcon
            source={imageSource}
            size={iconSize}
            tintColor={active ? activeColor : "#9ca3af"}
            opacity={active ? 1 : 0.9}
            roundedClassName="rounded-none"
            placeholderClassName="bg-transparent border-0"
          />
        ) : (
          <MaterialCommunityIcons
            name={(mciName ?? "help-circle-outline") as any}
            size={iconSize}
            color={active ? activeColor : "#9ca3af"}
          />
        )}
      </View>
    </Pressable>
  );
}

export default function GameDexScreen() {
  const { id } = useLocalSearchParams<{ id: string; }>();
  const router = useRouter();

  const game = useMemo(() => (id ? getGameById(id) : null), [id]);

  const supportsAlpha = useMemo(() => {
    if (!game) return false;
    return game.id.toLowerCase().includes("legends");
  }, [game]);

  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const entries = usePokemonCollectionStore((state) => state.entries);
  const getEntry = usePokemonCollectionStore((state) => state.getEntry);
  const toggleCaught = usePokemonCollectionStore((state) => state.toggleCaught);
  const toggleShiny = usePokemonCollectionStore((state) => state.toggleShiny);
  const toggleAlpha = usePokemonCollectionStore((state) => state.toggleAlpha);

  useEffect(() => {
    if (!game) return;

    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);

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
        if (isMounted) setItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [game]);

  const completion = useMemo(() => {
    if (!game) return { caught: 0, shiny: 0, alpha: 0, caughtPct: 0, shinyPct: 0, alphaPct: 0 };

    const prefix = `${game.id}:`;
    let caught = 0;
    let shiny = 0;
    let alpha = 0;

    Object.entries(entries).forEach(([key, entry]) => {
      if (!key.startsWith(prefix)) return;
      if (entry.caught) caught++;
      if (entry.shiny) shiny++;
      if (supportsAlpha && entry.alpha) alpha++;
    });

    const total = items.length || 1;
    const caughtPct = Math.round((caught / total) * 100);
    const shinyPct = Math.round((shiny / total) * 100);
    const alphaPct = supportsAlpha ? Math.round((alpha / total) * 100) : 0;

    return { caught, shiny, alpha, caughtPct, shinyPct, alphaPct };
  }, [entries, game, items.length, supportsAlpha]);

  const filteredItems = useMemo(() => {
    if (!game) return [];
    if (!supportsAlpha && statusFilter === "alpha") return items;
    if (statusFilter === "all") return items;

    return items.filter((item) => {
      const entry = getEntry(game.id, item.id);
      if (statusFilter === "caught") return entry.caught;
      if (statusFilter === "shiny") return entry.shiny;
      if (statusFilter === "alpha") return supportsAlpha && entry.alpha;
      return true;
    });
  }, [items, statusFilter, game, entries, getEntry, supportsAlpha]);

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
            Generation {game.generationId}
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
    const spriteUrl =
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + item.id + ".png";
    const entry = getEntry(game.id, item.id);

    const isCaught = entry.caught;
    const borderColor = isCaught ? game.accentColor[0] : "#1f2937";
    const bgOpacity = isCaught ? 0.95 : 0.85;

    const CAUGHT_COLOR = game.accentColor[0];
    const SHINY_COLOR = "#facc15";
    const ALPHA_COLOR = "#ef4444";

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/pokemon/[id]",
            params: { id: String(item.id), gameId: game.id },
          })
        }
        className="w-1/2 p-2"
      >
        <View
          className="rounded-3xl p-3 border bg-slate-900"
          style={{
            borderColor,
            backgroundColor: `rgba(15,23,42,${bgOpacity})`,
          }}
        >
          <View className="flex-row justify-between items-start mb-1.5">
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${game.accentColor[0]}22` }}>
              <Text className="text-[10px] font-semibold tracking-wide" style={{ color: game.accentColor[0] }}>
                #{String(item.gameDexNumber).padStart(3, "0")}
              </Text>
            </View>

            <ExpoImage
              source={{ uri: spriteUrl }}
              style={{ width: 70, height: 70 }}
              contentFit="contain"
              transition={120}
              cachePolicy="disk"
            />
          </View>

          <View className="mt-1">
            <Text className="text-sm font-semibold text-slate-50" numberOfLines={1}>
              {capitalize(item.name)}
            </Text>
            <Text className="text-[10px] text-slate-400 mt-0.5">National #{String(item.id).padStart(3, "0")}</Text>
          </View>

          <View className="flex-row mt-2 justify-between items-center">
            <CircleIconToggle
              active={!!entry.caught}
              activeColor={CAUGHT_COLOR}
              mciName="pokeball"
              onPress={() => toggleCaught(game.id, item.id)}
              size={28}
              iconSize={14}
            />

            <CircleIconToggle
              active={!!entry.shiny}
              activeColor={SHINY_COLOR}
              imageSource={AppImages.shinyPokemonIcon}
              onPress={() => toggleShiny(game.id, item.id)}
              size={28}
              iconSize={14}
            />

            {supportsAlpha && (
              <CircleIconToggle
                active={!!entry.alpha}
                activeColor={ALPHA_COLOR}
                imageSource={AppImages.alphaPokemonIcon}
                onPress={() => toggleAlpha(game.id, item.id)}
                size={28}
                iconSize={14}
              />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const StatusChip = ({ label, value }: { label: string; value: StatusFilter; }) => {
    const active = statusFilter === value;

    const config = {
      caught: { color: game.accentColor[0], icon: "pokeball" },
      shiny: { color: "#facc15", icon: AppImages.shinyPokemonIcon },
      alpha: { color: "#ef4444", icon: AppImages.alphaPokemonIcon },
      all: { color: "#94a3b8", icon: null } // Fallback for 'all'
    }[value] || { color: "#94a3b8", icon: null };

    if (value === "alpha" && !supportsAlpha) return null;

    return (
      <Pressable
        onPress={() => setStatusFilter(value)}
        className="h-8 px-3 rounded-lg mr-2 mb-2 flex-row items-center border"
        style={{
          backgroundColor: active ? `${config.color}20` : "transparent",
          borderColor: active ? config.color : "rgba(255,255,255,0.1)",
        }}
      >
        {value === "caught" && (
          <MaterialCommunityIcons name="pokeball" size={14} color={config.color} />
        )}
        {(value === "shiny" || value === "alpha") && (
          <LocalIcon
            source={config.icon as any}
            size={14}
            tintColor={config.color}
            roundedClassName="rounded-none"
            placeholderClassName="bg-transparent border-0"
          />
        )}

        <Text
          className={`text-[12px] font-medium ${value !== 'all' ? 'ml-1.5' : ''}`}
          style={{ color: active ? "#fff" : "rgba(255,255,255,0.6)" }}
        >
          {label}
        </Text>

        {active && (
          <View
            className="w-1 h-1 rounded-full ml-1.5"
            style={{ backgroundColor: config.color }}
          />
        )}
      </Pressable>
    );
  };

  const StatBar = ({
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
  }) => (
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

  const totalMon = items.length;
  const descriptionText = supportsAlpha
    ? `Track your ${game.title} Pokédex completion by caught, shiny, and alpha forms.`
    : `Track your ${game.title} Pokédex completion by caught and shiny forms.`;

  const coverStyle = getCoverArtStyle(game);

  return (
    <PageWrapper
      title={game.title}
      subtitle={game.subtitle}
      leftActions={
        <Text className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: game.accentColor[0] }}>
          Generation {game.generationId}
        </Text>
      }
    >
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
                      GEN {game.generationId}
                    </Text>
                  </View>

                  {game.releaseYear && (
                    <View className="px-2 py-0.5 rounded-full mr-1 mb-1 bg-slate-900 border border-slate-700">
                      <Text className="text-[10px] text-slate-300">{game.releaseYear}</Text>
                    </View>
                  )}

                  {typeof game.speciesCount === "number" && (
                    <View className="px-2 py-0.5 rounded-full mr-1 mb-1 bg-slate-900 border border-slate-700">
                      <Text className="text-[10px] text-slate-300">{game.speciesCount} species</Text>
                    </View>
                  )}
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
                <StatBar label="Shiny" value={completion.shiny} total={totalMon} pct={completion.shinyPct} barColor="#facc15" />
                {supportsAlpha && <StatBar label="Alpha" value={completion.alpha} total={totalMon} pct={completion.alphaPct} barColor="#38bdf8" />}
              </View>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap justify-center items-center">
          <StatusChip label="All" value="all" />
          <StatusChip label="Caught" value="caught" />
          <StatusChip label="Shiny" value="shiny" />
          {supportsAlpha && <StatusChip label="Alpha" value="alpha" />}
        </View>

        <FlatList
          data={filteredItems}
          keyExtractor={(i) => String(i.id)}
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
      </View>
    </PageWrapper>
  );
}
