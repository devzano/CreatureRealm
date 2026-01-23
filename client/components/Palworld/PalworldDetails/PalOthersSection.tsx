// components/Palworld/PalworldDetails/PalDetailOthersSection.tsx
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Section from "@/components/Section";

export type PalOthersSectionProps = {
  others?: Record<string, string>;
};

export const PalOthersSection: React.FC<PalOthersSectionProps> = ({
  others,
}) => {
  const entries = Object.entries(others ?? {});
  if (entries.length === 0) return null;

  // ~20 rows * (row height ~18-20 + padding). Tune if you want tighter/looser.
  const MAX_SCROLL_HEIGHT = 420;

  const content = (
    <>
      {entries.map(([k, v]) => (
        <View key={k} className="flex-row items-center justify-between py-1">
          <Text className="text-[12px] text-slate-400 flex-1 pr-3">{k}</Text>
          <Text className="text-[12px] text-slate-100 font-semibold text-right">
            {v}
          </Text>
        </View>
      ))}
    </>
  );

  return (
    <View className="mb-3">
      <Section
        title={
          <>
            <MaterialCommunityIcons
              name="dots-horizontal-circle-outline"
              size={12}
              color="#9ca3af"
            />{" "}
            Others
          </>
        }
        rightText={"Scroll for more"}
      >
        {entries.length > 20 ? (
          <ScrollView
            style={{ maxHeight: MAX_SCROLL_HEIGHT }}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          <View>{content}</View>
        )}
      </Section>
    </View>
  );
};

export default PalOthersSection;