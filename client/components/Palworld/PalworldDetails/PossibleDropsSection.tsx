// components/Palworld/PalworldDetails/PalPossibleDropsSection.tsx
import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { Image } from "expo-image";

export type PalPossibleDropsSectionProps = {
  drops: Array<{
    name: string;
    iconUrl?: string;
    amount?: string;
    probability?: string;
  }>;
};

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

function buildImageSource(url?: string) {
  const u = safeEncodeUrl(url);
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

export const PalPossibleDropsSection: React.FC<PalPossibleDropsSectionProps> = ({
  drops,
}) => {
  if (!drops || drops.length === 0) return null;

  const data = useMemo(
    () =>
      drops.map((d) => ({
        ...d,
        _src: buildImageSource(d.iconUrl),
      })),
    [drops]
  );

  const ROW_H = 74;
  const MAX_H = 160;
  const computedH = Math.min(MAX_H, Math.max(ROW_H, data.length * ROW_H));

  return (
    <View className="ml-4 max-w-[110px]">
      <Text className="text-[9px] font-bold text-slate-500 uppercase mb-2 text-center">
        Possible Drops
      </Text>

      <View className="rounded-2xl bg-slate-900/80 border border-slate-700 px-2 py-2">
        <ScrollView
          style={{ height: computedH }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: 2,
          }}
        >
          {data.map((d, idx) => (
            <View
              key={`${d.name}-${idx}`}
              style={{ width: "100%" }}
              className="items-center mb-4 last:mb-0"
            >
              {d._src ? (
                <Image
                  source={d._src as any}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    marginBottom: 4,
                  }}
                  contentFit="contain"
                  transition={120}
                  cachePolicy="disk"
                />
              ) : (
                <View className="w-11 h-11 rounded-lg bg-slate-800/50 border border-slate-700 mb-1" />
              )}

              <Text
                numberOfLines={1}
                className="text-[10px] text-slate-200 font-medium text-center"
              >
                {d.name}
              </Text>

              {(d.amount || d.probability) ? (
                <View className="flex-row items-center justify-center mt-0.5">
                  {d.amount ? (
                    <Text className="text-[9px] text-slate-500 text-center">
                      {d.amount}
                    </Text>
                  ) : null}

                  {d.amount && d.probability ? (
                    <Text className="text-[9px] text-slate-600 mx-1">•</Text>
                  ) : null}

                  {d.probability ? (
                    <Text className="text-[9px] text-slate-500 text-center">
                      {d.probability}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default PalPossibleDropsSection;
