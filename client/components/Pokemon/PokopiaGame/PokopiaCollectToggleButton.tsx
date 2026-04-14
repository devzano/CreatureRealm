import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePokopiaCollectionStore, type PokopiaCollectKind } from "@/store/pokopiaCollectionStore";

type Props = {
  collected?: boolean;
  onPress?: () => void;
  label?: string;
  kind?: PokopiaCollectKind;
  slug?: string;
};

export default function PokopiaCollectToggleButton({
  collected,
  onPress,
  label,
  kind,
  slug,
}: Props) {
  const normalizedSlug = String(slug ?? "").trim().toLowerCase();
  const storeCollected = usePokopiaCollectionStore((state) =>
    kind && normalizedSlug ? state.collected[kind].includes(normalizedSlug) : false
  );
  const toggleCollected = usePokopiaCollectionStore((state) => state.toggleCollected);

  const resolvedCollected = kind && normalizedSlug ? storeCollected : !!collected;
  const handlePress =
    kind && normalizedSlug
      ? () => toggleCollected(kind, normalizedSlug)
      : onPress ?? (() => undefined);

  return (
    <Pressable
      onPress={handlePress}
      className="rounded-full border px-3 py-1.5"
      style={{
        backgroundColor: resolvedCollected ? "rgba(109,218,95,0.16)" : "rgba(15,23,42,0.9)",
        borderColor: resolvedCollected ? "rgba(109,218,95,0.42)" : "rgba(51,65,85,0.9)",
      }}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={resolvedCollected ? "checkmark-circle" : "ellipse-outline"}
          size={14}
          color={resolvedCollected ? "#b8ffb2" : "#cbd5e1"}
        />
        <Text
          className="ml-1.5 text-[11px] font-semibold"
          style={{ color: resolvedCollected ? "#d8ffd3" : "#e2e8f0" }}
        >
          {label ?? (resolvedCollected ? "Collected" : "Need")}
        </Text>
      </View>
    </Pressable>
  );
}
