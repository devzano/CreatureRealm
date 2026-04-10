import React from "react";
import { Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

import type { PokopiaItemVariantImage } from "@/lib/pokemon/pokopia/itemDetail";

type Props = {
  variants: PokopiaItemVariantImage[];
};

export default function PokopiaItemVariantStrip({ variants }: Props) {
  if (!variants.length) return null;

  return (
    <View className="mb-4">
      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
        Variants
      </Text>
      <View className="flex-row flex-wrap">
        {variants.map((variant) => (
          <View
            key={`${variant.label}-${variant.imageUrl}`}
            className="mr-2 mb-2 rounded-2xl border border-slate-700 bg-slate-950 px-2 py-2 items-center"
            style={{ width: 72 }}
          >
            <View className="w-10 h-10 mb-1">
              <ExpoImage
                source={{ uri: variant.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                transition={120}
              />
            </View>
            <Text
              numberOfLines={1}
              className="text-[10px] font-semibold text-slate-300 text-center"
            >
              {variant.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
