// app/(tabs)/index.tsx
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PageWrapper from "@/components/PageWrapper";
import PokemonHomeContent from "@/components/Pokemon/PokemonHomeContent";

type SeriesId = "pokemon";

export default function GamesScreen() {
  const [activeSeries, setActiveSeries] = useState<SeriesId | null>(null);

  // View 1: Series picker
  if (!activeSeries) {
    return (
      <PageWrapper
        hideBackButton
        title="Choose a collection"
        subtitle="Start with Pokémon — more CreatureRealm universes are coming soon."
        leftActions={
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            CreatureRealm
          </Text>
        }
      >
        <View className="mt-4">
          {/* Pokémon series card */}
          <Pressable
            onPress={() => setActiveSeries("pokemon")}
            className="rounded-3xl bg-slate-900 border border-slate-800 px-4 py-4 mb-3"
          >
            {/* Top row: icon + title + pill */}
            <View className="flex-row items-center mb-3">
              <View className="w-12 h-12 rounded-2xl bg-sky-500/15 items-center justify-center mr-3 border border-sky-500/40">
                <MaterialCommunityIcons
                  name="pokeball"
                  size={24}
                  color="#38bdf8"
                />
              </View>

              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-slate-50">
                  Pokémon
                </Text>
                <Text className="text-[12px] text-slate-400 mt-0.5">
                  Track your progress across every mainline generation.
                </Text>
              </View>

              <View className="items-end">
                <View className="px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/50 mb-1">
                  <Text className="text-[10px] font-semibold text-sky-300">
                    COLLECTION
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#94a3b8"
                />
              </View>
            </View>

            {/* Sub layout: meta rows */}
            <View className="rounded-2xl bg-slate-950/70 border border-slate-800 px-3 py-3">
              <View className="flex-row justify-between mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-[11px] text-slate-400">
                    Games & regions
                  </Text>
                  <Text className="text-[11px] font-semibold text-slate-100 mt-0.5">
                    Generations 1–9 • Kanto → Paldea
                  </Text>
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-[11px] text-slate-400">
                    What you can track
                  </Text>
                  <Text className="text-[11px] font-semibold text-slate-100 mt-0.5">
                    Caught, shiny, alpha, teams, notes
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center mt-1">
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="sword-cross"
                    size={14}
                    color="#e5e7eb"
                  />
                  <Text className="ml-1.5 text-[11px] text-slate-300">
                    Full move & ability breakdowns
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <MaterialCommunityIcons
                    name="star-four-points-outline"
                    size={14}
                    color="#facc15"
                  />
                  <Text className="ml-1.5 text-[11px] text-slate-300">
                    Shiny hunt helpers
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>

          {/* Placeholder for future series */}
          <View className="rounded-3xl bg-slate-950 border border-dashed border-slate-700 px-4 py-4">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-2xl bg-slate-900/90 items-center justify-center mr-3 border border-slate-700">
                <MaterialCommunityIcons
                  name="controller-classic-outline"
                  size={20}
                  color="#64748b"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-slate-200">
                  More CreatureRealm universes coming soon
                </Text>
                <Text className="text-[12px] text-slate-500 mt-0.5">
                  Separate collections for other creature games will live here with
                  their own tracking and layouts. Currently in development:
                </Text>
              </View>
            </View>

            <View className="mt-2 flex-row flex-wrap items-center justify-center">
              <View className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/80 mr-2 mb-2">
                <Text className="text-[11px] text-slate-400">
                  Animal Crossing
                </Text>
              </View>
              <View className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/80 mr-2 mb-2">
                <Text className="text-[11px] text-slate-400">
                  Palworld
                </Text>
              </View>
            </View>
          </View>
        </View>
      </PageWrapper>
    );
  }

  // View 2: Pokémon games + maps (sub-tabs are handled inside this component)
  if (activeSeries === "pokemon") {
    return (
      <PokemonHomeContent onBackToCollections={() => setActiveSeries(null)} />
    );
  }

  return null;
}
