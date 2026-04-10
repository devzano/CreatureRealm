import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { CollectibleCategoryFilter, CollectibleSubcategoryFilter } from "./config";
import { COLLECTIBLE_CATEGORY_FILTERS, POKOPIA_COLORS } from "./config";
import PokopiaFavoriteChip from "./PokopiaFavoriteChip";
import PokopiaFavoriteDetailSheet from "./PokopiaFavoriteDetailSheet";
import PokopiaItemVariantStrip from "./PokopiaItemVariantStrip";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";
import type { PokopiaCollectibleDetail } from "@/lib/pokemon/pokopia/collectibleDetail";
import { resolveFavoriteSlug } from "@/lib/pokemon/pokopia/favoriteUtils";
import type { PokopiaCollectible } from "@/lib/pokemon/pokopia/collectibles";
import type { PokopiaItemDetail } from "@/lib/pokemon/pokopia/itemDetail";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

type Props = {
  filteredCollectibles: PokopiaCollectible[];
  collectiblesLoading: boolean;
  collectiblesError: string | null;
  selectedCollectible: PokopiaCollectible | null;
  selectedCollectibleDetail: PokopiaCollectibleDetail | null;
  selectedCollectibleItemDetail: PokopiaItemDetail | null;
  selectedCollectibleLoading: boolean;
  selectedCollectibleError: string | null;
  selectedCollectibleCategory: CollectibleCategoryFilter;
  selectedCollectibleSubcategory: CollectibleSubcategoryFilter;
  collectibleSubcategoryFilters: CollectibleSubcategoryFilter[];
  collectibleSearch: string;
  onSelectCollectibleCategory: (category: CollectibleCategoryFilter) => void;
  onSelectCollectibleSubcategory: (category: CollectibleSubcategoryFilter) => void;
  onChangeCollectibleSearch: (value: string) => void;
  onSelectCollectible: (collectible: PokopiaCollectible | null) => void;
  onClearSelectedCollectibleDetail: () => void;
  onClearSelectedCollectibleItemDetail: () => void;
  onClearSelectedCollectibleError: () => void;
};

