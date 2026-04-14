import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  collected: boolean;
  onPress: () => void;
  label?: string;
};

export default function PokopiaCollectToggleButton({
  collected,
  onPress,
  label,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border px-3 py-1.5"
      style={{
        backgroundColor: collected ? "rgba(109,218,95,0.16)" : "rgba(15,23,42,0.9)",
        borderColor: collected ? "rgba(109,218,95,0.42)" : "rgba(51,65,85,0.9)",
      }}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={collected ? "checkmark-circle" : "ellipse-outline"}
          size={14}
          color={collected ? "#b8ffb2" : "#cbd5e1"}
        />
        <Text
          className="ml-1.5 text-[11px] font-semibold"
          style={{ color: collected ? "#d8ffd3" : "#e2e8f0" }}
        >
          {label ?? (collected ? "Collected" : "Need")}
        </Text>
      </View>
    </Pressable>
  );
}
