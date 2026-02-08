// components/Palworld/PalworldDetails/PalDetailOthersSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Section from "@/components/Section";

export type PalOthersSectionProps = {
  others?: Record<string, string>;
};

export const PalOthersSection: React.FC<PalOthersSectionProps> = ({ others }) => {
  const entries = Object.entries(others ?? {});
  if (entries.length === 0) return null;

  const MAX_SCROLL_HEIGHT = 420;

  const [contentH, setContentH] = useState(0);
  const isScrollable = contentH > MAX_SCROLL_HEIGHT + 1;

  const content = useMemo(() => {
    return (
      <>
        {entries.map(([k, v]) => (
          <View key={k} className="flex-row items-center justify-between py-1">
            <Text className="text-[12px] text-slate-400 flex-1 pr-3">{k}</Text>
            <Text className="text-[12px] text-slate-100 font-semibold text-right">{v}</Text>
          </View>
        ))}
      </>
    );
  }, [entries]);

  return (
    <View className="mb-3">
      <Section
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="dots-horizontal-circle-outline"
              size={14}
              color="#9ca3af"
            />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Others
            </Text>
          </View>
        }
        rightText={isScrollable ? "scroll for more" : undefined}
      >
        <ScrollView
          style={{ maxHeight: MAX_SCROLL_HEIGHT }}
          contentContainerStyle={{ flexGrow: 1 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          scrollEnabled={isScrollable}
          onContentSizeChange={(_, h) => setContentH(h)}
        >
          {content}
        </ScrollView>
      </Section>
    </View>
  );
};

export default PalOthersSection;
