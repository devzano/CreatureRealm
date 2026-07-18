import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import {
  buildTwoLineTitle,
  clamp,
  formatPillNumber,
  makeStripTrailingSuffix,
  safeName,
  safeText,
  useDetailSheet,
  usePrefetchIcons,
} from "@/components/Palworld/Construction/palGridKit";
import {
  DependencyTreeSection,
  DescriptionSection,
  RecipeSection,
  WorkSuitabilitySection,
} from "@/components/Palworld/Construction/palSheetSections";
import type { SpecialConstructionDetail, SpecialConstructionIndexItem, SpecialConstructionStatRow } from "@/lib/palworld/construction/paldbSpecialStructures";

type SpecialConstructionGridProps = {
  items: SpecialConstructionIndexItem[];
  fetchDetail: (slug: string) => Promise<SpecialConstructionDetail>;
  typeLabel: string;
  onPressItem?: (item: SpecialConstructionIndexItem) => void;
  emptyText?: string;
  numColumns?: number;
  prefetchIcons?: boolean;
};

const stripTrailingType = makeStripTrailingSuffix(/\s*(station|pond)\s*$/i);

function StatsSection({ rows }: { rows: SpecialConstructionStatRow[] }) {
  if (!rows.length) return null;

  return (
    <View className="mt-5">
      <Text className="text-white/80 text-[12px] mb-2">Stats</Text>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {rows.map((row, index) => (
          <View
            key={`${row.label}:${index}`}
            className={[
              "flex-row items-center justify-between px-3 py-2.5",
              index !== rows.length - 1 ? "border-b border-white/5" : "",
            ].join(" ")}
          >
            <Text className="text-white/70 text-[12px] flex-1 pr-4">{row.label}</Text>
            <Text className="text-white text-[12px] text-right">{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function compactRows(rows: SpecialConstructionStatRow[] | undefined, max = 3) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => safeText(row?.label) && safeText(row?.value))
    .slice(0, max);
}

export default function SpecialConstructionGrid({
  items,
  fetchDetail,
  typeLabel,
  onPressItem,
  emptyText = "No structures found.",
  numColumns = 3,
  prefetchIcons = true,
}: SpecialConstructionGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const filtered = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  usePrefetchIcons(
    prefetchIcons,
    filtered.map((item) => item.iconUrl)
  );

  const { visible, open, close, selected, detail, loading, error } = useDetailSheet<SpecialConstructionIndexItem, SpecialConstructionDetail>(
    fetchDetail,
    onPressItem
  );

  if (!filtered.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const tileHeight = 196;
  const active = detail ?? selected;
  const title = safeText(active?.name);
  const categoryText = safeText(active?.categoryText);

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {filtered.map((item) => {
            const builtTitle = buildTwoLineTitle(safeName(item), item.categoryText ?? typeLabel, {
              strip: stripTrailingType,
              fallback1: typeLabel,
              fallback2: typeLabel,
            });
            const summaryRows = compactRows(item.detailRows, 3);

            return (
              <View key={item.slug} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
                <Pressable
                  onPress={() => open(item)}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden active:opacity-90"
                  style={{ height: tileHeight }}
                >
                  <View className="flex-1 px-3 pt-3 pb-3">
                    <View className="items-center justify-center">
                      <RemoteIcon
                        uri={item.iconUrl ?? null}
                        size={60}
                        roundedClassName="rounded-xl"
                        placeholderClassName="bg-white/5 border border-white/10"
                        contentFit="contain"
                      />
                    </View>

                    <View className="mt-2 items-center">
                      <Text numberOfLines={1} className="text-white text-[12px] leading-4 text-center">
                        {builtTitle.line1}
                      </Text>
                      <Text numberOfLines={1} className="text-white/50 text-[10px] text-center mt-0.5">
                        {builtTitle.line2}
                      </Text>
                    </View>

                    <View className="flex-1" />

                    <View className="mt-2">
                      <View className="flex-row items-center justify-center gap-x-2">
                        <Text className="text-[10px] text-white/60">Tech</Text>
                        <View className="px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
                          <Text className="text-[10px] text-white/85">
                            {formatPillNumber(item.technologyLevel)}
                          </Text>
                        </View>
                      </View>

                      {summaryRows.length ? (
                        <View className="mt-2 pt-2 border-t border-white/5">
                          {summaryRows.map((row, index) => (
                            <View
                              key={`${item.slug}:${row.label}:${index}`}
                              className="flex-row items-center justify-between"
                              style={{ marginTop: index === 0 ? 0 : 4 }}
                            >
                              <Text className="text-[10px] text-white/45 flex-1 pr-2" numberOfLines={1}>
                                {row.label}
                              </Text>
                              <Text className="text-[10px] text-white/78" numberOfLines={1}>
                                {row.value}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <BottomSheetModal
        visible={visible}
        onRequestClose={close}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={active?.iconUrl ?? null}
                size={56}
                roundedClassName="rounded-xl"
                placeholderClassName="bg-white/5 border border-white/10"
                contentFit="contain"
              />

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {title || "—"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={2}>
                  Tech {formatPillNumber(active?.technologyLevel)}
                  {categoryText ? (
                    <>
                      {" "}
                      <Text className="text-white/40">•</Text> {categoryText}
                    </>
                  ) : null}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={close}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Type: <Text className="text-white">{categoryText || typeLabel}</Text>
              </Text>
            </View>

            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Tech: <Text className="text-white">{formatPillNumber(active?.technologyLevel)}</Text>
              </Text>
            </View>

            {active?.workSuitability?.name ? (
              <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
                <Text className="text-white/80 text-[12px]">
                  Work:{" "}
                  <Text className="text-white">
                    {active.workSuitability.name}
                    {active.workSuitability.level != null ? ` Lv ${active.workSuitability.level}` : ""}
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>

          {loading && !detail ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
            </View>
          ) : null}

          {error ? (
            <View className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <Text className="text-red-200 text-[12px]">{error}</Text>
            </View>
          ) : null}

          <DescriptionSection text={active?.description} />
          <RecipeSection rows={active?.recipe ?? []} />
          <WorkSuitabilitySection ws={active?.workSuitability ?? null} />
          <StatsSection rows={active?.detailRows ?? []} />
          <DependencyTreeSection treant={active?.treant ?? null} />
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
