import React from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Section from "@/components/Section";
import LiquidGlass from "@/components/ui/LiquidGlass";
import { elementHex } from "@/lib/palworld/palworldDB"; // Ensure this path is correct

type UniqueComboPal = {
  palSlug: string;
  palName: string;
  iconUrl?: string | null;
  element?: string | null; // Added element to the type
};

type UniqueCombo = {
  parents: [UniqueComboPal, UniqueComboPal];
  child: UniqueComboPal;
};

export default function PalUniqueComboSection({
  uniqueCombo,
}: {
  uniqueCombo?: UniqueCombo | null;
}) {
  const router = useRouter();

  if (!uniqueCombo?.parents?.[0]?.palSlug || !uniqueCombo?.child?.palSlug) {
    return null;
  }

  const [parentA, parentB] = uniqueCombo.parents;
  const child = uniqueCombo.child;

  const PalChip = ({ pal, isChild = false }: { pal: UniqueComboPal; isChild?: boolean }) => {
    const elementColor = isChild && pal.element ? elementHex(pal.element) : "#94a3b8";

    return (
      <LiquidGlass
        interactive={true}
        tinted={isChild}
        tintColor={elementColor}
        showFallbackBackground
        style={{ borderRadius: 999 }}
      >
        <Pressable
          onPress={() => {
            if (!pal.palSlug) return;
            router.push({
              pathname: "/pal/[id]",
              params: { id: pal.palSlug },
            } as any);
          }}
          className="flex-row items-center rounded-full border px-3 py-2 bg-slate-900/40"
          style={{ borderColor: isChild ? `${elementColor}66` : "rgba(255,255,255,0.1)" }}
        >
          {pal.iconUrl ? (
            <Image
              source={{ uri: pal.iconUrl }}
              style={{ width: 24, height: 24, borderRadius: 12 }}
              contentFit="contain"
            />
          ) : (
            <View className="w-6 h-6 rounded-full bg-white/10 border border-white/15" />
          )}
          <Text className="ml-2 text-[12px] font-semibold text-slate-100">
            {pal.palName}
          </Text>
        </Pressable>
      </LiquidGlass>
    );
  };

  const resultColor = child.element ? elementHex(child.element) : "#94a3b8";

  return (
    <View className="mt-3 mb-3">
      <Section
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="dna" size={14} color="#9ca3af" />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Unique Breeding
            </Text>
          </View>
        }
      >
        <View className="flex-row items-center justify-center py-2">
          {/* Parents Column */}
          <View className="flex-1 items-center justify-center">
            <Text className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-widest">
              Parents
            </Text>
            <View className="items-center gap-y-2">
              <PalChip pal={parentA} />
              <MaterialCommunityIcons name="plus" size={14} color="#475569" />
              <PalChip pal={parentB} />
            </View>
          </View>

          {/* Spacer Arrow */}
          <View className="px-2">
            <MaterialCommunityIcons name="chevron-right" size={24} color="#334155" />
          </View>

          {/* Result Column */}
          <View className="flex-1 items-center justify-center">
            <Text
              className="text-[11px] font-semibold mb-2 uppercase tracking-widest"
              style={{ color: resultColor }}
            >
              Result
            </Text>
            <PalChip pal={child} isChild />
          </View>
        </View>
      </Section>
    </View>
  );
}
