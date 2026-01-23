// components/PokemonEvolutionLine.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { getPokemon, getPokemonSpecies, getType, type Pokemon } from "@/lib/pokemon/index";
import { DEFAULT_EVOLUTION_CHIP_STYLE, type EvolutionChipStyle, getEvolutionChipStyleFromSpeciesColor, getTypeStyle } from "@/lib/pokemon/ui/typeStyles";
import LiquidGlass from "@/components/ui/LiquidGlass";

type PokemonEvolutionLineProps = {
  evolutionNames: string[];
  currentName: string;
  /**
   * Optional game context so we can preserve it
   * when navigating to another Pokémon in the line.
   */
  gameId?: string;
};

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const PokemonEvolutionLine: React.FC<PokemonEvolutionLineProps> = ({
  evolutionNames,
  currentName,
  gameId,
}) => {
  const router = useRouter();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedMon, setSelectedMon] = useState<Pokemon | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [speciesColors, setSpeciesColors] = useState<
    Record<string, EvolutionChipStyle>
  >({});

  // per-preview weaknesses & strengths
  const [previewWeakTo, setPreviewWeakTo] = useState<string[]>([]);
  const [previewStrongTo, setPreviewStrongTo] = useState<string[]>([]);

  if (!evolutionNames || evolutionNames.length === 0) {
    return null;
  }

  const currentLower = currentName.toLowerCase();

  const openPreview = useCallback(
    (name: string) => {
      const normalized = name.toLowerCase();

      setSheetVisible(true);

      if (
        selectedName &&
        normalized === selectedName.toLowerCase() &&
        selectedMon
      ) {
        setLoadingPreview(false);
        return;
      }

      setSelectedMon(null);
      setPreviewWeakTo([]);
      setPreviewStrongTo([]);
      setLoadingPreview(true);
      setSelectedName(name);
    },
    [selectedName, selectedMon]
  );

  useEffect(() => {
    if (!selectedName) return;

    let isActive = true;

    (async () => {
      try {
        const mon = await getPokemon(selectedName.toLowerCase());
        if (!isActive) return;
        setSelectedMon(mon);
      } catch (err) {
        console.warn("Failed to load evolution preview", err);
        if (isActive) setSelectedMon(null);
      } finally {
        if (isActive) setLoadingPreview(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [selectedName]);

  useEffect(() => {
    if (!evolutionNames || evolutionNames.length === 0) return;

    let isActive = true;

    (async () => {
      try {
        const results = await Promise.all(
          evolutionNames.map((name) =>
            getPokemonSpecies(name.toLowerCase()).catch(() => null)
          )
        );

        if (!isActive) return;

        const nextMap: Record<string, EvolutionChipStyle> = {};

        results.forEach((species, idx) => {
          const rawName = evolutionNames[idx];
          const key = rawName.toLowerCase();
          const colorName = species?.color?.name ?? null;
          nextMap[key] = getEvolutionChipStyleFromSpeciesColor(colorName);
        });

        setSpeciesColors(nextMap);
      } catch (err) {
        console.warn("Failed to load species colors for evolution line", err);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [evolutionNames]);

  useEffect(() => {
    if (!selectedMon || !selectedMon.types || selectedMon.types.length === 0) {
      setPreviewWeakTo([]);
      setPreviewStrongTo([]);
      return;
    }

    let isActive = true;

    (async () => {
      try {
        const typeDetails = await Promise.all(
          selectedMon.types.map((t) => getType(t.type.name))
        );

        if (!isActive) return;

        const weakSet = new Set<string>();
        const strongSet = new Set<string>();

        typeDetails.forEach((td) => {
          td.damage_relations.double_damage_from.forEach((t) =>
            weakSet.add(t.name)
          );
          td.damage_relations.double_damage_to.forEach((t) =>
            strongSet.add(t.name)
          );
        });

        setPreviewWeakTo(Array.from(weakSet));
        setPreviewStrongTo(Array.from(strongSet));
      } catch (err) {
        console.warn("Failed to compute preview type relations", err);
        if (isActive) {
          setPreviewWeakTo([]);
          setPreviewStrongTo([]);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [selectedMon]);

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setLoadingPreview(false);
  };

  const handleNavigate = () => {
    if (!selectedName) return;

    setSheetVisible(false);

    router.push({
      pathname: "/pokemon/[id]",
      params: {
        id: selectedName.toLowerCase(),
        ...(gameId ? { gameId } : {}),
      },
    });
  };

  const artUrl =
    selectedMon?.sprites.other?.["official-artwork"]?.front_default ??
    selectedMon?.sprites.front_default ??
    null;

  return (
    <>
      <View className="mb-4">
        <Text className="text-xs font-semibold text-slate-400 mb-1">
          Evolution Line
        </Text>
        <View className="flex-row flex-wrap items-center">
          {evolutionNames.map((name, idx) => {
            const key = name.toLowerCase();
            const isSelf = key === currentLower;
            const isLast = idx === evolutionNames.length - 1;

            const baseStyle =
              speciesColors[key] ?? DEFAULT_EVOLUTION_CHIP_STYLE;

            const tintColor = baseStyle.tint;
            const bgClass = baseStyle.bgClass;
            const borderClass = baseStyle.borderClass;
            const textClass = baseStyle.textClass;

            return (
              <React.Fragment key={`${name}-${idx}`}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSelf}
                  onPress={isSelf ? undefined : () => openPreview(name)}
                  style={{
                    marginRight: isLast ? 0 : 4,
                    marginBottom: 8,
                    opacity: 1,
                  }}
                >
                  <LiquidGlass
                    interactive={false}
                    tinted
                    tintColor={tintColor}
                    showFallbackBackground
                    style={{
                      borderRadius: 999,
                    }}
                  >
                    <View className={`px-4 py-2 rounded-full border ${bgClass} ${borderClass}`}>
                      <Text className={`text-[12px] font-semibold ${textClass}`}>
                        {isSelf ? `✱ ${capitalize(name)}` : capitalize(name)}
                      </Text>
                    </View>
                  </LiquidGlass>
                </TouchableOpacity>

                {!isLast && (
                  <Text className="text-[11px] text-slate-500 mx-1 mb-2">
                    →
                  </Text>
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={handleCloseSheet}
        tintColor="#020617"
        fixedHeight={350}
      >
        <View className="flex-col" style={{ minHeight: 320 }}>
          <View className="flex-1 mt-1 px-2 w-full">
            {loadingPreview && (
              <View className="items-center justify-center flex-1">
                <ActivityIndicator />
                <Text className="mt-2 text-xs text-slate-400">
                  Loading evolution…
                </Text>
              </View>
            )}

            {!loadingPreview && selectedName && selectedMon && (
              <>
                <View className="flex-row items-center justify-between w-full px-6">
                  {artUrl && (
                    <Image
                      source={{ uri: artUrl }}
                      style={{ width: 140, height: 140 }}
                      resizeMode="contain"
                    />
                  )}

                  <View className="flex-1 items-end mr-6">
                    <Text className="text-lg font-semibold text-slate-50">
                      {capitalize(selectedName)}
                    </Text>

                    <View className="mt-2 inline-flex rounded-full bg-slate-900/80 border border-slate-700/80 px-3 py-1.5">
                      <Text className="text-[12px] font-semibold text-slate-200">
                        #{String(selectedMon.id).padStart(3, "0")}
                      </Text>
                    </View>

                    {selectedMon.types && selectedMon.types.length > 0 && (
                      <View className="flex-row flex-wrap mt-3 justify-end">
                        {selectedMon.types
                          .slice()
                          .sort((a, b) => a.slot - b.slot)
                          .map((t) => {
                            const { bg, border, text, tint } =
                              getTypeStyle(t.type.name);
                            return (
                              <LiquidGlass
                                key={t.type.name}
                                interactive={false}
                                tinted
                                tintColor={tint}
                                showFallbackBackground
                                style={{
                                  borderRadius: 999,
                                  marginLeft: 6,
                                  marginBottom: 6,
                                }}
                              >
                                <View
                                  className={`px-3.5 py-1.5 rounded-full border ${bg} ${border}`}
                                >
                                  <Text
                                    className={`text-[12px] font-semibold ${text}`}
                                  >
                                    {capitalize(t.type.name)}
                                  </Text>
                                </View>
                              </LiquidGlass>
                            );
                          })}
                      </View>
                    )}
                  </View>
                </View>

                {(previewWeakTo.length > 0 || previewStrongTo.length > 0) && (
                  <View className="mt-4 flex-row w-full px-6">
                    {previewWeakTo.length > 0 && (
                      <View className="flex-1 mr-2">
                        <Text className="text-[11px] font-semibold text-slate-400 mb-1">
                          Weak Towards
                        </Text>
                        <ScrollView
                          style={{ maxHeight: 120 }}
                          showsVerticalScrollIndicator={false}
                        >
                          <View className="flex-row flex-wrap">
                            {previewWeakTo.map((typeName) => {
                              const { bg, border, text, tint } =
                                getTypeStyle(typeName);
                              return (
                                <LiquidGlass
                                  key={`weak-${typeName}`}
                                  interactive={false}
                                  tinted
                                  tintColor={tint}
                                  showFallbackBackground
                                  style={{
                                    borderRadius: 999,
                                    marginRight: 6,
                                    marginBottom: 6,
                                  }}
                                >
                                  <View
                                    className={`px-3 py-1.5 rounded-full border ${bg} ${border}`}
                                  >
                                    <Text
                                      className={`text-[11px] font-semibold ${text}`}
                                    >
                                      {capitalize(typeName)}
                                    </Text>
                                  </View>
                                </LiquidGlass>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {previewStrongTo.length > 0 && (
                      <View className="flex-1 ml-2">
                        <Text className="text-[11px] font-semibold text-slate-400 mb-1">
                          Super Effective Towards
                        </Text>
                        <ScrollView
                          style={{ maxHeight: 120 }}
                          showsVerticalScrollIndicator={false}
                        >
                          <View className="flex-row flex-wrap">
                            {previewStrongTo.map((typeName) => {
                              const { bg, border, text, tint } =
                                getTypeStyle(typeName);
                              return (
                                <LiquidGlass
                                  key={`strong-${typeName}`}
                                  interactive={false}
                                  tinted
                                  tintColor={tint}
                                  showFallbackBackground
                                  style={{
                                    borderRadius: 999,
                                    marginRight: 6,
                                    marginBottom: 6,
                                  }}
                                >
                                  <View
                                    className={`px-3 py-1.5 rounded-full border ${bg} ${border}`}
                                  >
                                    <Text
                                      className={`text-[11px] font-semibold ${text}`}
                                    >
                                      {capitalize(typeName)}
                                    </Text>
                                  </View>
                                </LiquidGlass>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Capsule navigation button at bottom center */}
          <View className="mt-4 items-center">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleNavigate}
              disabled={!selectedName}
              className={`px-6 py-2 rounded-full border ${selectedName
                  ? "bg-sky-500/80 border-sky-300/80"
                  : "bg-slate-700/60 border-slate-600/80 opacity-60"
                }`}
            >
              <Text className="text-[13px] font-semibold text-slate-50">
                Open Full Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>
    </>
  );
};

export default PokemonEvolutionLine;