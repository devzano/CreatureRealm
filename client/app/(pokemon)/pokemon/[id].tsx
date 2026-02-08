// client/app/(pokemon)/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import LiquidGlass from "@/components/ui/LiquidGlass";
import PageWrapper from "@/components/PageWrapper";

import { getTypeStyle } from "@/lib/pokemon/ui/typeStyles";
import { getGameById } from "@/lib/pokemon/gameFilters";

import { usePokemonCollectionStore, type HuntMethod } from "@/store/pokemonCollectionStore";

import PokemonSpriteGallery from "@/components/Pokemon/PokemonDetails/PokemonSpriteGallery";
import PokemonVariantBrowser from "@/components/Pokemon/PokemonDetails/PokemonVariantBrowser";
import PokemonTypeMatchups from "@/components/Pokemon/PokemonDetails/PokemonTypeMatchups";
import PokemonEvolutionLine from "@/components/Pokemon/PokemonDetails/PokemonEvolutionLine";
import PokemonMovesSheet from "@/components/Pokemon/PokemonDetails/PokemonMovesSheet";
import PokedexEntryStrip from "@/components/Pokemon/PokemonDetails/PokedexEntryStrip";
import PokemonEncounterLocations from "@/components/Pokemon/PokemonDetails/PokemonEncounterLocations";

import { capitalize, humanizeSlug } from "@/components/Pokemon/PokemonDetails/helpers/pokemonDetailHelpers";
import { usePokemonDetailData } from "@/components/Pokemon/PokemonDetails/helpers/usePokemonDetailData";
import { useSpeciesDexSlots } from "@/components/Pokemon/PokemonDetails/helpers/useSpeciesDexSlots";
import Section from "@/components/Section";
import PokemonOverviewSection from "@/components/Pokemon/PokemonDetails/PokemonOverviewSection";

