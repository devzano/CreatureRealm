// components/Palworld/PalworldDetails/PalImageDropHero.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";

import LiquidGlass from "@/components/ui/LiquidGlass";
import { type PalDetail } from "@/lib/palworld/pal/paldbDetails";
import PalPossibleDropsSection from "./PossibleDropsSection";
import { elementHex } from "@/lib/palworld/palworldDB";
import { getElementStyle } from "@/lib/palworld/elementStyles";

function safeEncodeUrl(u?: string) {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;
  try {
    return encodeURI(s);
  } catch {
    return s;
  }
}

function isPaldbCdn(url: string) {
  return /^https?:\/\/cdn\.paldb\.cc\//i.test(url);
}

function buildPaldbImageSource(url?: string | null) {
  const u = safeEncodeUrl(url ?? undefined);
  if (!u) return undefined;

  if (isPaldbCdn(u)) {
    return {
      uri: u,
      headers: {
        Referer: "https://paldb.cc/",
        Origin: "https://paldb.cc",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
    } as const;
  }

  return u;
}

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

  const heroSource = useMemo(
    () => (effectiveHero ? buildPaldbImageSource(effectiveHero) : undefined),
    [effectiveHero]
  );

  return (
    <>
      <View className="flex-row items-center justify-center mb-6 px-4 min-h-[240px]">
        <View className="items-center justify-center">
          {heroSource ? (
            <View className="items-center justify-center relative">
              <Image
                source={heroSource as any}
                style={{ width: 240, height: 240 }}
                contentFit="contain"
                transition={120}
                cachePolicy="disk"
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
              <MaterialCommunityIcons
                name="image-off-outline"
                size={40}
                color="#64748b"
              />
            </View>
          )}
        </View>

        {data.possibleDrops && data.possibleDrops.length > 0 && (
          <View className="ml-4">
            <PalPossibleDropsSection drops={data.possibleDrops} />
          </View>
        )}
      </View>

      {(data.elements ?? []).length > 0 && (
        <View className="flex-row flex-wrap mb-3 justify-center">
          {(data.elements ?? []).map((el, idx) => {
            const label = String(el ?? "").trim();
            const pretty =
              label.length > 0
                ? label.charAt(0).toUpperCase() + label.slice(1)
                : "—";

            const { bg, text, tint } = getElementStyle(label);

            return (
              <LiquidGlass
                key={`${el}-${idx}`}
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
                <View className={`px-4 py-2 rounded-full ${bg}`}>
                  <Text className={`text-[12px] font-semibold ${text}`}>
                    {pretty}
                  </Text>
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
