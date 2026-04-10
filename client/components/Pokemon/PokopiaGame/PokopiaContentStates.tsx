import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

export function PokopiaLoadingState({ label }: { label: string }) {
  return (
    <View className="items-center justify-center mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-8">
      <ActivityIndicator />
      <Text className="mt-2 text-sm text-slate-300">{label}</Text>
    </View>
  );
}

export function PokopiaEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View className="rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-6">
      <Text className="text-sm font-semibold text-slate-100">{title}</Text>
      <Text className="mt-1 text-[12px] leading-5 text-slate-400">{message}</Text>
    </View>
  );
}
