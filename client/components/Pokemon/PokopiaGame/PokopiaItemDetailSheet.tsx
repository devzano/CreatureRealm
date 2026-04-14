import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PokopiaFavoriteChip from "./PokopiaFavoriteChip";
import PokopiaFavoriteDetailSheet from "./PokopiaFavoriteDetailSheet";
import PokopiaItemVariantStrip from "./PokopiaItemVariantStrip";
import PokopiaCollectToggleButton from "./PokopiaCollectToggleButton";
import { fetchPokopiaItemDetail, type PokopiaItemDetail } from "@/lib/pokemon/pokopia/itemDetail";
import { resolveFavoriteSlug } from "@/lib/pokemon/pokopia/favoriteUtils";
import type { PokopiaCollectKind } from "@/store/pokopiaCollectionStore";

type Props = {
  visible: boolean;
  itemSlug: string | null;
  itemName?: string | null;
  itemImageUrl?: string | null;
  subtitle?: string | null;
  onRequestClose: () => void;
  collectKind?: PokopiaCollectKind;
};

export default function PokopiaItemDetailSheet({
  visible,
  itemSlug,
  itemName,
  itemImageUrl,
  subtitle,
  onRequestClose,
  collectKind = "item",
}: Props) {
  const [detail, setDetail] = useState<PokopiaItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteSheetVisible, setFavoriteSheetVisible] = useState(false);
  const [selectedFavoriteLabel, setSelectedFavoriteLabel] = useState<string | null>(null);
  const [selectedFavoriteSlug, setSelectedFavoriteSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!visible || !itemSlug) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const nextDetail = await fetchPokopiaItemDetail(itemSlug);
        if (cancelled) return;
        setDetail(nextDetail);
      } catch (nextError) {
        if (cancelled) return;
        setDetail(null);
        setError(nextError instanceof Error ? nextError.message : "Failed to load item detail.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, itemSlug]);

  const displayName = detail?.name ?? itemName ?? "—";
  const displayImageUrl = detail?.imageUrl || itemImageUrl || "";
  const displaySubtitle = useMemo(() => {
    if (detail?.category) return detail.category;
    return subtitle ?? "Item";
  }, [detail?.category, subtitle]);

  const openFavoriteSheet = useCallback((label: string) => {
    setSelectedFavoriteLabel(label);
    setSelectedFavoriteSlug(resolveFavoriteSlug(label));
    setFavoriteSheetVisible(true);
  }, []);

  const closeFavoriteSheet = useCallback(() => {
    setFavoriteSheetVisible(false);
    setSelectedFavoriteLabel(null);
    setSelectedFavoriteSlug(null);
  }, []);

  const closeSheet = useCallback(() => {
    onRequestClose();
  }, [onRequestClose]);

  return (
    <>
      <BottomSheetModal
        visible={visible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-center flex-1 pr-3">
              {displayImageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{ uri: displayImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {displayName}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">{displaySubtitle}</Text>
              </View>
            </View>

            <View className="items-end">
              {itemSlug ? (
                <PokopiaCollectToggleButton
                  kind={collectKind}
                  slug={itemSlug}
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

          {loading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading item detail…</Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">Item unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{error}</Text>
            </View>
          ) : detail ? (
            <>
              <PokopiaItemVariantStrip variants={detail.variantImages} />

              {detail.description ? (
                <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3 mb-4">
                  <Text className="text-[13px] leading-5 text-slate-300">{detail.description}</Text>
                </View>
              ) : null}

              {detail.effectTags.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Effects
                  </Text>
                  <View className="flex-row flex-wrap">
                    {detail.effectTags.map((tag) => (
                      <View key={`effect-${tag}`} className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                        <Text className="text-[11px] text-slate-200">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {detail.favoriteTags.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Pokémon Favorites
                  </Text>
                  <View className="flex-row flex-wrap">
                    {detail.favoriteTags.map((tag) => (
                      <PokopiaFavoriteChip key={`favorite-${tag}`} label={tag} onPress={() => openFavoriteSheet(tag)} />
                    ))}
                  </View>
                </View>
              ) : null}

              {detail.storage ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Storage
                  </Text>
                  <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3">
                    <Text className="text-[13px] leading-5 text-slate-300">{detail.storage}</Text>
                  </View>
                </View>
              ) : null}

              {detail.whereToFind.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Where to Find
                  </Text>
                  <View className="flex-row flex-wrap">
                    {detail.whereToFind.map((entry) => (
                      <View key={`where-${entry}`} className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                        <Text className="text-[11px] text-slate-200">{entry}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {detail.recipeMaterials.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Recipe
                  </Text>
                  {detail.recipeMaterials.map((material) => (
                    <View key={`${material.slug}-${material.qty}`} className="rounded-3xl bg-slate-950 p-4 border mb-2 border-slate-800 flex-row items-center">
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                        <ExpoImage source={{ uri: material.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-slate-50">{material.name}</Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">x{material.qty}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {detail.usedInHabitats.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Used in Habitats
                  </Text>
                  {detail.usedInHabitats.map((habitat) => (
                    <View key={`${habitat.slug}-${habitat.number}`} className="rounded-3xl bg-slate-950 p-4 border mb-2 border-slate-800 flex-row items-center">
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                        <ExpoImage source={{ uri: habitat.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-slate-50">{habitat.name}</Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">Habitat #{habitat.number}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {detail.recipeUnlockedBy.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Recipe Unlocked By
                  </Text>
                  <View className="flex-row flex-wrap">
                    {detail.recipeUnlockedBy.map((entry) => (
                      <View key={entry} className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                        <Text className="text-[11px] text-slate-200">{entry}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {detail.cookWithItems.length ? (
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Cook With
                  </Text>
                  {detail.cookWithItems.map((item) => (
                    <View key={item.slug} className="rounded-3xl bg-slate-950 p-4 border mb-2 border-slate-800 flex-row items-center">
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                        <ExpoImage source={{ uri: item.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
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

      <PokopiaFavoriteDetailSheet
        visible={favoriteSheetVisible}
        favoriteLabel={selectedFavoriteLabel}
        favoriteSlug={selectedFavoriteSlug}
        onRequestClose={closeFavoriteSheet}
      />
    </>
  );
}
