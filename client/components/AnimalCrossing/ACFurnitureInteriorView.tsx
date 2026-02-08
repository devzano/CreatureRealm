import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";

import ACFurnitureGrid from "@/components/AnimalCrossing/ACFurnitureGrid";
import ACInteriorGrid from "./ACInteriorGrid";

type Mode = "furniture" | "interior";

type ACFurnitureInteriorViewProps = {
  search: string;
  initialMode?: Mode;

  collectedOnly?: boolean;
  collectedIds?: string[];
};

export default function ACFurnitureInteriorView({
  search,
  initialMode = "furniture",
  collectedOnly = false,
  collectedIds,
}: ACFurnitureInteriorViewProps) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const title = useMemo(() => {
    return mode === "furniture" ? "Furniture" : "Interior";
  }, [mode]);

  const setFurniture = useCallback(() => setMode("furniture"), []);
  const setInterior = useCallback(() => setMode("interior"), []);

  return (
    <View className="flex-1">
      <View className="px-1 mt-2 mb-2">
        <View className="flex-row items-center rounded-full bg-slate-900/80 border border-slate-700 p-1">
          <Pressable
            onPress={setFurniture}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
              mode === "furniture" ? "bg-slate-800" : ""
            }`}
          >
            <Text className={`text-[11px] font-semibold ${mode === "furniture" ? "text-slate-50" : "text-slate-400"}`}>
              Furniture
            </Text>
          </Pressable>

          <Pressable
            onPress={setInterior}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${
              mode === "interior" ? "bg-slate-800" : ""
            }`}
          >
            <Text className={`text-[11px] font-semibold ${mode === "interior" ? "text-slate-50" : "text-slate-400"}`}>
              Interior
            </Text>
          </Pressable>
        </View>

        <Text className="text-[10px] text-slate-500 mt-2 px-1">
          Viewing: <Text className="text-slate-300 font-semibold">{title}</Text>
        </Text>
      </View>

      {mode === "furniture" ? (
        <ACFurnitureGrid search={search} collectedOnly={collectedOnly} collectedIds={collectedIds} />
      ) : (
        <ACInteriorGrid search={search} collectedOnly={collectedOnly} collectedIds={collectedIds} />
      )}
    </View>
  );
}
