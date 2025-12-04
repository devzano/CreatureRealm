// components/PokemonTeamToggle.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Team = {
  id: string;
  name: string;
};

type PokemonTeamToggleProps = {
  team: Team;
  inTeam: boolean;
  onToggle: () => void;
};

const PokemonTeamToggle: React.FC<PokemonTeamToggleProps> = ({
  team,
  inTeam,
  onToggle,
}) => {
  return (
    <View className="mt-1 mb-4">
      <Text className="text-xs font-semibold text-slate-400 mb-1">
        Team
      </Text>
      <TouchableOpacity
        onPress={onToggle}
        className="px-3 py-2 rounded-2xl flex-row items-center justify-center bg-slate-900 border border-slate-700"
        style={{
          borderColor: inTeam ? "#38bdf8" : "#334155",
        }}
      >
        <MaterialCommunityIcons
          name="account-group"
          size={18}
          color={inTeam ? "#38bdf8" : "#94a3b8"}
        />
        <Text className="ml-2 text-[12px] font-semibold text-slate-100">
          {inTeam
            ? `Remove from ${team.name}`
            : `Add to ${team.name}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default PokemonTeamToggle;
