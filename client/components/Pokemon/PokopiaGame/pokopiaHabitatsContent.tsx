import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { POKOPIA_COLORS } from "./config";
import type { PokopiaHabitatDetail } from "@/lib/pokemon/pokopia/habitatDetail";
import type { PokopiaHabitat } from "@/lib/pokemon/pokopia/habitats";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";

type Props = {
  habitats: PokopiaHabitat[];
  habitatsLoading: boolean;
  habitatsError: string | null;
  selectedHabitat: PokopiaHabitat | null;
  selectedHabitatDetail: PokopiaHabitatDetail | null;
  selectedHabitatLoading: boolean;
  selectedHabitatError: string | null;
  resolveSpeciesId: (pokemon: { slug: string; name: string; dexNumber?: number }) => number | null;
  getCaughtState: (speciesId: number) => boolean;
  onToggleCaughtPokemon: (speciesId: number) => void;
  onSelectHabitat: (habitat: PokopiaHabitat) => void;
  onClearHabitat: () => void;
};

export default function PokopiaHabitatsContent({
  habitats,
  habitatsLoading,
  habitatsError,
  selectedHabitat,
  selectedHabitatDetail,
  selectedHabitatLoading,
  selectedHabitatError,
  resolveSpeciesId,
  getCaughtState,
  onToggleCaughtPokemon,
  onSelectHabitat,
  onClearHabitat,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const lastHabitat = useRef<PokopiaHabitat | null>(null);

  const openSheet = useCallback(
    (habitat: PokopiaHabitat) => {
      lastHabitat.current = habitat;
      setSheetVisible(true);
      onSelectHabitat(habitat);
    },
    [onSelectHabitat]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    onClearHabitat();
  }, [onClearHabitat]);

  const displayHabitat = selectedHabitat ?? lastHabitat.current;

  const groupedHabitats = useMemo(
    () =>
      ["Habitats", "Event Habitats"].map((groupLabel) => ({
        groupLabel,
        items: habitats.filter((habitat) => habitat.groupLabel === groupLabel),
      })),
    [habitats]
  );

  const isHabitatComplete = useCallback(
    (habitat: PokopiaHabitat) =>
      habitat.pokemon.length > 0 &&
      habitat.pokemon.every((pokemon) => {
        const speciesId =
          resolveSpeciesId({
            slug: pokemon.slug,
            name: pokemon.name,
          }) ?? (pokemon.id > 0 ? pokemon.id : null);

        return speciesId != null && getCaughtState(speciesId);
      }),
    [getCaughtState, resolveSpeciesId]
  );

  return (
    <View className="flex-1 px-2 pt-4">
      {habitatsLoading ? (
        <PokopiaLoadingState label="Loading Pokopia habitats…" />
      ) : habitatsError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Habitats unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{habitatsError}</Text>
        </View>
      ) : !groupedHabitats.some(({ items }) => items.length) ? (
        <PokopiaEmptyState
          title="No habitats to show"
          message="There are no Pokopia habitats available right now."
        />
      ) : (
        groupedHabitats.map(({ groupLabel, items }) => {
          if (!items.length) return null;

          return (
            <View key={groupLabel} className="mb-4">
              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {groupLabel}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  {items.length} entries
                </Text>
              </View>

              <View className="flex-row flex-wrap -mx-1">
                {items.map((habitat) => (
                  <View key={`${habitat.groupSlug}-${habitat.id}`} className="w-1/3 px-1 mb-2">
                    <Pressable
                      onPress={() => openSheet(habitat)}
                      className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
                      style={{ minHeight: 168 }}
                    >
                      {isHabitatComplete(habitat) ? (
                        <View
                          style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: "#6DDA5F",
                            borderWidth: 2,
                            borderColor: "rgba(255,255,255,0.92)",
                            zIndex: 2,
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              top: 10,
                              height: 2,
                              backgroundColor: "rgba(255,255,255,0.95)",
                            }}
                          />
                          <View
                            style={{
                              position: "absolute",
                              top: 6,
                              left: 6,
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: "rgba(255,255,255,0.95)",
                              borderWidth: 1.5,
                              borderColor: "#6DDA5F",
                            }}
                          />
                        </View>
                      ) : null}

                      <View className="items-center justify-center pt-4 pb-2">
                        <View className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700">
                          <ExpoImage
                            source={{ uri: habitat.imageUrl }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                            transition={120}
                          />
                        </View>
                      </View>

                      <View className="px-3 pb-4 items-center">
                        <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 text-center">
                          Habitat #{habitat.number}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="text-[13px] font-semibold text-slate-50 mt-1 text-center leading-5"
                        >
                          {habitat.name}
                        </Text>
                        <Text className="text-[11px] text-slate-400 mt-1 text-center">
                          {habitat.pokemon.length} pokemon
                        </Text>
                        {habitat.event ? (
                          <Text className="text-[11px] font-semibold text-amber-300 mt-1 text-center">
                            {habitat.event}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          );
        })
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
              {displayHabitat?.imageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700">
                  <ExpoImage
                    source={{ uri: displayHabitat.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {selectedHabitatDetail?.name ?? displayHabitat?.name ?? "—"}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">
                  {selectedHabitatDetail?.number
                    ? `Habitat #${String(selectedHabitatDetail.number).padStart(3, "0")}`
                    : displayHabitat
                      ? `Habitat #${displayHabitat.number}`
                      : "Habitat"}
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

          {selectedHabitatLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading habitat detail…</Text>
            </View>
          ) : selectedHabitatError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
              <Text className="text-sm font-semibold text-rose-200">Habitat unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{selectedHabitatError}</Text>
            </View>
          ) : selectedHabitatDetail ? (
            <>
              <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
                <View className="flex-row">
                  <View className="w-28 h-20 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                    <ExpoImage source={{ uri: selectedHabitatDetail.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-sm text-slate-300 mt-2">{selectedHabitatDetail.description}</Text>
                  </View>
                </View>
              </View>

              {selectedHabitatDetail.requirements.length ? (
                <View className="mb-4">
                  <View className="px-1 mb-2">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Requirements</Text>
                  </View>
                  {/* 3-per-row grid */}
                  <View className="flex-row flex-wrap -mx-1">
                    {selectedHabitatDetail.requirements.map((requirement) => (
                      <View key={requirement.slug} className="w-1/3 px-1 mb-2">
                        <View className="rounded-3xl p-3 items-center">
                          <View className="w-16 h-16 rounded-2xl overflow-hidden mb-2">
                            <ExpoImage
                              source={{ uri: requirement.imageUrl }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="contain"
                              transition={120}
                            />
                          </View>
                          <Text
                            numberOfLines={2}
                            className="text-[11px] font-semibold text-slate-50 text-center leading-4"
                          >
                            {requirement.name}
                          </Text>
                          <Text className="text-[11px] text-slate-400 mt-1 text-center">
                            x{requirement.qty}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View className="px-1 mb-2">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pokemon in This Habitat</Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">{selectedHabitatDetail.pokemon.length} entries</Text>
              </View>
              {selectedHabitatDetail.pokemon.map((pokemon) => {
                const fallbackSpeciesId =
                  displayHabitat?.pokemon.find(
                    (entry) =>
                      entry.slug === pokemon.slug ||
                      entry.name.trim().toLowerCase() === pokemon.name.trim().toLowerCase()
                  )?.id ?? null;
                const speciesId = resolveSpeciesId(pokemon) ?? fallbackSpeciesId;
                const isCaught = speciesId != null ? getCaughtState(speciesId) : false;

                return (
                  <View key={pokemon.slug} className="rounded-3xl bg-slate-950 p-4 border mb-3 border-slate-800">
                    <View className="flex-row items-center">
                      <View className="mr-3" style={{ width: 64, height: 64 }}>
                        <View className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700">
                          <ExpoImage
                            source={{ uri: pokemon.imageUrl }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="contain"
                            transition={120}
                          />
                        </View>
                        {speciesId != null ? (
                          <Pressable
                            onPress={() => onToggleCaughtPokemon(speciesId)}
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isCaught ? POKOPIA_COLORS.lime : "rgba(15,23,42,0.85)",
                              borderWidth: 1.5,
                              borderColor: isCaught ? POKOPIA_COLORS.limeBorder : "rgba(100,116,139,0.8)",
                            }}
                          >
                            <Ionicons
                              name={isCaught ? "checkmark" : "add"}
                              size={13}
                              color={isCaught ? "#fff" : "#94a3b8"}
                            />
                          </Pressable>
                        ) : null}
                      </View>

                      <View className="flex-1">
                        <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {pokemon.dexNumber ? `Dex #${String(pokemon.dexNumber).padStart(3, "0")}` : "Pokemon"}
                        </Text>
                        <Text className="text-[15px] font-semibold text-slate-50 mt-0.5">{pokemon.name}</Text>
                        {pokemon.rarity ? <Text className="text-[11px] text-amber-300 mt-1">{pokemon.rarity}</Text> : null}
                        {pokemon.times.length ? <Text className="text-[11px] text-slate-300 mt-1">Time: {pokemon.times.join(" • ")}</Text> : null}
                        {pokemon.weather.length ? <Text className="text-[11px] text-slate-400 mt-1">Weather: {pokemon.weather.join(" • ")}</Text> : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}
