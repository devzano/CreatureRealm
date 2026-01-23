// components/Palworld/PalworldDetails/PalActiveSkillsSection.tsx
import React from "react";
import { View, Text, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type PalActiveSkill } from "@/lib/palworld/pal/paldbActiveSkills";
import LiquidGlass from "@/components/ui/LiquidGlass";
import Section from "@/components/Section";

export type PalActiveSkillsSectionProps = {
  activeSkills: PalActiveSkill[];
};

function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

/**
 * Normalize any incoming element string from paldb into our canonical keys.
 * paldb typically gives: "Fire", "Water", "Electric", etc.
 */
function normalizeElement(el: string) {
  const e = (el ?? "").toLowerCase();

  if (e.includes("fire")) return "fire";
  if (e.includes("water")) return "water";
  if (e.includes("ice")) return "ice";
  if (e.includes("electric") || e.includes("thunder")) return "electric";
  if (e.includes("grass") || e.includes("leaf")) return "grass";
  if (e.includes("ground") || e.includes("earth")) return "ground";
  if (e.includes("dark")) return "dark";
  if (e.includes("dragon")) return "dragon";
  if (e.includes("neutral") || e.includes("normal")) return "neutral";

  // fallback: keep whatever it is
  return e.trim();
}

/**
 * Palworld palette (your hexes)
 */
function elementHex(el: string) {
  const k = normalizeElement(el);
  if (k === "ice") return "#1BB3BB";
  if (k === "water") return "#1673D3";
  if (k === "electric") return "#CEAA0F";
  if (k === "grass") return "#64A805";
  if (k === "neutral") return "#B39690";
  if (k === "ground") return "#905521";
  if (k === "dark") return "#9B124A";
  if (k === "dragon") return "#A84BC2";
  if (k === "fire") return "#f97316"; // existing orange
  return "#0ea5e9";
}

/**
 * Pill style for LiquidGlass, matching your Type Matchups pills.
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

export const PalActiveSkillsSection: React.FC<PalActiveSkillsSectionProps> = ({
  activeSkills,
}) => {
  if (!activeSkills || activeSkills.length === 0) return null;

  return (
    <View className="mb-3">
      <Section
        title={
          <>
            <MaterialCommunityIcons name="flash" size={12} color="#9ca3af" />{" "}
            Active Skills
          </>
        }
      >
        {activeSkills.map((s, idx) => {
          const elementLabel = s.element ? capitalize(s.element) : "—";
          const pillType = s.element ? s.element : "neutral";
          const { tint, bgStyle, borderStyle, textStyle } =
            getPalworldElementStyle(pillType);

          return (
            <View
              key={`${s.name}-${idx}`}
              className="py-2 border-b border-slate-800 last:border-b-0"
            >
              {/* Top row: element pill + name + skill fruit icon */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-2">
                  <LiquidGlass
                    interactive={false}
                    tinted
                    tintColor={tint}
                    showFallbackBackground
                    style={{ borderRadius: 999, marginRight: 10 }}
                  >
                    <View
                      className="px-3 py-1 rounded-full border"
                      style={[bgStyle, borderStyle]}
                    >
                      <Text
                        className="text-[11px] font-semibold"
                        style={textStyle}
                      >
                        {elementLabel}
                      </Text>
                    </View>
                  </LiquidGlass>

                  <Text
                    className="text-[13px] text-slate-100 font-semibold flex-1"
                    numberOfLines={2}
                  >
                    Lv. {s.level} • {s.name}
                  </Text>
                </View>

                {s.skillFruitImageUrl ? (
                  <View className="ml-2">
                    <Image
                      source={{ uri: s.skillFruitImageUrl }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "rgba(148, 163, 184, 0.35)",
                      }}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}
              </View>

              <Text className="text-[12px] text-slate-400 mt-1">
                {s.coolTime ? `Cool: ${s.coolTime}` : "Cool: —"}
                {s.power ? ` • Power: ${s.power}` : ""}
                {s.aggregate ? ` • ${s.aggregate}` : ""}
              </Text>

              {s.description ? (
                <Text className="text-[12px] text-slate-300 mt-1">
                  {s.description}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Section>
    </View>
  );
};

export default PalActiveSkillsSection;
