import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type GestureResponderEvent } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import PageWrapper from "@/components/PageWrapper";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import PokemonTCGDigitalContent from "@/components/Pokemon/PokemonTCGDigitalContent";
import {
  fetchPokemonTCGCard,
  fetchPokemonTCGCardsForSet,
  fetchPokemonTCGSets,
  filterPokemonTCGSets,
  getPokemonTCGSeries,
  type PokemonTCGCard,
  type PokemonTCGSet,
} from "@/lib/pokemon/tcg";
import { usePokemonTCGCollectionStore, type PokemonTCGCollectionEntry } from "@/store/pokemonTCGCollectionStore";
import {
  usePokemonTCGPreferencesStore,
  type PokemonTCGCardFilterPreset,
} from "@/store/pokemonTCGPreferencesStore";

type CardOwnershipFilter = "all" | "owned" | "wanted" | "missing" | "duplicates";
type TCGMode = "physical" | "digital";

type CardSection = {
  key: string;
  title: string;
  subtitle: string;
  cards: PokemonTCGCard[];
  accent: string;
};

type SetCollectionStats = {
  owned: number;
  wanted: number;
  duplicates: number;
  tracked: number;
  completionPercent: number;
};

type RarityBreakdownRow = {
  rarity: string;
  owned: number;
  total: number;
};

const DEFAULT_ENTRY: PokemonTCGCollectionEntry = {
  owned: false,
  wanted: false,
  count: 0,
  digitalCount: 0,
  notes: "",
};

