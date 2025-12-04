// components/PokemonCollectionStatus.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type PokemonCollectionStatusProps = {
  entry: {
    caught: boolean;
    shiny: boolean;
    alpha?: boolean;
  };
  onToggleCaught: () => void;
  onToggleShiny: () => void;
  onToggleAlpha: () => void;
};

const PokemonCollectionStatus: React.FC<PokemonCollectionStatusProps> = ({
  entry,
  onToggleCaught,
  onToggleShiny,
  onToggleAlpha,
}) => {
  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-slate-400 mb-2">
        Collection Status
      </Text>
      <View className="flex-row items-center justify-between">
        {/* Caught */}
        <TouchableOpacity
          onPress={onToggleCaught}
          className="flex-1 mr-2 px-3 py-2 rounded-2xl flex-row items-center justify-center bg-slate-900 border border-slate-700"
          style={{
            borderColor: entry.caught ? "#22c55e" : "#334155",
          }}
        >
          <MaterialCommunityIcons
            name="pokeball"
            size={18}
            color={entry.caught ? "#22c55e" : "#94a3b8"}
          />
          <Text className="ml-2 text-[12px] font-semibold text-slate-100">
            {entry.caught ? "Caught" : "Mark caught"}
          </Text>
        </TouchableOpacity>

        {/* Shiny */}
        <TouchableOpacity
          onPress={onToggleShiny}
          className="flex-1 mr-2 px-3 py-2 rounded-2xl flex-row items-center justify-center bg-slate-900 border border-slate-700"
          style={{
            borderColor: entry.shiny ? "#facc15" : "#334155",
          }}
        >
          <MaterialCommunityIcons
            name={
              entry.shiny ? "star-four-points" : "star-four-points-outline"
            }
            size={18}
            color={entry.shiny ? "#facc15" : "#94a3b8"}
          />
          <Text className="ml-2 text-[12px] font-semibold text-slate-100">
            {entry.shiny ? "Shiny caught" : "Mark shiny"}
          </Text>
        </TouchableOpacity>

        {/* Alpha */}
        <TouchableOpacity
          onPress={onToggleAlpha}
          className="flex-1 px-3 py-2 rounded-2xl flex-row items-center justify-center bg-slate-900 border border-slate-700"
          style={{
            borderColor: entry.alpha ? "#38bdf8" : "#334155",
          }}
        >
          <MaterialCommunityIcons
            name="alpha-a"
            size={18}
            color={entry.alpha ? "#38bdf8" : "#94a3b8"}
          />
          <Text className="ml-2 text-[12px] font-semibold text-slate-100">
            {entry.alpha ? "Alpha caught" : "Mark alpha"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PokemonCollectionStatus;
