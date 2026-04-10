import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import {
  fetchPokopiaFoodFlavorItems,
  type PokopiaFoodItem,
  type PokopiaFoodPage,
} from "@/lib/pokemon/pokopia/food";
import type { PokopiaItemDetail } from "@/lib/pokemon/pokopia/itemDetail";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";
import PokopiaFavoriteChip from "./PokopiaFavoriteChip";
import PokopiaItemVariantStrip from "./PokopiaItemVariantStrip";

type Props = {
  foodPage: PokopiaFoodPage | null;
  foodLoading: boolean;
  foodError: string | null;
  selectedFoodItemSlug: string | null;
  selectedFoodItemDetail: PokopiaItemDetail | null;
  selectedFoodItemLoading: boolean;
  selectedFoodItemError: string | null;
  onSelectFoodItemSlug: (slug: string | null) => void;
  onClearSelectedFoodItemDetail: () => void;
  onClearSelectedFoodItemError: () => void;
};

export default function PokopiaFoodContent({
  foodPage,
  foodLoading,
  foodError,
  selectedFoodItemSlug,
  selectedFoodItemDetail,
  selectedFoodItemLoading,
  selectedFoodItemError,
  onSelectFoodItemSlug,
  onClearSelectedFoodItemDetail,
  onClearSelectedFoodItemError,
}: Props) {
  const [selectedFlavor, setSelectedFlavor] = useState("All Flavors");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedFoodItemName, setSelectedFoodItemName] = useState<string | null>(null);
  const [selectedFoodItemImageUrl, setSelectedFoodItemImageUrl] = useState<string | null>(null);
  const [flavorItems, setFlavorItems] = useState<PokopiaFoodItem[] | null>(null);
  const [flavorItemsLoading, setFlavorItemsLoading] = useState(false);
  const [flavorItemsError, setFlavorItemsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (selectedFlavor === "All Flavors") {
      setFlavorItems(null);
      setFlavorItemsLoading(false);
      setFlavorItemsError(null);
      return () => {
        cancelled = true;
      };
    }

    const routeSlug =
      selectedFlavor === "No Flavor"
        ? "no-flavor"
        : foodPage?.flavors.find((flavor) => flavor.label === selectedFlavor)?.routeSlug ?? "";

    if (!routeSlug) {
      setFlavorItems([]);
      setFlavorItemsLoading(false);
      setFlavorItemsError(null);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        setFlavorItemsLoading(true);
        setFlavorItemsError(null);
        const nextItems = await fetchPokopiaFoodFlavorItems(routeSlug);
        if (cancelled) return;
        setFlavorItems(nextItems);
      } catch (error) {
        if (cancelled) return;
        setFlavorItems([]);
        setFlavorItemsError(error instanceof Error ? error.message : "Failed to load this flavor.");
      } finally {
        if (!cancelled) setFlavorItemsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [foodPage, selectedFlavor]);

  const filteredItems = useMemo(() => {
    if (!foodPage) return [];
    if (selectedFlavor === "All Flavors") return foodPage.items;
    return flavorItems ?? [];
  }, [foodPage, flavorItems, selectedFlavor]);

  return (
    <View className="flex-1 px-2 pt-4">
      {foodLoading ? (
        <PokopiaLoadingState label="Loading Pokopia food…" />
      ) : foodError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Food unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{foodError}</Text>
        </View>
      ) : !foodPage ? (
        <PokopiaEmptyState
          title="No food to show"
          message="There is no Pokopia food data available right now."
        />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ paddingRight: 8 }}
          >
            <Pressable
              onPress={() => setSelectedFlavor("All Flavors")}
              className="mr-2 px-3 py-2 rounded-full border"
              style={{
                backgroundColor:
                  selectedFlavor === "All Flavors" ? "rgba(245,158,11,0.16)" : "rgba(15,23,42,0.72)",
                borderColor:
                  selectedFlavor === "All Flavors" ? "rgba(245,158,11,0.45)" : "rgba(51,65,85,0.9)",
              }}
            >
              <Text
                className="text-[11px] font-semibold"
                style={{ color: selectedFlavor === "All Flavors" ? "#ffe4b5" : "#cbd5e1" }}
              >
                All Flavors
              </Text>
            </Pressable>
            {foodPage.flavors.map((flavor) => (
              <Pressable
                key={flavor.slug}
                onPress={() => setSelectedFlavor(flavor.label)}
                className="mr-2 px-3 py-2 rounded-full border"
                style={{
                  backgroundColor:
                    selectedFlavor === flavor.label ? `${flavor.color}2E` : "rgba(15,23,42,0.72)",
                  borderColor:
                    selectedFlavor === flavor.label ? `${flavor.color}AA` : "rgba(51,65,85,0.9)",
                }}
              >
                <Text
                  className="text-[11px] font-semibold"
                  style={{ color: selectedFlavor === flavor.label ? "#ffffff" : "#cbd5e1" }}
                >
                  {flavor.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {flavorItemsLoading ? (
            <PokopiaLoadingState label={`Loading ${selectedFlavor.toLowerCase()} food…`} />
          ) : flavorItemsError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
              <Text className="text-sm font-semibold text-rose-200">Flavor unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{flavorItemsError}</Text>
            </View>
          ) : !filteredItems.length ? (
            <PokopiaEmptyState
              title="No food to show"
              message="There are no food items for this flavor."
            />
          ) : (
            <View className="flex-row flex-wrap -mx-1">
              {filteredItems.map((item) => (
                <View key={item.slug} className="w-1/3 px-1 mb-2">
                  <Pressable
                    onPress={() => {
                      setSelectedFoodItemName(item.name);
                      setSelectedFoodItemImageUrl(item.imageUrl);
                      setSheetVisible(true);
                      onSelectFoodItemSlug(item.slug);
                    }}
                    className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
                    style={{ minHeight: 170 }}
                  >
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
                      <Text numberOfLines={2} className="text-[13px] font-semibold text-slate-50 text-center leading-5">
                        {item.name}
                      </Text>
                      <Text numberOfLines={2} className="text-[11px] text-slate-400 mt-1 text-center">
                        {item.flavors.join(" • ") || "No Flavor"}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={() => {
          setSheetVisible(false);
          onSelectFoodItemSlug(null);
          onClearSelectedFoodItemDetail();
          onClearSelectedFoodItemError();
        }}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              {selectedFoodItemImageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{ uri: selectedFoodItemDetail?.imageUrl || selectedFoodItemImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {selectedFoodItemDetail?.name ?? selectedFoodItemName ?? "—"}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">Food</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setSheetVisible(false);
                onSelectFoodItemSlug(null);
                onClearSelectedFoodItemDetail();
                onClearSelectedFoodItemError();
              }}
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {selectedFoodItemLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading food detail…</Text>
            </View>
          ) : selectedFoodItemError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">Food unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{selectedFoodItemError}</Text>
            </View>
          ) : selectedFoodItemDetail ? (
            <>
              <PokopiaItemVariantStrip variants={selectedFoodItemDetail.variantImages} />

              {selectedFoodItemDetail.description ? (
                <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3 mb-4">
                  <Text className="text-[13px] leading-5 text-slate-300">
                    {selectedFoodItemDetail.description}
                  </Text>
                </View>
              ) : null}

              {selectedFoodItemDetail.favoriteTags.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Pokémon Favorites
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedFoodItemDetail.favoriteTags.map((tag) => (
                      <PokopiaFavoriteChip key={tag} label={tag} />
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedFoodItemDetail.whereToFind.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Where to Find
                  </Text>
                  <View className="flex-row flex-wrap">
                    {selectedFoodItemDetail.whereToFind.map((entry) => (
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

              {selectedFoodItemDetail.mosslaxEffect ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Mosslax Effect
                  </Text>
                  <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3">
                    <Text className="text-[13px] leading-5 text-slate-300">
                      {selectedFoodItemDetail.mosslaxEffect}
                    </Text>
                  </View>
                </View>
              ) : null}

              {selectedFoodItemDetail.recipeMaterials.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Cooking Recipe
                  </Text>
                  {selectedFoodItemDetail.recipeMaterials.map((material) => (
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

              {selectedFoodItemDetail.cookWithItems.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Cook With {selectedFoodItemDetail.name}
                  </Text>
                  {selectedFoodItemDetail.cookWithItems.map((item) => (
                    <View
                      key={item.slug}
                      className="rounded-3xl bg-slate-950 p-4 border mb-2 border-slate-800 flex-row items-center"
                    >
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                        <ExpoImage
                          source={{ uri: item.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="contain"
                          transition={120}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-slate-50">{item.name}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}