export default function PokemonDetailScreen() {
  const { id, gameId, form } = useLocalSearchParams<{
    id: string;
    gameId?: string;
    form?: string;
  }>();

  const game = useMemo(() => (gameId ? getGameById(gameId) : null), [gameId]);

  const {
    loading,
    data,
    species,
    monToDisplay,
    weaknesses,
    strengths,
    variants,
    activeVariantKey,
    setActiveVariantKey,
    evolutionNames,
    evolutionRequirementForCurrent,
    encounters,
    encountersLoading,
  } = usePokemonDetailData({ id, form });

  const { dexSlots, ownershipGameFilterIds } = useSpeciesDexSlots(species);

  const [movesSheetVisible, setMovesSheetVisible] = useState(false);
  const [showShiny, setShowShiny] = useState(false);

  const getEntry = usePokemonCollectionStore((s) => s.getEntry);
  const toggleCaught = usePokemonCollectionStore((s) => s.toggleCaught);
  const toggleShiny = usePokemonCollectionStore((s) => s.toggleShiny);
  const toggleAlpha = usePokemonCollectionStore((s) => s.toggleAlpha);
  const toggleFavorite = usePokemonCollectionStore((s) => s.toggleFavorite);
  const isFavorite = usePokemonCollectionStore((s) => s.isFavorite);
  const teams = usePokemonCollectionStore((s) => s.teams);
  const addToTeam = usePokemonCollectionStore((s) => s.addToTeam);
  const removeFromTeam = usePokemonCollectionStore((s) => s.removeFromTeam);
  const incrementHuntCount = usePokemonCollectionStore((s) => s.incrementHuntCount);
  const decrementHuntCount = usePokemonCollectionStore((s) => s.decrementHuntCount);
  const setHuntMethod = usePokemonCollectionStore((s) => s.setHuntMethod);
  const setNotes = usePokemonCollectionStore((s) => s.setNotes);

  const entries = usePokemonCollectionStore((s) => s.entries);
  void entries;

  const cryUrl = data?.cries?.latest ?? null;
  const cryPlayer = useAudioPlayer(cryUrl, { downloadFirst: true });
  const cryStatus = useAudioPlayerStatus(cryPlayer);
  const [hasAutoplayedCry, setHasAutoplayedCry] = useState(false);

  useEffect(() => {
    setHasAutoplayedCry(false);
  }, [cryUrl]);

  useEffect(() => {
    if (loading) return;
    if (!cryUrl) return;
    if (!cryStatus.isLoaded) return;
    if (hasAutoplayedCry) return;

    try {
      cryPlayer.seekTo(0);
      cryPlayer.play();
      setHasAutoplayedCry(true);
    } catch (e) {
      console.warn("Failed to auto-play Pokémon cry:", e);
    }
  }, [cryUrl, cryStatus.isLoaded, hasAutoplayedCry, cryPlayer, loading]);

  const handlePlayCry = () => {
    if (!cryUrl) return;
    try {
      cryPlayer.seekTo(0);
      cryPlayer.play();
    } catch (e) {
      console.warn("Failed to replay Pokémon cry:", e);
    }
  };

  if (loading || !data || !monToDisplay) {
    return (
      <PageWrapper title="Pokémon Detail" scroll={false} headerLayout="inline">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading Pokémon…</Text>
        </View>
      </PageWrapper>
    );
  }

  const speciesId = data.id;
  const favorite = isFavorite(speciesId);

  const entry =
    game && speciesId
      ? getEntry(game.id, speciesId)
      : {
        caught: false,
        shiny: false,
        alpha: false,
        shinyHuntCount: 0,
        shinyHuntMethod: "none" as HuntMethod,
        notes: "",
      };

  const gameTeams = useMemo(
    () => (game ? Object.values(teams).filter((t) => t.gameId === game.id) : []),
    [game, teams]
  );

  const primaryTeam = gameTeams[0] ?? null;

  const genderText = useMemo(() => {
    if (!species) return "-";
    const rate = species.gender_rate;
    if (rate === -1) return "Genderless";
    const female = Math.round((rate / 8) * 100);
    const male = 100 - female;
    return `${male}% ♂ / ${female}% ♀`;
  }, [species]);

  const eggGroupText = useMemo(() => {
    if (!species?.egg_groups || species.egg_groups.length === 0) return "-";
    return species.egg_groups.map((g) => humanizeSlug(g.name)).join(", ");
  }, [species]);

  const habitatText = useMemo(() => humanizeSlug(species?.habitat?.name ?? null), [species]);
  const growthRateText = useMemo(() => humanizeSlug(species?.growth_rate?.name ?? null), [species]);

  const captureRateText = species ? `${species.capture_rate}` : "-";
  const baseHappinessText = species ? `${species.base_happiness}` : "-";

  const canTrack = !!game;
  const inPrimaryTeam = !!primaryTeam && primaryTeam.memberIds.includes(speciesId);

  const huntCount = entry.shinyHuntCount || 0;
  const huntMethod = entry.shinyHuntMethod || "none";

  const handleSetHuntMethod = (method: HuntMethod) => {
    if (!game) return;
    setHuntMethod(game.id, speciesId, method);
  };

  const handleNotesChange = (text: string) => {
    if (!game) return;
    setNotes(game.id, speciesId, text);
  };

  const dexLine = `#${String(data.id).padStart(3, "0")}`;
  const subtitle = game ? `${dexLine} • ${game.title}` : `${dexLine} • National Dex`;

  return (
    <PageWrapper
      scroll
      title={capitalize(data.name)}
      subtitle={subtitle}
      headerLayout="inline"
      rightActions={
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handlePlayCry}
            disabled={!cryUrl || !cryStatus.isLoaded}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginRight: 12, opacity: !cryUrl || !cryStatus.isLoaded ? 0.4 : 1 }}
          >
            <MaterialCommunityIcons name="play-circle-outline" size={22} color="#e5e7eb" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleFavorite(speciesId)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={favorite ? "heart" : "heart-outline"}
              size={22}
              color={favorite ? "#0cd3f1" : "#e5e7eb"}
            />
          </TouchableOpacity>
        </View>
      }
    >
      <PokemonVariantBrowser variants={variants} activeKey={activeVariantKey} onSelect={(key) => setActiveVariantKey(key)} />

      <PokemonSpriteGallery mon={monToDisplay} showShiny={showShiny} setShowShiny={setShowShiny} />

      {/* Elements */}
      <View className="flex-row flex-wrap mb-3 justify-center">
        {monToDisplay.types
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((t) => {
            const { bg, text, tint } = getTypeStyle(t.type.name);

            return (
              <LiquidGlass
                key={t.type.name}
                interactive={false}
                tinted
                tintColor={tint}
                showFallbackBackground
                style={{
                  borderRadius: 999,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <View className={`px-4 py-2 rounded-full ${bg}`}>
                  <Text className={`text-[12px] font-semibold ${text}`}>{capitalize(t.type.name)}</Text>
                </View>
              </LiquidGlass>
            );
          })}
      </View>

      <PokedexEntryStrip speciesId={speciesId} gameFilterIds={ownershipGameFilterIds} />

      <PokemonOverviewSection
        primaryType={monToDisplay.types[0]?.type.name}
        dexSlots={dexSlots}
        species={species}
        genderText={genderText}
        growthRateText={growthRateText}
        eggGroupText={eggGroupText}
        habitatText={habitatText}
        captureRateText={captureRateText}
        baseHappinessText={baseHappinessText}
        stats={monToDisplay.stats}
      />

      <View className="mt-3" />

      <View className="relative">
        <Section
          title={
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="axe-battle" size={14} color="#9ca3af" />
              <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Battle Data
              </Text>
            </View>
          }
        >
          <TouchableOpacity
            disabled={!monToDisplay.moves || monToDisplay.moves.length === 0}
            onPress={() => setMovesSheetVisible(true)}
            hitSlop={15}
            className="absolute -top-1 -right-1 z-10 rounded-full bg-slate-900 border border-slate-700 px-3 py-1.5 flex-row items-center shadow-lg shadow-black/50"
            style={!monToDisplay.moves || monToDisplay.moves.length === 0 ? { opacity: 0.4 } : undefined}
          >
            <MaterialCommunityIcons name="sword-cross" size={12} color="#38bdf8" />
            <Text className="ml-1.5 text-[10px] font-bold text-white uppercase tracking-tight">Moves</Text>
          </TouchableOpacity>

          <View>
            <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2.5">
              Abilities
            </Text>

            {monToDisplay.abilities && monToDisplay.abilities.length > 0 ? (
              <View className="flex-row flex-wrap items-center">
                {monToDisplay.abilities
                  .slice()
                  .sort((a: any, b: any) => Number(!!a.is_hidden) - Number(!!b.is_hidden))
                  .map((a: any) => {
                    const name = a?.ability?.name ?? "";
                    const isHidden = !!a?.is_hidden;
                    const label = name ? humanizeSlug(name) : "-";

                    return (
                      <View
                        key={`${name}-${isHidden ? "hidden" : "normal"}`}
                        className="mr-2 mb-2 rounded-full bg-slate-900 border border-slate-700 px-3 py-2 flex-row items-center"
                      >
                        <MaterialCommunityIcons
                          name={isHidden ? "eye-off-outline" : "baseball-diamond-outline"}
                          size={14}
                          color={isHidden ? "#facc15" : "#e5e7eb"}
                        />
                        <Text className="ml-2 text-[12px] font-semibold text-slate-100" numberOfLines={1}>
                          {label}
                        </Text>
                        {isHidden && (
                          <View className="ml-2 rounded-full bg-yellow-500/15 border border-yellow-400/30 px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-yellow-200">Hidden</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            ) : (
              <View className="rounded-2xl bg-slate-900 border border-slate-800 px-3 py-3">
                <Text className="text-[12px] text-slate-300">No abilities found.</Text>
              </View>
            )}
          </View>
        </Section>
      </View>

      <PokemonTypeMatchups weakTo={weaknesses} superEffectiveVs={strengths} />

      <PokemonEvolutionLine
        evolutionNames={evolutionNames}
        currentName={data.name}
        gameId={game?.id}
        evolutionRequirementForCurrent={evolutionRequirementForCurrent}
      />
      <View className="mt-3" />
      <PokemonEncounterLocations encounters={encounters} loading={encountersLoading} />

      <PokemonMovesSheet
        visible={movesSheetVisible}
        onClose={() => setMovesSheetVisible(false)}
        pokemonName={data.name}
        moves={monToDisplay.moves}
        gameId={game?.id}
      />
    </PageWrapper>
  );
}
