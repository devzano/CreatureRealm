import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { RecipeCategoryFilter } from "./config";
import { RECIPE_CATEGORY_FILTERS } from "./config";
import PokopiaFavoriteChip from "./PokopiaFavoriteChip";
import PokopiaCollectToggleButton from "./PokopiaCollectToggleButton";
import PokopiaFavoriteDetailSheet from "./PokopiaFavoriteDetailSheet";
import PokopiaItemVariantStrip from "./PokopiaItemVariantStrip";
import PokopiaSearchInput from "./PokopiaSearchInput";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";
import { resolveFavoriteSlug } from "@/lib/pokemon/pokopia/favoriteUtils";
import type { PokopiaRecipe } from "@/lib/pokemon/pokopia/recipes";
import { fetchPokopiaItemDetail, type PokopiaItemDetail } from "@/lib/pokemon/pokopia/itemDetail";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { usePokopiaCollectionStore } from "@/store/pokopiaCollectionStore";

type Props = {
  filteredRecipes: PokopiaRecipe[];
  recipesLoading: boolean;
  recipesError: string | null;
  selectedRecipeCategory: RecipeCategoryFilter;
  recipeSearch: string;
  onSelectRecipeCategory: (category: RecipeCategoryFilter) => void;
  onChangeRecipeSearch: (value: string) => void;
};

