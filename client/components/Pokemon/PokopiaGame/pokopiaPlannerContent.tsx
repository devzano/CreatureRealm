import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { PokopiaPlannerCatalogBuilding } from "@/lib/pokemon/pokopia/planner";
import type {
  PokopiaPlannerBuilding,
  PokopiaPlannerPokemon,
  PokopiaPlannerZone,
  PokopiaPlannerZoneId,
} from "@/store/pokopiaPlannerStore";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import {
  POKOPIA_PLANNER_ZONES,
  POKOPIA_COLORS,
  type PlannerBuildingPickerTab,
  type PlannerPickerTarget,
} from "./config";

type PlannerListPokemon = {
  id: number;
  name: string;
  imageUrl?: string;
  gameDexNumber: number;
  slug?: string;
};

type PlannerAssignment = {
  zoneId: PokopiaPlannerZoneId;
  zoneName: string;
  type: "zone" | "building";
  buildingId?: string;
  label: string;
};

type Props = {
  selectedPlannerZoneId: PokopiaPlannerZoneId | null;
  selectedPlannerZone: PokopiaPlannerZone | null;
  plannerZones: Record<PokopiaPlannerZoneId, PokopiaPlannerZone>;
  plannerBuildingPickerForId: string | null;
  plannerPokemonPickerTarget: PlannerPickerTarget | null;
  plannerBuildingPickerTab: PlannerBuildingPickerTab;
  plannerSearch: string;
  plannerCustomBuildingName: string;
  plannerCustomBuildingSlots: number;
  plannerBuildingResults: PokopiaPlannerCatalogBuilding[];
  plannerPokemonResults: PlannerListPokemon[];
  plannerAssignments: Map<number, PlannerAssignment>;
  onSelectPlannerZone: (zoneId: PokopiaPlannerZoneId | null) => void;
  onSetPlannerBuildingPickerForId: (buildingId: string | null) => void;
  onSetPlannerPokemonPickerTarget: (target: PlannerPickerTarget | null) => void;
  onSetPlannerBuildingPickerTab: (tab: PlannerBuildingPickerTab) => void;
  onSetPlannerSearch: (value: string) => void;
  onSetPlannerCustomBuildingName: (value: string) => void;
  onSetPlannerCustomBuildingSlots: (slots: number) => void;
  setPlannerEnvironmentalLevel: (zoneId: PokopiaPlannerZoneId, level: number) => void;
  addPlannerBuilding: (zoneId: PokopiaPlannerZoneId) => string;
  removePlannerBuilding: (zoneId: PokopiaPlannerZoneId, buildingId: string) => void;
  setPlannerBuildingCatalogEntry: (
    zoneId: PokopiaPlannerZoneId,
    buildingId: string,
    payload: {
      name: string;
      buildingSlug?: string | null;
      imageUrl?: string | null;
      slots: number;
      buildingType?: string | null;
      source: "game" | "custom";
    }
  ) => void;
  addPlannerPokemonToZone: (
    zoneId: PokopiaPlannerZoneId,
    payload: {
      speciesId: number;
      name: string;
      gameDexNumber: number;
      slug?: string;
      imageUrl?: string;
    }
  ) => void;
  removePlannerPokemonFromZone: (zoneId: PokopiaPlannerZoneId, pokemonId: string) => void;
  addPlannerPokemonToBuilding: (
    zoneId: PokopiaPlannerZoneId,
    buildingId: string,
    payload: {
      speciesId: number;
      name: string;
      gameDexNumber: number;
      slug?: string;
      imageUrl?: string;
    }
  ) => void;
  removePlannerPokemonFromBuilding: (
    zoneId: PokopiaPlannerZoneId,
    buildingId: string,
    pokemonId: string
  ) => void;
};

