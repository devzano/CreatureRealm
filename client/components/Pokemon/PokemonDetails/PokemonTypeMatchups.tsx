// components/PokemonDetails/PokemonTypeMatchups.tsx
import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LiquidGlass from "@/components/ui/LiquidGlass";
import { getTypeStyle } from "@/lib/ui/typeStyles";

type PokemonTypeMatchupsProps = {
  weakTo: string[];
  superEffectiveVs: string[];
};

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const PokemonTypeMatchups: React.FC<PokemonTypeMatchupsProps> = ({
  weakTo,
  superEffectiveVs,
}) => {
  const hasWeak = weakTo && weakTo.length > 0;
  const hasStrong = superEffectiveVs && superEffectiveVs.length > 0;

  if (!hasWeak && !hasStrong) {
    return null;
  }

  return (
    <View className="mt-3 mb-3 rounded-3xl bg-slate-950/90 border border-slate-800 px-3 py-3">
      {/* Header row to match PokedexEntryStrip */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="sword-cross"
            size={14}
            color="#9ca3af"
          />
          <Text className="ml-1.5 text-xs font-semibold text-slate-200">
            Type Matchups
          </Text>
        </View>
      </View>

      <View className="flex-row">
        {/* Weak to column */}
        {hasWeak && (
          <View className="flex-1 mr-2 items-center justify-center">
            <Text className="text-[11px] font-semibold text-slate-400 mb-1">
              Weak Towards
            </Text>
            <View className="flex-row flex-wrap justify-center">
              {weakTo.map((typeName) => {
                const { bg, border, text, tint } = getTypeStyle(typeName);
                return (
                  <LiquidGlass
                    key={`weak-${typeName}`}
                    interactive={false}
                    tinted
                    tintColor={tint}
                    showFallbackBackground
                    style={{
                      borderRadius: 999,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      className={`px-4 py-2 rounded-full border ${bg} ${border}`}
                    >
                      <Text className={`text-[12px] font-semibold ${text}`}>
                        {capitalize(typeName)}
                      </Text>
                    </View>
                  </LiquidGlass>
                );
              })}
            </View>
          </View>
        )}

        {/* Super effective vs column */}
        {hasStrong && (
          <View className="flex-1 ml-2 items-center justify-center">
            <Text className="text-[11px] font-semibold text-slate-400 mb-1">
              Super Effective Towards
            </Text>
            <View className="flex-row flex-wrap justify-center">
              {superEffectiveVs.map((typeName) => {
                const { bg, border, text, tint } = getTypeStyle(typeName);
                return (
                  <LiquidGlass
                    key={`strong-${typeName}`}
                    interactive={false}
                    tinted
                    tintColor={tint}
                    showFallbackBackground
                    style={{
                      borderRadius: 999,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      className={`px-4 py-2 rounded-full border ${bg} ${border}`}
                    >
                      <Text className={`text-[12px] font-semibold ${text}`}>
                        {capitalize(typeName)}
                      </Text>
                    </View>
                  </LiquidGlass>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default PokemonTypeMatchups;
