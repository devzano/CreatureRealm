import React, { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { POKOPIA_COLORS } from "./config";
import { usePokopiaDailyTasksStore } from "@/store/pokopiaDailyTasksStore";

type DailyTask = {
  id: string;
  label: string;
  icon?: string;
  emoji?: string;
};

const TASKS: DailyTask[] = [
  { id: "daily-challenges", label: "Complete Daily Challenges", emoji: "🎯" },
  { id: "daily-shop", label: "Check Daily Shop Items", icon: "https://pokopiadex.com/images/icons/shop.png" },
  { id: "daily-stamp", label: "Get Daily Stamp", emoji: "🎫" },
  { id: "mosslax-offering", label: "Give Mosslax Food Offering", icon: "https://pokopiadex.com/images/pokemon/sprites/snorlax-mossy.png" },
  { id: "dream-island", label: "Visit A Dream Island", icon: "https://pokopiadex.com/images/items/shop_ui/eevee-doll.png" },
  { id: "vending-machine", label: "Get Vending Machine Drinks", icon: "https://pokopiadex.com/images/items/shop_ui/vending-machine.png" },
  { id: "artifacts", label: "Dig for Artifacts", icon: "https://pokopiadex.com/images/icons/artifact.png" },
  { id: "water-ripples", label: "Find Shiny Water Ripples", emoji: "✨" },
];

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PokopiaDailyChecklist() {
  const dateKey = getLocalDateKey();
  const storedDateKey = usePokopiaDailyTasksStore((state) => state.dateKey);
  const checkedTaskIds = usePokopiaDailyTasksStore((state) => state.checkedTaskIds);
  const ensureDate = usePokopiaDailyTasksStore((state) => state.ensureDate);
  const toggleTask = usePokopiaDailyTasksStore((state) => state.toggleTask);

  useEffect(() => {
    if (storedDateKey !== dateKey) {
      ensureDate(dateKey);
    }
  }, [dateKey, ensureDate, storedDateKey]);

  const checkedSet = useMemo(() => new Set(checkedTaskIds), [checkedTaskIds]);
  const completedCount = checkedTaskIds.length;

  return (
    <View
      className="rounded-3xl border px-4 py-4"
      style={{
        backgroundColor: "rgba(255,255,255,0.06)",
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 pr-3">
          <Text className="text-[16px] font-semibold text-white">Daily Tasks</Text>
          <Text className="text-[12px] text-white/55 mt-0.5">Keep your Pokopia routine tight.</Text>
        </View>

        <View
          className="rounded-full border px-3 py-1"
          style={{
            backgroundColor: completedCount === TASKS.length ? POKOPIA_COLORS.limeSoft : "rgba(255,255,255,0.05)",
            borderColor: completedCount === TASKS.length ? POKOPIA_COLORS.limeBorder : "rgba(255,255,255,0.12)",
          }}
        >
          <Text
            className="text-[11px] font-semibold"
            style={{ color: completedCount === TASKS.length ? POKOPIA_COLORS.limeText : "rgba(255,255,255,0.72)" }}
          >
            {completedCount}/{TASKS.length}
          </Text>
        </View>
      </View>

      <View>
        {TASKS.map((task, index) => {
          const checked = checkedSet.has(task.id);

          return (
            <Pressable
              key={task.id}
              onPress={() => toggleTask(task.id, dateKey)}
              className="flex-row items-center rounded-2xl px-2 py-2"
              style={{
                borderBottomWidth: index === TASKS.length - 1 ? 0 : 1,
                borderBottomColor: "rgba(255,255,255,0.08)",
                opacity: checked ? 0.78 : 1,
              }}
            >
              <View
                className="mr-3 h-5 w-5 items-center justify-center rounded-full border"
                style={{
                  backgroundColor: checked ? POKOPIA_COLORS.orange : "rgba(255,255,255,0.04)",
                  borderColor: checked ? POKOPIA_COLORS.orangeBorder : "rgba(255,255,255,0.16)",
                }}
              >
                {checked ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : null}
              </View>

              <View className="mr-2 h-5 w-5 items-center justify-center">
                {task.icon ? (
                  <ExpoImage
                    source={{ uri: task.icon }}
                    style={{ width: 20, height: 20 }}
                    contentFit="contain"
                    transition={100}
                  />
                ) : (
                  <Text style={{ fontSize: 15 }}>{task.emoji}</Text>
                )}
              </View>

              <Text
                className="flex-1 text-[13px] font-semibold"
                style={{
                  color: checked ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.92)",
                  textDecorationLine: checked ? "line-through" : "none",
                }}
              >
                {task.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
