// components/pokemon/PokemonVariantBrowser.tsx
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Image as ExpoImage } from "expo-image";

export type PokemonVariantKind =
  | "base"
  | "alolan"
  | "galarian"
  | "hisuian"
  | "paldean"
  | "mega"
  | "gigantamax"
  | "other";

export type PokemonVariant = {
  key: string;
  label: string;
  subtitle?: string;
  regionTag?: string;
  kind?: PokemonVariantKind;
  imageUrl: string | null;
};

type PokemonVariantBrowserProps = {
  variants: PokemonVariant[];
  activeKey: string;
  onSelect: (key: string) => void;
};

const PokemonVariantBrowser: React.FC<PokemonVariantBrowserProps> = ({ variants, activeKey, onSelect }) => {
  if (!variants || variants.length <= 1) return null;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs font-semibold text-slate-300">Forms & Variants</Text>
        <Text className="text-[11px] text-slate-500">
          {variants.length} form{variants.length === 1 ? "" : "s"}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
        {variants.map((variant) => {
          const isActive = variant.key === activeKey;

          return (
            <TouchableOpacity key={variant.key} onPress={() => onSelect(variant.key)} className="mr-3" activeOpacity={0.9}>
              <View
                className={`flex-row items-center rounded-2xl px-3 py-2 border ${isActive ? "bg-slate-900" : "bg-slate-900/60"}`}
                style={{ borderColor: isActive ? "#22c55e" : "#1f2937" }}
              >
                {variant.imageUrl ? (
                  <ExpoImage
                    source={{ uri: variant.imageUrl }}
                    style={{ width: 40, height: 40, marginRight: 8 }}
                    contentFit="contain"
                    transition={120}
                    cachePolicy="disk"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-xl bg-slate-800 mr-2 items-center justify-center">
                    <Text className="text-[10px] text-slate-400">N/A</Text>
                  </View>
                )}

                <View>
                  <Text className="text-[12px] font-semibold" style={{ color: isActive ? "#e5e7eb" : "#cbd5f5" }}>
                    {variant.label}
                  </Text>

                  <View className="flex-row items-center mt-0.5">
                    {variant.regionTag ? (
                      <View className="px-2 py-[2px] rounded-full bg-slate-800 mr-1">
                        <Text className="text-[10px] text-slate-300">{variant.regionTag}</Text>
                      </View>
                    ) : null}

                    {variant.subtitle ? <Text className="text-[10px] text-slate-500">{variant.subtitle}</Text> : null}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default PokemonVariantBrowser;
