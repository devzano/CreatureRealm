// components/MapCard.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { FontAwesome6, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

export type MapCardProps = {
  onPress: () => void;
  title: string;
  subtitle: string;
  tagLabel: string; // "Region" or "Hub"
  tagValue: string; // e.g. "Kalos • Lumiose City"
  iconType: "mci" | "fa5" | "fa6";
  iconName: string;
  iconColor: string;
  iconSize: number;
  borderColorClass: string; // e.g. "border-sky-700/70"
  iconBgClass: string; // e.g. "bg-sky-500/20 border-sky-500/60"
  infoIconName: string; // e.g. "map-search-outline"
  infoText: string;
  badgeBgClass: string; // e.g. "bg-sky-500/15"
  badgeBorderClass: string; // e.g. "border-sky-500/60"
  badgeTextClass: string; // e.g. "text-sky-300"
  poweredBy?: string;     // e.g. "GamerGuides.com"
  badgeLabel?: string;    // e.g. "WEB MAP"
  viewMode?: string;      // e.g. "In-App • Web Browser"
};

const MapCard: React.FC<MapCardProps> = ({
  onPress,
  title,
  subtitle,
  tagLabel,
  tagValue,
  iconType,
  iconName,
  iconColor,
  iconSize,
  borderColorClass,
  iconBgClass,
  infoIconName,
  infoText,
  badgeBgClass,
  badgeBorderClass,
  badgeTextClass,
  poweredBy = "GamerGuides.com",
  badgeLabel = "WEB MAP",
  viewMode = "In-App • Web Browser",
}) => {
  const LeadingIcon = iconType == "fa5" ? FontAwesome5 : iconType == "fa6" ? FontAwesome6 : MaterialCommunityIcons;

  return (
    <Pressable onPress={onPress} className="w-full px-1">
      <View
        className={`rounded-3xl bg-slate-950 p-4 border mb-3 ${borderColorClass}`}
      >
        {/* Header row */}
        <View className="flex-row items-center mb-2">
          <View
            className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 border ${iconBgClass}`}
          >
            <LeadingIcon name={iconName as any} size={iconSize} color={iconColor} />
          </View>

          <View className="flex-1">
            <Text className="text-[13px] font-semibold text-slate-50">
              {title}
            </Text>
            <Text className="text-[11px] text-slate-400 mt-0.5">
              {subtitle}
            </Text>

            {/* Small meta row */}
            <View className="mt-1 flex-row justify-between">
              <View className="mr-2">
                <Text className="text-[10px] text-slate-500 uppercase tracking-[0.12em]">
                  {tagLabel}
                </Text>
                <Text className="text-[11px] font-semibold text-slate-200">
                  {tagValue}
                </Text>
              </View>
              <View className="items-end ml-2">
                <Text className="text-[10px] text-slate-500 uppercase tracking-[0.12em]">
                  View mode
                </Text>
                <Text className="text-[11px] font-semibold text-slate-200">
                  {viewMode}
                </Text>
              </View>
            </View>
          </View>

          <MaterialCommunityIcons
            name="open-in-new"
            size={18}
            color="#94a3b8"
          />
        </View>

        {/* Info strip */}
        <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-slate-900/80 px-3 py-2 border border-slate-800/80">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-6 h-6 rounded-full bg-slate-950 items-center justify-center mr-2 border border-slate-700">
              <MaterialCommunityIcons
                name={infoIconName as any}
                size={16}
                color="#e5e7eb"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] text-slate-300">{infoText}</Text>
            </View>
          </View>

          <View className="items-end">
            <View
              className={`px-2.5 py-1 rounded-full mb-1 border ${badgeBgClass} ${badgeBorderClass}`}
            >
              <Text className={`text-[10px] font-semibold ${badgeTextClass}`}>
                {badgeLabel}
              </Text>
            </View>
            <Text className="text-[10px] text-slate-500">
              Powered by {poweredBy}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default MapCard;
