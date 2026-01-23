// components/PokemonShinyHunt.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { HuntMethod } from "@/store/pokemonCollectionStore";

type PokemonShinyHuntProps = {
  count: number;
  method: HuntMethod;
  onIncrement: () => void;
  onDecrement: () => void;
  onSetMethod: (method: HuntMethod) => void;
};

function methodLabel(m: HuntMethod): string {
  switch (m) {
    case "random":
      return "Random";
    case "masuda":
      return "Masuda";
    case "outbreak":
      return "Outbreak";
    case "other":
      return "Other";
    default:
      return "None";
  }
}

const PokemonShinyHunt: React.FC<PokemonShinyHuntProps> = ({
  count,
  method,
  onIncrement,
  onDecrement,
  onSetMethod,
}) => {
  const MethodChip = ({ value }: { value: HuntMethod }) => {
    const active = method === value;
    return (
      <TouchableOpacity
        onPress={() => onSetMethod(value)}
        className="px-3 py-1.5 rounded-full mr-2 mb-2"
        style={{
          backgroundColor: active ? "#f97316" : "#020617",
          borderWidth: 1,
          borderColor: active ? "#f97316" : "#1f2933",
        }}
      >
        <Text
          className="text-[11px] font-semibold"
          style={{ color: active ? "#020617" : "#e5e7eb" }}
        >
          {methodLabel(value)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-slate-400 mb-2">
        Shiny hunt
      </Text>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={onDecrement}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 items-center justify-center mr-2"
          >
            <Text className="text-[16px] text-slate-200">-</Text>
          </TouchableOpacity>
          <View className="px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-700">
            <Text className="text-[13px] font-semibold text-slate-100">
              {count} encounter{count === 1 ? "" : "s"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onIncrement}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 items-center justify-center ml-2"
          >
            <Text className="text-[16px] text-slate-200">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row flex-wrap">
        <MethodChip value="none" />
        <MethodChip value="random" />
        <MethodChip value="masuda" />
        <MethodChip value="outbreak" />
        <MethodChip value="other" />
      </View>
    </View>
  );
};

export default PokemonShinyHunt;
