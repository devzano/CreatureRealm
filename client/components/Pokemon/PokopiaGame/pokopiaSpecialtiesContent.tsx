import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { PokopiaSpecialtyDetail } from "@/lib/pokemon/pokopia/specialtyDetail";
import type { PokopiaSpecialty } from "@/lib/pokemon/pokopia/specialties";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

type Props = {
  specialties: PokopiaSpecialty[];
  specialtiesLoading: boolean;
  specialtiesError: string | null;
  selectedSpecialtySlug: string | null;
  selectedSpecialtyDetail: PokopiaSpecialtyDetail | null;
  selectedSpecialtyLoading: boolean;
  selectedSpecialtyError: string | null;
  onSelectSpecialtySlug: (slug: string | null) => void;
  onClearSelectedSpecialtyDetail: () => void;
  onClearSelectedSpecialtyError: () => void;
};

export default function PokopiaSpecialtiesContent({
  specialties,
  specialtiesLoading,
  specialtiesError,
  selectedSpecialtySlug,
  selectedSpecialtyDetail,
  selectedSpecialtyLoading,
  selectedSpecialtyError,
  onSelectSpecialtySlug,
  onClearSelectedSpecialtyDetail,
  onClearSelectedSpecialtyError,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<PokopiaSpecialty | null>(null);
  const lastSpecialty = useRef<PokopiaSpecialty | null>(null);

  const openSheet = useCallback(
    (specialty: PokopiaSpecialty) => {
      lastSpecialty.current = specialty;
      setSelectedSpecialty(specialty);
      setSheetVisible(true);
      onSelectSpecialtySlug(specialty.slug);
    },
    [onSelectSpecialtySlug]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    onSelectSpecialtySlug(null);
    onClearSelectedSpecialtyDetail();
    onClearSelectedSpecialtyError();
  }, [onSelectSpecialtySlug, onClearSelectedSpecialtyDetail, onClearSelectedSpecialtyError]);

  const displaySpecialty = selectedSpecialty ?? lastSpecialty.current;

  return (
    <View className="flex-1 px-2 pt-4">
      {specialtiesLoading ? (
        <View className="items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading Pokopia specialties…</Text>
        </View>
      ) : specialtiesError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Specialties unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{specialtiesError}</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap -mx-1">
          {specialties.map((specialty) => (
            <View key={specialty.id} className="w-1/3 px-1 mb-2">
              <Pressable
                onPress={() => openSheet(specialty)}
                className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
                style={{ minHeight: 160 }}
              >
                <View className="items-center justify-center pt-4 pb-2">
                  <View className="w-24 h-24">
                    <ExpoImage
                      source={{ uri: specialty.imageUrl }}
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
                    {specialty.name}
                  </Text>
                  {specialty.pokemonCountLabel ? (
                    <Text className="text-[11px] text-slate-400 mt-1 text-center">
                      {specialty.pokemonCountLabel}
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
              {displaySpecialty?.imageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{ uri: displaySpecialty.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {displaySpecialty?.name ?? "—"}
                </Text>
                {displaySpecialty?.description ? (
                  <Text className="text-slate-400 text-[12px] mt-0.5" numberOfLines={2}>
                    {displaySpecialty.description}
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

          {selectedSpecialtyLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading specialty detail…</Text>
            </View>
          ) : selectedSpecialtyError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">Specialty unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">
                {selectedSpecialtyError}
              </Text>
            </View>
          ) : selectedSpecialtyDetail ? (
            <>
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pokémon with {selectedSpecialtyDetail.name}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  {selectedSpecialtyDetail.pokemon.length} entries
                </Text>
              </View>

              <View className="flex-row flex-wrap -mx-1">
                {selectedSpecialtyDetail.pokemon.map((pokemon) => (
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