// components/AnimalCrossing/ACFossilGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  fetchFossilIndividualByName,
  fetchFossilIndividualNames,
  type NookipediaFossilIndividualItem,
} from "@/lib/animalCrossing/nookipediaFossils";

import ACGridWrapper from "@/components/AnimalCrossing/ACGridWrapper";
import { useACNameDetailGrid } from "@/lib/animalCrossing/useACNameDetailGrid";
import { useAnimalCrossingCollectionStore, acMakeKey } from "@/store/animalCrossingCollectionStore";

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

function buildFossilImageCandidates(item?: NookipediaFossilIndividualItem | null): string[] {
  if (!item) return [];
  return uniqStrings([(item as any).image_url]);
}

type ACFossilGridProps = {
  search: string;
};

type FossilTileProps = {
  name: string;
  detail?: NookipediaFossilIndividualItem;
  usedThumb?: number;
  isDetailLoading: boolean;
  onNeedFallbackThumb: (name: string) => Promise<void>;
};

const FossilTile: React.FC<FossilTileProps> = React.memo(
  ({ name, detail, usedThumb, isDetailLoading, onNeedFallbackThumb }) => {
    const router = useRouter();

    const key = useMemo(() => acMakeKey("fossil", name), [name]);

    const entry = useAnimalCrossingCollectionStore(
      useCallback((s: any) => s.entries?.[key], [key])
    );

    const toggleCollected = useAnimalCrossingCollectionStore(
      useCallback((s: any) => s.toggleCollected, [])
    );
    const incrementCount = useAnimalCrossingCollectionStore(
      useCallback((s: any) => s.incrementCount, [])
    );
    const decrementCount = useAnimalCrossingCollectionStore(
      useCallback((s: any) => s.decrementCount, [])
    );

    const isCollected = !!entry?.collected;
    const count = Math.max(Number(entry?.count || 0), 0);

    const candidates = useMemo(() => buildFossilImageCandidates(detail), [detail]);
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
      router.push({
        pathname: "/fossil/[id]",
        params: { id: encodeURIComponent(name) },
      } as any);
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

    const group = detail?.fossil_group ? String((detail as any).fossil_group) : "Fossil";

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

            <Text className="text-xs font-semibold text-slate-50 text-center mt-2" numberOfLines={2}>
              {name}
            </Text>

            <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
              {group}
            </Text>
          </Pressable>

          <View className="flex-row items-center mt-2">
            <Pressable
              onPress={() => toggleCollected("fossil", name)}
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
                  onPress={() => decrementCount("fossil", name)}
                  className="w-6 h-6 rounded-xl bg-slate-950/60 border border-slate-700 items-center justify-center"
                >
                  <Text className="text-slate-100 text-[12px] font-bold">−</Text>
                </Pressable>

                <View className="px-2">
                  <Text className="text-[11px] text-slate-200 font-semibold">{count}</Text>
                </View>

                <Pressable
                  onPress={() => incrementCount("fossil", name)}
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

const ACFossilGrid: React.FC<ACFossilGridProps> = ({ search }) => {
  const grid = useACNameDetailGrid<NookipediaFossilIndividualItem>({
    search,
    fetchNames: fetchFossilIndividualNames,
    fetchDetail: fetchFossilIndividualByName,
    pageSize: PAGE_SIZE,
    thumbPrimary: THUMB_PRIMARY,
    thumbFallback: THUMB_FALLBACK,
    prefetchBuffer: PREFETCH_BUFFER,
    detailConcurrency: DETAIL_CONCURRENCY,
    initialPrefetchCount: INITIAL_PREFETCH,
  });

  const headerLine = useMemo(() => {
    const loading = Object.keys(grid.detailLoadingByName).length > 0 ? " • loading…" : "";
    return `Showing ${grid.visibleNames.length} / ${grid.filteredNames.length} fossils${loading}`;
  }, [grid.visibleNames.length, grid.filteredNames.length, grid.detailLoadingByName]);

  const renderFossilItem = useCallback(
    ({ item }: { item: string; index: number }) => (
      <FossilTile
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
      initialLoadingText="Loading fossil list…"
      errorText={grid.namesError}
      onRetry={grid.retryReloadNames}
      isEmpty={grid.filteredNames.length === 0}
      emptyText="No fossils match this search."
      headerLine={headerLine}
      data={grid.visibleNames}
      keyExtractor={(item) => item}
      renderItem={renderFossilItem as any}
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

export default ACFossilGrid;
