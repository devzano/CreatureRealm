import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { fetchPokopiaFoodFlavorItems, type PokopiaFoodItem, type PokopiaFoodPage } from "@/lib/pokemon/pokopia/food";
import {
  fetchPokopiaFilteredItemsPage,
  type PokopiaFilteredItemsPage,
} from "@/lib/pokemon/pokopia/itemFilters";
import { POKOPIA_EFFECTS, POKOPIA_FAVORITES } from "./config";
import PokopiaSearchInput from "./PokopiaSearchInput";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";
import { getPokopiaFavoriteTheme } from "./favoritePresentation";
import { usePokopiaCollectionStore } from "@/store/pokopiaCollectionStore";

type Props = {
  foodPage: PokopiaFoodPage | null;
  foodLoading: boolean;
  foodError: string | null;
};

type ThemeEntry =
  | {
      key: string;
      kind: "favorite";
      label: string;
      slug: string;
      subtitle: string;
      iconUrl?: string;
    }
  | {
      key: string;
      kind: "effect";
      label: string;
      slug: string;
      subtitle: string;
      iconUrl: string;
    }
  | {
      key: string;
      kind: "flavor";
      label: string;
      slug: string;
      subtitle: string;
      iconUrl?: string;
    };

type FavoriteFilterItem = (typeof POKOPIA_FAVORITES)[number];
type FavoriteFilterColumn = {
  key: string;
  items: FavoriteFilterItem[];
};

function toTitleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

const FavoriteFilterChip = React.memo(function FavoriteFilterChip({
  favorite,
  active,
  onPress,
}: {
  favorite: FavoriteFilterItem;
  active: boolean;
  onPress: () => void;
}) {
  const theme = getPokopiaFavoriteTheme(favorite.label, favorite.href);

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 rounded-2xl border px-3 py-2 h-[42px] min-w-[158px] justify-center"
      style={{
        backgroundColor: active ? theme.bg : "rgba(15,23,42,0.72)",
        borderColor: active ? theme.border : "rgba(51,65,85,0.9)",
      }}
    >
      <View className="flex-row items-center">
        {favorite.iconUrl ? (
          <ExpoImage
            source={{ uri: favorite.iconUrl }}
            style={{ width: 14, height: 14 }}
            contentFit="contain"
            transition={120}
          />
        ) : null}
        <Text
          className="text-[11px] font-semibold flex-1"
          style={{
            color: active ? theme.text : "#cbd5e1",
            marginLeft: favorite.iconUrl ? 6 : 0,
          }}
          numberOfLines={1}
        >
          {favorite.label}
        </Text>
      </View>
    </Pressable>
  );
});

