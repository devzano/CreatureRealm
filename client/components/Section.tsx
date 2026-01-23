// components/Section.tsx
import React from "react";
import { View, Text } from "react-native";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </Text>
  );
}

export function Card({
  children,
  borderColor,
}: {
  children: React.ReactNode;
  borderColor?: string;
}) {
  return (
    <View
      className="rounded-3xl bg-slate-900/80 border p-4"
      style={{ borderColor: borderColor ?? "rgba(51, 65, 85, 1)" }} // slate-700 fallback
    >
      {children}
    </View>
  );
}

export function StatRow({ label, value }: { label: string; value?: any }) {
  const v = value == null ? null : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-1">
      <Text className="text-[11px] text-slate-400">{label}</Text>
      <Text className="text-[11px] text-slate-200 text-right ml-3 flex-1">
        {v}
      </Text>
    </View>
  );
}

export default function Section({
  title,
  rightText,
  rightNode,
  children,
  borderColor,
}: {
  title: React.ReactNode;
  rightText?: string;
  rightNode?: React.ReactNode;
  children: React.ReactNode;
  borderColor?: string;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between mb-2 px-1">
        <SectionTitle>{title}</SectionTitle>

        {rightNode ? (
          rightNode
        ) : rightText ? (
          <Text className="text-[10px] text-slate-500">{rightText}</Text>
        ) : null}
      </View>

      <Card borderColor={borderColor}>{children}</Card>
    </View>
  );
}
