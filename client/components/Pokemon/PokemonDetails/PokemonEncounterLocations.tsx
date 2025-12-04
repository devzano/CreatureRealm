import React, { useMemo } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LocationAreaEncounter } from "@/lib/pokemon/index";

type PokemonEncounterLocationsProps = {
  encounters: LocationAreaEncounter[];
  loading: boolean;
  maxLocationsToShow?: number;
};

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function titleCaseFromSlug(str: string) {
  return str
    .split("-")
    .map((part) => (part ? capitalize(part) : part))
    .join(" ");
}

const PokemonEncounterLocations: React.FC<PokemonEncounterLocationsProps> = ({
  encounters,
  loading,
  maxLocationsToShow = 4,
}) => {
  const hasEncounters = encounters && encounters.length > 0;

  const summarized = useMemo(() => {
    if (!hasEncounters) return [];

    return encounters.map((loc) => {
      const prettyLocation = titleCaseFromSlug(loc.location_area.name);

      const versions = new Set<string>();
      const methods = new Set<string>();
      const conditions = new Set<string>();
      let minLevel: number | null = null;
      let maxLevel: number | null = null;

      loc.version_details.forEach((vd) => {
        if (vd.version?.name) {
          versions.add(vd.version.name);
        }

        vd.encounter_details.forEach((ed) => {
          if (typeof ed.min_level === "number") {
            if (minLevel === null || ed.min_level < minLevel) {
              minLevel = ed.min_level;
            }
          }
          if (typeof ed.max_level === "number") {
            if (maxLevel === null || ed.max_level > maxLevel) {
              maxLevel = ed.max_level;
            }
          }

          if (ed.method?.name) {
            methods.add(ed.method.name);
          }

          ed.condition_values?.forEach((cv) => {
            if (cv?.name) conditions.add(cv.name);
          });
        });
      });

      const versionLabel =
        versions.size > 0
          ? Array.from(versions)
              .slice(0, 4)
              .map((v) => titleCaseFromSlug(v))
              .join(" • ")
          : null;

      const methodLabel =
        methods.size > 0
          ? Array.from(methods)
              .slice(0, 4)
              .map((m) => titleCaseFromSlug(m))
              .join(" • ")
          : null;

      const conditionLabel =
        conditions.size > 0
          ? Array.from(conditions)
              .slice(0, 4)
              .map((c) => titleCaseFromSlug(c))
              .join(" • ")
          : null;

      let levelLabel: string | null = null;
      if (minLevel !== null && maxLevel !== null) {
        levelLabel =
          minLevel === maxLevel
            ? `Level ${minLevel}`
            : `Levels ${minLevel}–${maxLevel}`;
      }

      return {
        key: loc.location_area.name,
        prettyLocation,
        versionLabel,
        methodLabel,
        conditionLabel,
        levelLabel,
      };
    });
  }, [encounters, hasEncounters]);

  if (loading) {
    return (
      <View className="mt-3 mb-3 rounded-3xl bg-slate-950/90 border border-slate-800 px-3 py-3 flex-row items-center">
        <ActivityIndicator size="small" />
        <Text className="ml-2 text-[12px] text-slate-400">
          Loading encounter locations…
        </Text>
      </View>
    );
  }

  if (!hasEncounters) {
    return null;
  }

  const toShow = summarized.slice(0, maxLocationsToShow);
  const remaining = summarized.length - toShow.length;

  return (
    <View className="mt-3 mb-3 rounded-3xl bg-slate-950/90 border border-slate-800 px-3 py-3">
      {/* Header to match other sections */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={14}
            color="#9ca3af"
          />
          <Text className="ml-1.5 text-xs font-semibold text-slate-200">
            Where to Find
          </Text>
        </View>
        <Text className="text-[10px] text-slate-500">
          Game locations & methods
        </Text>
      </View>

      {toShow.map((loc) => (
        <View
          key={loc.key}
          className="mb-2 rounded-2xl bg-slate-900 border border-slate-800 px-3 py-2"
        >
          <Text className="text-[13px] font-semibold text-slate-100">
            {loc.prettyLocation}
          </Text>

          {loc.versionLabel && (
            <Text className="text-[11px] text-slate-400 mt-1">
              Versions: {loc.versionLabel}
            </Text>
          )}

          {loc.levelLabel && (
            <Text className="text-[11px] text-slate-400 mt-0.5">
              {loc.levelLabel}
            </Text>
          )}

          {loc.methodLabel && (
            <Text className="text-[11px] text-slate-400 mt-0.5">
              Methods: {loc.methodLabel}
            </Text>
          )}

          {loc.conditionLabel && (
            <Text className="text-[11px] text-slate-500 mt-0.5">
              Conditions: {loc.conditionLabel}
            </Text>
          )}
        </View>
      ))}

      {remaining > 0 && (
        <Text className="text-[11px] text-slate-500 mt-1">
          +{remaining} more locations across other games
        </Text>
      )}
    </View>
  );
};

export default PokemonEncounterLocations;
