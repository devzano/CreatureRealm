import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, TextInput, Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import LiquidGlass from "@/components/ui/LiquidGlass";
import PageWrapper from "@/components/PageWrapper";
import Section from "@/components/Section";

import { getTypeStyle } from "@/lib/pokemon/ui/typeStyles";
import { getGameById } from "@/lib/pokemon/gameFilters";
import { fetchPokopiaPokemonDetail, type PokopiaPokemonDetail } from "@/lib/pokemon/pokopia/detail";
import { resolveFavoriteSlug } from "@/lib/pokemon/pokopia/favoriteUtils";

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
import PokemonOverviewSection from "@/components/Pokemon/PokemonDetails/PokemonOverviewSection";
import PokopiaFavoriteChip from "@/components/Pokemon/PokopiaGame/PokopiaFavoriteChip";
import PokopiaFavoriteDetailSheet from "@/components/Pokemon/PokopiaGame/PokopiaFavoriteDetailSheet";
import PokopiaItemDetailSheet from "@/components/Pokemon/PokopiaGame/PokopiaItemDetailSheet";
import { POKOPIA_COLORS } from "@/components/Pokemon/PokopiaGame/config";

type RouteParams = {
  id: string;
  gameId?: string;
  form?: string;
  pokopiaSlug?: string;
};

export default function PokemonDetailScreen() {
  const { id, gameId, form, pokopiaSlug } = useLocalSearchParams<RouteParams>();
  const game = useMemo(() => (gameId ? getGameById(gameId) : null), [gameId]);

  if (game?.id === "pokopia" && pokopiaSlug) {
    return <PokopiaPokemonDetailScreen id={id} gameId={gameId} pokopiaSlug={pokopiaSlug} />;
  }

  return <StandardPokemonDetailScreen id={id} gameId={gameId} form={form} />;
}

