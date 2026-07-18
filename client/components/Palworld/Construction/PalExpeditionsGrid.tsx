import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import RemoteIcon from "@/components/Palworld/RemoteIcon";
import { clamp, formatPillNumber, safeText } from "@/components/Palworld/Construction/palGridKit";
import type { PalExpeditionEntry } from "@/lib/palworld/construction/paldbSpecialStructures";

type PalExpeditionsGridProps = {
  items: PalExpeditionEntry[];
  emptyText?: string;
  numColumns?: number;
};

function Pill({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || safeText(value) === "") return null;
  return (
    <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
      <Text className="text-white/80 text-[12px]">
        {label}: <Text className="text-white">{String(value)}</Text>
      </Text>
    </View>
  );
}

export default function PalExpeditionsGrid({
  items,
  emptyText = "No pal expeditions found.",
  numColumns = 2,
}: PalExpeditionsGridProps) {
  const cols = clamp(numColumns, 1, 3);
  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const [selected, setSelected] = useState<PalExpeditionEntry | null>(null);

  if (!rows.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {rows.map((item) => (
            <View key={item.id} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
              <Pressable
                onPress={() => setSelected(item)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 active:opacity-90"
                style={{ minHeight: 184 }}
              >
                <View className="flex-row items-start justify-between">
                  <Text className="text-white text-[14px] font-semibold flex-1 pr-3" numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.risk ? (
                    <View className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.05]">
                      <Text className="text-[10px] font-semibold text-white/80">{item.risk}</Text>
                    </View>
                  ) : null}
                </View>

                <Text className="text-white/60 text-[11px] mt-2" numberOfLines={3}>
                  {item.objective || "Expedition objective"}
                </Text>

                <View className="mt-3 gap-y-2">
                  <Text className="text-white/65 text-[11px]">
                    Duration: <Text className="text-white/90">{item.duration || "—"}</Text>
                  </Text>
                  <Text className="text-white/65 text-[11px]">
                    Firepower:{" "}
                    <Text className="text-white/90">
                      {item.recommendedFirepower != null ? formatPillNumber(item.recommendedFirepower) : "—"}
                    </Text>
                  </Text>
                  {item.requiredType ? (
                    <Text className="text-white/65 text-[11px]">
                      Required: <Text className="text-white/90">{item.requiredType}</Text>
                    </Text>
                  ) : null}
                </View>

                <View className="flex-1" />

                <View className="mt-3 pt-3 border-t border-white/5">
                  <Text className="text-white/55 text-[11px]">
                    {item.rewards.length} reward{item.rewards.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      <BottomSheetModal
        visible={selected != null}
        onRequestClose={() => setSelected(null)}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white text-[18px] font-semibold" numberOfLines={2}>
                {selected?.name ?? "—"}
              </Text>
              <Text className="text-white/60 text-[12px] mt-1" numberOfLines={3}>
                {selected?.objective ?? "Expedition details"}
              </Text>
            </View>

            <Pressable
              onPress={() => setSelected(null)}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <Pill label="Risk" value={selected?.risk} />
            <Pill label="Duration" value={selected?.duration} />
            <Pill
              label="Firepower"
              value={selected?.recommendedFirepower != null ? formatPillNumber(selected.recommendedFirepower) : null}
            />
            <Pill label="Required Type" value={selected?.requiredType} />
          </View>

          <View className="mt-5">
            <Text className="text-white/80 text-[12px] mb-2">Items that can be obtained</Text>
            <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
              {selected?.rewards.length ? (
                selected.rewards.map((reward, index) => (
                  <View
                    key={reward.id}
                    className={[
                      "flex-row items-center justify-between px-3 py-2.5",
                      index !== selected.rewards.length - 1 ? "border-b border-white/5" : "",
                    ].join(" ")}
                  >
                    <View className="flex-row items-center flex-1 min-w-0">
                      <RemoteIcon
                        uri={reward.iconUrl ?? null}
                        size={28}
                        roundedClassName="rounded-lg"
                        placeholderClassName="bg-white/5 border border-white/10"
                        contentFit="contain"
                      />
                      <View className="ml-3 flex-1 min-w-0">
                        <Text className="text-white/90 text-[13px]" numberOfLines={1}>
                          {reward.name}
                        </Text>
                        {reward.quantityText ? (
                          <Text className="text-white/45 text-[11px]" numberOfLines={1}>
                            Qty {reward.quantityText}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Text className="text-white/75 text-[12px] ml-3">
                      {reward.chanceText || "—"}
                    </Text>
                  </View>
                ))
              ) : (
                <View className="px-3 py-4">
                  <Text className="text-white/60 text-[12px]">No rewards parsed for this expedition.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
