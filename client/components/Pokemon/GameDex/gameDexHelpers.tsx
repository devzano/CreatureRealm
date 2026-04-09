import React from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { CreatureRealmGame } from "@/lib/pokemon/gameFilters";
import LocalIcon from "@/components/LocalIcon";

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getCoverArtStyle(game: CreatureRealmGame | null) {
  const platform = game?.platforms?.[0] ?? "";

  if (platform.includes("Switch")) return { width: 88, aspectRatio: 10 / 17, maxHeight: 150 };
  if (platform.includes("Nintendo 3DS") || platform.includes("Nintendo DS")) {
    return { width: 96, aspectRatio: 2 / 3, maxHeight: 150 };
  }
  if (platform.includes("Game Boy Advance")) return { width: 92, aspectRatio: 2 / 3, maxHeight: 145 };
  if (platform.includes("Game Boy Color") || platform.includes("Game Boy")) {
    return { width: 88, aspectRatio: 3 / 4, maxHeight: 135 };
  }

  return { width: 96, aspectRatio: 3 / 4, maxHeight: 150 };
}

type CircleIconToggleProps = {
  active: boolean;
  activeColor: string;
  onPress: () => void;
  mciName?: string;
  imageSource?: any;
  size?: number;
  iconSize?: number;
};

export function CircleIconToggle({
  active,
  activeColor,
  onPress,
  mciName,
  imageSource,
  size = 28,
  iconSize = 14,
}: CircleIconToggleProps) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <View
        className="rounded-full border items-center justify-center"
        style={{
          width: size,
          height: size,
          borderColor: active ? `${activeColor}99` : "rgba(55,65,81,0.8)",
          backgroundColor: active ? `${activeColor}22` : "rgba(15,23,42,0.40)",
        }}
      >
        {imageSource ? (
          <LocalIcon
            source={imageSource}
            size={iconSize}
            tintColor={active ? activeColor : "#9ca3af"}
            opacity={active ? 1 : 0.9}
            roundedClassName="rounded-none"
            placeholderClassName="bg-transparent border-0"
          />
        ) : (
          <MaterialCommunityIcons
            name={(mciName ?? "help-circle-outline") as any}
            size={iconSize}
            color={active ? activeColor : "#9ca3af"}
          />
        )}
      </View>
    </Pressable>
  );
}