function StandardPokemonDetailScreen({
  id,
  gameId,
  form,
}: {
  id: string;
  gameId?: string;
  form?: string;
}) {
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

  const speciesId = data?.id ?? 0;
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
  const inPrimaryTeam = !!primaryTeam && primaryTeam.memberIds.includes(speciesId);
  const huntCount = entry.shinyHuntCount || 0;
  const huntMethod = entry.shinyHuntMethod || "none";

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

      <Section
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="bookmark-outline" size={14} color="#9ca3af" />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Tracking
            </Text>
          </View>
        }
      >
        <View className="flex-row flex-wrap">
          {game ? (
            <TouchableOpacity
              onPress={() => toggleCaught(game.id, speciesId)}
              className={`mr-2 mb-2 rounded-full px-4 py-2 border ${entry.caught ? "bg-primary-500/15 border-primary-400/40" : "bg-slate-900 border-slate-700"}`}
            >
              <Text className={`text-[12px] font-semibold ${entry.caught ? "text-primary-300" : "text-slate-200"}`}>Caught</Text>
            </TouchableOpacity>
          ) : null}

          {game ? (
            <TouchableOpacity
              onPress={() => toggleShiny(game.id, speciesId)}
              className={`mr-2 mb-2 rounded-full px-4 py-2 border ${entry.shiny ? "bg-yellow-500/15 border-yellow-400/40" : "bg-slate-900 border-slate-700"}`}
            >
              <Text className={`text-[12px] font-semibold ${entry.shiny ? "text-yellow-200" : "text-slate-200"}`}>Shiny</Text>
            </TouchableOpacity>
          ) : null}

          {game?.id?.includes("legends") ? (
            <TouchableOpacity
              onPress={() => toggleAlpha(game.id, speciesId)}
              className={`mr-2 mb-2 rounded-full px-4 py-2 border ${entry.alpha ? "bg-red-500/15 border-red-400/40" : "bg-slate-900 border-slate-700"}`}
            >
              <Text className={`text-[12px] font-semibold ${entry.alpha ? "text-red-200" : "text-slate-200"}`}>Alpha</Text>
            </TouchableOpacity>
          ) : null}

          {game && primaryTeam ? (
            <TouchableOpacity
              onPress={() => (inPrimaryTeam ? removeFromTeam(primaryTeam.id, speciesId) : addToTeam(primaryTeam.id, speciesId))}
              className={`mr-2 mb-2 rounded-full px-4 py-2 border ${inPrimaryTeam ? "bg-cyan-500/15 border-cyan-400/40" : "bg-slate-900 border-slate-700"}`}
            >
              <Text className={`text-[12px] font-semibold ${inPrimaryTeam ? "text-cyan-200" : "text-slate-200"}`}>
                {inPrimaryTeam ? "In Team" : "Add to Team"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {game ? (
          <View className="mt-2 rounded-2xl bg-slate-950/80 border border-slate-800 p-3">
            <Text className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider mb-2">
              Shiny Hunt
            </Text>

            <View className="flex-row items-center mb-3">
              <TouchableOpacity
                onPress={() => decrementHuntCount(game.id, speciesId)}
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 items-center justify-center"
              >
                <MaterialCommunityIcons name="minus" size={18} color="#e2e8f0" />
              </TouchableOpacity>

              <View className="mx-3 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 min-w-[72px] items-center">
                <Text className="text-lg font-bold text-white">{huntCount}</Text>
                <Text className="text-[10px] uppercase tracking-wider text-slate-400">Encounters</Text>
              </View>

              <TouchableOpacity
                onPress={() => incrementHuntCount(game.id, speciesId)}
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 items-center justify-center"
              >
                <MaterialCommunityIcons name="plus" size={18} color="#e2e8f0" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap">
              {(["none", "random", "masuda", "radar", "chain", "outbreak", "sandwich"] as HuntMethod[]).map((method) => {
                const active = huntMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    onPress={() => handleSetHuntMethod(method)}
                    className={`mr-2 mb-2 rounded-full px-3 py-1.5 border ${active ? "bg-primary-500/15 border-primary-400/40" : "bg-slate-900 border-slate-700"}`}
                  >
                    <Text className={`text-[11px] font-semibold ${active ? "text-primary-300" : "text-slate-300"}`}>
                      {capitalize(method)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={entry.notes ?? ""}
              onChangeText={handleNotesChange}
              placeholder="Notes for this hunt…"
              placeholderTextColor="#64748b"
              multiline
              className="mt-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 text-[12px] text-slate-100"
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
          </View>
        ) : null}
      </Section>

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

function PokopiaPokemonDetailScreen({
  id,
  gameId,
  pokopiaSlug,
}: {
  id: string;
  gameId?: string;
  pokopiaSlug: string;
}) {
  const game = useMemo(() => (gameId ? getGameById(gameId) : null), [gameId]);
  const [detail, setDetail] = useState<PokopiaPokemonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteSheetVisible, setFavoriteSheetVisible] = useState(false);
  const [selectedFavoriteLabel, setSelectedFavoriteLabel] = useState<string | null>(null);
  const [selectedFavoriteSlug, setSelectedFavoriteSlug] = useState<string | null>(null);
  const [selectedLovedItemSlug, setSelectedLovedItemSlug] = useState<string | null>(null);
  const [selectedLovedItemName, setSelectedLovedItemName] = useState<string | null>(null);
  const [selectedLovedItemImageUrl, setSelectedLovedItemImageUrl] = useState<string | null>(null);

  const speciesId = Number(id);
  const toggleCaught = usePokemonCollectionStore((s) => s.toggleCaught);
  const toggleFavorite = usePokemonCollectionStore((s) => s.toggleFavorite);
  const isFavorite = usePokemonCollectionStore((s) => s.isFavorite);
  const getEntry = usePokemonCollectionStore((s) => s.getEntry);

  const favorite = isFavorite(speciesId);
  const entry = game ? getEntry(game.id, speciesId) : { caught: false, shiny: false, alpha: false };

  const openFavoriteSheet = (label: string, href?: string) => {
    setSelectedFavoriteLabel(label);
    setSelectedFavoriteSlug(resolveFavoriteSlug(label, href));
    setFavoriteSheetVisible(true);
  };

  const closeFavoriteSheet = () => {
    setFavoriteSheetVisible(false);
    setSelectedFavoriteLabel(null);
    setSelectedFavoriteSlug(null);
  };

  const openLovedItemSheet = (item: { slug: string; name: string; imageUrl: string }) => {
    setSelectedLovedItemSlug(item.slug);
    setSelectedLovedItemName(item.name);
    setSelectedLovedItemImageUrl(item.imageUrl);
  };

  const closeLovedItemSheet = () => {
    setSelectedLovedItemSlug(null);
    setSelectedLovedItemName(null);
    setSelectedLovedItemImageUrl(null);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const nextDetail = await fetchPokopiaPokemonDetail(pokopiaSlug);
        if (cancelled) return;
        setDetail(nextDetail);
      } catch (nextError) {
        if (cancelled) return;
        setDetail(null);
        setError(nextError instanceof Error ? nextError.message : "Failed to load Pokopia entry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pokopiaSlug]);

  if (loading) {
    return (
      <PageWrapper title="Pokopia Entry" scroll={false} headerLayout="inline">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading Pokopia entry…</Text>
        </View>
      </PageWrapper>
    );
  }

  if (!detail || error) {
    return (
      <PageWrapper title="Pokopia Entry" scroll={false} headerLayout="inline">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm font-semibold text-rose-200">Pokopia entry unavailable</Text>
          <Text className="mt-2 text-center text-sm text-slate-300">{error ?? "This Pokopia page could not be loaded."}</Text>
        </View>
      </PageWrapper>
    );
  }

  const subtitle = `#${String(detail.dexNumber).padStart(3, "0")} • ${detail.groupLabel === "Event Pokedex" ? "Pokopia Event Dex" : "Pokopia Dex"}`;

  return (
    <PageWrapper
      scroll
      title={detail.name}
      subtitle={subtitle}
      headerLayout="inline"
      rightActions={
        <View className="flex-row items-center">
          {game ? (
            <TouchableOpacity
              onPress={() => toggleCaught(game.id, speciesId)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: 12 }}
            >
              <MaterialCommunityIcons
                name={entry.caught ? "pokeball" : "pokeball"}
                size={21}
                color={entry.caught ? game.accentColor[0] : "#e5e7eb"}
              />
            </TouchableOpacity>
          ) : null}

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
      <View className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
        <View className="items-center">
          <ExpoImage
            source={{ uri: detail.imageUrl }}
            style={{ width: 180, height: 180 }}
            contentFit="contain"
            transition={150}
            cachePolicy="disk"
          />
        </View>

        <View className="mt-3 items-center">
          {detail.speciesLabel ? (
            <Text className="text-sm text-slate-300 text-center">{detail.speciesLabel}</Text>
          ) : null}

          {detail.badges.length ? (
            <View className="mt-3 flex-row flex-wrap justify-center">
              {detail.badges.map((badge) => (
                <View key={badge.href} className="mx-1 mb-2 rounded-2xl border border-amber-700/50 bg-amber-950/70 px-2 py-1 flex-row items-center">
                  <ExpoImage
                    source={{ uri: badge.iconUrl }}
                    style={{ width: 20, height: 20 }}
                    contentFit="contain"
                    transition={120}
                    cachePolicy="disk"
                  />
                  <Text className="ml-1.5 text-[11px] font-semibold text-amber-100">{badge.name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text className="mt-3 text-center text-sm leading-6 text-slate-100">{detail.description}</Text>

          {detail.measurements ? (
            <Text className="mt-3 text-xs text-slate-400">{detail.measurements}</Text>
          ) : null}
        </View>
      </View>

      <View className="mt-3" />

      <Section
        title={
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="information-outline" size={14} color="#9ca3af" />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pokopia Profile
            </Text>
          </View>
        }
      >
        {detail.teaches.length ? (
          <View className="mb-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: POKOPIA_COLORS.orange }}>Teaches</Text>
            <View className="flex-row flex-wrap">
              {detail.teaches.map((value) => (
                <View key={value} className="mr-2 mb-2 rounded-full bg-slate-900 border border-slate-700 px-3 py-1.5">
                  <Text className="text-[11px] font-semibold text-slate-100">{value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {detail.eventName ? (
          <View className="mb-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: POKOPIA_COLORS.orange }}>Event</Text>
            <View className="rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-3">
              <Text className="text-[12px] text-slate-100">{detail.eventName}</Text>
            </View>
          </View>
        ) : null}

        {detail.idealHabitats.length ? (
          <View className="mb-3">
            <Text className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: POKOPIA_COLORS.orange }}>Ideal Habitat</Text>
            <View className="flex-row flex-wrap">
              {detail.idealHabitats.map((value) => (
                <View key={value} className="mr-2 mb-2 rounded-full bg-slate-900 border border-slate-700 px-3 py-1.5">
                  <Text className="text-[11px] font-semibold text-slate-100">{value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {detail.favorites.length ? (
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: POKOPIA_COLORS.orange }}>Favorites</Text>
            <View className="flex-row flex-wrap">
              {(
                detail.favoriteLinks.length
                  ? detail.favoriteLinks
                  : detail.favorites.map((value) => ({ label: value, href: undefined as string | undefined }))
              ).map((entry) => (
                <PokopiaFavoriteChip
                  key={`${entry.label}-${entry.href ?? ""}`}
                  label={entry.label}
                  href={entry.href}
                  onPress={() => openFavoriteSheet(entry.label, entry.href)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </Section>

      {detail.habitats.length ? (
        <>
          <View className="mt-3" />
          <Section
            title={
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="map-marker-radius" size={14} color="#9ca3af" />
                <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Where to Find
                </Text>
              </View>
            }
          >
            {detail.habitats.map((habitat) => (
              <View key={habitat.slug} className="mb-3 rounded-2xl bg-slate-950/80 border border-slate-800 p-3">
                <View className="flex-row">
                  <ExpoImage
                    source={{ uri: habitat.imageUrl }}
                    style={{ width: 92, height: 70, borderRadius: 12 }}
                    contentFit="cover"
                    transition={120}
                    cachePolicy="disk"
                  />

                  <View className="ml-3 flex-1">
                    <Text className="text-[12px] text-slate-400">
                      {habitat.dexNumber ? `#${String(habitat.dexNumber).padStart(3, "0")}` : "Habitat"}
                    </Text>
                    <Text className="mt-0.5 text-[14px] font-semibold text-slate-100">{habitat.name}</Text>

                    {habitat.rarity ? (
                      <Text className="mt-1 text-[11px] text-amber-200">{habitat.rarity}</Text>
                    ) : null}

                    {habitat.times.length ? (
                      <Text className="mt-1 text-[11px] text-slate-300">Time: {habitat.times.join(" • ")}</Text>
                    ) : null}

                    {habitat.weather.length ? (
                      <Text className="mt-1 text-[11px] text-slate-400">Weather: {habitat.weather.join(" • ")}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Section>
        </>
      ) : null}

      {detail.lovedItemGroups.length ? (
        <>
          <View className="mt-3" />
          <Section
            title={
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="gift-outline" size={14} color="#9ca3af" />
                <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Loved Items
                </Text>
              </View>
            }
          >
            {detail.lovedItemGroups.map((group) => (
              <View key={group.label} className="mb-4">
                <Text className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: POKOPIA_COLORS.orange }}>
                  {group.label}
                </Text>

                <View className="flex-row flex-wrap -mx-1">
                  {group.items.map((item) => (
                    <View key={item.slug} className="w-1/3 px-1 mb-2">
                      <Pressable
                        onPress={() => openLovedItemSheet(item)}
                        className="rounded-2xl bg-slate-950/80 border border-slate-800 p-2 items-center min-h-[120px]"
                      >
                        <ExpoImage
                          source={{ uri: item.imageUrl }}
                          style={{ width: 40, height: 40 }}
                          contentFit="contain"
                          transition={120}
                          cachePolicy="disk"
                        />
                        <Text className="mt-2 text-[11px] font-semibold text-slate-100 text-center" numberOfLines={2}>
                          {item.name}
                        </Text>
                        {item.tags.length ? (
                          <Text className="mt-1 text-[10px] text-slate-400 text-center" numberOfLines={2}>
                            {item.tags.join(" • ")}
                          </Text>
                        ) : null}
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Section>
        </>
      ) : null}

      {detail.similarPokemon.length ? (
        <>
          <View className="mt-3" />
          <Section
            title={
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="account-group-outline" size={14} color="#9ca3af" />
                <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Similar Pokémon
                </Text>
              </View>
            }
          >
            {detail.similarPokemon.map((pokemon) => (
              <View key={pokemon.slug} className="mb-2 rounded-2xl bg-slate-950/80 border border-slate-800 p-3">
                <View className="flex-row items-center">
                  <ExpoImage
                    source={{ uri: pokemon.imageUrl }}
                    style={{ width: 48, height: 48 }}
                    contentFit="contain"
                    transition={120}
                    cachePolicy="disk"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-semibold text-slate-100">{pokemon.name}</Text>
                    {pokemon.tags.length ? (
                      <Text className="mt-1 text-[11px] text-slate-400">{pokemon.tags.join(" • ")}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Section>
        </>
      ) : null}

      <PokopiaFavoriteDetailSheet
        visible={favoriteSheetVisible}
        favoriteLabel={selectedFavoriteLabel}
        favoriteSlug={selectedFavoriteSlug}
        onRequestClose={closeFavoriteSheet}
      />

      <PokopiaItemDetailSheet
        visible={!!selectedLovedItemSlug}
        itemSlug={selectedLovedItemSlug}
        itemName={selectedLovedItemName}
        itemImageUrl={selectedLovedItemImageUrl}
        subtitle="Loved Item"
        collectKind="item"
        onRequestClose={closeLovedItemSheet}
      />
    </PageWrapper>
  );
}
