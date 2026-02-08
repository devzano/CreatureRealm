// components/AnimalCrossing/ACVillagersGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import {
  fetchVillagerByName,
  fetchVillagerNames,
  fetchVillagerSpecies,
  fetchVillagerSpeciesByName,
  type NookipediaVillager,
} from "@/lib/animalCrossing/nookipediaVillagers";

import ACGridWrapper from "@/components/AnimalCrossing/ACGridWrapper";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";
import { useACNameDetailGrid } from "@/lib/animalCrossing/useACNameDetailGrid";
import LocalIcon from "@/components/LocalIcon";

const PAGE_SIZE = 45;
const THUMB_PRIMARY = 256;
const THUMB_FALLBACK = 128;

const PREFETCH_BUFFER = 12;
const DETAIL_CONCURRENCY = 3;
const INITIAL_PREFETCH = 9;

function uniqStrings(list: any[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function buildVillagerImageCandidates(item?: NookipediaVillager | null): string[] {
  if (!item) return [];
  const nh = (item as any)?.nh_details ?? null;

  return uniqStrings([
    nh?.icon_url,
    nh?.image_url,
    (item as any)?.image_url,
    nh?.photo_url,
    nh?.house_exterior_url,
    nh?.house_interior_url,
  ]);
}

function mergeVillager(prev: NookipediaVillager, next: NookipediaVillager): NookipediaVillager {
  const prevNh: any = (prev as any)?.nh_details ?? null;
  const nextNh: any = (next as any)?.nh_details ?? null;

  return {
    ...(prev as any),
    ...(next as any),
    nh_details:
      prevNh || nextNh
        ? {
            ...(prevNh ?? {}),
            ...(nextNh ?? {}),
          }
        : undefined,
  };
}

function speciesFromDetail(detail?: NookipediaVillager | null): string | null {
  if (!detail) return null;
  const s = String((detail as any)?.species ?? "").trim();
  return s ? s : null;
}

type ACVillagersGridProps = {
  search: string;
  collectedOnly?: boolean;
  collectedIds?: string[];
};

type VillagerTileProps = {
  name: string;
  detail?: NookipediaVillager;
  usedThumb?: number;
  isDetailLoading: boolean;
  onNeedFallbackThumb: (name: string) => Promise<void>;
};

const VillagerTile: React.FC<VillagerTileProps> = React.memo(
  ({ name, detail, usedThumb, isDetailLoading, onNeedFallbackThumb }) => {
    const router = useRouter();

    const key = useMemo(() => `villager:${String(name ?? "").trim()}`, [name]);

    const entry = useAnimalCrossingCollectionStore(useCallback((s: any) => s.entries?.[key], [key]));
    const toggleCollected = useAnimalCrossingCollectionStore(useCallback((s: any) => s.toggleCollected, []));

    const isCollected = !!entry?.collected;

    const candidates = useMemo(() => buildVillagerImageCandidates(detail), [detail]);
    const [candidateIndex, setCandidateIndex] = useState(0);
    const currentUri = candidates[candidateIndex] ?? null;

    const [imgLoading, setImgLoading] = useState(false);

    useEffect(() => {
      setCandidateIndex(0);
    }, [detail]);

    useEffect(() => {
      if (!currentUri) return;
      ExpoImage.prefetch(currentUri).catch(() => {});
    }, [currentUri]);

    const goDetails = useCallback(() => {
      router.push(
        {
          pathname: "/villager/[id]",
          params: { id: encodeURIComponent(name) },
        } as any
      );
    }, [router, name]);

    const handleImageError = useCallback(async () => {
      setImgLoading(false);

      if (candidateIndex + 1 < candidates.length) {
        setCandidateIndex((i) => i + 1);
        return;
      }

      const thumb = usedThumb ?? THUMB_PRIMARY;
      if (thumb > THUMB_FALLBACK) {
        try {
          await onNeedFallbackThumb(name);
        } catch {}
      }
    }, [candidateIndex, candidates.length, usedThumb, onNeedFallbackThumb, name]);

    const showOverlaySpinner = imgLoading || isDetailLoading;

    const species = detail?.species ? String(detail.species) : "Villager";
    const personality = detail?.personality ? String(detail.personality) : null;

    return (
      <View className="w-1/3 p-1">
        <View className="rounded-3xl p-3 border mb-1 bg-slate-900/80 border-slate-700 items-center">
          <Pressable onPress={goDetails} className="items-center">
            <View style={{ width: 60, height: 60, alignItems: "center", justifyContent: "center" }}>
              {currentUri ? (
                <>
                  <ExpoImage
                    source={{ uri: currentUri }}
                    style={{ width: 60, height: 60 }}
                    contentFit="contain"
                    transition={120}
                    cachePolicy="disk"
                    onLoadStart={() => setImgLoading(true)}
                    onLoad={() => setImgLoading(false)}
                    onError={handleImageError}
                  />

                  {showOverlaySpinner ? (
                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(2,6,23,0.35)",
                        borderRadius: 16,
                      }}
                    >
                      <ActivityIndicator />
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={{ width: 60, height: 60, alignItems: "center", justifyContent: "center" }}>
                  <LocalIcon
                    source={null}
                    size={60}
                    roundedClassName="rounded-2xl"
                    placeholderClassName="bg-slate-950/60 border border-slate-700"
                  />
                  <View style={{ position: "absolute" }}>
                    {showOverlaySpinner ? <ActivityIndicator /> : <Feather name="image" size={18} color="#64748b" />}
                  </View>
                </View>
              )}
            </View>

            <Text className="text-xs font-semibold text-slate-50 text-center mt-2" numberOfLines={1}>
              {name}
            </Text>

            <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
              {personality ? `${species} • ${personality}` : species}
            </Text>
          </Pressable>

          <View className="flex-row items-center mt-2">
            <Pressable
              onPress={() => toggleCollected("villager" as any, name)}
              className={`px-2 py-1 rounded-2xl border ${
                isCollected ? "bg-emerald-500/15 border-emerald-500/40" : "bg-slate-950/40 border-slate-700"
              }`}
            >
              <Text className={`text-[10px] font-semibold ${isCollected ? "text-emerald-200" : "text-slate-300"}`}>
                {isCollected ? "Island Resident" : "Moved Out"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }
);

type SpeciesPillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

const SpeciesPill: React.FC<SpeciesPillProps> = React.memo(({ label, selected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 px-3 py-2 rounded-full border ${
        selected ? "bg-slate-200 border-slate-200" : "bg-slate-950/30 border-slate-700"
      }`}
      hitSlop={6}
    >
      <Text className={`text-[11px] font-semibold ${selected ? "text-slate-900" : "text-slate-200"}`}>{label}</Text>
    </Pressable>
  );
});

const ACVillagersGrid: React.FC<ACVillagersGridProps> = ({ search, collectedOnly = false, collectedIds }) => {
  const [speciesFilter, setSpeciesFilter] = useState<string>("All");

  const [speciesOptions, setSpeciesOptions] = useState<string[]>(["All"]);
  const [speciesByName, setSpeciesByName] = useState<Record<string, string>>({});

  const entries = useAnimalCrossingCollectionStore(useCallback((s: any) => s.entries, []));
  const collectedSet = useMemo(() => {
    const set = new Set<string>();

    if (Array.isArray(collectedIds)) {
      for (const x of collectedIds) {
        const s = String(x ?? "").trim();
        if (s) set.add(s);
      }
      return set;
    }

    if (!collectedOnly) return set;

    for (const [key, entry] of Object.entries(entries || {})) {
      if (!key.startsWith("villager:")) continue;
      const isCollected = !!(entry as any)?.collected;
      const count = Math.max(Number((entry as any)?.count || 0), 0);
      if (!isCollected && count <= 0) continue;

      const name = key.slice("villager:".length).trim();
      if (name) set.add(name);
    }
    return set;
  }, [entries, collectedOnly, collectedIds]);

  const extraFilter = useMemo(() => {
    if (!collectedOnly) return undefined;
    if (collectedSet.size <= 0) return () => false;
    return (name: string) => collectedSet.has(String(name));
  }, [collectedOnly, collectedSet]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [speciesList, map] = await Promise.all([
          fetchVillagerSpecies({ game: "nh" }),
          fetchVillagerSpeciesByName({ game: "nh" }),
        ]);

        if (cancelled) return;

        setSpeciesOptions(["All", ...speciesList]);
        setSpeciesByName(map);
      } catch {
        // keep defaults
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchNamesStrict = useCallback(async () => {
    return await fetchVillagerNames({ game: "nh" } as any);
  }, []);

  const fetchVillagerDetailStrict = useCallback(
    async (name: string, opts: { thumbsize: number }): Promise<NookipediaVillager> => {
      const item = await fetchVillagerByName(name, { thumbsize: opts.thumbsize, game: "nh", nhdetails: true });
      if (!item) throw new Error(`Villager not found: ${String(name ?? "").trim()}`);
      return item;
    },
    []
  );

  const grid = useACNameDetailGrid<NookipediaVillager>({
    search,
    fetchNames: fetchNamesStrict,
    fetchDetail: fetchVillagerDetailStrict,

    pageSize: PAGE_SIZE,
    thumbPrimary: THUMB_PRIMARY,
    thumbFallback: THUMB_FALLBACK,
    prefetchBuffer: PREFETCH_BUFFER,
    detailConcurrency: DETAIL_CONCURRENCY,
    initialPrefetchCount: INITIAL_PREFETCH,

    mergeDetail: mergeVillager,
    extraFilter,
  });

  const visibleSpeciesOptions = useMemo(() => {
    if (!collectedOnly) return speciesOptions;

    const available = new Set<string>();

    for (const name of collectedSet) {
      const spIndex = String(speciesByName[name] ?? "").trim();
      if (spIndex) {
        available.add(spIndex);
        continue;
      }

      const spDetail = speciesFromDetail(grid.detailsByName[name]);
      if (spDetail) available.add(spDetail);
    }

    if (available.size <= 0) return ["All"];

    const out: string[] = ["All"];
    for (const sp of speciesOptions) {
      if (sp === "All") continue;
      if (available.has(sp)) out.push(sp);
    }
    return out;
  }, [collectedOnly, speciesOptions, collectedSet, speciesByName, grid.detailsByName]);

  useEffect(() => {
    if (speciesFilter === "All") return;
    if (visibleSpeciesOptions.includes(speciesFilter)) return;
    setSpeciesFilter("All");
  }, [speciesFilter, visibleSpeciesOptions]);

  const speciesFilteredVisibleNames = useMemo(() => {
    if (speciesFilter === "All") return grid.visibleNames;

    return grid.visibleNames.filter((name) => {
      const spIndex = String(speciesByName[name] ?? "").trim();
      if (spIndex) return spIndex === speciesFilter;

      const spDetail = speciesFromDetail(grid.detailsByName[name]);
      return spDetail ? spDetail === speciesFilter : false;
    });
  }, [grid.visibleNames, grid.detailsByName, speciesFilter, speciesByName]);

  const headerLine = useMemo(() => {
    const loadingSuffix = Object.keys(grid.detailLoadingByName).length > 0 ? " • loading…" : "";
    const shown = speciesFilter === "All" ? grid.visibleNames.length : speciesFilteredVisibleNames.length;
    const label = collectedOnly ? "collected villagers" : "villagers";
    return `Showing ${shown} / ${grid.filteredNames.length} ${label}${loadingSuffix}`;
  }, [
    grid.detailLoadingByName,
    grid.filteredNames.length,
    grid.visibleNames.length,
    speciesFilter,
    speciesFilteredVisibleNames.length,
    collectedOnly,
  ]);

  const renderVillagerItem = useCallback(
    ({ item }: { item: string; index: number }) => (
      <VillagerTile
        name={item}
        detail={grid.detailsByName[item]}
        usedThumb={grid.detailThumbByName[item]}
        isDetailLoading={!!grid.detailLoadingByName[item]}
        onNeedFallbackThumb={grid.onNeedFallbackThumb}
      />
    ),
    [grid.detailsByName, grid.detailThumbByName, grid.detailLoadingByName, grid.onNeedFallbackThumb]
  );

  return (
    <View className="flex-1">
      <View className="px-3 pb-2">
        <View className="mt-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {visibleSpeciesOptions.map((sp) => (
              <SpeciesPill key={sp} label={sp} selected={sp === speciesFilter} onPress={() => setSpeciesFilter(sp)} />
            ))}
          </ScrollView>
        </View>
      </View>

      <ACGridWrapper<string>
        isInitialLoading={grid.namesLoading && !grid.namesLoadedOnce}
        initialLoadingText={collectedOnly ? "Loading your collected villagers…" : "Loading villagers list…"}
        errorText={grid.namesError}
        onRetry={grid.retryReloadNames}
        isEmpty={grid.filteredNames.length === 0}
        emptyText={collectedOnly ? "No collected villagers yet." : "No villagers match this search."}
        headerLine={headerLine}
        data={speciesFilteredVisibleNames}
        keyExtractor={(item) => item}
        renderItem={renderVillagerItem as any}
        footerMode={grid.visibleCount < grid.filteredNames.length ? "more" : "end"}
        onEndReached={grid.onEndReached}
        onEndReachedThreshold={0.65}
        viewabilityConfig={grid.viewabilityConfigRef.current}
        onViewableItemsChanged={grid.onViewableItemsChanged as any}
        removeClippedSubviews
        initialNumToRender={18}
        maxToRenderPerBatch={18}
        windowSize={9}
        updateCellsBatchingPeriod={40}
        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        numColumns={3}
      />
    </View>
  );
};

export default ACVillagersGrid;
