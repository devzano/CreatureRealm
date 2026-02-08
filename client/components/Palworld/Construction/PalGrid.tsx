import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import { fetchPalDetail, type PalConstructionIndexItem, type PalDetail } from "@/lib/palworld/construction/paldbPal";

import {
  clamp,
  safeNum,
  safeText,
  safeName,
  formatPillNumber,
  makeStripTrailingSuffix,
  buildTwoLineTitle,
  usePrefetchIcons,
  useDetailSheet,
} from "@/components/Palworld/Construction/palGridKit";

import { DescriptionSection, DependencyTreeSection, RecipeSection } from "@/components/Palworld/Construction/palSheetSections";

type PalPalGridProps = {
  items: PalConstructionIndexItem[];
  onPressItem?: (item: PalConstructionIndexItem) => void;

  emptyText?: string;
  showUnavailable?: boolean; // default false
  numColumns?: number; // default 3

  prefetchIcons?: boolean; // default true
};

const stripTrailingPal = makeStripTrailingSuffix(/\s*pal\s*$/i);

export default function PalPalGrid({
  items,
  onPressItem,
  emptyText = "No pal builds found.",
  showUnavailable = false,
  numColumns = 3,
  prefetchIcons = true,
}: PalPalGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    if (showUnavailable) return arr;

    return arr.filter((x: any) => {
      if (typeof x?.notAvailable === "boolean") return !x.notAvailable;
      if (typeof x?.isAvailable === "boolean") return !!x.isAvailable;
      return true;
    });
  }, [items, showUnavailable]);

  usePrefetchIcons(
    prefetchIcons,
    filtered.map((x: any) => x?.iconUrl)
  );

  const { visible: sheetVisible, open: openSheet, close: closeSheet, selected, detail, loading, error } =
    useDetailSheet<PalConstructionIndexItem, PalDetail>(fetchPalDetail, onPressItem);

  if (!filtered.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const TILE_H = 154;

  const sel = selected;
  const d = (detail as any) ?? sel;

  const notAvailable =
    !!(sel as any)?.notAvailable ||
    (typeof (sel as any)?.isAvailable === "boolean" ? !(sel as any)?.isAvailable : false);

  const tech = safeNum((d as any)?.technologyLevel ?? (sel as any)?.technologyLevel ?? (sel as any)?.technology);
  const categoryText = safeText((d as any)?.categoryText ?? (sel as any)?.categoryText);
  const description = safeText((d as any)?.description ?? (sel as any)?.description);
  const recipeRows = ((d as any)?.recipe ?? (sel as any)?.recipe ?? []) as any[];
  const treant = (detail as any)?.treant ?? null;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {filtered.map((it: any) => {
            const disabled = !!it?.notAvailable || (typeof it?.isAvailable === "boolean" ? !it.isAvailable : false);

            const title = buildTwoLineTitle(safeName(it), it?.categoryText ?? null, {
              strip: stripTrailingPal,
              fallback1: "Pal",
              fallback2: "Pal",
            });

            const t = safeNum(it?.technologyLevel ?? it?.technology);
            const ring = "border-white/10";

            return (
              <View key={String(it?.slug)} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
                <Pressable
                  onPress={() => openSheet(it)}
                  disabled={disabled}
                  className={[
                    "rounded-2xl border bg-white/[0.03] overflow-hidden",
                    ring,
                    disabled ? "opacity-50" : "opacity-100",
                  ].join(" ")}
                  style={{ height: TILE_H }}
                >
                  <View className="flex-1 px-3 pt-3 pb-3">
                    <View className="items-center justify-center">
                      <View className="relative">
                        <RemoteIcon
                          uri={it?.iconUrl ?? null}
                          size={58}
                          roundedClassName="rounded-xl"
                          placeholderClassName="bg-white/5 border border-white/10"
                          contentFit="contain"
                        />

                        {disabled && (
                          <View className="absolute -top-1 -right-1 px-2 py-[2px] rounded-full border bg-red-500/15 border-red-500/35">
                            <Text className="text-red-200 text-[10px] font-semibold">N/A</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="mt-2 items-center">
                      <Text numberOfLines={1} className="text-white text-[12px] leading-4 text-center">
                        {title.line1}
                      </Text>
                      <Text numberOfLines={1} className="text-white/50 text-[10px] text-center mt-0.5">
                        {title.line2}
                      </Text>
                    </View>

                    <View className="flex-1" />

                    <View className="flex-row items-end justify-between mt-2">
                      <View className="flex-1 items-center">
                        <Text className="text-[10px] text-white/60">Tech</Text>
                        <View className="mt-1 px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
                          <Text
                            className="text-[10px] text-white/85"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                          >
                            {formatPillNumber(t)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={(sel as any)?.iconUrl ?? null}
                size={56}
                roundedClassName="rounded-xl"
                placeholderClassName="bg-white/5 border border-white/10"
                contentFit="contain"
              />

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {sel?.name ?? "—"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={1}>
                  Tech {tech != null ? formatPillNumber(tech) : "—"}
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
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {/* Pills */}
          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Type: <Text className="text-white">Pal</Text>
              </Text>
            </View>

            {tech != null ? (
              <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
                <Text className="text-white/80 text-[12px]">
                  Tech: <Text className="text-white">{formatPillNumber(tech)}</Text>
                </Text>
              </View>
            ) : null}

            {notAvailable ? (
              <View className="px-3 py-2 rounded-full border border-red-500/30 bg-red-500/10">
                <Text className="text-red-200 text-[12px]">Not available</Text>
              </View>
            ) : null}
          </View>

          {/* Detail loading/error */}
          {loading ? (
            <View className="mt-5 items-center">
              <ActivityIndicator />
              <Text className="text-white/60 text-[12px] mt-2">Loading details…</Text>
            </View>
          ) : error ? (
            <View className="mt-5">
              <Text className="text-red-200 text-[12px]">{error}</Text>
            </View>
          ) : null}

          <DescriptionSection text={description} />
          <DependencyTreeSection treant={treant} />
          <RecipeSection rows={recipeRows as any} />
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
