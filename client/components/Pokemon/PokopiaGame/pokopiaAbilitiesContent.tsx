import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { PokopiaAbilityDetail } from "@/lib/pokemon/pokopia/abilityDetail";
import type { PokopiaAbility } from "@/lib/pokemon/pokopia/abilities";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

type Props = {
  abilities: PokopiaAbility[];
  abilitiesLoading: boolean;
  abilitiesError: string | null;
  selectedAbilitySlug: string | null;
  selectedAbilityDetail: PokopiaAbilityDetail | null;
  selectedAbilityLoading: boolean;
  selectedAbilityError: string | null;
  onSelectAbilitySlug: (slug: string | null) => void;
  onClearSelectedAbilityDetail: () => void;
  onClearSelectedAbilityError: () => void;
};

export default function PokopiaAbilitiesContent({
  abilities,
  abilitiesLoading,
  abilitiesError,
  selectedAbilitySlug,
  selectedAbilityDetail,
  selectedAbilityLoading,
  selectedAbilityError,
  onSelectAbilitySlug,
  onClearSelectedAbilityDetail,
  onClearSelectedAbilityError,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<PokopiaAbility | null>(null);
  const lastAbility = useRef<PokopiaAbility | null>(null);

  const openSheet = useCallback(
    (ability: PokopiaAbility) => {
      lastAbility.current = ability;
      setSelectedAbility(ability);
      setSheetVisible(true);
      onSelectAbilitySlug(ability.slug);
    },
    [onSelectAbilitySlug]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    onSelectAbilitySlug(null);
    onClearSelectedAbilityDetail();
    onClearSelectedAbilityError();
  }, [onSelectAbilitySlug, onClearSelectedAbilityDetail, onClearSelectedAbilityError]);

  const displayAbility = selectedAbility ?? lastAbility.current;

  return (
    <View className="flex-1 px-2 pt-4">
      {abilitiesLoading ? (
        <View className="items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading Pokopia abilities…</Text>
        </View>
      ) : abilitiesError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Abilities unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{abilitiesError}</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap -mx-1">
          {abilities.map((ability) => (
            <View key={ability.id} className="w-1/3 px-1 mb-2">
              <Pressable
                onPress={() => openSheet(ability)}
                className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
                style={{ minHeight: 160 }}
              >
                <View className="items-center justify-center pt-4 pb-2">
                  <View className="w-24 h-24">
                    <ExpoImage
                      source={{ uri: ability.imageUrl }}
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
                    {ability.name}
                  </Text>
                  {ability.pokemonCountLabel ? (
                    <Text className="text-[11px] text-slate-400 mt-1 text-center">
                      {ability.pokemonCountLabel}
                    </Text>
                  ) : null}
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
              {displayAbility?.imageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{ uri: displayAbility.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {displayAbility?.name ?? "—"}
                </Text>
                {displayAbility?.description ? (
                  <Text className="text-slate-400 text-[12px] mt-0.5" numberOfLines={2}>
                    {displayAbility.description}
                  </Text>
                ) : null}
              </View>
            </View>

            <Pressable
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {selectedAbilityLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading ability detail…</Text>
            </View>
          ) : selectedAbilityError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">Ability unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">
                {selectedAbilityError}
              </Text>
            </View>
          ) : selectedAbilityDetail ? (
            <>
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pokémon that Teach {selectedAbilityDetail.name}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  {selectedAbilityDetail.pokemon.length} entries
                </Text>
              </View>

              <View className="flex-row flex-wrap -mx-1">
                {selectedAbilityDetail.pokemon.map((pokemon) => (
                  <View key={pokemon.slug} className="w-1/3 px-1 mb-2">
                    <View className="rounded-3xl bg-slate-950 p-3 border border-slate-800 items-center">
                      <ExpoImage
                        source={{ uri: pokemon.imageUrl }}
                        style={{ width: 64, height: 64 }}
                        contentFit="contain"
                        transition={120}
                      />
                      {pokemon.dexNumber ? (
                        <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mt-2">
                          #{String(pokemon.dexNumber).padStart(3, "0")}
                        </Text>
                      ) : null}
                      <Text className="text-[12px] font-semibold text-slate-50 mt-1 text-center">
                        {pokemon.name}
                      </Text>
                      {pokemon.types.length ? (
                        <View className="flex-row flex-wrap justify-center mt-2">
                          {pokemon.types.map((type) => (
                            <View
                              key={`${pokemon.slug}-${type.name}`}
                              className="rounded-xl bg-slate-900 border border-slate-700 p-1 mx-0.5"
                            >
                              <ExpoImage
                                source={{ uri: type.iconUrl }}
                                style={{ width: 20, height: 20 }}
                                contentFit="contain"
                                transition={120}
                              />
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}