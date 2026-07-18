import React, { useMemo } from "react";
import { Text, View } from "react-native";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import { clamp, safeText } from "@/components/Palworld/Construction/palGridKit";
import type { WorkPriorityItem } from "@/lib/palworld/upgrades/paldbWorkPriority";

type WorkPriorityGridProps = {
  items: WorkPriorityItem[];
  emptyText?: string;
  numColumns?: number;
};

function accentColor(priority: number) {
  if (priority <= 5) return "rgba(250, 204, 21, 0.65)";
  if (priority <= 10) return "rgba(103, 232, 249, 0.55)";
  if (priority <= 15) return "rgba(167, 139, 250, 0.55)";
  return "rgba(148, 163, 184, 0.45)";
}

export default function WorkPriorityGrid({
  items,
  emptyText = "No work priority entries found.",
  numColumns = 3,
}: WorkPriorityGridProps) {
  const cols = clamp(numColumns, 2, 4);
  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  if (!rows.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  return (
    <View className="px-4">
      <View className="flex-row flex-wrap -mx-2">
        {rows.map((item) => {
          const borderColor = accentColor(item.priority);

          return (
            <View key={item.id} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
              <View
                className="rounded-3xl bg-white/[0.03] px-4 py-4 border"
                style={{ minHeight: 144, borderColor }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center flex-1 pr-3">
                    <RemoteIcon
                      uri={item.iconUrl ?? null}
                      size={22}
                      roundedClassName="rounded-lg"
                      placeholderClassName="bg-white/5 border border-white/10"
                      contentFit="contain"
                    />
                    <Text className="ml-2 text-white text-[15px] font-semibold flex-1" numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>

                  <View
                    className="px-2.5 py-1 rounded-full border"
                    style={{ borderColor, backgroundColor: "rgba(255,255,255,0.04)" }}
                  >
                    <Text className="text-white text-[11px] font-semibold">#{item.priority}</Text>
                  </View>
                </View>

                <View className="flex-1" />

                <View className="mt-4">
                  <Text className="text-white/55 text-[10px] uppercase tracking-[0.18em]">Code</Text>
                  <Text className="text-white/82 text-[12px] mt-1" numberOfLines={2}>
                    {safeText(item.code) || "—"}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
