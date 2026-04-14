import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { ItemCategoryFilter } from "./config";
import { ITEM_CATEGORY_FILTERS } from "./config";
import PokopiaFavoriteChip from "./PokopiaFavoriteChip";
import PokopiaCollectToggleButton from "./PokopiaCollectToggleButton";
import PokopiaFavoriteDetailSheet from "./PokopiaFavoriteDetailSheet";
import PokopiaItemVariantStrip from "./PokopiaItemVariantStrip";
import PokopiaSearchInput from "./PokopiaSearchInput";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";
import type { PokopiaItemDetail } from "@/lib/pokemon/pokopia/itemDetail";
import { resolveFavoriteSlug } from "@/lib/pokemon/pokopia/favoriteUtils";
import type { PokopiaItem } from "@/lib/pokemon/pokopia/items";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { usePokopiaCollectionStore } from "@/store/pokopiaCollectionStore";

type Props = {
  filteredPokopiaItems: PokopiaItem[];
  pokopiaItemsLoading: boolean;
  pokopiaItemsError: string | null;
  selectedItemSlug: string | null;
  selectedItemDetail: PokopiaItemDetail | null;
  selectedItemLoading: boolean;
  selectedItemError: string | null;
  selectedItemCategory: ItemCategoryFilter;
  itemSearch: string;
  onSelectItemCategory: (category: ItemCategoryFilter) => void;
  onChangeItemSearch: (value: string) => void;
  onSelectItemSlug: (slug: string | null) => void;
  onClearSelectedItemDetail: () => void;
  onClearSelectedItemError: () => void;
};

