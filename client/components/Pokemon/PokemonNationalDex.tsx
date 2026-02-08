// components/Pokemon/PokemonNationalDex.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { getPokemonList, extractPokemonIdFromUrl, type PokemonListResult, type PokemonListResponse } from "@/lib/pokemon/index";

export type DexViewMode = "national" | "generation" | "region" | "game";

type ListItem = {
  id: number;
  name: string;
};

type PokemonNationalDexProps = {
  search: string;
  from?: number; // National Dex start (inclusive)
  to?: number; // National Dex end (inclusive)
  viewMode: DexViewMode; // currently only "national"
};

const PAGE_SIZE = 50;

let NATIONAL_DEX_CACHE: ListItem[] | null = null;

type DexTileProps = {
  item: ListItem;
  onPress: (name: string) => void;
};

const DexTile: React.FC<DexTileProps> = ({ item, onPress }) => {
  const spriteUrl =
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + item.id + ".png";

  return (
    <Pressable onPress={() => onPress(item.name)} className="w-1/3 p-1">
      <View className="rounded-3xl p-3 border mb-1 bg-slate-900/80 border-slate-700 items-center">
        <ExpoImage
          source={{ uri: spriteUrl }}
          style={{ width: 60, height: 60 }}
          contentFit="contain"
          transition={120}
          cachePolicy="disk"
        />
        <Text className="text-[11px] text-slate-400 mt-1">#{String(item.id).padStart(3, "0")}</Text>
        <Text className="text-xs font-semibold text-slate-50 text-center" numberOfLines={1}>
          {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
        </Text>
      </View>
    </Pressable>
  );
};

const PokemonNationalDex: React.FC<PokemonNationalDexProps> = ({ search, from, to, viewMode }) => {
  void viewMode;
  const router = useRouter();

  const [allItems, setAllItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transformResponse = (res: PokemonListResponse): ListItem[] =>
    res.results
      .map((p: PokemonListResult) => {
        const id = extractPokemonIdFromUrl(p.url);
        if (id == null) return null;
        return { id, name: p.name };
      })
      .filter(Boolean) as ListItem[];

  const normalizedQuery = search.trim().toLowerCase();

  useEffect(() => {
    let cancelled = false;

    const loadAllPokemon = async () => {
      try {
        setError(null);

        if (NATIONAL_DEX_CACHE && !cancelled) {
          setAllItems(NATIONAL_DEX_CACHE);
          setLoading(false);
          return;
        }

        setLoading(true);
        let offset = 0;
        let aggregated: ListItem[] = [];
        let hasMore = true;

        while (hasMore && !cancelled) {
          const res = await getPokemonList(PAGE_SIZE, offset);
          const pageItems = transformResponse(res);
          aggregated = aggregated.concat(pageItems);

          if (res.next == null) {
            hasMore = false;
          } else {
            offset += PAGE_SIZE;
          }
        }

        if (cancelled) return;

        const seen = new Set<number>();
        const deduped: ListItem[] = [];
        for (const item of aggregated) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            deduped.push(item);
          }
        }

        NATIONAL_DEX_CACHE = deduped;
        setAllItems(deduped);
        setLoading(false);
      } catch (e) {
        console.error("Failed to fetch full Pokémon list", e);
        if (!cancelled) {
          setError("Failed to load the National Pokédex.");
          setLoading(false);
        }
      }
    };

    loadAllPokemon();

    return () => {
      cancelled = true;
    };
  }, []);

  const rangedItems = useMemo(() => {
    let base = allItems;

    if (typeof from === "number") base = base.filter((item) => item.id >= from);
    if (typeof to === "number") base = base.filter((item) => item.id <= to);

    return base;
  }, [allItems, from, to]);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return rangedItems;

    return rangedItems.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(normalizedQuery);
      const idMatch = String(item.id).includes(normalizedQuery);
      return nameMatch || idMatch;
    });
  }, [rangedItems, normalizedQuery]);

  const handlePress = (name: string) => {
    router.push({
      pathname: "/pokemon/[id]",
      params: { id: name },
    } as any);
  };

  const renderItem = ({ item }: { item: ListItem }) => <DexTile item={item} onPress={handlePress} />;

  if (loading && allItems.length === 0) {
    return (
      <View className="flex-1 items-center justify-center mt-4">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-slate-300">Loading National Pokédex…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center mt-4 px-4">
        <Text className="text-sm text-rose-300 text-center">{error}</Text>
      </View>
    );
  }

  if (!loading && filteredItems.length === 0) {
    return (
      <View className="flex-1 items-center justify-center mt-4 px-4">
        <Text className="text-sm text-slate-400 text-center">No Pokémon found in this view. Try a different search.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredItems}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      numColumns={3}
      contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 24 }}
    />
  );
};

export default PokemonNationalDex;
