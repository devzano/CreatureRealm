import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Section from "@/components/Section";
import { getTypeStyle } from "@/lib/pokemon/ui/typeStyles";
import type { PokemonStat } from "@/lib/pokemon";

type DexSlot = {
  number: string;
  labels: string[];
};

type PokemonOverviewSectionProps = {
  primaryType: string;
  dexSlots: DexSlot[];
  species?: any | null;
  genderText: string;
  growthRateText: string;
  eggGroupText: string;
  habitatText: string;
  captureRateText: string;
  baseHappinessText: string;
  stats: PokemonStat[];
};

const BASE_STAT_MAX = 255;

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const PokemonOverviewSection: React.FC<PokemonOverviewSectionProps> = ({
  primaryType,
  dexSlots,
  species,
  genderText,
  growthRateText,
  eggGroupText,
  habitatText,
  captureRateText,
  baseHappinessText,
  stats,
}) => {
  const { tint } = getTypeStyle(primaryType);

  const statsWithLabels = useMemo(() => {
    const labelMap: Record<string, string> = {
      hp: "HP",
      attack: "Attack",
      defense: "Defense",
      "special-attack": "Sp. Atk",
      "special-defense": "Sp. Def",
      speed: "Speed",
    };

    return stats.map((s) => ({
      key: s.stat.name,
      label: labelMap[s.stat.name] ?? capitalize(s.stat.name),
      base: s.base_stat,
      effort: s.effort,
    }));
  }, [stats]);

  const statsTotal = useMemo(
    () => statsWithLabels.reduce((sum, s) => sum + s.base, 0),
    [statsWithLabels]
  );

  return (
    <Section
      borderColor={`${tint}AA`}
      title={
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="information-outline"
            size={14}
            color="#9ca3af"
          />
          <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Overview
          </Text>
        </View>
      }
    >
      {dexSlots.length > 0 && (
        <View className="flex-row mb-3">
          <View className="flex-1 mr-2 rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-2">
            <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-1">
              Dex Numbers
            </Text>

            {dexSlots.map((slot, idx) => (
              <View
                key={`${slot.number}-${idx}`}
                className="flex-row items-center justify-between py-0.5"
              >
                <Text className="text-[11px] font-mono text-slate-100">
                  {slot.number}
                </Text>
                <Text
                  className="text-[11px] text-slate-300 ml-3 flex-1 text-right"
                  numberOfLines={1}
                >
                  {slot.labels.join(" • ")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {species && (
        <View className="mb-3 rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-3">
          <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-1.5">
            Profile
          </Text>

          <View className="flex-row mb-2">
            <View className="flex-1 mr-3">
              <Text className="text-[11px] font-semibold text-slate-400">
                Gender
              </Text>
              <Text className="text-[12px] text-slate-100 mt-0.5">
                {genderText}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-400">
                Growth Rate
              </Text>
              <Text className="text-[12px] text-slate-100 mt-0.5">
                {growthRateText}
              </Text>
            </View>
          </View>

          <View className="flex-row mb-2">
            <View className="flex-1 mr-3">
              <Text className="text-[11px] font-semibold text-slate-400">
                Egg Groups
              </Text>
              <Text
                className="text-[12px] text-slate-100 mt-0.5"
                numberOfLines={2}
              >
                {eggGroupText}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-400">
                Habitat
              </Text>
              <Text className="text-[12px] text-slate-100 mt-0.5">
                {habitatText}
              </Text>
            </View>
          </View>

          <View className="flex-row">
            <View className="flex-1 mr-3">
              <Text className="text-[11px] font-semibold text-slate-400">
                Capture Rate
              </Text>
              <Text className="text-[12px] text-slate-100 mt-0.5">
                {captureRateText}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-400">
                Base Happiness
              </Text>
              <Text className="text-[12px] text-slate-100 mt-0.5">
                {baseHappinessText}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3">
        <View className="flex-row items-center justify-between mb-1">
         <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-1.5">
            Base Stats
          </Text>
          <Text className="text-[11px] text-slate-400">
            Total {statsTotal}
          </Text>
        </View>

        {statsWithLabels.map((s) => {
          const pct = Math.min(100, (s.base / BASE_STAT_MAX) * 100);

          return (
            <View key={s.key} className="mb-1.5">
              <View className="flex-row justify-between mb-0.5">
                <Text className="text-[11px] text-slate-300">
                  {s.label}
                </Text>

                <View className="flex-row items-center">
                  {s.effort > 0 && (
                    <Text className="text-[10px] mr-1" style={{ color: tint }}>
                      +{s.effort} EV
                    </Text>
                  )}
                  <Text className="text-[11px] text-slate-400">
                    {s.base}
                  </Text>
                </View>
              </View>

              <View className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <View
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `${tint}AA`,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Section>
  );
};

export default PokemonOverviewSection;
