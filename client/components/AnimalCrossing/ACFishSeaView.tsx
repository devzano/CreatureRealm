import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";

import ACFishGrid from "@/components/AnimalCrossing/ACFishGrid";
import ACSeaCreatureGrid from "@/components/AnimalCrossing/ACSeaCreatureGrid";

type Mode = "fish" | "sea";

type ACFishSeaViewProps = {
  search: string;
  initialMode?: Mode;

  collectedOnly?: boolean;
  collectedIds?: string[];
};

export default function ACFishSeaView({
  search,
  initialMode = "fish",
  collectedOnly = false,
  collectedIds,
}: ACFishSeaViewProps) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const title = useMemo(() => {
    return mode === "fish" ? "Fish" : "Sea Creatures";
  }, [mode]);

  const setFish = useCallback(() => setMode("fish"), []);
  const setSea = useCallback(() => setMode("sea"), []);

  return (
    <View className="flex-1">
      <View className="px-1 mt-2 mb-2">
        <View className="flex-row items-center rounded-full bg-slate-900/80 border border-slate-700 p-1">
          <Pressable
            onPress={setFish}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${mode === "fish" ? "bg-slate-800" : ""}`}
          >
            <Text className={`text-[11px] font-semibold ${mode === "fish" ? "text-slate-50" : "text-slate-400"}`}>
              Fish
            </Text>
          </Pressable>

          <Pressable
            onPress={setSea}
            className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${mode === "sea" ? "bg-slate-800" : ""}`}
          >
            <Text className={`text-[11px] font-semibold ${mode === "sea" ? "text-slate-50" : "text-slate-400"}`}>
              Sea Creatures
            </Text>
          </Pressable>
        </View>

        <Text className="text-[10px] text-slate-500 mt-2 px-1">
          Viewing: <Text className="text-slate-300 font-semibold">{title}</Text>
        </Text>
      </View>

      {mode === "fish" ? (
        <ACFishGrid search={search} collectedOnly={collectedOnly} collectedIds={collectedIds} />
      ) : (
        <ACSeaCreatureGrid search={search} collectedOnly={collectedOnly} collectedIds={collectedIds} />
      )}
    </View>
  );
}
