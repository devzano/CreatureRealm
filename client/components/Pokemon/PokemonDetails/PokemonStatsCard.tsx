// components/PokemonStatsCard.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import type { PokemonStat } from "@/lib/pokemon/index";

type PokemonStatsCardProps = {
  stats: PokemonStat[];
};

const BASE_STAT_MAX = 255;

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Compact base stats card with total + EV flags.
 * This is form-agnostic: just feed it the active form's stats array.
 */
const PokemonStatsCard: React.FC<PokemonStatsCardProps> = ({ stats }) => {
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
    <View className="mb-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-3">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs font-semibold text-slate-300">
          Base stats
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
                  <Text className="text-[10px] text-emerald-400 mr-1">
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
                  backgroundColor: "#22c55e",
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default PokemonStatsCard;