export default function PokopiaPlannerContent({
  selectedPlannerZoneId,
  selectedPlannerZone,
  plannerZones,
  plannerBuildingPickerForId,
  plannerPokemonPickerTarget,
  plannerBuildingPickerTab,
  plannerSearch,
  plannerCustomBuildingName,
  plannerCustomBuildingSlots,
  plannerBuildingResults,
  plannerPokemonResults,
  plannerAssignments,
  onSelectPlannerZone,
  onSetPlannerBuildingPickerForId,
  onSetPlannerPokemonPickerTarget,
  onSetPlannerBuildingPickerTab,
  onSetPlannerSearch,
  onSetPlannerCustomBuildingName,
  onSetPlannerCustomBuildingSlots,
  setPlannerEnvironmentalLevel,
  addPlannerBuilding,
  removePlannerBuilding,
  setPlannerBuildingCatalogEntry,
  addPlannerPokemonToZone,
  removePlannerPokemonFromZone,
  addPlannerPokemonToBuilding,
  removePlannerPokemonFromBuilding,
}: Props) {
  const zoneMeta = selectedPlannerZoneId
    ? POKOPIA_PLANNER_ZONES.find((zone) => zone.id === selectedPlannerZoneId) ?? null
    : null;

  const closePlannerPickers = () => {
    onSetPlannerBuildingPickerForId(null);
    onSetPlannerPokemonPickerTarget(null);
    onSetPlannerBuildingPickerTab("game");
    onSetPlannerSearch("");
    onSetPlannerCustomBuildingName("");
    onSetPlannerCustomBuildingSlots(1);
  };

  const plannerPickerVisible = !!plannerBuildingPickerForId || !!plannerPokemonPickerTarget;
  const activePlannerZoneId = selectedPlannerZone?.id ?? null;

  const renderPlannerPokemonCard = (pokemon: PokopiaPlannerPokemon, onRemove: () => void) => (
    <View key={pokemon.id} className="rounded-2xl bg-slate-950 border border-slate-800 px-3 py-3 mb-2">
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3 items-center justify-center">
          {pokemon.imageUrl ? (
            <ExpoImage
              source={{ uri: pokemon.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              transition={120}
            />
          ) : (
            <Text className="text-slate-500 text-lg">?</Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-[14px] font-semibold text-slate-50">{pokemon.name}</Text>
          <Text className="text-[11px] text-slate-400 mt-1">
            #{String(pokemon.gameDexNumber).padStart(3, "0")}
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          className="rounded-full border border-rose-800 bg-rose-950/40 px-2.5 py-1.5"
        >
          <Text className="text-[11px] font-semibold text-rose-200">Remove</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 px-2 pt-4">
      {selectedPlannerZone ? (
        <>
          <Pressable
            onPress={() => {
              onSelectPlannerZone(null);
              closePlannerPickers();
            }}
            className="self-start mb-3 px-3 py-2 rounded-2xl border border-slate-700 bg-slate-900/80"
          >
            <Text className="text-[12px] font-semibold text-slate-100">Back to Planner</Text>
          </Pressable>

          <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                {zoneMeta ? (
                  <View className="w-10 h-10 rounded-2xl bg-amber-950/60 border border-amber-700 items-center justify-center mr-3">
                    <ExpoImage
                      source={{ uri: zoneMeta.iconUrl }}
                      style={{ width: 18, height: 18 }}
                      contentFit="contain"
                      transition={120}
                    />
                  </View>
                ) : null}
                <View className="flex-1">
                  <Text className="text-xl font-bold text-slate-50">{selectedPlannerZone.name}</Text>
                  <Text className="text-[12px] leading-5 text-slate-300 mt-1">
                    Adjust environmental level, add buildings, and assign Pokemon for this zone.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  const nextId = addPlannerBuilding(selectedPlannerZone.id);
                  onSetPlannerBuildingPickerForId(nextId);
                  onSetPlannerPokemonPickerTarget(null);
                  onSetPlannerSearch("");
                }}
                className="rounded-2xl bg-amber-700 px-3 py-2"
              >
                <Text className="text-[12px] font-semibold text-white">+ Add New Building</Text>
              </Pressable>
            </View>
          </View>

          <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[16px] font-semibold text-slate-50">Environmental Level</Text>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() =>
                    setPlannerEnvironmentalLevel(
                      selectedPlannerZone.id,
                      selectedPlannerZone.environmentalLevel - 1
                    )
                  }
                  className="w-9 h-9 rounded-2xl border border-slate-700 bg-slate-900 items-center justify-center"
                >
                  <Text className="text-base font-semibold text-slate-100">-</Text>
                </Pressable>
                <Text className="mx-3 text-lg font-bold" style={{ color: POKOPIA_COLORS.blue }}>
                  {selectedPlannerZone.environmentalLevel}
                </Text>
                <Pressable
                  onPress={() =>
                    setPlannerEnvironmentalLevel(
                      selectedPlannerZone.id,
                      selectedPlannerZone.environmentalLevel + 1
                    )
                  }
                  className="w-9 h-9 rounded-2xl border border-slate-700 bg-slate-900 items-center justify-center"
                >
                  <Text className="text-base font-semibold text-slate-100">+</Text>
                </Pressable>
              </View>
            </View>
            <View className="flex-row mt-4">
              {Array.from({ length: 10 }).map((_, index) => {
                const active = index < selectedPlannerZone.environmentalLevel;
                return (
                  <View
                    key={`planner-level-${index}`}
                    className="flex-1 h-4 rounded-full mr-1"
                    style={{ backgroundColor: active ? POKOPIA_COLORS.blue : "#173549" }}
                  />
                );
              })}
            </View>
          </View>

          {selectedPlannerZone.buildings.length ? (
            selectedPlannerZone.buildings.map((building: PokopiaPlannerBuilding) => (
              <View
                key={building.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mr-3 items-center justify-center">
                      {building.imageUrl ? (
                        <ExpoImage
                          source={{ uri: building.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="contain"
                          transition={120}
                        />
                      ) : (
                        <MaterialCommunityIcons name="home-outline" size={24} color="#94a3b8" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-slate-50">{building.name}</Text>
                      <Text className="text-[11px] text-slate-400 mt-1">
                        {building.slots} {building.slots === 1 ? "slot" : "slots"}
                        {building.buildingType ? ` · ${building.buildingType}` : ""}
                        {building.source === "custom" ? " · Custom" : ""}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      removePlannerBuilding(selectedPlannerZone.id, building.id);
                      if (plannerBuildingPickerForId === building.id) {
                        closePlannerPickers();
                      }
                      if (
                        plannerPokemonPickerTarget?.type === "building" &&
                        plannerPokemonPickerTarget.buildingId === building.id
                      ) {
                        closePlannerPickers();
                      }
                    }}
                    className="rounded-full border border-rose-800 bg-rose-950/40 px-2.5 py-1.5"
                  >
                    <Text className="text-[11px] font-semibold text-rose-200">Remove</Text>
                  </Pressable>
                </View>

                <View className="flex-row mt-3">
                  <Pressable
                    onPress={() => {
                      onSetPlannerBuildingPickerForId(building.id);
                      onSetPlannerPokemonPickerTarget(null);
                      onSetPlannerSearch("");
                    }}
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 mr-2"
                  >
                    <Text className="text-[12px] font-semibold text-slate-100">Choose Building</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onSetPlannerPokemonPickerTarget({
                        zoneId: selectedPlannerZone.id,
                        type: "building",
                        buildingId: building.id,
                      });
                      onSetPlannerBuildingPickerForId(null);
                      onSetPlannerSearch("");
                    }}
                    className="rounded-2xl border border-dashed border-amber-700 bg-amber-950/30 px-3 py-2"
                    disabled={building.slots <= 0 || building.pokemon.length >= building.slots}
                  >
                    <Text className="text-[12px] font-semibold text-amber-200">
                      {building.slots <= 0
                        ? "No Pokémon Slots"
                        : building.pokemon.length >= building.slots
                          ? `${building.name} Full`
                          : `+ Add Pokemon to ${building.name}`}
                    </Text>
                  </Pressable>
                </View>

                <View className="mt-4">
                  {building.pokemon.length ? (
                    building.pokemon.map((pokemon) =>
                      renderPlannerPokemonCard(pokemon, () =>
                        removePlannerPokemonFromBuilding(selectedPlannerZone.id, building.id, pokemon.id)
                      )
                    )
                  ) : (
                    <Text className="text-[13px] leading-6 text-slate-400">
                      No Pokemon assigned to this building yet.
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
              <Text className="text-[15px] font-semibold text-slate-50">No buildings in this zone yet.</Text>
              <Text className="text-[12px] leading-5 text-slate-300 mt-2">
                Add a hut or building first, then start assigning Pokemon to it.
              </Text>
            </View>
          )}

          <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
            <Text className="text-[16px] font-semibold text-slate-50">
              {selectedPlannerZone.name}: No Building
            </Text>
            <Text className="text-[12px] leading-5 text-slate-300 mt-2 mb-3">
              Pokemon assigned to this zone without a building yet.
            </Text>

            {selectedPlannerZone.pokemon.length ? (
              selectedPlannerZone.pokemon.map((pokemon) =>
                renderPlannerPokemonCard(pokemon, () =>
                  removePlannerPokemonFromZone(selectedPlannerZone.id, pokemon.id)
                )
              )
            ) : (
              <Text className="text-[13px] leading-6 text-slate-400">
                No Pokémon assigned to this zone without a building yet.
              </Text>
            )}

            <Pressable
              onPress={() => {
                onSetPlannerPokemonPickerTarget({ zoneId: selectedPlannerZone.id, type: "zone" });
                onSetPlannerBuildingPickerForId(null);
                onSetPlannerSearch("");
              }}
              className="rounded-2xl border border-dashed border-amber-700 bg-amber-950/20 px-4 py-3 mt-3"
            >
              <Text className="text-[13px] font-semibold text-amber-200">
                + Add Pokémon to {selectedPlannerZone.name}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Planner
            </Text>
            <Text className="text-lg font-bold text-slate-50 mt-1">
              Pokémon Building Planner for Pokopia
            </Text>
            <Text className="text-sm text-slate-300 mt-1">
              Use this planner to organize Pokémon into buildings across Pokopia&apos;s five zones
              with local-only saved data.
            </Text>
          </View>

          {POKOPIA_PLANNER_ZONES.map((zone) => {
            const storedZone = plannerZones[zone.id];
            const assignedPokemonCount =
              storedZone.pokemon.length +
              storedZone.buildings.reduce((sum, building) => sum + building.pokemon.length, 0);

            return (
              <Pressable
                key={zone.id}
                onPress={() => {
                  onSelectPlannerZone(zone.id);
                  closePlannerPickers();
                }}
                className="rounded-3xl bg-slate-950 p-4 border mb-3 border-slate-800"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-12 h-12 rounded-2xl bg-amber-950/50 border border-amber-700 items-center justify-center mr-3">
                      <ExpoImage
                        source={{ uri: zone.iconUrl }}
                        style={{ width: 20, height: 20 }}
                        contentFit="contain"
                        transition={120}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-slate-50">{zone.title}</Text>
                      <Text className="text-[11px] text-slate-400 mt-1">
                        {storedZone.buildings.length} buildings • {assignedPokemonCount} Pokémon assigned
                      </Text>
                    </View>
                  </View>
                  <View
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: POKOPIA_COLORS.purpleBorder,
                      backgroundColor: POKOPIA_COLORS.purpleSoft,
                    }}
                  >
                    <Text className="text-[11px] font-semibold" style={{ color: POKOPIA_COLORS.purpleText }}>
                      Lv {storedZone.environmentalLevel}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      <BottomSheetModal
        visible={plannerPickerVisible}
        onRequestClose={closePlannerPickers}
        fixedHeight={560}
        sheetStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, overflow: "hidden" }}
      >
        <View className="px-5 pt-5 pb-3 flex-row items-center justify-between border-b border-slate-800">
          <Text className="text-[18px] font-semibold text-slate-50">
            {plannerBuildingPickerForId ? "Add Building" : "Add Pokemon"}
          </Text>
          <Pressable onPress={closePlannerPickers} className="w-8 h-8 items-center justify-center">
            <Text className="text-[20px] text-slate-300">×</Text>
          </Pressable>
        </View>

        {plannerBuildingPickerForId ? (
          <View className="flex-1">
            <View className="flex-row px-5 pt-3">
              <Pressable
                onPress={() => onSetPlannerBuildingPickerTab("game")}
                className="px-4 py-2 rounded-full border mr-2"
                style={{
                  backgroundColor:
                    plannerBuildingPickerTab === "game" ? "rgba(217,124,32,0.95)" : "rgba(15,23,42,0.72)",
                  borderColor:
                    plannerBuildingPickerTab === "game" ? "rgba(217,124,32,1)" : "rgba(71,85,105,0.9)",
                }}
              >
                <Text
                  className="text-[12px] font-semibold"
                  style={{ color: plannerBuildingPickerTab === "game" ? "#ffffff" : "#e2e8f0" }}
                >
                  Game Buildings
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onSetPlannerBuildingPickerTab("custom")}
                className="px-4 py-2 rounded-full border"
                style={{
                  backgroundColor:
                    plannerBuildingPickerTab === "custom" ? "rgba(217,124,32,0.95)" : "rgba(15,23,42,0.72)",
                  borderColor:
                    plannerBuildingPickerTab === "custom" ? "rgba(217,124,32,1)" : "rgba(71,85,105,0.9)",
                }}
              >
                <Text
                  className="text-[12px] font-semibold"
                  style={{ color: plannerBuildingPickerTab === "custom" ? "#ffffff" : "#e2e8f0" }}
                >
                  Custom Building
                </Text>
              </Pressable>
            </View>

            {plannerBuildingPickerTab === "game" ? (
              <>
                <View className="px-5 pt-3">
                  <TextInput
                    value={plannerSearch}
                    onChangeText={onSetPlannerSearch}
                    placeholder="Search buildings..."
                    placeholderTextColor="#64748b"
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-50"
                  />
                </View>
                <ScrollView className="flex-1 px-5 pt-3 pb-5">
                  {plannerBuildingResults.map((building) => (
                    <Pressable
                      key={`planner-building-option-${building.slug}`}
                      onPress={() => {
                        if (!activePlannerZoneId) return;
                        setPlannerBuildingCatalogEntry(activePlannerZoneId, plannerBuildingPickerForId, {
                          name: building.name,
                          buildingSlug: building.slug,
                          imageUrl: building.imageUrl,
                          slots: building.occupants,
                          buildingType: building.type,
                          source: "game",
                        });
                        closePlannerPickers();
                      }}
                      className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 mb-2 flex-row items-center"
                    >
                      <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 mr-3">
                        <ExpoImage
                          source={{ uri: building.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="contain"
                          transition={120}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-slate-50">{building.name}</Text>
                        <Text className="text-[11px] leading-5 text-slate-400 mt-1">
                          {building.occupants} {building.occupants === 1 ? "slot" : "slots"}
                          {building.type ? ` · ${building.type}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <View className="px-5 pt-3 pb-5">
                <TextInput
                  value={plannerCustomBuildingName}
                  onChangeText={onSetPlannerCustomBuildingName}
                  placeholder="Custom building name..."
                  placeholderTextColor="#64748b"
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-50 mb-3"
                />
                <Text className="text-[12px] font-semibold text-slate-300 mb-2">
                  Slots
                </Text>
                <View className="flex-row flex-wrap mb-3">
                  {[1, 2, 3, 4].map((slot) => {
                    const active = plannerCustomBuildingSlots === slot;
                    return (
                      <Pressable
                        key={`custom-slot-${slot}`}
                        onPress={() => onSetPlannerCustomBuildingSlots(slot)}
                        className="px-4 py-2 rounded-full border mr-2 mb-2"
                        style={{
                          backgroundColor: active ? "rgba(217,124,32,0.95)" : "rgba(15,23,42,0.72)",
                          borderColor: active ? "rgba(217,124,32,1)" : "rgba(71,85,105,0.9)",
                        }}
                      >
                        <Text
                          className="text-[12px] font-semibold"
                          style={{ color: active ? "#ffffff" : "#e2e8f0" }}
                        >
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text className="text-[11px] leading-5 text-slate-400 mb-3">
                  Custom buildings can hold up to 4 Pokémon.
                </Text>
                <Pressable
                  onPress={() => {
                    if (!activePlannerZoneId) return;
                    setPlannerBuildingCatalogEntry(activePlannerZoneId, plannerBuildingPickerForId, {
                      name: plannerCustomBuildingName.trim() || "Custom Building",
                      buildingSlug: null,
                      imageUrl: null,
                      slots: plannerCustomBuildingSlots,
                      buildingType: "Custom",
                      source: "custom",
                    });
                    closePlannerPickers();
                  }}
                  className="rounded-2xl bg-amber-700 px-4 py-3"
                >
                  <Text className="text-[13px] font-semibold text-white">Save Custom Building</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : plannerPokemonPickerTarget ? (
          <View className="flex-1">
            <View className="px-5 pt-3">
              <TextInput
                value={plannerSearch}
                onChangeText={onSetPlannerSearch}
                placeholder="Search Pokemon..."
                placeholderTextColor="#64748b"
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-50"
              />
            </View>
            <ScrollView className="flex-1 px-5 pt-3 pb-5">
              {plannerPokemonResults.map((pokemon) => {
                const assignment = plannerAssignments.get(pokemon.id);
                const sameTarget =
                  assignment &&
                  ((plannerPokemonPickerTarget.type === "zone" &&
                    assignment.type === "zone" &&
                    assignment.zoneId === plannerPokemonPickerTarget.zoneId) ||
                    (plannerPokemonPickerTarget.type === "building" &&
                      assignment.type === "building" &&
                      assignment.zoneId === plannerPokemonPickerTarget.zoneId &&
                      assignment.buildingId === plannerPokemonPickerTarget.buildingId));
                const actionLabel = sameTarget ? "Added" : assignment ? "Move" : "Add";
                const disabled = sameTarget;

                return (
                  <View
                    key={`planner-pokemon-option-${pokemon.id}`}
                    className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 mb-2 flex-row items-center"
                  >
                    <View className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 mr-3">
                      {pokemon.imageUrl ? (
                        <ExpoImage
                          source={{ uri: pokemon.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="contain"
                          transition={120}
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <Text className="text-slate-500 text-lg">?</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1 mr-3">
                      <Text className="text-[14px] font-semibold text-slate-50">{pokemon.name}</Text>
                      <Text className="text-[11px] text-slate-400 mt-1">
                        #{String(pokemon.gameDexNumber).padStart(3, "0")}
                      </Text>
                      {assignment ? (
                        <Text className="text-[11px] text-amber-300 mt-1">
                          Currently in {assignment.label}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      disabled={disabled}
                      onPress={() => {
                        const payload = {
                          speciesId: pokemon.id,
                          name: pokemon.name,
                          gameDexNumber: pokemon.gameDexNumber,
                          slug: pokemon.slug,
                          imageUrl: pokemon.imageUrl,
                        };
                        if (plannerPokemonPickerTarget.type === "zone") {
                          addPlannerPokemonToZone(plannerPokemonPickerTarget.zoneId, payload);
                        } else {
                          addPlannerPokemonToBuilding(
                            plannerPokemonPickerTarget.zoneId,
                            plannerPokemonPickerTarget.buildingId,
                            payload
                          );
                        }
                        closePlannerPickers();
                      }}
                      className="rounded-full px-3 py-2"
                      style={{
                        backgroundColor: disabled ? "rgba(51,65,85,0.7)" : "rgba(217,124,32,0.95)",
                        borderWidth: 1,
                        borderColor: disabled ? "rgba(71,85,105,0.9)" : "rgba(217,124,32,1)",
                      }}
                    >
                      <Text className="text-[12px] font-semibold text-white">{actionLabel}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}
