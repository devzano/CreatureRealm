// components/Palworld/PaldeckEntryStrip.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { usePalworldCollectionStore } from "@/store/palworldCollectionStore";
import AppImages from "@/constants/images";
import Section from "@/components/Section";

const EMPTY_ENTRY = Object.freeze({
  caught: false,
  lucky: false,
  alpha: false,
  luckyHuntCount: 0,
  luckyHuntMethod: "none" as const,
  notes: "",
});

export type PaldeckEntryStripProps = {
  dexId: string; // e.g. "5" or "5B"
};

export const PaldeckEntryStrip: React.FC<PaldeckEntryStripProps> = ({ dexId }) => {
  const key = String(dexId ?? "").trim();

  const entry = usePalworldCollectionStore((s) => {
    return (s.entries[key] as any) ?? EMPTY_ENTRY;
  });

  const toggleCaught = usePalworldCollectionStore((s) => s.toggleCaught);
  const toggleLucky = usePalworldCollectionStore((s) => (s as any).toggleLucky);
  const toggleAlpha = usePalworldCollectionStore((s) => s.toggleAlpha);

  const caught = !!entry.caught;
  const lucky = !!entry.lucky;
  const alpha = !!entry.alpha;

  const IconToggle = ({
    active,
    activeColor,
    iconOn,
    iconOff,
    imageSource,
    imageSize = 16,
    onPress,
    label,
  }: {
    active: boolean;
    activeColor: string;
    iconOn: string;
    iconOff: string;
    imageSource?: any;
    imageSize?: number;
    onPress: () => void;
    label: string;
  }) => (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      className="flex-row items-center rounded-full border px-5 py-3"
      style={{
        borderColor: active ? `${activeColor}99` : "rgba(55,65,81,0.9)",
        backgroundColor: active ? "rgba(12,211,241,0.22)" : "rgba(15,23,42,0.9)",
      }}
    >
      <View style={{ width: 16, height: 16, justifyContent: "center", alignItems: "center" }}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={{
              width: imageSize,
              height: imageSize,
              position: "absolute",
              tintColor: active ? activeColor : "#9ca3af",
              opacity: active ? 1 : 0.9,
            }}
            contentFit="contain"
            transition={120}
          />
        ) : (
          <MaterialCommunityIcons
            name={(active ? iconOn : iconOff) as any}
            size={16}
            color={active ? activeColor : "#9ca3af"}
          />
        )}
      </View>

      <Text className="ml-1.5 text-[13px] font-semibold" style={{ color: active ? activeColor : "#e5e7eb" }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View className="mb-3">
      <Section
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="clipboard-check-outline" size={14} color="#9ca3af" />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Paldeck Entry
            </Text>
          </View>
        }
        rightText="Tap to update"
      >
        <View className="flex-row flex-wrap justify-center items-center gap-2">
          <IconToggle
            active={caught}
            activeColor="#f97316"
            iconOn="pokeball"
            iconOff="pokeball"
            imageSource={AppImages.caughtPalworldIcon}
            label="Caught"
            onPress={() => {
              if (!key) return;
              toggleCaught(key);
            }}
          />

          <IconToggle
            active={lucky}
            activeColor="#facc15"
            iconOn="star-four-points"
            iconOff="star-four-points-outline"
            imageSource={AppImages.luckyPalworldIcon}
            imageSize={20}
            label="Lucky"
            onPress={() => {
              if (!key || !toggleLucky) return;
              toggleLucky(key);
            }}
          />

          <IconToggle
            active={alpha}
            activeColor="#38bdf8"
            iconOn="alpha-a-circle"
            iconOff="alpha-a-circle-outline"
            imageSource={AppImages.alphaPalworldIcon}
            label="Alpha"
            onPress={() => {
              if (!key) return;
              toggleAlpha(key);
            }}
          />
        </View>
      </Section>
    </View>
  );
};

export default PaldeckEntryStrip;
