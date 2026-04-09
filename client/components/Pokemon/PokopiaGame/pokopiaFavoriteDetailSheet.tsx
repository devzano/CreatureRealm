import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { POKOPIA_COLORS } from "./config";
import {
  fetchPokopiaFavoriteDetail,
  type PokopiaFavoriteDetail,
} from "@/lib/pokemon/pokopia/favoriteDetail";

type Props = {
  visible: boolean;
  favoriteLabel: string | null;
  favoriteSlug: string | null;
  onRequestClose: () => void;
};

export default function PokopiaFavoriteDetailSheet({
  visible,
  favoriteLabel,
  favoriteSlug,
  onRequestClose,
}: Props) {
  const [detail, setDetail] = useState<PokopiaFavoriteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!visible || !favoriteSlug) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const nextDetail = await fetchPokopiaFavoriteDetail(favoriteSlug);
        if (cancelled) return;
        setDetail(nextDetail);
      } catch (nextError) {
        if (cancelled) return;
        setDetail(null);
        setError(
          nextError instanceof Error ? nextError.message : "Failed to load favorite detail."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [favoriteSlug, visible]);

  const title = detail?.name ?? favoriteLabel ?? "Favorite";

  return (
    <BottomSheetModal
      visible={visible}
      onRequestClose={onRequestClose}
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
              {title}
            </Text>
            <Text className="text-slate-400 text-[12px] mt-0.5">Pokopia Favorite</Text>
          </View>

          <Pressable
            onPress={onRequestClose}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
          >
            <Ionicons name="close" size={20} color="white" />
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center justify-center py-8">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-slate-300">Loading favorite detail…</Text>
          </View>
        ) : error ? (
          <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
            <Text className="text-sm font-semibold text-rose-200">Favorite unavailable</Text>
            <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{error}</Text>
          </View>
        ) : detail ? (
          <>
            {detail.description ? (
              <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-3 mb-4">
                <Text className="text-[13px] leading-5 text-slate-300">{detail.description}</Text>
              </View>
            ) : null}

            {detail.itemGroups.length ? (
              <View className="mb-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                  Items
                </Text>
                {detail.itemGroups.map((group) => (
                  <View key={group.label} className="mb-3">
                    <Text
                      className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: POKOPIA_COLORS.orange }}
                    >
                      {group.label}
                    </Text>
                    <View className="flex-row flex-wrap -mx-1">
                      {group.items.map((item) => (
                        <View key={item.slug} className="w-1/3 px-1 mb-2">
                          <View className="rounded-2xl bg-slate-950 border border-slate-800 p-2 items-center min-h-[120px]">
                            <ExpoImage
                              source={{ uri: item.imageUrl }}
                              style={{ width: 48, height: 48 }}
                              contentFit="contain"
                              transition={120}
                            />
                            <Text
                              numberOfLines={2}
                              className="mt-2 text-[11px] font-semibold text-slate-100 text-center"
                            >
                              {item.name}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {detail.pokemon.length ? (
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                  Pokémon
                </Text>
                <View className="flex-row flex-wrap -mx-1">
                  {detail.pokemon.map((pokemon) => (
                    <View key={pokemon.slug} className="w-1/3 px-1 mb-2">
                      <View className="rounded-2xl bg-slate-950 border border-slate-800 p-2 items-center min-h-[128px]">
                        <ExpoImage
                          source={{ uri: pokemon.imageUrl }}
                          style={{ width: 56, height: 56 }}
                          contentFit="contain"
                          transition={120}
                        />
                        <Text className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {pokemon.dexNumber
                            ? `#${String(pokemon.dexNumber).padStart(3, "0")}`
                            : "Pokemon"}
                        </Text>
                        <Text
                          numberOfLines={2}
                          className="mt-1 text-[11px] font-semibold text-slate-100 text-center"
                        >
                          {pokemon.name}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </BottomSheetModal>
  );
}
