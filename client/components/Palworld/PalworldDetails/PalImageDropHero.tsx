import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import LiquidGlass from "@/components/ui/LiquidGlass";
import { type PalDetail } from "@/lib/palworld/pal/paldbDetails";
import PalPossibleDropsSection from "./PalPossibleDropsSection";
import { elementHex } from "@/lib/palworld/palworldDB";

export type PalImageDropHeroProps = {
  data: PalDetail;
  subtitle: string;
  accent: string;
};

export const PalImageDropHero: React.FC<PalImageDropHeroProps> = ({
  data,
  subtitle,
  accent,
}) => {
  const [forceFallbackImage, setForceFallbackImage] = useState(false);
  const [hideImage, setHideImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setForceFallbackImage(false);
    setHideImage(false);
    setIsLoading(true);
  }, [data?.id]);

  const effectiveHero = useMemo(() => {
    if (hideImage) return null;
    if (forceFallbackImage) return data.iconUrl ?? null;
    return data.imageUrl ?? data.iconUrl ?? null;
  }, [hideImage, forceFallbackImage, data.imageUrl, data.iconUrl]);

  return (
    <>
      {/* Container: justify-center aligns the "group" of image+drops to the middle */}
      <View className="flex-row items-center justify-center mb-6 px-4 min-h-[240px]">

        {/* Left Side: Main Image */}
        <View className="items-center justify-center">
          {effectiveHero ? (
            <View className="items-center justify-center relative">
              <Image
                source={{ uri: effectiveHero }}
                style={{ width: 240, height: 240 }}
                resizeMode="contain"
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  if (!forceFallbackImage && data.iconUrl) {
                    setForceFallbackImage(true);
                  } else {
                    setHideImage(true);
                  }
                }}
              />
              {isLoading && (
                <View className="absolute inset-0 items-center justify-center">
                  <ActivityIndicator size="large" color={accent} />
                </View>
              )}
            </View>
          ) : (
            <View className="w-[200px] h-[200px] rounded-3xl bg-slate-950/90 border border-slate-800 items-center justify-center">
              <MaterialCommunityIcons name="image-off-outline" size={40} color="#64748b" />
            </View>
          )}
        </View>

        {/* Right Side: Drops Section (Removed absolute) */}
        {data.possibleDrops && data.possibleDrops.length > 0 && (
          <View className="ml-4">
            <PalPossibleDropsSection drops={data.possibleDrops} />
          </View>
        )}

      </View>

      {/* Elements Section */}
      {(data.elements ?? []).length > 0 && (
        <View className="flex-row flex-wrap mb-3 justify-center">
          {(data.elements ?? []).map((el) => {
            const tint = elementHex(el);
            return (
              <LiquidGlass
                key={el}
                interactive={false}
                tinted
                tintColor={tint}
                showFallbackBackground
                style={{ borderRadius: 999, marginRight: 8, marginBottom: 8 }}
              >
                <View
                  className="px-4 py-2 rounded-full border"
                  style={{ backgroundColor: `${tint}22`, borderColor: `${tint}99` }}
                >
                  <Text className="text-[12px] font-semibold text-slate-100">{el}</Text>
                </View>
              </LiquidGlass>
            );
          })}
        </View>
      )}
    </>
  );
};

export default PalImageDropHero;
