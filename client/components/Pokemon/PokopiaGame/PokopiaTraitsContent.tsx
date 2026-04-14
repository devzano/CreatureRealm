import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { PokopiaAbility } from "@/lib/pokemon/pokopia/abilities";
import type { PokopiaAbilityDetail } from "@/lib/pokemon/pokopia/abilityDetail";
import type { PokopiaSpecialty } from "@/lib/pokemon/pokopia/specialties";
import type { PokopiaSpecialtyDetail } from "@/lib/pokemon/pokopia/specialtyDetail";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";

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

type OpenSheetState =
  | { kind: "ability"; item: PokopiaAbility }
  | { kind: "specialty"; item: PokopiaSpecialty }
  | null;

function GridSection({
  title,
  subtitle,
  items,
  onPress,
}: {
  title: string;
  subtitle: string;
  items: { id: string; name: string; imageUrl: string; pokemonCountLabel?: string }[];
  onPress: (item: any) => void;
}) {
  return (
    <View className="mb-4">
      <View className="px-1 mb-2">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </Text>
        <Text className="text-[11px] text-slate-500 mt-0.5">{subtitle}</Text>
      </View>

      <View className="flex-row flex-wrap -mx-1">
        {items.map((item) => (
          <View key={item.id} className="w-1/3 px-1 mb-2">
            <Pressable
              onPress={() => onPress(item)}
              className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
              style={{ minHeight: 160 }}
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
                <Text
                  numberOfLines={2}
                  className="text-[13px] font-semibold text-slate-50 text-center leading-5"
                >
                  {item.name}
                </Text>
                {item.pokemonCountLabel ? (
                  <Text className="text-[11px] text-slate-400 mt-1 text-center">
                    {item.pokemonCountLabel}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PokopiaTraitsContent({
  abilities,
  abilitiesLoading,
  abilitiesError,
  selectedAbilityDetail,
  selectedAbilityLoading,
  selectedAbilityError,
  onSelectAbilitySlug,
  onClearSelectedAbilityDetail,
  onClearSelectedAbilityError,
  specialties,
  specialtiesLoading,
  specialtiesError,
  selectedSpecialtyDetail,
  selectedSpecialtyLoading,
  selectedSpecialtyError,
  onSelectSpecialtySlug,
  onClearSelectedSpecialtyDetail,
  onClearSelectedSpecialtyError,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [openSheet, setOpenSheet] = useState<OpenSheetState>(null);
  const lastOpenSheet = useRef<OpenSheetState>(null);

  const openAbility = useCallback(
    (ability: PokopiaAbility) => {
      const next = { kind: "ability" as const, item: ability };
      lastOpenSheet.current = next;
      setOpenSheet(next);
      setSheetVisible(true);
      onSelectAbilitySlug(ability.slug);
      onSelectSpecialtySlug(null);
      onClearSelectedSpecialtyDetail();
      onClearSelectedSpecialtyError();
    },
    [onClearSelectedSpecialtyDetail, onClearSelectedSpecialtyError, onSelectAbilitySlug, onSelectSpecialtySlug]
  );

  const openSpecialty = useCallback(
    (specialty: PokopiaSpecialty) => {
      const next = { kind: "specialty" as const, item: specialty };
      lastOpenSheet.current = next;
      setOpenSheet(next);
      setSheetVisible(true);
      onSelectSpecialtySlug(specialty.slug);
      onSelectAbilitySlug(null);
      onClearSelectedAbilityDetail();
      onClearSelectedAbilityError();
    },
    [onClearSelectedAbilityDetail, onClearSelectedAbilityError, onSelectAbilitySlug, onSelectSpecialtySlug]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setOpenSheet(null);
    onSelectAbilitySlug(null);
    onClearSelectedAbilityDetail();
    onClearSelectedAbilityError();
    onSelectSpecialtySlug(null);
    onClearSelectedSpecialtyDetail();
    onClearSelectedSpecialtyError();
  }, [
    onClearSelectedAbilityDetail,
    onClearSelectedAbilityError,
    onClearSelectedSpecialtyDetail,
    onClearSelectedSpecialtyError,
    onSelectAbilitySlug,
    onSelectSpecialtySlug,
  ]);

  const displaySheet = openSheet ?? lastOpenSheet.current;
  const isLoading = displaySheet?.kind === "ability" ? selectedAbilityLoading : selectedSpecialtyLoading;
  const error = displaySheet?.kind === "ability" ? selectedAbilityError : selectedSpecialtyError;

  const content = displaySheet?.kind === "ability" ? selectedAbilityDetail : selectedSpecialtyDetail;
  const title = displaySheet?.item.name ?? "—";
  const subtitle = displaySheet?.item.description ?? "";
  const imageUrl = displaySheet?.item.imageUrl ?? "";

  const initialLoading = abilitiesLoading || specialtiesLoading;
  const initialError = !abilities.length && abilitiesError ? abilitiesError : !specialties.length && specialtiesError ? specialtiesError : null;

  return (
    <View className="flex-1 px-2 pt-4">
      {initialLoading && !abilities.length && !specialties.length ? (
        <PokopiaLoadingState label="Loading Pokopia traits…" />
      ) : initialError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Traits unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{initialError}</Text>
        </View>
      ) : !abilities.length && !specialties.length ? (
        <PokopiaEmptyState
          title="No traits to show"
          message="There are no Pokopia abilities or specialties available right now."
        />
      ) : (
        <>
          {abilities.length ? (
            <GridSection
              title="Abilities"
              subtitle={`${abilities.length} entries`}
              items={abilities}
              onPress={openAbility}
            />
          ) : null}

          {specialties.length ? (
            <GridSection
              title="Specialties"
              subtitle={`${specialties.length} entries`}
              items={specialties}
              onPress={openSpecialty}
            />
          ) : null}
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
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              {imageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{ uri: imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text className="text-slate-400 text-[12px] mt-0.5" numberOfLines={2}>
                    {subtitle}
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

          {isLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">
                Loading {displaySheet?.kind === "ability" ? "ability" : "specialty"} detail…
              </Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">
                {displaySheet?.kind === "ability" ? "Ability" : "Specialty"} unavailable
              </Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{error}</Text>
            </View>
          ) : content && displaySheet?.kind === "ability" ? (
            <>
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pokémon that Teach {content.name}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  {content.pokemon.length} entries
                </Text>
              </View>

              <View className="flex-row flex-wrap -mx-1">
                {content.pokemon.map((pokemon) => (
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
          ) : content && displaySheet?.kind === "specialty" ? (
            <>
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pokémon with {content.name}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  {content.pokemon.length} entries
                </Text>
              </View>

              <View className="flex-row flex-wrap -mx-1">
                {content.pokemon.map((pokemon) => (
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
