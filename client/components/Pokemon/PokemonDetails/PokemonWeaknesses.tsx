// components/PokemonWeaknesses.tsx
import React from "react";
import { View, Text } from "react-native";
import LiquidGlass from "@/components/ui/LiquidGlass";
import { getTypeStyle } from "@/lib/ui/typeStyles";

type PokemonWeaknessesProps = {
  weaknesses: string[];
};

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const PokemonWeaknesses: React.FC<PokemonWeaknessesProps> = ({
  weaknesses,
}) => {
  if (!weaknesses || weaknesses.length === 0) {
    return null;
  }

  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-slate-400 mb-1">
        Weak to
      </Text>
      <View className="flex-row flex-wrap">
        {weaknesses.map((w) => {
          const { bg, border, text, tint } = getTypeStyle(w);
          return (
            <LiquidGlass
              key={w}
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
              <View className={`px-4 py-2 rounded-full border ${bg} ${border}`}>
                <Text className={`text-[12px] font-semibold ${text}`}>
                  {capitalize(w)}
                </Text>
              </View>
            </LiquidGlass>
          );
        })}
      </View>
    </View>
  );
};

export default PokemonWeaknesses;
