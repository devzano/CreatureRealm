import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import type { PaldbUpdateCategory, PaldbUpdateDetail, PaldbUpdateListItem } from "@/lib/palworld/paldbUpdates";

type Props = {
  visible: boolean;
  category: PaldbUpdateCategory | null;
  items: PaldbUpdateListItem[];
  loading: boolean;
  error: string | null;
  selectedItem: PaldbUpdateListItem | null;
  selectedDetail: PaldbUpdateDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  onClose: () => void;
  onSelectItem: (item: PaldbUpdateListItem) => void;
  onBackToList: () => void;
  onRetryCategory: () => void;
  onRetryDetail: () => void;
};

function categoryLabel(category: PaldbUpdateCategory | null) {
  if (category === "versionChanges") return "Version Changes";
  if (category === "contentUpdates") return "Content Updates";
  if (category === "patchNotes") return "Patch Notes";
  return "Palworld Updates";
}

function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center justify-center py-10">
      <Text className="text-[13px] text-slate-400 text-center">{text}</Text>
    </View>
  );
}

function UpdateListCard({
  item,
  onPress,
}: {
  item: PaldbUpdateListItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl border border-slate-800 bg-slate-950 p-3 mb-3"
    >
      <View className="flex-row">
        <View className="w-24 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 mr-3">
          {item.imageUrl ? (
            <ExpoImage
              source={{ uri: item.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="newspaper-outline" size={22} color="#94a3b8" />
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text className="text-slate-50 text-[14px] font-semibold" numberOfLines={2}>
            {item.title}
          </Text>
          {item.date ? (
            <Text className="text-[11px] text-slate-400 mt-1">{item.date}</Text>
          ) : null}
          <Text className="text-[12px] text-slate-300 mt-1.5" numberOfLines={3}>
            {item.description}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PalworldUpdatesSheet({
  visible,
  category,
  items,
  loading,
  error,
  selectedItem,
  selectedDetail,
  detailLoading,
  detailError,
  onClose,
  onSelectItem,
  onBackToList,
  onRetryCategory,
  onRetryDetail,
}: Props) {
  const listMode = !selectedItem;
  const title = listMode ? categoryLabel(category) : selectedDetail?.title ?? selectedItem?.title ?? "Update";

  return (
    <BottomSheetModal
      visible={visible}
      onRequestClose={onClose}
      sheetStyle={{ maxHeight: "92%", minHeight: 360, paddingBottom: 10 }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1 pr-3">
          {!listMode ? (
            <Pressable
              onPress={onBackToList}
              className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
            >
              <Ionicons name="arrow-back" size={18} color="white" />
            </Pressable>
          ) : null}

          <View className="flex-1">
            <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
              {title}
            </Text>
            <Text className="text-slate-400 text-[12px] mt-0.5">
              {listMode ? "Pulled from paldb.cc" : selectedDetail?.date ?? selectedItem?.date ?? "PalDB"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onClose}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
        >
          <Ionicons name="close" size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        {listMode ? (
          <>
            {loading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-slate-300">Loading {categoryLabel(category).toLowerCase()}…</Text>
              </View>
            ) : error ? (
              <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
                <Text className="text-sm font-semibold text-rose-200">Updates unavailable</Text>
                <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{error}</Text>
                <Pressable
                  onPress={onRetryCategory}
                  className="mt-3 self-start rounded-full border border-slate-700 bg-slate-900 px-3 py-2"
                >
                  <Text className="text-[11px] font-semibold text-slate-100">Retry</Text>
                </Pressable>
              </View>
            ) : items.length === 0 ? (
              <EmptyState text="No updates were found for this section." />
            ) : (
              items.map((item) => (
                <UpdateListCard key={item.id} item={item} onPress={() => onSelectItem(item)} />
              ))
            )}
          </>
        ) : detailLoading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-slate-300">Loading update detail…</Text>
          </View>
        ) : detailError ? (
          <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
            <Text className="text-sm font-semibold text-rose-200">Detail unavailable</Text>
            <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{detailError}</Text>
            <Pressable
              onPress={onRetryDetail}
              className="mt-3 self-start rounded-full border border-slate-700 bg-slate-900 px-3 py-2"
            >
              <Text className="text-[11px] font-semibold text-slate-100">Retry</Text>
            </Pressable>
          </View>
        ) : selectedDetail ? (
          <>
            {selectedDetail.imageUrls.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                className="mb-4"
              >
                {selectedDetail.imageUrls.map((imageUrl, index) => (
                  <View
                    key={`${imageUrl}-${index}`}
                    className="w-48 h-28 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 mr-3"
                  >
                    <ExpoImage
                      source={{ uri: imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={120}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {selectedDetail.summary ? (
              <View className="rounded-3xl border border-slate-800 bg-slate-950 p-4 mb-4">
                <Text className="text-[13px] text-slate-200 leading-6">{selectedDetail.summary}</Text>
              </View>
            ) : null}

            {selectedDetail.sections.length > 0 ? (
              selectedDetail.sections.map((section, index) => (
                <View key={`${section.heading ?? "section"}-${index}`} className="mb-4">
                  {section.heading ? (
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                      {section.heading}
                    </Text>
                  ) : null}

                  {section.paragraphs.map((paragraph, paragraphIndex) => {
                    if (section.heading && paragraph === selectedDetail.date) return null;
                    return (
                      <Text
                        key={`${paragraphIndex}-${paragraph}`}
                        className="text-[13px] text-slate-200 leading-6 mb-2"
                      >
                        {paragraph}
                      </Text>
                    );
                  })}

                  {section.bullets.map((bullet, bulletIndex) => (
                    <View key={`${bulletIndex}-${bullet}`} className="flex-row items-start mb-2">
                      <Text className="text-[13px] text-orange-300 mr-2">•</Text>
                      <Text className="flex-1 text-[13px] text-slate-200 leading-6">{bullet}</Text>
                    </View>
                  ))}
                </View>
              ))
            ) : selectedDetail.bodyText ? (
              <Text className="text-[13px] text-slate-200 leading-6">{selectedDetail.bodyText}</Text>
            ) : (
              <EmptyState text="No detail text was available for this update." />
            )}
          </>
        ) : (
          <EmptyState text="Select an update to view its details." />
        )}
      </ScrollView>
    </BottomSheetModal>
  );
}