export default function PokopiaCollectiblesContent({
  filteredCollectibles,
  collectiblesLoading,
  collectiblesError,
  selectedCollectible,
  selectedCollectibleDetail,
  selectedCollectibleItemDetail,
  selectedCollectibleLoading,
  selectedCollectibleError,
  selectedCollectibleCategory,
  selectedCollectibleSubcategory,
  collectibleSubcategoryFilters,
  collectibleSearch,
  onSelectCollectibleCategory,
  onSelectCollectibleSubcategory,
  onChangeCollectibleSearch,
  onSelectCollectible,
  onClearSelectedCollectibleDetail,
  onClearSelectedCollectibleItemDetail,
  onClearSelectedCollectibleError,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [favoriteSheetVisible, setFavoriteSheetVisible] = useState(false);
  const [selectedFavoriteLabel, setSelectedFavoriteLabel] = useState<string | null>(null);
  const [selectedFavoriteSlug, setSelectedFavoriteSlug] = useState<string | null>(null);
  const lastCollectible = useRef<PokopiaCollectible | null>(null);

  const openSheet = useCallback(
    (collectible: PokopiaCollectible) => {
      lastCollectible.current = collectible;
      setSheetVisible(true);
      onSelectCollectible(collectible);
    },
    [onSelectCollectible]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    onSelectCollectible(null);
    onClearSelectedCollectibleDetail();
    onClearSelectedCollectibleItemDetail();
    onClearSelectedCollectibleError();
  }, [onSelectCollectible, onClearSelectedCollectibleDetail, onClearSelectedCollectibleItemDetail, onClearSelectedCollectibleError]);

  const displayCollectible = selectedCollectible ?? lastCollectible.current;

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

  const categoryLabel = (collectible: PokopiaCollectible) => {
    if (selectedCollectibleSubcategory !== "All") {
      return collectible.groupLabel === "Music CDs" ? "CDs" : collectible.groupLabel;
    }
    if (selectedCollectibleCategory === "All") {
      return collectible.groupLabel === "Music CDs" ? "CDs" : collectible.groupLabel;
    }
    return collectible.menuCategory || "Uncategorized";
  };

  return (
    <View className="flex-1 px-2 pt-4">
      <View className="flex-row flex-wrap mb-2">
        {COLLECTIBLE_CATEGORY_FILTERS.map((category) => {
          const active = selectedCollectibleCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => onSelectCollectibleCategory(category)}
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

      {collectibleSubcategoryFilters.length > 1 ? (
        <View className="flex-row flex-wrap mb-4">
          {collectibleSubcategoryFilters.map((category) => {
            const active = selectedCollectibleSubcategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => onSelectCollectibleSubcategory(category)}
                className="mr-2 mb-2 px-3 py-2 rounded-full border"
                style={{
                  backgroundColor: active ? POKOPIA_COLORS.purpleSoft : "rgba(15,23,42,0.72)",
                  borderColor: active ? POKOPIA_COLORS.purpleBorder : "rgba(51,65,85,0.9)",
                }}
              >
                <Text
                  className="text-[11px] font-semibold"
                  style={{ color: active ? POKOPIA_COLORS.purpleText : "#cbd5e1" }}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="mb-2" />
      )}

      <View className="mb-4">
        <TextInput
          value={collectibleSearch}
          onChangeText={onChangeCollectibleSearch}
          placeholder="Search collectibles..."
          placeholderTextColor="rgba(148,163,184,0.8)"
          className="h-11 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-[13px] text-slate-100"
        />
      </View>

      {collectiblesLoading ? (
        <PokopiaLoadingState label="Loading Pokopia collectibles…" />
      ) : collectiblesError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Collectibles unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{collectiblesError}</Text>
        </View>
      ) : !filteredCollectibles.length ? (
        <PokopiaEmptyState
          title="No collectibles to show"
          message="Try a different category, subcategory, or search term."
        />
      ) : (
        <View className="flex-row flex-wrap -mx-1">
          {filteredCollectibles.map((collectible) => (
            <View
              key={`${collectible.groupSlug}-${collectible.id}-${collectible.detailPath}`}
              className="w-1/3 px-1 mb-2"
            >
              <Pressable
                onPress={() => openSheet(collectible)}
                className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
                style={{ minHeight: 160 }}
              >
                <View className="items-center justify-center pt-4 pb-2">
                  <View className="w-24 h-24">
                    {collectible.imageUrl ? (
                      <ExpoImage
                        source={{ uri: collectible.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="contain"
                        transition={120}
                      />
                    ) : null}
                  </View>
                </View>

                <View className="px-3 pb-4 items-center">
                  <Text
                    numberOfLines={2}
                    className="text-[13px] font-semibold text-slate-50 text-center leading-5"
                  >
                    {collectible.name}
                  </Text>
                  <Text className="text-[11px] text-slate-400 mt-1 text-center">
                    {categoryLabel(collectible)}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
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
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              {displayCollectible?.imageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{
                      uri:
                        selectedCollectibleItemDetail?.imageUrl || displayCollectible.imageUrl,
                    }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {displayCollectible?.name ?? "—"}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">
                  {displayCollectible ? categoryLabel(displayCollectible) : "—"}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {selectedCollectibleLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading collectible detail…</Text>
            </View>
          ) : selectedCollectibleError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">Collectible unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">
                {selectedCollectibleError}
              </Text>
            </View>
          ) : selectedCollectibleItemDetail ? (
            <>
              <PokopiaItemVariantStrip variants={selectedCollectibleItemDetail.variantImages} />

              {selectedCollectibleItemDetail.description ? (
                <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3 mb-4">
                  <Text className="text-[13px] leading-5 text-slate-300">
                    {selectedCollectibleItemDetail.description}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row flex-wrap mb-4">
                {[selectedCollectibleItemDetail.category, displayCollectible?.subgroupLabel, displayCollectible?.groupLabel]
                  .filter(Boolean)
                  .map((value, index) => (
                    <View
                      key={`${value}-${index}`}
                      className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                    >
                      <Text className="text-[11px] text-slate-200">{value}</Text>
                    </View>
                  ))}
              </View>

              {selectedCollectibleItemDetail.effectTags.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Effects
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedCollectibleItemDetail.effectTags.map((tag) => (
                      <View
                        key={tag}
                        className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                      >
                        <Text className="text-[11px] text-slate-200">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedCollectibleItemDetail.favoriteTags.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Pokémon Favorites
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedCollectibleItemDetail.favoriteTags.map((tag) => (
                      <PokopiaFavoriteChip key={tag} label={tag} onPress={() => openFavoriteSheet(tag)} />
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedCollectibleItemDetail.recipeMaterials.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Recipe Materials
                  </Text>
                  {selectedCollectibleItemDetail.recipeMaterials.map((material) => (
                    <View
                      key={`${material.slug}-${material.qty}`}
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

              {selectedCollectibleItemDetail.recipeUnlockedBy.length ? (
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Recipe Unlocks
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedCollectibleItemDetail.recipeUnlockedBy.map((tag) => (
                      <View
                        key={tag}
                        className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                      >
                        <Text className="text-[11px] text-slate-200">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : selectedCollectibleDetail ? (
            <>
              <View className="flex-row flex-wrap mb-4">
                {[selectedCollectibleDetail.type, displayCollectible?.subgroupLabel, selectedCollectibleDetail.category, selectedCollectibleDetail.zone, selectedCollectibleDetail.location]
                  .filter(Boolean)
                  .map((value, index) => (
                    <View
                      key={`${value}-${index}`}
                      className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                    >
                      <Text className="text-[11px] text-slate-200">{value}</Text>
                    </View>
                  ))}
              </View>
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