function normalize(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function compareCardNumber(a: string, b: string) {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getEntry(entries: Record<string, PokemonTCGCollectionEntry>, cardId: string) {
  return entries[normalize(cardId)] ?? DEFAULT_ENTRY;
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
  tone?: "blue" | "green" | "rose" | "amber";
  compact?: boolean;
}) {
  const { label, active, onPress, tone = "blue", compact = false } = props;

  const activeColors =
    tone === "green"
      ? { backgroundColor: "rgba(109,218,95,0.14)", borderColor: "rgba(109,218,95,0.45)", color: "#d9f99d" }
      : tone === "rose"
      ? { backgroundColor: "rgba(251,113,133,0.14)", borderColor: "rgba(251,113,133,0.45)", color: "#fecdd3" }
      : tone === "amber"
      ? { backgroundColor: "rgba(245,158,11,0.14)", borderColor: "rgba(245,158,11,0.45)", color: "#fde68a" }
      : { backgroundColor: "rgba(59,130,246,0.14)", borderColor: "rgba(59,130,246,0.45)", color: "#bfdbfe" };

  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 mb-2 rounded-full border ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}
      style={{
        backgroundColor: active ? activeColors.backgroundColor : "rgba(15,23,42,0.72)",
        borderColor: active ? activeColors.borderColor : "rgba(51,65,85,0.9)",
      }}
    >
      <Text className={`${compact ? "text-[10px]" : "text-[11px]"} font-semibold`} style={{ color: active ? activeColors.color : "#cbd5e1" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatCard(props: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="rounded-2xl border bg-slate-900 px-3 py-3 items-center" style={{ borderColor: props.accent }}>
        <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{props.label}</Text>
        <Text className="mt-1 text-[18px] font-semibold text-slate-100">{props.value}</Text>
      </View>
    </View>
  );
}

function ActionButton(props: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  tone?: "green" | "rose" | "blue" | "amber";
  onPress: (event: GestureResponderEvent) => void;
  compact?: boolean;
}) {
  const { label, icon, active = false, tone = "blue", onPress, compact = false } = props;

  const activeStyle =
    tone === "green"
      ? { backgroundColor: "rgba(109,218,95,0.14)", borderColor: "rgba(109,218,95,0.5)", color: "#d9f99d", icon: "#d9f99d" }
      : tone === "rose"
      ? { backgroundColor: "rgba(251,113,133,0.14)", borderColor: "rgba(251,113,133,0.5)", color: "#fecdd3", icon: "#fda4af" }
      : tone === "amber"
      ? { backgroundColor: "rgba(245,158,11,0.14)", borderColor: "rgba(245,158,11,0.5)", color: "#fde68a", icon: "#fbbf24" }
      : { backgroundColor: "rgba(59,130,246,0.14)", borderColor: "rgba(59,130,246,0.5)", color: "#bfdbfe", icon: "#93c5fd" };

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border flex-row items-center justify-center ${compact ? "px-2.5 py-2" : "px-3 py-3"}`}
      style={{
        backgroundColor: active ? activeStyle.backgroundColor : "rgba(15,23,42,0.72)",
        borderColor: active ? activeStyle.borderColor : "rgba(51,65,85,0.9)",
      }}
    >
      <Ionicons name={icon} size={compact ? 12 : 14} color={active ? activeStyle.icon : "#e2e8f0"} />
      <Text
        className={`${compact ? "text-[10px]" : "text-[12px]"} font-semibold ml-1.5`}
        style={{ color: active ? activeStyle.color : "#e2e8f0" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function buildPresetName(params: {
  ownership: CardOwnershipFilter;
  selectedType: string | null;
  selectedSupertype: string | null;
  selectedRarity: string | null;
  search: string;
}) {
  const parts: string[] = [];

  if (params.ownership !== "all") {
    parts.push(
      params.ownership === "duplicates"
        ? "Duplicates"
        : params.ownership.charAt(0).toUpperCase() + params.ownership.slice(1)
    );
  }
  if (params.selectedType) parts.push(params.selectedType);
  if (params.selectedSupertype) parts.push(params.selectedSupertype);
  if (params.selectedRarity) parts.push(params.selectedRarity);
  if (params.search.trim()) parts.push(`"${params.search.trim()}"`);

  return parts.length ? parts.slice(0, 3).join(" • ") : "My Binder Filter";
}

function getSectionedCards(cards: PokemonTCGCard[], entries: Record<string, PokemonTCGCollectionEntry>, ownershipFilter: CardOwnershipFilter) {
  const duplicates = cards.filter((card) => getEntry(entries, card.id).count > 1);
  const collected = cards.filter((card) => {
    const entry = getEntry(entries, card.id);
    return entry.owned && entry.count <= 1;
  });
  const wanted = cards.filter((card) => {
    const entry = getEntry(entries, card.id);
    return !entry.owned && entry.wanted;
  });
  const need = cards.filter((card) => {
    const entry = getEntry(entries, card.id);
    return !entry.owned && !entry.wanted;
  });

  const sections: CardSection[] = [];

  if (ownershipFilter === "duplicates") {
    if (duplicates.length) {
      sections.push({
        key: "duplicates",
        title: "Duplicates",
        subtitle: "Cards you own more than once.",
        cards: duplicates,
        accent: "#f59e0b",
      });
    }
    return sections;
  }

  if (ownershipFilter === "owned") {
    if (duplicates.length) {
      sections.push({ key: "duplicates", title: "Duplicates", subtitle: "Extra copies in your binder.", cards: duplicates, accent: "#f59e0b" });
    }
    if (collected.length) {
      sections.push({ key: "collected", title: "Collected", subtitle: "Owned single copies.", cards: collected, accent: "#6DDA5F" });
    }
    return sections;
  }

  if (ownershipFilter === "wanted") {
    if (wanted.length) {
      sections.push({ key: "wanted", title: "Wanted", subtitle: "Cards you marked to chase.", cards: wanted, accent: "#fb7185" });
    }
    return sections;
  }

  if (ownershipFilter === "missing") {
    if (need.length) {
      sections.push({ key: "need", title: "Need", subtitle: "Still missing from this set.", cards: need, accent: "#60a5fa" });
    }
    return sections;
  }

  if (duplicates.length) {
    sections.push({ key: "duplicates", title: "Duplicates", subtitle: "Extra copies in your binder.", cards: duplicates, accent: "#f59e0b" });
  }
  if (collected.length) {
    sections.push({ key: "collected", title: "Collected", subtitle: "Already in your collection.", cards: collected, accent: "#6DDA5F" });
  }
  if (wanted.length) {
    sections.push({ key: "wanted", title: "Wanted", subtitle: "Cards marked for later.", cards: wanted, accent: "#fb7185" });
  }
  if (need.length) {
    sections.push({ key: "need", title: "Need", subtitle: "Still missing from this set.", cards: need, accent: "#60a5fa" });
  }

  return sections;
}

function getSetCollectionStats(
  entries: Record<string, PokemonTCGCollectionEntry>,
  setId: string,
  totalCards: number
): SetCollectionStats {
  const prefix = `${normalize(setId)}-`;

  let owned = 0;
  let wanted = 0;
  let duplicates = 0;

  for (const [cardId, entry] of Object.entries(entries)) {
    if (!cardId.startsWith(prefix)) continue;
    if (entry.owned) owned += 1;
    if (!entry.owned && entry.wanted) wanted += 1;
    if (entry.count > 1) duplicates += 1;
  }

  return {
    owned,
    wanted,
    duplicates,
    tracked: owned + wanted,
    completionPercent: totalCards > 0 ? Math.min(100, Math.round((owned / totalCards) * 100)) : 0,
  };
}

function getRarityBreakdown(cards: PokemonTCGCard[], entries: Record<string, PokemonTCGCollectionEntry>): RarityBreakdownRow[] {
  const counts = new Map<string, RarityBreakdownRow>();

  for (const card of cards) {
    const rarity = card.rarity?.trim() || "Unspecified";
    const current = counts.get(rarity) ?? { rarity, owned: 0, total: 0 };
    current.total += 1;
    if (getEntry(entries, card.id).owned) current.owned += 1;
    counts.set(rarity, current);
  }

  return [...counts.values()].sort((a, b) => {
    if (b.owned !== a.owned) return b.owned - a.owned;
    if (b.total !== a.total) return b.total - a.total;
    return a.rarity.localeCompare(b.rarity);
  });
}

export default function PokemonTCGContent() {
  const [mode, setMode] = useState<TCGMode>("physical");
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLoadError, setDetailLoadError] = useState<string | null>(null);

  const entries = usePokemonTCGCollectionStore((state) => state.entries);
  const toggleOwned = usePokemonTCGCollectionStore((state) => state.toggleOwned);
  const toggleWanted = usePokemonTCGCollectionStore((state) => state.toggleWanted);
  const setCount = usePokemonTCGCollectionStore((state) => state.setCount);
  const setNotes = usePokemonTCGCollectionStore((state) => state.setNotes);

  const savedCardFilters = usePokemonTCGPreferencesStore((state) => state.savedCardFilters);
  const saveCardFilter = usePokemonTCGPreferencesStore((state) => state.saveCardFilter);
  const deleteCardFilter = usePokemonTCGPreferencesStore((state) => state.deleteCardFilter);

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

  const setCollectionStats = useMemo(() => {
    const statsMap: Record<string, SetCollectionStats> = {};

    for (const set of sets) {
      statsMap[set.id] = getSetCollectionStats(entries, set.id, set.total);
    }

    return statsMap;
  }, [sets, entries]);

  const currentCards = useMemo(() => {
    if (!selectedSet) return [];
    return cardsBySet[selectedSet.id] ?? [];
  }, [selectedSet, cardsBySet]);

  const currentSetStats = useMemo(() => {
    const owned = currentCards.filter((card) => getEntry(entries, card.id).owned).length;
    const wanted = currentCards.filter((card) => {
      const entry = getEntry(entries, card.id);
      return !entry.owned && entry.wanted;
    }).length;
    const duplicates = currentCards.filter((card) => getEntry(entries, card.id).count > 1).length;
    const missing = Math.max(currentCards.length - owned, 0);

    return { owned, wanted, duplicates, missing };
  }, [currentCards, entries]);

  const rarityBreakdown = useMemo(() => getRarityBreakdown(currentCards, entries), [currentCards, entries]);

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

        const entry = getEntry(entries, card.id);
        if (ownershipFilter === "owned" && !entry.owned) return false;
        if (ownershipFilter === "wanted" && (!entry.wanted || entry.owned)) return false;
        if (ownershipFilter === "missing" && entry.owned) return false;
        if (ownershipFilter === "duplicates" && entry.count <= 1) return false;

        if (!query) return true;

        const haystack = `${card.name} ${card.number} ${card.supertype} ${(card.types ?? []).join(" ")} ${card.rarity ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const entryA = getEntry(entries, a.id);
        const entryB = getEntry(entries, b.id);

        if ((entryA.count > 1) !== (entryB.count > 1)) return entryA.count > 1 ? -1 : 1;
        if (entryA.owned !== entryB.owned) return entryA.owned ? -1 : 1;
        if (entryA.wanted !== entryB.wanted) return entryA.wanted ? -1 : 1;
        return compareCardNumber(a.number, b.number);
      });
  }, [currentCards, selectedType, selectedSupertype, selectedRarity, ownershipFilter, cardSearch, entries]);

  const cardSections = useMemo(
    () => getSectionedCards(filteredCards, entries, ownershipFilter),
    [filteredCards, entries, ownershipFilter]
  );

  const selectedEntry = detailCard ? getEntry(entries, detailCard.id) : DEFAULT_ENTRY;

  const selectedMarketSummary = useMemo(() => {
    if (!detailCard?.tcgplayer?.prices) return null;

    const priceEntries = Object.entries(detailCard.tcgplayer.prices);
    for (const [finish, price] of priceEntries) {
      if (price?.market != null || price?.mid != null || price?.low != null) {
        return {
          finish,
          market: price.market ?? null,
          mid: price.mid ?? null,
          low: price.low ?? null,
          updatedAt: detailCard.tcgplayer.updatedAt ?? null,
        };
      }
    }

    return null;
  }, [detailCard]);

  const selectedCardmarketSummary = useMemo(() => {
    const prices = detailCard?.cardmarket?.prices;
    if (!prices) return null;

    return {
      averageSellPrice: prices.averageSellPrice ?? null,
      lowPrice: prices.lowPrice ?? null,
      trendPrice: prices.trendPrice ?? null,
      avg7: prices.avg7 ?? null,
      updatedAt: detailCard?.cardmarket?.updatedAt ?? null,
    };
  }, [detailCard]);

  const activeFilterCount = useMemo(() => {
    return [
      ownershipFilter !== "all",
      !!selectedType,
      !!selectedSupertype,
      !!selectedRarity,
      !!cardSearch.trim(),
    ].filter(Boolean).length;
  }, [ownershipFilter, selectedType, selectedSupertype, selectedRarity, cardSearch]);

  const applyPreset = (preset: PokemonTCGCardFilterPreset) => {
    setCardSearch(preset.search);
    setOwnershipFilter(preset.ownership);
    setSelectedType(preset.type);
    setSelectedSupertype(preset.supertype);
    setSelectedRarity(preset.rarity);
  };

  const saveCurrentPreset = () => {
    const baseName = buildPresetName({
      ownership: ownershipFilter,
      selectedType,
      selectedSupertype,
      selectedRarity,
      search: cardSearch,
    });
    const presetId = normalize(`${ownershipFilter}-${selectedType ?? ""}-${selectedSupertype ?? ""}-${selectedRarity ?? ""}-${cardSearch}`);

    saveCardFilter({
      id: presetId || `preset-${Date.now()}`,
      name: baseName,
      search: cardSearch.trim(),
      ownership: ownershipFilter,
      type: selectedType,
      supertype: selectedSupertype,
      rarity: selectedRarity,
    });
  };

  const clearCardFilters = () => {
    setCardSearch("");
    setOwnershipFilter("all");
    setSelectedType(null);
    setSelectedSupertype(null);
    setSelectedRarity(null);
  };

  const openExternalUrl = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn("[PokemonTCG] Failed to open URL:", error);
    }
  };

  const openCardById = async (cardId: string) => {
    try {
      setDetailLoading(true);
      setDetailLoadError(null);
      const nextCard = await fetchPokemonTCGCard(cardId);
      setDetailCard(nextCard);
    } catch (error) {
      setDetailLoadError(error instanceof Error ? error.message : "Failed to load card detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Pokemon TCG"
      subtitle="Physical sets, cards, and collection tracking."
      headerLayout="inline"
      backgroundColor="#020617"
    >
      <View className="mt-4 mb-2 px-2">
        <View className="flex-row items-center rounded-full bg-slate-900/80 border border-slate-700 p-1">
          <Pressable
            onPress={() => setMode("physical")}
            className={`flex-1 rounded-full px-3 py-2 items-center justify-center ${mode === "physical" ? "bg-slate-800" : ""}`}
          >
            <Text className={`text-[11px] font-semibold ${mode === "physical" ? "text-slate-50" : "text-slate-400"}`}>
              Physical Sets
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("digital")}
            className={`flex-1 rounded-full px-3 py-2 items-center justify-center ${mode === "digital" ? "bg-slate-800" : ""}`}
          >
            <Text className={`text-[11px] font-semibold ${mode === "digital" ? "text-slate-50" : "text-slate-400"}`}>
              Digital Packs
            </Text>
          </Pressable>
        </View>
      </View>

      {detailLoadError ? (
        <View className="mx-2 mb-3 rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Card unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{detailLoadError}</Text>
        </View>
      ) : null}

      {mode === "physical" ? (!selectedSet ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 30 }}>
          <View className="mb-4">
            <View className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4">
              <Text className="text-[16px] font-semibold text-slate-50">Physical Set Browser</Text>
              <Text className="mt-1 text-[12px] leading-5 text-slate-400">
                Browse official TCG sets, then open a set to track owned, wanted, duplicates, and missing cards.
              </Text>

              <View className="mt-3 flex-row flex-wrap -mx-1">
                <StatCard label="Sets" value={sets.length} accent="rgba(51,65,85,0.9)" />
                <StatCard label="Series" value={seriesOptions.length} accent="rgba(51,65,85,0.9)" />
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
              <Text className="text-sm text-slate-400 text-center px-4">No TCG sets match this search.</Text>
            </View>
          ) : (
            filteredSets.map((set) => (
              (() => {
                const stats = setCollectionStats[set.id] ?? getSetCollectionStats(entries, set.id, set.total);

                return (
                  <Pressable
                    key={set.id}
                    onPress={() => {
                      setSelectedSet(set);
                      clearCardFilters();
                    }}
                    className="rounded-3xl bg-slate-950/80 border border-slate-800 mb-3 overflow-hidden"
                  >
                    <View className="px-4 pt-4 pb-3">
                  <View className="flex-row items-center">
                    <View className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 items-center justify-center mr-3 overflow-hidden p-1">
                      <ExpoImage source={{ uri: set.images.symbol }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                    </View>

                    <View className="flex-1 pr-3">
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{set.series}</Text>
                      <Text className="text-[15px] font-semibold text-slate-50 mt-0.5">{set.name}</Text>
                      <Text className="text-[11px] text-slate-400 mt-0.5">{set.releaseDate} • {set.total} cards</Text>
                    </View>

                    <View className="px-3 py-1.5 rounded-full bg-amber-500/12 border border-amber-400/35">
                      <Text className="text-[10px] font-semibold text-amber-100">Open Set</Text>
                    </View>
                  </View>

                  <View className="mt-3 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden p-2">
                    <ExpoImage source={{ uri: set.images.logo }} style={{ width: "100%", height: 42 }} contentFit="contain" transition={120} />
                  </View>
                    </View>

                    <View className="px-4 pb-4">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Set Completion</Text>
                        <Text className="text-[11px] font-semibold text-slate-200">{stats.owned}/{set.total}</Text>
                      </View>

                      <View className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <View
                          style={{
                            width: `${stats.completionPercent}%`,
                            height: "100%",
                            backgroundColor: "#6DDA5F",
                          }}
                        />
                      </View>

                      <View className="flex-row flex-wrap mt-2 -mr-2">
                        <View className="mr-2 mt-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1">
                          <Text className="text-[10px] text-slate-300">{stats.completionPercent}% owned</Text>
                        </View>
                        {stats.wanted ? (
                          <View className="mr-2 mt-2 rounded-full border border-rose-400/35 bg-rose-500/10 px-2.5 py-1">
                            <Text className="text-[10px] text-rose-100">{stats.wanted} wanted</Text>
                          </View>
                        ) : null}
                        {stats.duplicates ? (
                          <View className="mr-2 mt-2 rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-1">
                            <Text className="text-[10px] text-amber-100">{stats.duplicates} duplicates</Text>
                          </View>
                        ) : null}
                        {!stats.tracked ? (
                          <View className="mr-2 mt-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1">
                            <Text className="text-[10px] text-slate-400">Untracked</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })()
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 34 }}>
          <View className="mb-3 flex-row items-center justify-between">
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

            <View className="mt-4 flex-row flex-wrap -mx-1">
              <StatCard label="Owned" value={currentSetStats.owned} accent="rgba(109,218,95,0.45)" />
              <StatCard label="Wanted" value={currentSetStats.wanted} accent="rgba(251,113,133,0.45)" />
              <StatCard label="Duplicates" value={currentSetStats.duplicates} accent="rgba(245,158,11,0.45)" />
              <StatCard label="Missing" value={currentSetStats.missing} accent="rgba(59,130,246,0.45)" />
            </View>

            <View className="mt-2">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Completion</Text>
                <Text className="text-[11px] font-semibold text-slate-200">
                  {currentCards.length ? Math.round((currentSetStats.owned / currentCards.length) * 100) : 0}%
                </Text>
              </View>
              <View className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <View
                  style={{
                    width: `${currentCards.length ? Math.round((currentSetStats.owned / currentCards.length) * 100) : 0}%`,
                    height: "100%",
                    backgroundColor: "#6DDA5F",
                  }}
                />
              </View>
            </View>
          </View>

          {rarityBreakdown.length ? (
            <View className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rarity Breakdown</Text>
                <Text className="text-[10px] text-slate-500">Owned / Total</Text>
              </View>

              <View className="mt-3">
                {rarityBreakdown.map((row) => {
                  const percent = row.total ? Math.round((row.owned / row.total) * 100) : 0;

                  return (
                    <View key={row.rarity} className="mb-3 last:mb-0">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-[12px] font-medium text-slate-200 flex-1 pr-3">{row.rarity}</Text>
                        <Text className="text-[11px] text-slate-400">{row.owned}/{row.total}</Text>
                      </View>
                      <View className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <View
                          style={{
                            width: `${percent}%`,
                            height: "100%",
                            backgroundColor: percent === 100 ? "#6DDA5F" : percent >= 50 ? "#60a5fa" : "#f59e0b",
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View className="mb-4">
            <SearchBar value={cardSearch} onChangeText={setCardSearch} placeholder="Search cards in this set..." />
          </View>

          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Filters {activeFilterCount ? `(${activeFilterCount})` : ""}
            </Text>
            <View className="flex-row items-center">
              <Pressable onPress={saveCurrentPreset} className="mr-2 px-3 py-1.5 rounded-full border border-amber-400/35 bg-amber-500/10">
                <Text className="text-[10px] font-semibold text-amber-100">Save Binder Filter</Text>
              </Pressable>
              <Pressable onPress={clearCardFilters} className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900">
                <Text className="text-[10px] font-semibold text-slate-200">Reset</Text>
              </Pressable>
            </View>
          </View>

          {savedCardFilters.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              {savedCardFilters.map((preset) => {
                const isActive =
                  preset.search === cardSearch.trim() &&
                  preset.ownership === ownershipFilter &&
                  preset.type === selectedType &&
                  preset.supertype === selectedSupertype &&
                  preset.rarity === selectedRarity;

                return (
                  <View key={preset.id} className="mr-2 mb-2 flex-row items-center rounded-full border border-slate-700 bg-slate-900/90">
                    <Pressable onPress={() => applyPreset(preset)} className="pl-3 pr-2 py-2">
                      <Text className="text-[10px] font-semibold" style={{ color: isActive ? "#fde68a" : "#cbd5e1" }}>
                        {preset.name}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => deleteCardFilter(preset.id)} className="pr-2 py-2">
                      <Feather name="x" size={12} color="#94a3b8" />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <FilterPill label="All Cards" active={ownershipFilter === "all"} onPress={() => setOwnershipFilter("all")} />
            <FilterPill label="Collected" active={ownershipFilter === "owned"} onPress={() => setOwnershipFilter("owned")} tone="green" />
            <FilterPill label="Wanted" active={ownershipFilter === "wanted"} onPress={() => setOwnershipFilter("wanted")} tone="rose" />
            <FilterPill label="Need" active={ownershipFilter === "missing"} onPress={() => setOwnershipFilter("missing")} />
            <FilterPill label="Duplicates" active={ownershipFilter === "duplicates"} onPress={() => setOwnershipFilter("duplicates")} tone="amber" />
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <FilterPill label="All Types" active={!selectedType} onPress={() => setSelectedType(null)} compact />
            {typeOptions.map((type) => (
              <FilterPill key={type} label={type} active={selectedType === type} onPress={() => setSelectedType(selectedType === type ? null : type)} compact />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <FilterPill label="All Supertypes" active={!selectedSupertype} onPress={() => setSelectedSupertype(null)} compact />
            {supertypeOptions.map((supertype) => (
              <FilterPill
                key={supertype}
                label={supertype}
                active={selectedSupertype === supertype}
                onPress={() => setSelectedSupertype(selectedSupertype === supertype ? null : supertype)}
                compact
              />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <FilterPill label="All Rarities" active={!selectedRarity} onPress={() => setSelectedRarity(null)} compact />
            {rarityOptions.map((rarity) => (
              <FilterPill
                key={rarity}
                label={rarity}
                active={selectedRarity === rarity}
                onPress={() => setSelectedRarity(selectedRarity === rarity ? null : rarity)}
                compact
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
          ) : !cardSections.length ? (
            <View className="mt-6 items-center">
              <Text className="text-sm text-slate-400 text-center px-4">No cards match these filters.</Text>
            </View>
          ) : (
            cardSections.map((section) => (
              <View key={section.key} className="mb-4">
                <View className="flex-row items-center justify-between mb-2 px-1">
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="w-1.5 h-5 rounded-full mr-2" style={{ backgroundColor: section.accent }} />
                    <View className="flex-1">
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{section.title}</Text>
                      <Text className="text-[11px] text-slate-500 mt-0.5">{section.subtitle}</Text>
                    </View>
                  </View>

                  <View className="px-2.5 py-1 rounded-full border border-slate-700 bg-slate-900">
                    <Text className="text-[10px] font-semibold text-slate-300">{section.cards.length}</Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap -mx-1">
                  {section.cards.map((card) => {
                    const entry = getEntry(entries, card.id);

                    return (
                      <View key={card.id} className="w-1/3 px-1 mb-2">
                        <Pressable
                          onPress={() => setDetailCard(card)}
                          className="rounded-[22px] bg-slate-950 border border-slate-800 overflow-hidden"
                        >
                          <View className="px-2.5 pt-2.5 pb-2">
                            <View className="flex-row items-start justify-between mb-1.5">
                              <View className="flex-row">
                                {entry.count > 1 ? (
                                  <View className="mr-1 rounded-full bg-amber-500/18 border border-amber-400/40 px-1.5 py-1">
                                    <Text className="text-[9px] font-bold text-amber-100">x{entry.count}</Text>
                                  </View>
                                ) : null}
                                {entry.digitalCount > 0 ? (
                                  <View className="mr-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/45 px-1.5 py-1">
                                    <Text className="text-[9px] font-bold text-fuchsia-100">D{entry.digitalCount}</Text>
                                  </View>
                                ) : null}
                                {entry.owned ? (
                                  <View className="mr-1 rounded-full bg-[#6DDA5F] border border-white/70 px-1.5 py-1">
                                    <Ionicons name="checkmark" size={10} color="#fff" />
                                  </View>
                                ) : null}
                                {entry.wanted ? (
                                  <View className="rounded-full bg-rose-500/20 border border-rose-400/50 px-1.5 py-1">
                                    <Ionicons name="heart" size={10} color="#fda4af" />
                                  </View>
                                ) : null}
                              </View>

                              <Text className="text-[9px] text-slate-500">#{card.number}</Text>
                            </View>

                            <View className="items-center">
                              <ExpoImage source={{ uri: card.images.small }} style={{ width: 92, height: 128 }} contentFit="contain" transition={120} />
                            </View>

                            <Text numberOfLines={2} className="mt-1.5 text-[11px] font-semibold text-slate-100 text-center min-h-[30px]">
                              {card.name}
                            </Text>
                            <Text numberOfLines={1} className="mt-0.5 text-[9px] text-slate-500 text-center">
                              {card.rarity || card.supertype}
                            </Text>

                            <View className="mt-2">
                              <View className="flex-row">
                                <View className="flex-1 mr-1">
                                  <ActionButton
                                    label={entry.wanted ? "Wanted" : "Want"}
                                    icon="heart"
                                    tone="rose"
                                    active={entry.wanted}
                                    compact
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      toggleWanted(card.id);
                                    }}
                                  />
                                </View>
                                <View className="flex-1 ml-1">
                                  <ActionButton
                                    label={entry.owned ? "Owned" : "Collect"}
                                    icon="checkmark-circle"
                                    tone="green"
                                    active={entry.owned}
                                    compact
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      toggleOwned(card.id);
                                    }}
                                  />
                                </View>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )) : (
        <PokemonTCGDigitalContent onOpenPhysicalCard={(cardId) => void openCardById(cardId)} />
      )}

      <BottomSheetModal
        visible={!!detailCard || detailLoading}
        onRequestClose={() => {
          setDetailCard(null);
          setDetailLoading(false);
        }}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        {detailLoading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator />
            <Text className="mt-3 text-sm text-slate-300">Loading card detail…</Text>
          </View>
        ) : detailCard ? (
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
                <View className="flex-1 mr-2">
                  <ActionButton
                    label={selectedEntry.owned ? "Owned" : "Mark Owned"}
                    icon="checkmark-circle"
                    active={selectedEntry.owned}
                    tone="green"
                    onPress={() => toggleOwned(detailCard.id)}
                  />
                </View>

                <View className="flex-1 ml-2">
                  <ActionButton
                    label={selectedEntry.wanted ? "Wanted" : "Mark Wanted"}
                    icon="heart"
                    active={selectedEntry.wanted}
                    tone="rose"
                    onPress={() => toggleWanted(detailCard.id)}
                  />
                </View>
              </View>

              <View className="flex-row items-center justify-center mt-3">
                <Pressable
                  onPress={() => setCount(detailCard.id, Math.max(0, selectedEntry.count - 1))}
                  className="h-10 w-10 rounded-full items-center justify-center border border-slate-700 bg-slate-900"
                >
                  <Feather name="minus" size={16} color="#e2e8f0" />
                </Pressable>

                <View className="mx-4 items-center">
                  <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Owned Count</Text>
                  <Text className="text-[20px] font-semibold text-slate-50 mt-1">{selectedEntry.count}</Text>
                </View>

                <Pressable
                  onPress={() => setCount(detailCard.id, selectedEntry.count + 1)}
                  className="h-10 w-10 rounded-full items-center justify-center border border-slate-700 bg-slate-900"
                >
                  <Feather name="plus" size={16} color="#e2e8f0" />
                </Pressable>
              </View>

              {selectedEntry.digitalCount > 0 ? (
                <View className="mt-4 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-3">
                  <Text className="text-[10px] uppercase tracking-[0.18em] text-fuchsia-200">Digital Binder</Text>
                  <Text className="mt-1 text-[13px] text-slate-100">
                    You have <Text className="font-semibold">{selectedEntry.digitalCount}</Text> digital cop{selectedEntry.digitalCount === 1 ? "y" : "ies"} of this card from pack openings.
                  </Text>
                </View>
              ) : null}

              <View className="mt-4">
                <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">Notes</Text>
                <TextInput
                  value={selectedEntry.notes ?? ""}
                  onChangeText={(value) => setNotes(detailCard.id, value)}
                  placeholder="Add binder notes, trade status, condition, etc."
                  placeholderTextColor="#64748b"
                  multiline
                  textAlignVertical="top"
                  className="min-h-[92px] rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 text-[12px] text-slate-100"
                />
              </View>
            </View>

            {detailCard.abilities?.length ? (
              <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-4 mb-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Abilities</Text>
                <View className="mt-3">
                  {detailCard.abilities.map((ability) => (
                    <View key={`${ability.type}-${ability.name}`} className="mb-3 last:mb-0 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3">
                      <Text className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">{ability.type}</Text>
                      <Text className="mt-1 text-[13px] font-semibold text-slate-100">{ability.name}</Text>
                      <Text className="mt-1 text-[12px] leading-5 text-slate-300">{ability.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {detailCard.attacks?.length ? (
              <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-4 mb-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Attacks</Text>
                <View className="mt-3">
                  {detailCard.attacks.map((attack) => (
                    <View key={`${attack.name}-${attack.damage ?? "0"}`} className="mb-3 last:mb-0 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="text-[13px] font-semibold text-slate-100">{attack.name}</Text>
                          {attack.cost?.length ? (
                            <Text className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                              Cost: {attack.cost.join(" • ")}
                            </Text>
                          ) : null}
                        </View>

                        {attack.damage ? (
                          <View className="rounded-full border border-amber-400/35 bg-amber-500/10 px-2.5 py-1">
                            <Text className="text-[11px] font-semibold text-amber-100">{attack.damage}</Text>
                          </View>
                        ) : null}
                      </View>
                      {attack.text ? <Text className="mt-2 text-[12px] leading-5 text-slate-300">{attack.text}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {(detailCard.rules?.length || detailCard.flavorText) ? (
              <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-4 mb-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rules & Flavor</Text>
                {detailCard.rules?.length ? (
                  <View className="mt-3">
                    {detailCard.rules.map((rule, index) => (
                      <Text key={`${index}-${rule.slice(0, 24)}`} className="text-[12px] leading-5 text-slate-200 mb-2 last:mb-0">
                        • {rule}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {detailCard.flavorText ? (
                  <View className={`${detailCard.rules?.length ? "mt-3" : "mt-3"} rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3`}>
                    <Text className="text-[12px] italic leading-5 text-slate-300">{detailCard.flavorText}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {(detailCard.legalities || detailCard.regulationMark || detailCard.tcgplayer?.url || detailCard.cardmarket?.url) ? (
              <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-4 mb-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Play & Market</Text>

                {detailCard.regulationMark ? (
                  <View className="mt-3 flex-row items-center">
                    <View className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5">
                      <Text className="text-[11px] font-semibold text-slate-200">Regulation {detailCard.regulationMark}</Text>
                    </View>
                  </View>
                ) : null}

                {detailCard.legalities ? (
                  <View className="mt-3 flex-row flex-wrap">
                    {Object.entries(detailCard.legalities).map(([format, status]) => (
                      <View key={format} className="mr-2 mb-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5">
                        <Text className="text-[11px] text-slate-200">
                          <Text className="font-semibold capitalize">{format}</Text>: {status}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {selectedMarketSummary ? (
                  <View className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] font-semibold text-slate-100">TCGplayer</Text>
                      <Pressable onPress={() => openExternalUrl(detailCard.tcgplayer?.url)} className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5">
                        <Text className="text-[10px] font-semibold text-cyan-100">Open</Text>
                      </Pressable>
                    </View>
                    <Text className="mt-2 text-[12px] text-slate-300">
                      Finish: <Text className="font-semibold text-slate-100">{selectedMarketSummary.finish}</Text>
                    </Text>
                    {selectedMarketSummary.market != null ? (
                      <Text className="mt-1 text-[12px] text-slate-300">
                        Market: <Text className="font-semibold text-slate-100">${selectedMarketSummary.market.toFixed(2)}</Text>
                      </Text>
                    ) : null}
                    {selectedMarketSummary.mid != null ? (
                      <Text className="mt-1 text-[12px] text-slate-300">
                        Mid: <Text className="font-semibold text-slate-100">${selectedMarketSummary.mid.toFixed(2)}</Text>
                      </Text>
                    ) : null}
                    {selectedMarketSummary.low != null ? (
                      <Text className="mt-1 text-[12px] text-slate-300">
                        Low: <Text className="font-semibold text-slate-100">${selectedMarketSummary.low.toFixed(2)}</Text>
                      </Text>
                    ) : null}
                    {selectedMarketSummary.updatedAt ? (
                      <Text className="mt-2 text-[10px] text-slate-500">Updated {selectedMarketSummary.updatedAt}</Text>
                    ) : null}
                  </View>
                ) : null}

                {selectedCardmarketSummary ? (
                  <View className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] font-semibold text-slate-100">Cardmarket</Text>
                      <Pressable onPress={() => openExternalUrl(detailCard.cardmarket?.url)} className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1.5">
                        <Text className="text-[10px] font-semibold text-amber-100">Open</Text>
                      </Pressable>
                    </View>
                    {selectedCardmarketSummary.averageSellPrice != null ? (
                      <Text className="mt-2 text-[12px] text-slate-300">
                        Avg Sell: <Text className="font-semibold text-slate-100">€{selectedCardmarketSummary.averageSellPrice.toFixed(2)}</Text>
                      </Text>
                    ) : null}
                    {selectedCardmarketSummary.lowPrice != null ? (
                      <Text className="mt-1 text-[12px] text-slate-300">
                        Low: <Text className="font-semibold text-slate-100">€{selectedCardmarketSummary.lowPrice.toFixed(2)}</Text>
                      </Text>
                    ) : null}
                    {selectedCardmarketSummary.trendPrice != null ? (
                      <Text className="mt-1 text-[12px] text-slate-300">
                        Trend: <Text className="font-semibold text-slate-100">€{selectedCardmarketSummary.trendPrice.toFixed(2)}</Text>
                      </Text>
                    ) : null}
                    {selectedCardmarketSummary.avg7 != null ? (
                      <Text className="mt-1 text-[12px] text-slate-300">
                        7d Avg: <Text className="font-semibold text-slate-100">€{selectedCardmarketSummary.avg7.toFixed(2)}</Text>
                      </Text>
                    ) : null}
                    {selectedCardmarketSummary.updatedAt ? (
                      <Text className="mt-2 text-[10px] text-slate-500">Updated {selectedCardmarketSummary.updatedAt}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View className="rounded-3xl bg-slate-950 border border-slate-800 px-4 py-4">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Card Info</Text>
              <Text className="text-[13px] text-slate-200 mt-3">Set: {detailCard.set.name}</Text>
              <Text className="text-[13px] text-slate-200 mt-2">Series: {detailCard.set.series}</Text>
              <Text className="text-[13px] text-slate-200 mt-2">Number: {detailCard.number}</Text>
              {detailCard.hp ? <Text className="text-[13px] text-slate-200 mt-2">HP: {detailCard.hp}</Text> : null}
              {detailCard.level ? <Text className="text-[13px] text-slate-200 mt-2">Level: {detailCard.level}</Text> : null}
              {detailCard.evolvesFrom ? <Text className="text-[13px] text-slate-200 mt-2">Evolves From: {detailCard.evolvesFrom}</Text> : null}
              {detailCard.evolvesTo?.length ? <Text className="text-[13px] text-slate-200 mt-2">Evolves To: {detailCard.evolvesTo.join(", ")}</Text> : null}
              {detailCard.weaknesses?.length ? (
                <Text className="text-[13px] text-slate-200 mt-2">
                  Weaknesses: {detailCard.weaknesses.map((entry) => `${entry.type} ${entry.value}`).join(" • ")}
                </Text>
              ) : null}
              {detailCard.resistances?.length ? (
                <Text className="text-[13px] text-slate-200 mt-2">
                  Resistances: {detailCard.resistances.map((entry) => `${entry.type} ${entry.value}`).join(" • ")}
                </Text>
              ) : null}
              {detailCard.retreatCost?.length ? (
                <Text className="text-[13px] text-slate-200 mt-2">
                  Retreat Cost: {detailCard.retreatCost.join(" • ")}
                </Text>
              ) : null}
              {detailCard.artist ? <Text className="text-[13px] text-slate-200 mt-2">Artist: {detailCard.artist}</Text> : null}
            </View>
          </ScrollView>
        ) : null}
      </BottomSheetModal>
    </PageWrapper>
  );
}