export default function PokopiaItemsContent({
  filteredPokopiaItems,
  pokopiaItemsLoading,
  pokopiaItemsError,
  selectedItemSlug,
  selectedItemDetail,
  selectedItemLoading,
  selectedItemError,
  selectedItemCategory,
  itemSearch,
  onSelectItemCategory,
  onChangeItemSearch,
  onSelectItemSlug,
  onClearSelectedItemDetail,
  onClearSelectedItemError,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PokopiaItem | null>(null);
  const [favoriteSheetVisible, setFavoriteSheetVisible] = useState(false);
  const [selectedFavoriteLabel, setSelectedFavoriteLabel] = useState<string | null>(null);
  const [selectedFavoriteSlug, setSelectedFavoriteSlug] = useState<string | null>(null);
  const lastItem = useRef<PokopiaItem | null>(null);
  const collectedItems = usePokopiaCollectionStore((state) => state.collected.item);
  const collectedItemSet = useMemo(() => new Set(collectedItems), [collectedItems]);
  const groupedItems = useMemo(() => {
    const collected: PokopiaItem[] = [];
    const needed: PokopiaItem[] = [];

    for (const item of filteredPokopiaItems) {
      const slug = String(item.slug).trim().toLowerCase();
      if (collectedItemSet.has(slug)) {
        collected.push(item);
      } else {
        needed.push(item);
      }
    }

    return [
      { key: "collected", label: "Collected", items: collected },
      { key: "needed", label: "Need", items: needed },
    ].filter((group) => group.items.length > 0);
  }, [filteredPokopiaItems, collectedItemSet]);

  const openSheet = useCallback(
    (item: PokopiaItem) => {
      lastItem.current = item;
      setSelectedItem(item);
      setSheetVisible(true);
      onSelectItemSlug(item.slug);
    },
    [onSelectItemSlug]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    onSelectItemSlug(null);
    onClearSelectedItemDetail();
    onClearSelectedItemError();
  }, [onSelectItemSlug, onClearSelectedItemDetail, onClearSelectedItemError]);

  const displayItem = selectedItem ?? lastItem.current;

  const openFavoriteSheet = useCallback((label: string) => {
    setSelectedFavoriteLabel(label);
    setSelectedFavoriteSlug(resolveFavoriteSlug(label));
    setSheetVisible(false);
    setTimeout(() => {
      setFavoriteSheetVisible(true);
    }, 120);
  }, []);

  const closeFavoriteSheet = useCallback(() => {
    setFavoriteSheetVisible(false);
    setSelectedFavoriteLabel(null);
    setSelectedFavoriteSlug(null);
  }, []);

  return (
    <View className="flex-1 px-2 pt-4">
      <View className="flex-row flex-wrap mb-4">
        {ITEM_CATEGORY_FILTERS.map((category) => {
          const active = selectedItemCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => onSelectItemCategory(category)}
              className="mr-2 mb-2 px-3 py-2 rounded-full border"
              style={{
                backgroundColor: active ? "rgba(14,165,233,0.14)" : "rgba(15,23,42,0.72)",
                borderColor: active ? "rgba(14,165,233,0.45)" : "rgba(51,65,85,0.9)",
              }}
            >
              <Text
                className="text-[11px] font-semibold"
                style={{ color: active ? "#bae6fd" : "#cbd5e1" }}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mb-4">
        <PokopiaSearchInput
          value={itemSearch}
          onChangeText={onChangeItemSearch}
          placeholder="Search items..."
        />
      </View>

      {pokopiaItemsLoading ? (
        <PokopiaLoadingState label="Loading Pokopia items…" />
      ) : pokopiaItemsError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Items unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{pokopiaItemsError}</Text>
        </View>
      ) : !filteredPokopiaItems.length ? (
        <PokopiaEmptyState
          title="No items to show"
          message="Try a different category or search term."
        />
      ) : (
        <>
          {groupedItems.map((group) => (
            <View key={group.key} className="mb-4">
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {group.label}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">{group.items.length} items</Text>
              </View>

              <View className="flex-row flex-wrap -mx-1">
                {group.items.map((item) => {
                  const collected = collectedItemSet.has(String(item.slug).trim().toLowerCase());

                  return (
                    <View key={`${item.id}-${item.slug}`} className="w-1/3 px-1 mb-2">
                      <Pressable
                        onPress={() => openSheet(item)}
                        className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
                        style={{ minHeight: 160 }}
                      >
                        {collected ? (
                          <View className="absolute top-2 right-2 z-10 rounded-full bg-[#6DDA5F] border border-white/70 px-1.5 py-1">
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          </View>
                        ) : null}
                        <View className="items-center justify-center pt-4 pb-2">
                          <View className="w-24 h-24">
                            <ExpoImage
                              source={{ uri: item.imageUrl }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="contain"
                              transition={120}
                            />
                          </View>
                        </View>

                        <View className="px-3 pb-4 items-center">
                          <Text
                            numberOfLines={2}
                            className="text-[13px] font-semibold text-slate-50 text-center leading-5"
                          >
                            {item.name}
                          </Text>
                          <Text className="text-[11px] text-slate-400 mt-1 text-center">
                            {item.menuCategory || "Uncategorized"}
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </>
      )}

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-center flex-1 pr-3">
              {displayItem?.imageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{ uri: selectedItemDetail?.imageUrl || displayItem.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {displayItem?.name ?? "—"}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">
                  {displayItem?.menuCategory || "Uncategorized"}
                </Text>
              </View>
            </View>

            <View className="items-end">
              {displayItem?.slug ? (
                <PokopiaCollectToggleButton
                  kind="item"
                  slug={displayItem.slug}
                />
              ) : null}

              <Pressable
                onPress={closeSheet}
                className="mt-2 h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>
          </View>

          {displayItem ? (
            <View className="flex-row flex-wrap mb-4">
              <View className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                <Text className="text-[11px] text-slate-200">{displayItem.sourceGroup}</Text>
              </View>
              {displayItem.event ? (
                <View className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-amber-950 border border-amber-800">
                  <Text className="text-[11px] text-amber-200">{displayItem.event}</Text>
                </View>
              ) : null}
              {displayItem.tags.map((tag) => (
                <View
                  key={`${displayItem.id}-tag-${tag}`}
                  className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                >
                  <Text className="text-[11px] text-slate-200">{tag}</Text>
                </View>
              ))}
              {displayItem.mosslax ? (
                <View className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                  <Text className="text-[11px] text-slate-200">{displayItem.mosslax}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {selectedItemLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading item detail…</Text>
            </View>
          ) : selectedItemError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">Item unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{selectedItemError}</Text>
            </View>
          ) : selectedItemDetail ? (
            <>
              <PokopiaItemVariantStrip variants={selectedItemDetail.variantImages} />

              {selectedItemDetail.description ? (
                <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3 mb-4">
                  <Text className="text-[13px] leading-5 text-slate-300">
                    {selectedItemDetail.description}
                  </Text>
                </View>
              ) : null}

              {selectedItemDetail.effectTags.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Effects
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedItemDetail.effectTags.map((tag) => (
                      <View
                        key={`effect-${tag}`}
                        className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                      >
                        <Text className="text-[11px] text-slate-200">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedItemDetail.favoriteTags.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Pokémon Favorites
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedItemDetail.favoriteTags.map((tag) => (
                      <PokopiaFavoriteChip
                        key={`favorite-${tag}`}
                        label={tag}
                        onPress={() => openFavoriteSheet(tag)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedItemDetail.storage ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Storage
                  </Text>
                  <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3">
                    <Text className="text-[13px] leading-5 text-slate-300">
                      {selectedItemDetail.storage}
                    </Text>
                  </View>
                </View>
              ) : null}

              {selectedItemDetail.whereToFind.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Where to Find
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedItemDetail.whereToFind.map((entry) => (
                      <View
                        key={`where-${entry}`}
                        className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                      >
                        <Text className="text-[11px] text-slate-200">{entry}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedItemDetail.recipeMaterials.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Recipe
                  </Text>
                  {selectedItemDetail.recipeMaterials.map((material) => (
                    <View
                      key={material.slug}
                      className="rounded-3xl bg-slate-950 p-4 border mb-2 border-slate-800 flex-row items-center"
                    >
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                        <ExpoImage
                          source={{ uri: material.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="contain"
                          transition={120}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-slate-50">{material.name}</Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">x{material.qty}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedItemDetail.usedInHabitats.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Used in Habitats
                  </Text>
                  {selectedItemDetail.usedInHabitats.map((habitat) => (
                    <View
                      key={`${habitat.slug}-${habitat.number}`}
                      className="rounded-3xl bg-slate-950 p-4 border mb-2 border-slate-800 flex-row items-center"
                    >
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                        <ExpoImage
                          source={{ uri: habitat.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={120}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-slate-50">{habitat.name}</Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">
                          Habitat #{habitat.number}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedItemDetail.recipeUnlockedBy.length ? (
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Recipe Unlocked By
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedItemDetail.recipeUnlockedBy.map((entry) => (
                      <View
                        key={entry}
                        className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                      >
                        <Text className="text-[11px] text-slate-200">{entry}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {displayItem?.sources.length ? (
                <View className="mt-2">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Sources
                  </Text>
                  <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3">
                    <Text className="text-[13px] leading-5 text-slate-300">
                      {displayItem.sources.join(" • ")}
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </BottomSheetModal>

      <PokopiaFavoriteDetailSheet
        visible={favoriteSheetVisible}
        favoriteLabel={selectedFavoriteLabel}
        favoriteSlug={selectedFavoriteSlug}
        onRequestClose={closeFavoriteSheet}
      />
    </View>
  );
}