export default function PokopiaRecipesContent({
  filteredRecipes,
  recipesLoading,
  recipesError,
  selectedRecipeCategory,
  recipeSearch,
  onSelectRecipeCategory,
  onChangeRecipeSearch,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<PokopiaRecipe | null>(null);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<PokopiaItemDetail | null>(null);
  const [selectedRecipeDetailLoading, setSelectedRecipeDetailLoading] = useState(false);
  const [selectedRecipeDetailError, setSelectedRecipeDetailError] = useState<string | null>(null);
  const [favoriteSheetVisible, setFavoriteSheetVisible] = useState(false);
  const [selectedFavoriteLabel, setSelectedFavoriteLabel] = useState<string | null>(null);
  const [selectedFavoriteSlug, setSelectedFavoriteSlug] = useState<string | null>(null);
  const lastRecipe = useRef<PokopiaRecipe | null>(null);
  const collectedRecipes = usePokopiaCollectionStore((state) => state.collected.recipe);
  const collectedRecipeSet = useMemo(() => new Set(collectedRecipes), [collectedRecipes]);
  const groupedRecipes = useMemo(() => {
    const collected: PokopiaRecipe[] = [];
    const needed: PokopiaRecipe[] = [];

    for (const recipe of filteredRecipes) {
      const slug = String(recipe.slug).trim().toLowerCase();
      if (collectedRecipeSet.has(slug)) {
        collected.push(recipe);
      } else {
        needed.push(recipe);
      }
    }

    return [
      { key: "collected", label: "Collected", items: collected },
      { key: "needed", label: "Need", items: needed },
    ].filter((group) => group.items.length > 0);
  }, [filteredRecipes, collectedRecipeSet]);

  const openSheet = useCallback(async (recipe: PokopiaRecipe) => {
    lastRecipe.current = recipe;
    setSelectedRecipe(recipe);
    setSelectedRecipeDetail(null);
    setSelectedRecipeDetailError(null);
    setSheetVisible(true);
    if (!recipe.href.includes("/items/")) return;

    const slug = recipe.href.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/items\//, "").split("?")[0];
    if (!slug) return;

    try {
      setSelectedRecipeDetailLoading(true);
      const detail = await fetchPokopiaItemDetail(slug);
      setSelectedRecipeDetail(detail);
    } catch (error) {
      setSelectedRecipeDetail(null);
      setSelectedRecipeDetailError(error instanceof Error ? error.message : "Failed to load recipe detail.");
    } finally {
      setSelectedRecipeDetailLoading(false);
    }
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedRecipeDetail(null);
    setSelectedRecipeDetailError(null);
    setSelectedRecipeDetailLoading(false);
  }, []);

  const displayRecipe = selectedRecipe ?? lastRecipe.current;

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
        {RECIPE_CATEGORY_FILTERS.map((category) => {
          const active = selectedRecipeCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => onSelectRecipeCategory(category)}
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
          value={recipeSearch}
          onChangeText={onChangeRecipeSearch}
          placeholder="Search recipes..."
        />
      </View>

      {recipesLoading ? (
        <PokopiaLoadingState label="Loading Pokopia recipes…" />
      ) : recipesError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Recipes unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{recipesError}</Text>
        </View>
      ) : !filteredRecipes.length ? (
        <PokopiaEmptyState
          title="No recipes to show"
          message="Try a different category or search term."
        />
      ) : (
        <>
          {groupedRecipes.map((group) => (
            <View key={group.key} className="mb-4">
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {group.label}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">{group.items.length} recipes</Text>
              </View>

              <View className="flex-row flex-wrap -mx-1">
                {group.items.map((recipe) => {
                  const collected = collectedRecipeSet.has(String(recipe.slug).trim().toLowerCase());

                  return (
                    <View key={`${recipe.category}-${recipe.id}`} className="w-1/3 px-1 mb-2">
                      <Pressable
                        onPress={() => openSheet(recipe)}
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
                              source={{ uri: recipe.imageUrl }}
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
                            {recipe.name}
                          </Text>
                          <Text className="text-[11px] text-slate-400 mt-1 text-center">
                            {recipe.category || "Other"}
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
              {displayRecipe?.imageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{ uri: selectedRecipeDetail?.imageUrl || displayRecipe.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {displayRecipe?.name ?? "—"}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">
                  {displayRecipe?.category || "Other"}
                </Text>
              </View>
            </View>

            <View className="items-end">
              {displayRecipe?.slug ? (
                <PokopiaCollectToggleButton
                  kind="recipe"
                  slug={displayRecipe.slug}
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

          {selectedRecipeDetailLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading recipe detail…</Text>
            </View>
          ) : selectedRecipeDetailError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">Recipe detail unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">
                {selectedRecipeDetailError}
              </Text>
            </View>
          ) : null}

          {selectedRecipeDetail ? (
            <PokopiaItemVariantStrip variants={selectedRecipeDetail.variantImages} />
          ) : null}

          {selectedRecipeDetail?.description ? (
            <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3 mb-4">
              <Text className="text-[13px] leading-5 text-slate-300">
                {selectedRecipeDetail.description}
              </Text>
            </View>
          ) : displayRecipe?.description ? (
            <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3 mb-4">
              <Text className="text-[13px] leading-5 text-slate-300">
                {displayRecipe.description}
              </Text>
            </View>
          ) : null}

          {selectedRecipeDetail?.effectTags.length ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Effects
              </Text>
              <View className="flex-row flex-wrap">
                {selectedRecipeDetail.effectTags.map((tag) => (
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

          {selectedRecipeDetail?.favoriteTags.length ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Pokémon Favorites
              </Text>
              <View className="flex-row flex-wrap">
                {selectedRecipeDetail.favoriteTags.map((tag) => (
                  <PokopiaFavoriteChip
                    key={`favorite-${tag}`}
                    label={tag}
                    onPress={() => openFavoriteSheet(tag)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {selectedRecipeDetail?.storage ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Storage
              </Text>
              <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3">
                <Text className="text-[13px] leading-5 text-slate-300">{selectedRecipeDetail.storage}</Text>
              </View>
            </View>
          ) : null}

          {selectedRecipeDetail?.whereToFind.length ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Where to Find
              </Text>
              <View className="flex-row flex-wrap">
                {selectedRecipeDetail.whereToFind.map((entry) => (
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

          {selectedRecipeDetail?.recipeMaterials.length ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Recipe Materials
              </Text>
              {selectedRecipeDetail.recipeMaterials.map((material) => (
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

          {selectedRecipeDetail?.usedInHabitats.length ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Used in Habitats
              </Text>
              {selectedRecipeDetail.usedInHabitats.map((habitat) => (
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
                    <Text className="text-[11px] text-slate-400 mt-0.5">Habitat #{habitat.number}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {selectedRecipeDetail?.recipeUnlockedBy.length ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Recipe Unlocks
              </Text>
              <View className="flex-row flex-wrap">
                {selectedRecipeDetail.recipeUnlockedBy.map((entry) => (
                  <View
                    key={`unlock-${entry}`}
                    className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                  >
                    <Text className="text-[11px] text-slate-200">{entry}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {displayRecipe?.meta && !selectedRecipeDetail ? (
            <View className="mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Info
              </Text>
              <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3">
                <Text className="text-[13px] leading-5 text-slate-300">{displayRecipe.meta}</Text>
              </View>
            </View>
          ) : null}

          {displayRecipe?.badges.length && !selectedRecipeDetail ? (
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Tags
              </Text>
              <View className="flex-row flex-wrap">
                {displayRecipe.badges.map((badge) => (
                  <View
                    key={`${displayRecipe.id}-${badge}`}
                    className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                  >
                    <Text className="text-[11px] text-slate-200">{badge}</Text>
                  </View>
                ))}
              </View>
            </View>
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
