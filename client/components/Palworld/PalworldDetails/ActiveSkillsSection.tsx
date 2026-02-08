// components/Palworld/PalworldDetails/PalActiveSkillsSection.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type PalActiveSkill } from "@/lib/palworld/pal/paldbActiveSkills";
import LiquidGlass from "@/components/ui/LiquidGlass";
import Section from "@/components/Section";
import RemoteIcon from "@/components/Palworld/RemoteIcon";
import { elementHex } from "@/lib/palworld/palworldDB";

export type PalActiveSkillsSectionProps = {
  activeSkills: PalActiveSkill[];
};

function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

/**
 * Pill style for LiquidGlass, matching your Type Matchups pills.
 * Uses shared elementHex() so we don't duplicate element logic.
 */
function getPalworldElementStyle(typeName: string) {
  const tint = elementHex(typeName);
  return {
    tint,
    bgStyle: { backgroundColor: `${tint}22` },
    borderStyle: { borderColor: `${tint}99` },
    textStyle: { color: "#e5e7eb" },
  };
}

export const PalActiveSkillsSection: React.FC<PalActiveSkillsSectionProps> = ({ activeSkills }) => {
  const rows = activeSkills ?? [];
  if (rows.length === 0) return null;

  const MAX_SCROLL_HEIGHT = 420;

  // Measure-based scroll detection
  const [contentH, setContentH] = useState(0);
  const isScrollable = contentH > MAX_SCROLL_HEIGHT + 1;

  const content = useMemo(() => {
    return (
      <>
        {rows.map((s, idx) => {
          const elementLabel = s.element ? capitalize(s.element) : "—";
          const pillType = s.element ? s.element : "neutral";
          const { tint, bgStyle, borderStyle, textStyle } = getPalworldElementStyle(pillType);

          return (
            <View key={`${s.name}-${idx}`} className="py-2 border-b border-slate-800 last:border-b-0">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-2">
                  <LiquidGlass
                    interactive={false}
                    tinted
                    tintColor={tint}
                    showFallbackBackground
                    style={{ borderRadius: 999, marginRight: 10 }}
                  >
                    <View className="px-3 py-1 rounded-full border" style={[bgStyle, borderStyle]}>
                      <Text className="text-[11px] font-semibold" style={textStyle}>
                        {elementLabel}
                      </Text>
                    </View>
                  </LiquidGlass>

                  <Text className="text-[13px] text-slate-100 font-semibold flex-1" numberOfLines={2}>
                    Lv. {s.level} • {s.name}
                  </Text>
                </View>

                {s.skillFruitImageUrl ? (
                  <View className="ml-2">
                    <RemoteIcon
                      uri={s.skillFruitImageUrl}
                      size={28}
                      contentFit="contain"
                      style={{
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "rgba(148, 163, 184, 0.35)",
                        backgroundColor: "rgba(255,255,255,0.04)",
                      }}
                    />
                  </View>
                ) : null}
              </View>

              <Text className="text-[12px] text-slate-400 mt-1">
                {s.coolTime ? `Cool: ${s.coolTime}` : "Cool: —"}
                {s.power ? ` • Power: ${s.power}` : ""}
                {s.aggregate ? ` • ${s.aggregate}` : ""}
              </Text>

              {s.description ? <Text className="text-[12px] text-slate-300 mt-1">{s.description}</Text> : null}
            </View>
          );
        })}
      </>
    );
  }, [rows]);

  return (
    <View className="mb-3">
      <Section
        title={
          <>
            <MaterialCommunityIcons name="flash" size={12} color="#9ca3af" /> Active Skills
          </>
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

export default PalActiveSkillsSection;
