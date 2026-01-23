// components/AnimalCrossing/ACSeaCreatureGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  fetchSeaCreatureByName,
  fetchSeaCreatureNames,
  type NookipediaSeaCreatureItem,
} from "@/lib/animalCrossing/nookipediaSeaCreatures";
import ACGridWrapper from "@/components/AnimalCrossing/ACGridWrapper";
import { useACNameDetailGrid } from "@/lib/animalCrossing/useACNameDetailGrid";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";

const PAGE_SIZE = 45;
const THUMB_PRIMARY = 256;
const THUMB_FALLBACK = 128;

const PREFETCH_BUFFER = 6;
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

function buildSeaImageCandidates(item?: NookipediaSeaCreatureItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any).image_url, (item as any).render_url]);
}

function seaSubtitle(detail?: NookipediaSeaCreatureItem) {
  const size = String((detail as any)?.shadow_size ?? "").trim();
  const move = String((detail as any)?.shadow_movement ?? "").trim();

  if (size && move) return `${size} • ${move}`;
  if (size) return size;
  if (move) return move;
  return "Sea Creature";
}

type ACSeaCreatureGridProps = {
  search: string;
  collectedOnly?: boolean;
  collectedIds?: string[];
};

type SeaTileProps = {
  name: string;
  detail?: NookipediaSeaCreatureItem;
  usedThumb?: number;
  isDetailLoading: boolean;
  onNeedFallbackThumb: (name: string) => Promise<void>;
};

const SeaTile: React.FC<SeaTileProps> = React.memo(
  ({ name, detail, usedThumb, isDetailLoading, onNeedFallbackThumb }) => {
    const router = useRouter();

    const key = useMemo(() => `seaCreature:${String(name ?? "").trim()}`, [name]);

    const entry = useAnimalCrossingCollectionStore(useCallback((s: any) => s.entries?.[key], [key]));

    const toggleCollected = useAnimalCrossingCollectionStore(useCallback((s: any) => s.toggleCollected, []));
    const incrementCount = useAnimalCrossingCollectionStore(useCallback((s: any) => s.incrementCount, []));
    const decrementCount = useAnimalCrossingCollectionStore(useCallback((s: any) => s.decrementCount, []));

    const isCollected = !!entry?.collected;
    const count = Math.max(Number(entry?.count || 0), 0);

    const candidates = useMemo(() => buildSeaImageCandidates(detail), [detail]);
    const [candidateIndex, setCandidateIndex] = useState(0);
    const currentUri = candidates[candidateIndex] ?? null;

    const [imgLoading, setImgLoading] = useState(false);

    useEffect(() => {
      setCandidateIndex(0);
    }, [detail]);

    useEffect(() => {
      if (!currentUri) return;
      Image.prefetch(currentUri).catch(() => {});
    }, [currentUri]);

    const goDetails = useCallback(() => {
      router.push(
        {
          pathname: "/seaCreature/[id]",
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

    return (
      <View className="w-1/3 p-1">
        <View className="rounded-3xl p-3 border mb-1 bg-slate-900/80 border-slate-700 items-center">
          <Pressable onPress={goDetails} className="items-center">
            <View style={{ width: 60, height: 60, alignItems: "center", justifyContent: "center" }}>
              {currentUri ? (
                <>
                  <Image
                    source={{ uri: currentUri }}
                    style={{ width: 60, height: 60 }}
                    resizeMode="contain"
                    onLoadStart={() => setImgLoading(true)}
                    onLoadEnd={() => setImgLoading(false)}
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
                <View className="w-[60px] h-[60px] rounded-2xl bg-slate-950/60 border border-slate-700 items-center justify-center">
                  {showOverlaySpinner ? <ActivityIndicator /> : <Feather name="image" size={18} color="#64748b" />}
                </View>
              )}
            </View>

            <Text className="text-xs font-semibold text-slate-50 text-center mt-2" numberOfLines={1}>
              {name}
            </Text>

            <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
              {seaSubtitle(detail)}
            </Text>
          </Pressable>

          <View className="flex-row items-center mt-2">
            <Pressable
              onPress={() => toggleCollected("seaCreature", name)}
              className={`px-2 py-1 rounded-2xl border ${
                isCollected ? "bg-emerald-500/15 border-emerald-500/40" : "bg-slate-950/40 border-slate-700"
              }`}
            >
              <Text className={`text-[10px] font-semibold ${isCollected ? "text-emerald-200" : "text-slate-300"}`}>
                {isCollected ? "Collected" : "Collect"}
              </Text>
            </Pressable>

            {isCollected ? (
              <View className="flex-row items-center ml-2">
                <Pressable
                  onPress={() => decrementCount("seaCreature", name)}
                  className="w-6 h-6 rounded-xl bg-slate-950/60 border border-slate-700 items-center justify-center"
                >
                  <Text className="text-slate-100 text-[12px] font-bold">−</Text>
                </Pressable>

                <View className="px-2">
                  <Text className="text-[11px] text-slate-200 font-semibold">{count}</Text>
                </View>

                <Pressable
                  onPress={() => incrementCount("seaCreature", name)}
                  className="w-6 h-6 rounded-xl bg-slate-950/60 border border-slate-700 items-center justify-center"
                >
                  <Text className="text-slate-100 text-[12px] font-bold">+</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  }
);

const ACSeaCreatureGrid: React.FC<ACSeaCreatureGridProps> = ({ search, collectedOnly = false, collectedIds }) => {
  const collectedSet = useMemo(() => {
    const xs = Array.isArray(collectedIds) ? collectedIds : [];
    const set = new Set<string>();
    xs.forEach((x) => {
      const s = String(x ?? "").trim();
      if (s) set.add(s);
    });
    return set;
  }, [collectedIds]);

  const extraFilter = useMemo(() => {
    if (!collectedOnly) return undefined;
    if (collectedSet.size <= 0) return () => false;
    return (name: string) => collectedSet.has(String(name));
  }, [collectedOnly, collectedSet]);

  const grid = useACNameDetailGrid<NookipediaSeaCreatureItem>({
    search,
    fetchNames: fetchSeaCreatureNames,
    fetchDetail: fetchSeaCreatureByName,
    pageSize: PAGE_SIZE,
    thumbPrimary: THUMB_PRIMARY,
    thumbFallback: THUMB_FALLBACK,
    prefetchBuffer: PREFETCH_BUFFER,
    detailConcurrency: DETAIL_CONCURRENCY,
    initialPrefetchCount: INITIAL_PREFETCH,
    extraFilter,
  });

  const headerLine = useMemo(() => {
    const label = collectedOnly ? "collected" : "sea creatures";
    return `Showing ${grid.visibleNames.length} / ${grid.filteredNames.length} ${label}${
      Object.keys(grid.detailLoadingByName).length > 0 ? " • loading…" : ""
    }`;
  }, [grid.visibleNames.length, grid.filteredNames.length, grid.detailLoadingByName, collectedOnly]);

  const renderSeaItem = useCallback(
    ({ item }: { item: string; index: number }) => (
      <SeaTile
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
    <ACGridWrapper<string>
      isInitialLoading={grid.namesLoading && !grid.namesLoadedOnce}
      initialLoadingText="Loading sea creatures…"
      errorText={grid.namesError}
      onRetry={grid.retryReloadNames}
      isEmpty={grid.filteredNames.length === 0}
      emptyText={collectedOnly ? "No collected sea creatures in this category." : "No sea creatures match this search."}
      headerLine={headerLine}
      data={grid.visibleNames}
      keyExtractor={(item) => item}
      renderItem={renderSeaItem as any}
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
  );
};

export default ACSeaCreatureGrid;
