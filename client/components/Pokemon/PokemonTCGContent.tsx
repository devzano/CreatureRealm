import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Feather, Ionicons } from "@expo/vector-icons";

import PageWrapper from "@/components/PageWrapper";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import {
  fetchPokemonTCGCardsForSet,
  fetchPokemonTCGSets,
  filterPokemonTCGSets,
  getPokemonTCGSeries,
  type PokemonTCGCard,
  type PokemonTCGSet,
} from "@/lib/pokemon/tcg";
import { usePokemonTCGCollectionStore } from "@/store/pokemonTCGCollectionStore";

type CardOwnershipFilter = "all" | "owned" | "wanted" | "missing";

function normalize(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function compareCardNumber(a: string, b: string) {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function SearchBar(props: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { value, onChangeText, placeholder } = props;

  return (
    <View className="flex-row items-center rounded-2xl bg-slate-900 px-3 py-2 border border-slate-800">
      <Feather name="search" size={18} color="#9CA3AF" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        className="flex-1 ml-2 text-[13px] text-slate-100"
      />

      {value.trim().length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} className="ml-1 rounded-full p-1 bg-slate-800/80">
          <Feather name="x" size={14} color="#9CA3AF" />
        </Pressable>
      ) : null}
    </View>
  );
}

function FilterPill(props: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { label, active, onPress } = props;

  return (
    <Pressable
      onPress={onPress}
      className="mr-2 mb-2 px-3 py-2 rounded-full border"
      style={{
        backgroundColor: active ? "rgba(59,130,246,0.14)" : "rgba(15,23,42,0.72)",
        borderColor: active ? "rgba(59,130,246,0.45)" : "rgba(51,65,85,0.9)",
      }}
    >
      <Text className="text-[11px] font-semibold" style={{ color: active ? "#bfdbfe" : "#cbd5e1" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function PokemonTCGContent() {
  const [sets, setSets] = useState<PokemonTCGSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [setSearch, setSetSearch] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<PokemonTCGSet | null>(null);

  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [cardsBySet, setCardsBySet] = useState<Record<string, PokemonTCGCard[]>>({});
  const [cardSearch, setCardSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSupertype, setSelectedSupertype] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<CardOwnershipFilter>("all");
  const [detailCard, setDetailCard] = useState<PokemonTCGCard | null>(null);

  const entries = usePokemonTCGCollectionStore((state) => state.entries);
  const toggleOwned = usePokemonTCGCollectionStore((state) => state.toggleOwned);
  const toggleWanted = usePokemonTCGCollectionStore((state) => state.toggleWanted);
  const setCount = usePokemonTCGCollectionStore((state) => state.setCount);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setSetsLoading(true);
        setSetsError(null);
        const nextSets = await fetchPokemonTCGSets();
        if (cancelled) return;
        setSets(nextSets);
      } catch (error) {
        if (cancelled) return;
        setSetsError(error instanceof Error ? error.message : "Failed to load TCG sets.");
      } finally {
        if (!cancelled) setSetsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!selectedSet) return () => void 0;
    if (cardsBySet[selectedSet.id]) return () => void 0;

    (async () => {
      try {
        setCardsLoading(true);
        setCardsError(null);
        const nextCards = await fetchPokemonTCGCardsForSet(selectedSet.id);
        if (cancelled) return;
        setCardsBySet((prev) => ({ ...prev, [selectedSet.id]: nextCards }));
      } catch (error) {
        if (cancelled) return;
        setCardsError(error instanceof Error ? error.message : "Failed to load cards for this set.");
      } finally {
        if (!cancelled) setCardsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSet, cardsBySet]);

  const seriesOptions = useMemo(() => getPokemonTCGSeries(sets), [sets]);
  const filteredSets = useMemo(
    () => filterPokemonTCGSets(sets, { search: setSearch, series: selectedSeries }),
    [sets, setSearch, selectedSeries]
  );

  const currentCards = useMemo(() => {
    if (!selectedSet) return [];
    return cardsBySet[selectedSet.id] ?? [];
  }, [selectedSet, cardsBySet]);

  const typeOptions = useMemo(
    () => Array.from(new Set(currentCards.flatMap((card) => card.types ?? []).filter(Boolean))).sort(),
    [currentCards]
  );
  const supertypeOptions = useMemo(
    () => Array.from(new Set(currentCards.map((card) => card.supertype).filter(Boolean))).sort(),
    [currentCards]
  );
  const rarityOptions = useMemo(
    () => Array.from(new Set(currentCards.map((card) => card.rarity).filter(Boolean) as string[])).sort(),
    [currentCards]
  );

  const filteredCards = useMemo(() => {
    const query = normalize(cardSearch);

    return [...currentCards]
      .filter((card) => {
        if (selectedType && !(card.types ?? []).includes(selectedType)) return false;
        if (selectedSupertype && card.supertype !== selectedSupertype) return false;
        if (selectedRarity && card.rarity !== selectedRarity) return false;

        const entry = entries[normalize(card.id)] ?? { owned: false, wanted: false, count: 0 };
        if (ownershipFilter === "owned" && !entry.owned) return false;
        if (ownershipFilter === "wanted" && !entry.wanted) return false;
        if (ownershipFilter === "missing" && entry.owned) return false;

        if (!query) return true;

        const haystack = `${card.name} ${card.number} ${card.supertype} ${(card.types ?? []).join(" ")} ${card.rarity ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const entryA = entries[normalize(a.id)] ?? { owned: false, wanted: false, count: 0 };
        const entryB = entries[normalize(b.id)] ?? { owned: false, wanted: false, count: 0 };

        if (entryA.owned !== entryB.owned) return entryA.owned ? -1 : 1;
        if (entryA.wanted !== entryB.wanted) return entryA.wanted ? -1 : 1;
        return compareCardNumber(a.number, b.number);
      });
  }, [currentCards, selectedType, selectedSupertype, selectedRarity, ownershipFilter, cardSearch, entries]);

  const selectedEntry = detailCard ? entries[normalize(detailCard.id)] ?? { owned: false, wanted: false, count: 0 } : null;

  return (
    <PageWrapper
      title="Pokemon TCG"
      subtitle="Physical sets, cards, and collection tracking."
      headerLayout="inline"
      backgroundColor="#020617"
    >
      {!selectedSet ? (
        <View className="flex-1 px-2 pb-4">
          <View className="mt-4 mb-4">
            <View className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4">
              <Text className="text-[16px] font-semibold text-slate-50">Physical Set Browser</Text>
              <Text className="mt-1 text-[12px] leading-5 text-slate-400">
                Browse official TCG sets, then open a set to track owned and wanted cards.
              </Text>

              <View className="mt-3 flex-row flex-wrap -mx-1">
                <View className="w-1/2 px-1">
                  <View className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 items-center">
                    <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Sets</Text>
                    <Text className="mt-1 text-[18px] font-semibold text-slate-100">{sets.length}</Text>
                  </View>
                </View>
                <View className="w-1/2 px-1">
                  <View className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 items-center">
                    <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Series</Text>
                    <Text className="mt-1 text-[18px] font-semibold text-slate-100">{seriesOptions.length}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <SearchBar value={setSearch} onChangeText={setSetSearch} placeholder="Search TCG sets..." />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <FilterPill label="All Series" active={!selectedSeries} onPress={() => setSelectedSeries(null)} />
            {seriesOptions.map((series) => (
              <FilterPill
                key={series}
                label={series}
                active={selectedSeries === series}
                onPress={() => setSelectedSeries(selectedSeries === series ? null : series)}
              />
            ))}
          </ScrollView>

          {setsLoading ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading TCG sets…</Text>
            </View>
          ) : setsError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
              <Text className="text-sm font-semibold text-rose-200">TCG unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{setsError}</Text>
            </View>
          ) : !filteredSets.length ? (
            <View className="mt-6 items-center">
              <Text className="text-sm text-slate-400 text-center px-4">
                No TCG sets match this search.
              </Text>
            </View>
          ) : (
            filteredSets.map((set) => (
              <Pressable
                key={set.id}
                onPress={() => {
                  setSelectedSet(set);
                  setCardSearch("");
                  setSelectedType(null);
                  setSelectedSupertype(null);
                  setSelectedRarity(null);
                  setOwnershipFilter("all");
                }}
                className="rounded-3xl bg-slate-950/80 border border-slate-800 mb-3 overflow-hidden"
              >
                <View className="px-4 pt-4 pb-3">
                  <View className="flex-row items-center">
                    <View className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 items-center justify-center mr-3 overflow-hidden p-1">
                      <ExpoImage source={{ uri: set.images.symbol }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                    </View>

                    <View className="flex-1 pr-3">
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {set.series}
                      </Text>
                      <Text className="text-[15px] font-semibold text-slate-50 mt-0.5">{set.name}</Text>
                      <Text className="text-[11px] text-slate-400 mt-0.5">
                        {set.releaseDate} • {set.total} cards
                      </Text>
                    </View>

                    <View className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700">
                      <Text className="text-[10px] font-semibold text-slate-200">Open Set</Text>
                    </View>
                  </View>

                  <View className="mt-3 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden p-2">
                    <ExpoImage source={{ uri: set.images.logo }} style={{ width: "100%", height: 42 }} contentFit="contain" transition={120} />
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <View className="flex-1 px-2 pb-4">
          <View className="mt-4 mb-3 flex-row items-center justify-between">
            <Pressable
              onPress={() => setSelectedSet(null)}
              className="h-10 flex-row items-center rounded-full border border-cyan-400/45 bg-cyan-500/12 px-3"
            >
              <Ionicons name="arrow-back" size={16} color="#a5f3fc" />
              <Text className="ml-1.5 text-[12px] font-semibold text-cyan-100">Back to Sets</Text>
            </Pressable>

            <View className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700">
              <Text className="text-[10px] font-semibold text-slate-300">{currentCards.length} cards</Text>
            </View>
          </View>

          <View className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 mb-4">
            <View className="flex-row items-center">
              <View className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 items-center justify-center mr-3 overflow-hidden p-1">
                <ExpoImage source={{ uri: selectedSet.images.symbol }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{selectedSet.series}</Text>
                <Text className="text-[16px] font-semibold text-slate-50 mt-0.5">{selectedSet.name}</Text>
                <Text className="text-[12px] text-slate-400 mt-0.5">{selectedSet.releaseDate} • {selectedSet.total} cards</Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <SearchBar value={cardSearch} onChangeText={setCardSearch} placeholder="Search cards in this set..." />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <FilterPill label="All Cards" active={ownershipFilter === "all"} onPress={() => setOwnershipFilter("all")} />
            <FilterPill label="Owned" active={ownershipFilter === "owned"} onPress={() => setOwnershipFilter("owned")} />
            <FilterPill label="Wanted" active={ownershipFilter === "wanted"} onPress={() => setOwnershipFilter("wanted")} />
            <FilterPill label="Missing" active={ownershipFilter === "missing"} onPress={() => setOwnershipFilter("missing")} />
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <FilterPill label="All Types" active={!selectedType} onPress={() => setSelectedType(null)} />
            {typeOptions.map((type) => (
              <FilterPill key={type} label={type} active={selectedType === type} onPress={() => setSelectedType(selectedType === type ? null : type)} />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <FilterPill label="All Supertypes" active={!selectedSupertype} onPress={() => setSelectedSupertype(null)} />
            {supertypeOptions.map((supertype) => (
              <FilterPill
                key={supertype}
                label={supertype}
                active={selectedSupertype === supertype}
                onPress={() => setSelectedSupertype(selectedSupertype === supertype ? null : supertype)}
              />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <FilterPill label="All Rarities" active={!selectedRarity} onPress={() => setSelectedRarity(null)} />
            {rarityOptions.map((rarity) => (
              <FilterPill
                key={rarity}
                label={rarity}
                active={selectedRarity === rarity}
                onPress={() => setSelectedRarity(selectedRarity === rarity ? null : rarity)}
              />
            ))}
          </ScrollView>

          {cardsLoading && !currentCards.length ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading set cards…</Text>
            </View>
          ) : cardsError ? (
            <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
              <Text className="text-sm font-semibold text-rose-200">Cards unavailable</Text>
              <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{cardsError}</Text>
            </View>
          ) : !filteredCards.length ? (
            <View className="mt-6 items-center">
              <Text className="text-sm text-slate-400 text-center px-4">
                No cards match these filters.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-1">
              {filteredCards.map((card) => {
                const entry = entries[normalize(card.id)] ?? { owned: false, wanted: false, count: 0 };

                return (
                  <View key={card.id} className="w-1/2 px-1 mb-2">
                    <Pressable
                      onPress={() => setDetailCard(card)}
                      className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden"
                    >
                      <View className="px-3 pt-3">
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-row">
                            {entry.owned ? (
                              <View className="mr-1 rounded-full bg-[#6DDA5F] border border-white/70 px-1.5 py-1">
                                <Ionicons name="checkmark" size={11} color="#fff" />
                              </View>
                            ) : null}
                            {entry.wanted ? (
                              <View className="rounded-full bg-rose-500/20 border border-rose-400/50 px-1.5 py-1">
                                <Ionicons name="heart" size={11} color="#fda4af" />
                              </View>
                            ) : null}
                          </View>

                          <Text className="text-[10px] text-slate-400">#{card.number}</Text>
                        </View>

                        <View className="items-center">
                          <ExpoImage
                            source={{ uri: card.images.small }}
                            style={{ width: 112, height: 156 }}
                            contentFit="contain"
                            transition={120}
                          />
                        </View>

                        <Text numberOfLines={2} className="mt-2 text-[12px] font-semibold text-slate-100 text-center">
                          {card.name}
                        </Text>
                        <Text numberOfLines={1} className="mt-1 text-[10px] text-slate-400 text-center">
                          {card.rarity || card.supertype}
                        </Text>

                        <View className="flex-row items-center justify-between mt-3 mb-3">
                          <Pressable
                            onPress={() => toggleWanted(card.id)}
                            className="px-2.5 py-1.5 rounded-full border border-slate-700 bg-slate-900"
                          >
                            <Text className="text-[10px] font-semibold text-slate-200">
                              {entry.wanted ? "Wanted" : "Want"}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => toggleOwned(card.id)}
                            className="px-2.5 py-1.5 rounded-full border"
                            style={{
                              borderColor: entry.owned ? "rgba(109,218,95,0.55)" : "rgba(51,65,85,0.9)",
                              backgroundColor: entry.owned ? "rgba(109,218,95,0.14)" : "rgba(15,23,42,0.72)",
                            }}
                          >
                            <Text className="text-[10px] font-semibold" style={{ color: entry.owned ? "#d9f99d" : "#e2e8f0" }}>
                              {entry.owned ? `Owned ${entry.count > 1 ? `(${entry.count})` : ""}` : "Collect"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <BottomSheetModal
        visible={!!detailCard}
        onRequestClose={() => setDetailCard(null)}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        {detailCard ? (
          <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 32 }}>
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {detailCard.name}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">
                  {detailCard.set.name} • #{detailCard.number}
                </Text>
              </View>

              <Pressable
                onPress={() => setDetailCard(null)}
                className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>

            <View className="items-center mb-4">
              <ExpoImage source={{ uri: detailCard.images.large }} style={{ width: 260, height: 360 }} contentFit="contain" transition={120} />
            </View>

            <View className="flex-row flex-wrap mb-4">
              <View className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                <Text className="text-[11px] text-slate-200">{detailCard.supertype}</Text>
              </View>
              {(detailCard.types ?? []).map((type) => (
                <View key={type} className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                  <Text className="text-[11px] text-slate-200">{type}</Text>
                </View>
              ))}
              {(detailCard.subtypes ?? []).map((subtype) => (
                <View key={subtype} className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                  <Text className="text-[11px] text-slate-200">{subtype}</Text>
                </View>
              ))}
              {detailCard.rarity ? (
                <View className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700">
                  <Text className="text-[11px] text-slate-200">{detailCard.rarity}</Text>
                </View>
              ) : null}
            </View>

            <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-4 mb-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Collection</Text>

              <View className="flex-row mt-3">
                <Pressable
                  onPress={() => toggleOwned(detailCard.id)}
                  className="flex-1 mr-2 rounded-2xl border px-3 py-3 items-center"
                  style={{
                    borderColor: selectedEntry?.owned ? "rgba(109,218,95,0.55)" : "rgba(51,65,85,0.9)",
                    backgroundColor: selectedEntry?.owned ? "rgba(109,218,95,0.14)" : "rgba(15,23,42,0.72)",
                  }}
                >
                  <Text className="text-[12px] font-semibold" style={{ color: selectedEntry?.owned ? "#d9f99d" : "#e2e8f0" }}>
                    {selectedEntry?.owned ? "Owned" : "Mark Owned"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => toggleWanted(detailCard.id)}
                  className="flex-1 ml-2 rounded-2xl border px-3 py-3 items-center"
                  style={{
                    borderColor: selectedEntry?.wanted ? "rgba(251,113,133,0.55)" : "rgba(51,65,85,0.9)",
                    backgroundColor: selectedEntry?.wanted ? "rgba(251,113,133,0.14)" : "rgba(15,23,42,0.72)",
                  }}
                >
                  <Text className="text-[12px] font-semibold" style={{ color: selectedEntry?.wanted ? "#fecdd3" : "#e2e8f0" }}>
                    {selectedEntry?.wanted ? "Wanted" : "Mark Wanted"}
                  </Text>
                </Pressable>
              </View>

              <View className="flex-row items-center justify-center mt-3">
                <Pressable
                  onPress={() => setCount(detailCard.id, Math.max(0, (selectedEntry?.count ?? 0) - 1))}
                  className="h-10 w-10 rounded-full items-center justify-center border border-slate-700 bg-slate-900"
                >
                  <Feather name="minus" size={16} color="#e2e8f0" />
                </Pressable>

                <View className="mx-4 items-center">
                  <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Owned Count</Text>
                  <Text className="text-[20px] font-semibold text-slate-50 mt-1">{selectedEntry?.count ?? 0}</Text>
                </View>

                <Pressable
                  onPress={() => setCount(detailCard.id, (selectedEntry?.count ?? 0) + 1)}
                  className="h-10 w-10 rounded-full items-center justify-center border border-slate-700 bg-slate-900"
                >
                  <Feather name="plus" size={16} color="#e2e8f0" />
                </Pressable>
              </View>
            </View>

            <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Card Info</Text>
              <Text className="text-[13px] text-slate-200 mt-3">Set: {detailCard.set.name}</Text>
              <Text className="text-[13px] text-slate-200 mt-2">Series: {detailCard.set.series}</Text>
              <Text className="text-[13px] text-slate-200 mt-2">Number: {detailCard.number}</Text>
              {detailCard.hp ? <Text className="text-[13px] text-slate-200 mt-2">HP: {detailCard.hp}</Text> : null}
              {detailCard.artist ? <Text className="text-[13px] text-slate-200 mt-2">Artist: {detailCard.artist}</Text> : null}
            </View>
          </ScrollView>
        ) : null}
      </BottomSheetModal>
    </PageWrapper>
  );
}
