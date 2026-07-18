import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { PokopiaBuildingDetail } from "@/lib/pokemon/pokopia/buildingDetail";
import type { PokopiaBuilding } from "@/lib/pokemon/pokopia/buildings";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";

type Props = {
  buildings: PokopiaBuilding[];
  buildingsLoading: boolean;
  buildingsError: string | null;
  selectedBuildingSlug: string | null;
  selectedBuildingDetail: PokopiaBuildingDetail | null;
  selectedBuildingLoading: boolean;
  selectedBuildingError: string | null;
  onSelectBuildingSlug: (slug: string | null) => void;
  onClearSelectedBuildingDetail: () => void;
  onClearSelectedBuildingError: () => void;
};

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl bg-slate-950 border border-slate-800 px-3 py-3 min-h-[64px] flex-1">
      <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </Text>
      <Text className="text-[12px] font-semibold text-slate-100 mt-1">{value}</Text>
    </View>
  );
}

export default function PokopiaBuildingsContent({
  buildings,
  buildingsLoading,
  buildingsError,
  selectedBuildingSlug,
  selectedBuildingDetail,
  selectedBuildingLoading,
  selectedBuildingError,
  onSelectBuildingSlug,
  onClearSelectedBuildingDetail,
  onClearSelectedBuildingError,
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<PokopiaBuilding | null>(null);
  const lastBuilding = useRef<PokopiaBuilding | null>(null);

  const openSheet = useCallback(
    (building: PokopiaBuilding) => {
      lastBuilding.current = building;
      setSelectedBuilding(building);
      setSheetVisible(true);
      onSelectBuildingSlug(building.slug);
    },
    [onSelectBuildingSlug]
  );

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    onSelectBuildingSlug(null);
    onClearSelectedBuildingDetail();
    onClearSelectedBuildingError();
  }, [onSelectBuildingSlug, onClearSelectedBuildingDetail, onClearSelectedBuildingError]);

  const displayBuilding = selectedBuilding ?? lastBuilding.current;

  return (
    <View className="flex-1 px-2 pt-4">
      {buildingsLoading ? (
        <PokopiaLoadingState label="Loading Pokopia buildings…" />
      ) : buildingsError ? (
        <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Buildings unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{buildingsError}</Text>
        </View>
      ) : !buildings.length ? (
        <PokopiaEmptyState
          title="No buildings to show"
          message="There are no Pokopia buildings available right now."
        />
      ) : (
        <View className="flex-row flex-wrap -mx-1">
          {buildings.map((building) => (
            <View key={building.id} className="w-1/3 px-1 mb-2">
              <Pressable
                onPress={() => openSheet(building)}
                className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
                style={{ minHeight: 160 }}
              >
                <View className="items-center justify-center pt-4 pb-2">
                  <View className="w-24 h-24">
                    <ExpoImage
                      source={{ uri: building.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="contain"
                      transition={120}
                    />
                  </View>
                </View>

                <View className="px-3 pb-4 items-center">
                  <Text
                    numberOfLines={2}
                    className="text-[13px] font-semibold text-slate-50 text-center leading-5"
                  >
                    {building.name}
                  </Text>
                  {building.pokemonCountLabel ? (
                    <Text className="text-[11px] text-slate-400 mt-1 text-center">
                      {building.pokemonCountLabel}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1">
              {displayBuilding?.imageUrl ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 p-1">
                  <ExpoImage
                    source={{ uri: displayBuilding.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>
              ) : null}

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {displayBuilding?.name ?? "—"}
                </Text>
                {displayBuilding?.description ? (
                  <Text className="text-slate-400 text-[12px] mt-0.5" numberOfLines={2}>
                    {displayBuilding.description}
                  </Text>
                ) : null}
              </View>
            </View>

            <Pressable
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {selectedBuildingLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading building detail…</Text>
            </View>
          ) : selectedBuildingError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
              <Text className="text-sm font-semibold text-rose-200">Building unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">
                {selectedBuildingError}
              </Text>
            </View>
          ) : selectedBuildingDetail ? (
            <>
              {[
                { label: "Construction Time", value: selectedBuildingDetail.constructionTime },
                { label: "Grid Size",          value: selectedBuildingDetail.gridSize },
                { label: "Occupants",          value: selectedBuildingDetail.occupants },
                { label: "Type",               value: selectedBuildingDetail.type },
                { label: "Floors",             value: selectedBuildingDetail.floors },
                { label: "Furniture Required", value: selectedBuildingDetail.furnitureRequired },
              ].filter((e) => e.value).length > 0 ? (
                <View className="mb-2">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Details
                  </Text>
                  <View className="flex-row flex-wrap -mr-2">
                    {[
                      { label: "Construction Time", value: selectedBuildingDetail.constructionTime },
                      { label: "Grid Size",          value: selectedBuildingDetail.gridSize },
                      { label: "Occupants",          value: selectedBuildingDetail.occupants },
                      { label: "Type",               value: selectedBuildingDetail.type },
                      { label: "Floors",             value: selectedBuildingDetail.floors },
                      { label: "Furniture Required", value: selectedBuildingDetail.furnitureRequired },
                    ]
                      .filter((e) => e.value)
                      .map((e) => (
                        <View key={e.label} className="w-1/2 pr-2 mb-2">
                          <StatChip label={e.label} value={String(e.value)} />
                        </View>
                      ))}
                  </View>
                </View>
              ) : null}

              {selectedBuildingDetail.kitItemName ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Kit Item
                  </Text>
                  <View className="rounded-3xl bg-slate-950 p-4 border border-slate-800 flex-row items-center">
                    <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                      <ExpoImage
                        source={{ uri: selectedBuildingDetail.kitItemImageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="contain"
                        transition={120}
                      />
                    </View>
                    <Text className="text-[14px] font-semibold text-slate-50">
                      {selectedBuildingDetail.kitItemName}
                    </Text>
                  </View>
                </View>
              ) : null}

              {selectedBuildingDetail.materialRequirements.length ? (
                <View className="mb-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Construction Materials
                  </Text>
                  {selectedBuildingDetail.materialRequirements.map((material) => (
                    <View
                      key={material.slug}
                      className="rounded-3xl bg-slate-950 p-4 border mb-2 border-slate-800 flex-row items-center"
                    >
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                        <ExpoImage
                          source={{ uri: material.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="contain"
                          transition={120}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-slate-50">
                          {material.name}
                        </Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">x{material.qty}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedBuildingDetail.pokemonRequirements.length ? (
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Pokémon Required
                  </Text>
                  {selectedBuildingDetail.pokemonRequirements.map((req, index) => (
                    <View
                      key={`${req.name}-${index}`}
                      className="rounded-3xl bg-slate-950 p-4 border mb-2 border-slate-800 flex-row items-center"
                    >
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3">
                        <ExpoImage
                          source={{ uri: req.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="contain"
                          transition={120}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-slate-50">{req.name}</Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">x{req.qty}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}
