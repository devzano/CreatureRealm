import React from "react";
import { Pressable, Text, View } from "react-native";

import { getPokopiaFavoriteTheme } from "./favoritePresentation";

type Props = {
  label: string;
  href?: string | null;
  onPress?: () => void;
  compact?: boolean;
};

export default function PokopiaFavoriteChip({ label, href, onPress, compact = false }: Props) {
  const theme = getPokopiaFavoriteTheme(label, href);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`mr-2 mb-2 rounded-full border ${compact ? "px-2.5 py-1" : "px-3 py-1.5"}`}
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        opacity: onPress ? 1 : 0.9,
      }}
    >
      <View className="flex-row items-center">
        <Text
          className={`${compact ? "text-[11px]" : "text-[11px]"} font-semibold`}
          style={{ color: theme.text }}
        >
          {label}
        </Text>
        {onPress ? (
          <Text className="ml-1.5 text-[10px] font-bold" style={{ color: theme.hint }}>
            ›
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