export default function PokopiaThemesContent({
  foodPage,
  foodLoading,
  foodError,
}: Props) {
  const [search, setSearch] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedFavoriteSlug, setSelectedFavoriteSlug] = useState<string | null>(null);
  const [selectedEffectSlug, setSelectedEffectSlug] = useState<string | null>(null);
  const [selectedFlavorSlug, setSelectedFlavorSlug] = useState<string | null>(null);
  const [filteredPage, setFilteredPage] = useState<PokopiaFilteredItemsPage | null>(null);
  const [filteredPageLoading, setFilteredPageLoading] = useState(false);
  const [filteredPageError, setFilteredPageError] = useState<string | null>(null);
  const [flavorItems, setFlavorItems] = useState<PokopiaFoodItem[]>([]);
  const [flavorItemsLoading, setFlavorItemsLoading] = useState(false);
  const [flavorItemsError, setFlavorItemsError] = useState<string | null>(null);
  const foodEffect = useMemo(() => POKOPIA_EFFECTS.find((effect) => effect.slug === "food") ?? null, []);
  const nonFoodEffects = useMemo(() => POKOPIA_EFFECTS.filter((effect) => effect.slug !== "food"), []);
  const collectedItems = usePokopiaCollectionStore((state) => state.collected.item);
  const collectedItemSet = useMemo(() => new Set(collectedItems), [collectedItems]);

  const themeEntries = useMemo<ThemeEntry[]>(() => {
    const favorites = POKOPIA_FAVORITES.map((favorite) => ({
      key: `favorite-${favorite.slug}`,
      kind: "favorite" as const,
      label: favorite.label,
      slug: favorite.slug,
      subtitle: "Favorite",
      iconUrl: favorite.iconUrl,
    }));

    const effects = nonFoodEffects.map((effect) => ({
      key: `effect-${effect.slug}`,
      kind: "effect" as const,
      label: effect.label,
      slug: effect.slug,
      subtitle: `${effect.count} items`,
      iconUrl: effect.iconUrl,
    }));

    const flavors = (foodPage?.flavors ?? []).map((flavor) => ({
      key: `flavor-${flavor.routeSlug}`,
      kind: "flavor" as const,
      label: flavor.label,
      slug: flavor.routeSlug,
      subtitle: "Flavor",
      iconUrl: flavor.iconUrl,
    }));
    return [...favorites, ...effects, ...flavors];
  }, [foodPage, nonFoodEffects]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return themeEntries;
    return themeEntries.filter((entry) => `${entry.label} ${entry.subtitle}`.toLowerCase().includes(query));
  }, [search, themeEntries]);

  const filteredFavorites = filteredEntries.filter((entry) => entry.kind === "favorite");
  const filteredEffects = filteredEntries.filter((entry) => entry.kind === "effect");
  const filteredFlavors = filteredEntries.filter((entry) => entry.kind === "flavor");

  const selectedFavorite = useMemo(
    () => POKOPIA_FAVORITES.find((favorite) => favorite.slug === selectedFavoriteSlug) ?? null,
    [selectedFavoriteSlug]
  );
  const selectedEffect = useMemo(
    () => POKOPIA_EFFECTS.find((effect) => effect.slug === selectedEffectSlug) ?? null,
    [selectedEffectSlug]
  );
  const selectedFlavor = useMemo(
    () => foodPage?.flavors.find((flavor) => flavor.routeSlug === selectedFlavorSlug) ?? null,
    [foodPage, selectedFlavorSlug]
  );
  const isFoodMode = selectedEffectSlug === "food" || !!selectedFlavorSlug;
  const favoriteIconBySlug = useMemo(
    () => new Map(POKOPIA_FAVORITES.map((favorite) => [favorite.slug, favorite.iconUrl])),
    []
  );
  const foodModeItems = useMemo(
    () => (selectedEffectSlug === "food" && !selectedFlavorSlug ? foodPage?.items ?? [] : []),
    [foodPage, selectedEffectSlug, selectedFlavorSlug]
  );
  const favoriteFilterColumns = useMemo<FavoriteFilterColumn[]>(
    () =>
      Array.from({ length: Math.ceil(POKOPIA_FAVORITES.length / 2) }, (_, columnIndex) => ({
        key: `favorite-column-${columnIndex}`,
        items: POKOPIA_FAVORITES.slice(columnIndex * 2, columnIndex * 2 + 2),
      })),
    []
  );
  const groupedFlavorItems = useMemo(() => {
    const collected: PokopiaFoodItem[] = [];
    const needed: PokopiaFoodItem[] = [];

    for (const item of flavorItems) {
      const slug = String(item.slug).trim().toLowerCase();
      if (collectedItemSet.has(slug)) collected.push(item);
      else needed.push(item);
    }

    return [
      { key: "collected", label: "Collected", items: collected },
      { key: "needed", label: "Need", items: needed },
    ].filter((group) => group.items.length > 0);
  }, [flavorItems, collectedItemSet]);
  const groupedFoodModeItems = useMemo(() => {
    const collected: PokopiaFoodItem[] = [];
    const needed: PokopiaFoodItem[] = [];

    for (const item of foodModeItems) {
      const slug = String(item.slug).trim().toLowerCase();
      if (collectedItemSet.has(slug)) collected.push(item);
      else needed.push(item);
    }

    return [
      { key: "collected", label: "Collected", items: collected },
      { key: "needed", label: "Need", items: needed },
    ].filter((group) => group.items.length > 0);
  }, [foodModeItems, collectedItemSet]);

  useEffect(() => {
    let cancelled = false;

    if (!sheetVisible) {
      setFilteredPage(null);
      setFilteredPageError(null);
      setFilteredPageLoading(false);
      setFlavorItems([]);
      setFlavorItemsError(null);
      setFlavorItemsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (selectedFlavorSlug) {
      (async () => {
        try {
          setFlavorItemsLoading(true);
          setFlavorItemsError(null);
          setFilteredPage(null);
          const nextItems = await fetchPokopiaFoodFlavorItems(selectedFlavorSlug);
          if (cancelled) return;
          setFlavorItems(nextItems);
        } catch (error) {
          if (cancelled) return;
          setFlavorItems([]);
          setFlavorItemsError(error instanceof Error ? error.message : "Failed to load flavor items.");
        } finally {
          if (!cancelled) setFlavorItemsLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    if (selectedEffectSlug === "food" && !selectedFavoriteSlug) {
      setFilteredPage(null);
      setFilteredPageError(null);
      setFilteredPageLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!selectedFavoriteSlug && !selectedEffectSlug) {
      setFilteredPage(null);
      setFilteredPageError(null);
      setFilteredPageLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        setFilteredPageLoading(true);
        setFilteredPageError(null);
        setFlavorItems([]);
        const nextPage = await fetchPokopiaFilteredItemsPage({
          favoriteSlug: selectedFavoriteSlug,
          tagSlug: selectedEffectSlug,
        });
        if (cancelled) return;
        setFilteredPage(nextPage);
      } catch (error) {
        if (cancelled) return;
        setFilteredPage(null);
        setFilteredPageError(error instanceof Error ? error.message : "Failed to load filtered items.");
      } finally {
        if (!cancelled) setFilteredPageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedEffectSlug, selectedFavoriteSlug, selectedFlavorSlug, sheetVisible]);

  function openEntry(entry: ThemeEntry) {
    if (entry.kind === "favorite") {
      setSelectedFavoriteSlug(entry.slug);
      setSelectedEffectSlug(null);
      setSelectedFlavorSlug(null);
    } else if (entry.kind === "effect") {
      setSelectedFavoriteSlug(null);
      setSelectedEffectSlug(entry.slug);
      setSelectedFlavorSlug(null);
    } else {
      setSelectedFavoriteSlug(null);
      setSelectedEffectSlug(null);
      setSelectedFlavorSlug(entry.slug);
    }

    setSheetVisible(true);
  }

  function renderTile(entry: ThemeEntry) {
    const href =
      entry.kind === "favorite"
        ? `https://pokopiadex.com/pokedex/favorites/${entry.slug}`
        : entry.kind === "effect"
          ? `https://pokopiadex.com/items?tag=${entry.slug}`
          : entry.slug === "no-flavor"
            ? "https://pokopiadex.com/food/no-flavor"
            : `https://pokopiadex.com/food/${entry.slug}`;
    const theme = getPokopiaFavoriteTheme(entry.label, href);

    return (
      <View key={entry.key} className="w-1/3 px-1 mb-2">
        <Pressable
          onPress={() => openEntry(entry)}
          className="rounded-3xl border overflow-hidden"
          style={{
            minHeight: 128,
            backgroundColor: theme.bg,
            borderColor: theme.border,
          }}
        >
          <View className="px-3 py-4 flex-1 justify-between">
            <View className="items-center">
              {entry.iconUrl ? (
                <View className="w-11 h-11 rounded-2xl overflow-hidden mb-3 items-center justify-center bg-white/10">
                  <ExpoImage
                    source={{ uri: entry.iconUrl }}
                    style={{ width: 24, height: 24 }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}
              <Text className="text-[13px] font-semibold leading-5 text-center" style={{ color: theme.text }}>
                {toTitleCase(entry.label)}
              </Text>
            </View>
            <Text className="text-[11px] font-semibold mt-3 text-center" style={{ color: theme.hint }}>
              {entry.subtitle}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 px-2 pt-4">
      <View className="mb-4">
        <View className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4">
          <Text className="text-[16px] font-semibold text-slate-50">Filters, Effects, and Flavors</Text>
          <Text className="mt-1 text-[12px] leading-5 text-slate-400">
            Use favorites for broad item themes, use effect filters for décor-focused item sets, and use Food plus Flavors for cooking-specific browsing.
          </Text>

          <View className="mt-3 flex-row flex-wrap -mx-1">
            <View className="w-1/3 px-1">
              <View className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 items-center">
                <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Favorites</Text>
                <Text className="mt-1 text-[18px] font-semibold text-slate-100">{POKOPIA_FAVORITES.length}</Text>
              </View>
            </View>
            <View className="w-1/3 px-1">
              <View className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 items-center">
                <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Effects</Text>
                <Text className="mt-1 text-[18px] font-semibold text-slate-100">{nonFoodEffects.length}</Text>
              </View>
            </View>
            <View className="w-1/3 px-1">
              <View className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 items-center">
                <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Flavors</Text>
                <Text className="mt-1 text-[18px] font-semibold text-slate-100">{foodPage?.flavors.length ?? 0}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="mb-4">
        <PokopiaSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search themes, effects, or flavors..."
        />
      </View>

      {foodLoading && !foodPage ? (
        <PokopiaLoadingState label="Loading Pokopia themes…" />
      ) : foodError && !foodPage ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Filters unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{foodError}</Text>
        </View>
      ) : !filteredEntries.length ? (
        <PokopiaEmptyState
          title="No themes to show"
          message="Try a different search term."
        />
      ) : (
        <>
          {filteredFavorites.length ? (
            <View className="mb-3">
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Favorites
                </Text>
              </View>
              <View className="flex-row flex-wrap -mx-1">
                {filteredFavorites.map(renderTile)}
              </View>
            </View>
          ) : null}

          {filteredEffects.length ? (
            <View className="mb-3">
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Effects
                </Text>
              </View>
              <View className="flex-row flex-wrap -mx-1">
                {filteredEffects.map(renderTile)}
              </View>
            </View>
          ) : null}

          {foodEffect ? (
            <View className="mb-3">
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Food & Flavors
                </Text>
              </View>
              <View className="flex-row flex-wrap -mx-1">
                {renderTile({
                  key: `effect-${foodEffect.slug}`,
                  kind: "effect",
                  label: foodEffect.label,
                  slug: foodEffect.slug,
                  subtitle: `${foodEffect.count} items`,
                  iconUrl: foodEffect.iconUrl,
                })}
                {filteredFlavors.map(renderTile)}
              </View>
            </View>
          ) : null}

        </>
      )}

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={() => {
          setSheetVisible(false);
          setSelectedFavoriteSlug(null);
          setSelectedEffectSlug(null);
          setSelectedFlavorSlug(null);
        }}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                {selectedFlavor?.label ??
                  (selectedFavorite?.label && selectedEffect?.label
                    ? `${selectedFavorite.label} + ${selectedEffect.label}`
                    : selectedFavorite?.label ?? selectedEffect?.label ?? "Filter")}
              </Text>
              <Text className="text-slate-400 text-[12px] mt-0.5">
                {selectedFlavor ? "Flavor Filter" : isFoodMode ? "Food Filter" : "Item Filter"}
              </Text>
            </View>

            <View className="items-end">
              {(selectedFavoriteSlug || selectedEffectSlug || selectedFlavorSlug) ? (
                <Pressable
                  onPress={() => {
                    setSelectedFavoriteSlug(null);
                    setSelectedEffectSlug(null);
                    setSelectedFlavorSlug(null);
                  }}
                  className="h-10 flex-row items-center rounded-full border border-cyan-400/45 bg-cyan-500/12 px-3"
                >
                  <Ionicons name="arrow-back" size={16} color="#a5f3fc" />
                  <Text className="ml-1.5 text-[12px] font-semibold text-cyan-100">Back</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => {
                  setSheetVisible(false);
                  setSelectedFavoriteSlug(null);
                  setSelectedEffectSlug(null);
                  setSelectedFlavorSlug(null);
                }}
                className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 mt-2"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>
          </View>

          {!isFoodMode ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Favorites
              </Text>
              <FlatList
                data={favoriteFilterColumns}
                horizontal
                showsHorizontalScrollIndicator={false}
                directionalLockEnabled
                nestedScrollEnabled
                removeClippedSubviews
                initialNumToRender={5}
                maxToRenderPerBatch={6}
                windowSize={4}
                keyExtractor={(column) => column.key}
                getItemLayout={(_, index) => ({
                  length: 168,
                  offset: 168 * index,
                  index,
                })}
                contentContainerStyle={{ paddingRight: 8 }}
                renderItem={({ item: column }) => (
                  <View className="mr-2">
                    {column.items.map((favorite) => {
                      const active = selectedFavoriteSlug === favorite.slug;

                      return (
                        <FavoriteFilterChip
                          key={favorite.slug}
                          favorite={favorite}
                          active={active}
                          onPress={() => {
                            setSelectedFlavorSlug(null);
                            setSelectedFavoriteSlug(active ? null : favorite.slug);
                          }}
                        />
                      );
                    })}
                  </View>
                )}
              />
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
              {isFoodMode ? "Food" : "Effects"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(isFoodMode ? [foodEffect].filter(Boolean) : nonFoodEffects).map((effect) => {
                const active = selectedEffectSlug === effect.slug;
                const theme = getPokopiaFavoriteTheme(effect.label, effect.href);

                return (
                  <Pressable
                    key={effect.slug}
                    onPress={() => {
                      setSelectedFlavorSlug(null);
                      setSelectedEffectSlug(active ? null : effect.slug);
                    }}
                    className="mr-2 mb-1 rounded-full border px-3 py-1.5"
                    style={{
                      backgroundColor: active ? theme.bg : "rgba(15,23,42,0.72)",
                      borderColor: active ? theme.border : "rgba(51,65,85,0.9)",
                    }}
                  >
                    <View className="flex-row items-center">
                      <ExpoImage
                        source={{ uri: effect.iconUrl }}
                        style={{ width: 14, height: 14 }}
                        contentFit="contain"
                        transition={120}
                      />
                      <Text
                        className="ml-1.5 text-[11px] font-semibold"
                        style={{ color: active ? theme.text : "#cbd5e1" }}
                      >
                        {effect.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {isFoodMode ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Flavors
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(foodPage?.flavors ?? []).map((flavor) => {
                  const active = selectedFlavorSlug === flavor.routeSlug;
                  const theme = getPokopiaFavoriteTheme(flavor.label);

                  return (
                    <Pressable
                      key={flavor.slug}
                      onPress={() => {
                        const nextActive = active ? null : flavor.routeSlug;
                        setSelectedFavoriteSlug(null);
                        setSelectedEffectSlug("food");
                        setSelectedFlavorSlug(nextActive);
                      }}
                      className="mr-2 mb-1 rounded-full border px-3 py-1.5"
                      style={{
                        backgroundColor: active ? theme.bg : "rgba(15,23,42,0.72)",
                        borderColor: active ? theme.border : "rgba(51,65,85,0.9)",
                      }}
                    >
                      <View className="flex-row items-center">
                        {flavor.iconUrl ? (
                          <ExpoImage
                            source={{ uri: flavor.iconUrl }}
                            style={{ width: 14, height: 14 }}
                            contentFit="contain"
                            transition={120}
                          />
                        ) : null}
                        <Text
                          className="text-[11px] font-semibold"
                          style={{ color: active ? theme.text : "#cbd5e1", marginLeft: flavor.iconUrl ? 6 : 0 }}
                        >
                          {flavor.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {!selectedFavoriteSlug && !selectedEffectSlug && !selectedFlavorSlug ? (
            <PokopiaEmptyState
              title="Pick a filter"
              message="Select a favorite, effect, or flavor to see matching items."
            />
          ) : selectedFlavorSlug ? (
            flavorItemsLoading ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-slate-300">Loading flavor items…</Text>
              </View>
            ) : flavorItemsError ? (
              <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
                <Text className="text-sm font-semibold text-rose-200">Flavor unavailable</Text>
                <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{flavorItemsError}</Text>
              </View>
            ) : !flavorItems.length ? (
              <PokopiaEmptyState
                title="No flavor items"
                message="No food items matched this flavor."
              />
            ) : (
              <>
                {groupedFlavorItems.map((group) => (
                  <View key={group.key} className="mb-4">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                      {group.label} • {group.items.length}
                    </Text>
                    <View className="flex-row flex-wrap -mx-1">
                      {group.items.map((item) => {
                        const collected = collectedItemSet.has(String(item.slug).trim().toLowerCase());

                        return (
                          <View key={item.slug} className="w-1/3 px-1 mb-2">
                            <View className="rounded-2xl bg-slate-950 border border-slate-800 px-2.5 py-3 items-center overflow-hidden">
                              {collected ? (
                                <View className="absolute top-2 right-2 z-10 rounded-full bg-[#6DDA5F] border border-white/70 px-1.5 py-1">
                                  <Ionicons name="checkmark" size={12} color="#fff" />
                                </View>
                              ) : null}
                              <ExpoImage
                                source={{ uri: item.imageUrl }}
                                style={{ width: 48, height: 48 }}
                                contentFit="contain"
                                transition={120}
                              />
                              <Text numberOfLines={2} className="mt-1.5 text-[11px] font-semibold text-slate-100 text-center">
                                {item.name}
                              </Text>
                              <Text numberOfLines={2} className="mt-1 text-[10px] text-slate-400 text-center">
                                {item.description}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </>
            )
          ) : selectedEffectSlug === "food" ? (
            !foodModeItems.length ? (
              <PokopiaEmptyState
                title="No food items"
                message="No food items are available right now."
              />
            ) : (
              <>
                {groupedFoodModeItems.map((group) => (
                  <View key={group.key} className="mb-4">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                      {group.label} • {group.items.length}
                    </Text>
                    <View className="flex-row flex-wrap -mx-1">
                      {group.items.map((item) => {
                        const collected = collectedItemSet.has(String(item.slug).trim().toLowerCase());

                        return (
                          <View key={item.slug} className="w-1/3 px-1 mb-2">
                            <View className="rounded-2xl bg-slate-950 border border-slate-800 px-2.5 py-3 items-center overflow-hidden">
                              {collected ? (
                                <View className="absolute top-2 right-2 z-10 rounded-full bg-[#6DDA5F] border border-white/70 px-1.5 py-1">
                                  <Ionicons name="checkmark" size={12} color="#fff" />
                                </View>
                              ) : null}
                              <ExpoImage
                                source={{ uri: item.imageUrl }}
                                style={{ width: 48, height: 48 }}
                                contentFit="contain"
                                transition={120}
                              />
                              <Text numberOfLines={2} className="mt-1.5 text-[11px] font-semibold text-slate-100 text-center">
                                {item.name}
                              </Text>
                              <Text numberOfLines={2} className="mt-1 text-[10px] text-slate-400 text-center">
                                {item.description}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </>
            )
          ) : filteredPageLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading filtered items…</Text>
            </View>
          ) : filteredPageError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
              <Text className="text-sm font-semibold text-rose-200">Filter unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{filteredPageError}</Text>
            </View>
          ) : filteredPage ? (
            <>
              <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3 mb-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {filteredPage.countLabel}
                </Text>
                {filteredPage.description ? (
                  <Text className="mt-2 text-[13px] leading-5 text-slate-300">
                    {filteredPage.description}
                  </Text>
                ) : null}
              </View>

              {filteredPage.groups.map((group, groupIndex) => (
                <View key={`${group.label}-${groupIndex}`} className="mb-4">
                  <View className="px-1 mb-2">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {group.label}
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      {group.items.length} items
                    </Text>
                  </View>
                  {[
                    {
                      key: "collected",
                      label: "Collected",
                      items: group.items.filter((item) =>
                        collectedItemSet.has(String(item.slug).trim().toLowerCase())
                      ),
                    },
                    {
                      key: "needed",
                      label: "Need",
                      items: group.items.filter(
                        (item) => !collectedItemSet.has(String(item.slug).trim().toLowerCase())
                      ),
                    },
                  ]
                    .filter((section) => section.items.length > 0)
                    .map((section) => (
                      <View key={`${group.label}-${section.key}`} className="mb-3">
                        <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2 px-1">
                          {section.label} • {section.items.length}
                        </Text>

                        <View className="flex-row flex-wrap -mx-1">
                          {section.items.map((item) => {
                            const collected = collectedItemSet.has(String(item.slug).trim().toLowerCase());

                            return (
                              <View key={item.slug} className="w-1/3 px-1 mb-2">
                                <View className="rounded-3xl bg-slate-950 border border-slate-800 px-2.5 py-3 overflow-hidden">
                                  {collected ? (
                                    <View className="absolute top-2 right-2 z-10 rounded-full bg-[#6DDA5F] border border-white/70 px-1.5 py-1">
                                      <Ionicons name="checkmark" size={12} color="#fff" />
                                    </View>
                                  ) : null}

                                  <View className="items-center">
                                    <ExpoImage
                                      source={{ uri: item.imageUrl }}
                                      style={{ width: 48, height: 48 }}
                                      contentFit="contain"
                                      transition={120}
                                    />
                                  </View>

                                  <Text numberOfLines={2} className="mt-1.5 text-[11px] font-semibold text-slate-100 text-center">
                                    {item.name}
                                  </Text>

                                  {item.description ? (
                                    <Text numberOfLines={2} className="mt-1 text-[10px] text-slate-400 text-center">
                                      {item.description}
                                    </Text>
                                  ) : null}

                                  <View className="flex-row flex-wrap mt-2">
                                    {!isFoodMode && !selectedEffectSlug
                                      ? item.effects
                                          .filter((effect) => effect.slug !== "food")
                                          .map((effect) => (
                                            <Pressable
                                              key={`${item.slug}-effect-${effect.slug}`}
                                              onPress={() => {
                                                setSelectedFlavorSlug(null);
                                                setSelectedEffectSlug(effect.slug);
                                              }}
                                              className="mr-2 mb-2 rounded-full border px-2 py-1"
                                              style={{
                                                backgroundColor: "rgba(15,23,42,0.72)",
                                                borderColor: "rgba(51,65,85,0.9)",
                                              }}
                                            >
                                              <View className="flex-row items-center">
                                                {effect.iconUrl ? (
                                                  <ExpoImage
                                                    source={{ uri: effect.iconUrl }}
                                                    style={{ width: 11, height: 11 }}
                                                    contentFit="contain"
                                                    transition={120}
                                                  />
                                                ) : null}
                                                <Text className="ml-1 text-[9px] font-semibold text-slate-200">
                                                  {effect.label}
                                                </Text>
                                              </View>
                                            </Pressable>
                                          ))
                                      : null}

                                    {item.isRecipe ? (
                                      <View className="mr-2 mb-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1">
                                        <Text className="text-[10px] font-semibold text-amber-200">Recipe</Text>
                                      </View>
                                    ) : null}

                                    {!isFoodMode && selectedEffectSlug
                                      ? item.favorites.map((favorite) => {
                                          const theme = getPokopiaFavoriteTheme(
                                            favorite.label,
                                            `https://pokopiadex.com/pokedex/favorites/${favorite.slug}`
                                          );
                                          const iconUrl = favoriteIconBySlug.get(favorite.slug);

                                          return (
                                            <Pressable
                                              key={`${item.slug}-favorite-${favorite.slug}`}
                                              onPress={() => {
                                                setSelectedFlavorSlug(null);
                                                setSelectedFavoriteSlug(favorite.slug);
                                              }}
                                              className="mr-2 mb-2 rounded-full border px-2 py-1"
                                              style={{
                                                backgroundColor: theme.bg,
                                                borderColor: theme.border,
                                              }}
                                            >
                                              <View className="flex-row items-center">
                                                {iconUrl ? (
                                                  <ExpoImage
                                                    source={{ uri: iconUrl }}
                                                    style={{ width: 11, height: 11 }}
                                                    contentFit="contain"
                                                    transition={120}
                                                  />
                                                ) : null}
                                                <Text
                                                  className="text-[9px] font-semibold"
                                                  style={{ color: theme.text, marginLeft: iconUrl ? 4 : 0 }}
                                                >
                                                  {favorite.label}
                                                </Text>
                                              </View>
                                            </Pressable>
                                          );
                                        })
                                      : null}
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}
