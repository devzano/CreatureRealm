import React, { useMemo } from "react";
import { Text, View } from "react-native";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import { clamp, safeText } from "@/components/Palworld/Construction/palGridKit";
import type { FishingShadowEntry, FishingShadowSize } from "@/lib/palworld/construction/paldbSpecialStructures";

type FishingShadowsGridProps = {
  items: FishingShadowEntry[];
  emptyText?: string;
  numColumns?: number;
};

const SHADOW_ORDER: FishingShadowSize[] = ["Small Shadow", "Medium Shadow", "Big Shadow"];

export default function FishingShadowsGrid({
  items,
  emptyText = "No fishing shadow data found.",
  numColumns = 3,
}: FishingShadowsGridProps) {
  const cols = clamp(numColumns, 2, 3);

  const sections = useMemo(() => {
    const byGroup = new Map<FishingShadowSize, FishingShadowEntry[]>();
    for (const key of SHADOW_ORDER) byGroup.set(key, []);

    for (const item of Array.isArray(items) ? items : []) {
      const current = byGroup.get(item.shadowSize);
      if (current) current.push(item);
    }

    return SHADOW_ORDER.map((shadowSize) => ({
      shadowSize,
      items: byGroup.get(shadowSize) ?? [],
    })).filter((section) => section.items.length > 0);
  }, [items]);

  if (!sections.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  return (
    <View className="pb-2">
      {sections.map((section) => (
        <View key={section.shadowSize} className="px-4 pt-2">
          <View className="flex-row items-baseline justify-between px-1 mb-3">
            <Text className="text-white text-[16px] font-semibold">{section.shadowSize}</Text>
            <Text className="text-white/45 text-[11px]">
              {section.items.length} result{section.items.length === 1 ? "" : "s"}
            </Text>
          </View>

          <View className="flex-row flex-wrap -mx-1.5">
            {section.items.map((item) => {
              const metaPrimary = item.kind === "pal" ? (item.isAlpha ? "Alpha Pal" : "Pal") : "Item";
              const metaSecondary = item.kind === "pal" ? item.levelText || "—" : item.quantityText || "—";

              return (
                <View key={item.id} className="px-1.5 mb-3" style={{ width: `${100 / cols}%` as any }}>
                  <View
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-2.5 py-2.5"
                    style={{ minHeight: 104 }}
                  >
                    <View className="items-center">
                      <RemoteIcon
                        uri={item.iconUrl ?? null}
                        size={44}
                        roundedClassName="rounded-xl"
                        placeholderClassName="bg-white/5 border border-white/10"
                        contentFit="contain"
                      />
                    </View>

                    <View className="mt-2">
                      <Text className="text-white text-[11px] font-semibold text-center" numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text className="text-white/45 text-[9px] mt-0.5 text-center" numberOfLines={1}>
                        {metaSecondary}
                      </Text>
                    </View>

                    <View className="flex-1" />

                    <View className="mt-2 pt-2 border-t border-white/5 flex-row items-center justify-between">
                      <Text className="text-white/55 text-[9px]" numberOfLines={1}>
                        {metaPrimary}
                      </Text>
                      <Text className="text-white/85 text-[9px] font-semibold ml-2">
                        {safeText(item.chanceText) || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
