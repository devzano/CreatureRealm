// components/AnimalCrossing/ACGyroidsGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  fetchGyroidByName,
  fetchGyroidNames,
  type NookipediaGyroidItem,
} from "@/lib/animalCrossing/nookipediaGyroids";

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

function buildGyroidImageCandidates(item?: NookipediaGyroidItem | null): string[] {
  if (!item) return [];

  const candidates: any[] = [];
  const vars = Array.isArray((item as any).variations) ? (item as any).variations : [];
  for (const v of vars) {
    const url = (v as any)?.image_url;
    if (url) candidates.push(url);
  }

  candidates.push((item as any).image_url, (item as any).render_url);
  return uniqStrings(candidates);
}

type ACGyroidsGridProps = {
  search: string;
  collectedOnly?: boolean;
  collectedIds?: string[];
};

type GyroidTileProps = {
  name: string;
  detail?: NookipediaGyroidItem;
  usedThumb?: number;
  isDetailLoading: boolean;
  onNeedFallbackThumb: (name: string) => Promise<void>;
};

const GyroidTile: React.FC<GyroidTileProps> = React.memo(
  ({ name, detail, usedThumb, isDetailLoading, onNeedFallbackThumb }) => {
    const router = useRouter();

    const key = useMemo(() => acMakeKey("gyroid", name), [name]);

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

    const candidates = useMemo(() => buildGyroidImageCandidates(detail), [detail]);
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
        pathname: "/gyroid/[id]",
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
    const sound = detail?.sound ? String((detail as any).sound) : null;

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
                  {showOverlaySpinner ? (
                    <ActivityIndicator />
                  ) : (
                    <Feather name="image" size={18} color="#64748b" />
                  )}
                </View>
              )}
            </View>

            <Text className="text-xs font-semibold text-slate-50 text-center mt-2" numberOfLines={2}>
              {name}
            </Text>

            <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
              {sound ? `Sound: ${sound}` : "Gyroid"}
            </Text>
          </Pressable>

          <View className="flex-row items-center mt-2">
            <Pressable
              onPress={() => toggleCollected("gyroid", name)}
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
                  onPress={() => decrementCount("gyroid", name)}
                  className="w-6 h-6 rounded-xl bg-slate-950/60 border border-slate-700 items-center justify-center"
                >
                  <Text className="text-slate-100 text-[12px] font-bold">−</Text>
                </Pressable>

                <View className="px-2">
                  <Text className="text-[11px] text-slate-200 font-semibold">{count}</Text>
                </View>

                <Pressable
                  onPress={() => incrementCount("gyroid", name)}
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

const ACGyroidsGrid: React.FC<ACGyroidsGridProps> = ({ search, collectedOnly = false, collectedIds }) => {
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

  const grid = useACNameDetailGrid<NookipediaGyroidItem>({
    search,
    fetchNames: fetchGyroidNames,
    fetchDetail: fetchGyroidByName,
    pageSize: PAGE_SIZE,
    thumbPrimary: THUMB_PRIMARY,
    thumbFallback: THUMB_FALLBACK,
    prefetchBuffer: PREFETCH_BUFFER,
    detailConcurrency: DETAIL_CONCURRENCY,
    initialPrefetchCount: INITIAL_PREFETCH,
    extraFilter,
  });

  const headerLine = useMemo(() => {
    const base = collectedOnly ? "collected" : "items";
    return `Showing ${grid.visibleNames.length} / ${grid.filteredNames.length} ${base}${
      Object.keys(grid.detailLoadingByName).length > 0 ? " • loading…" : ""
    }`;
  }, [grid.visibleNames.length, grid.filteredNames.length, collectedOnly, grid.detailLoadingByName]);

  const renderGyroidItem = useCallback(
    ({ item }: { item: string; index: number }) => (
      <GyroidTile
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
      initialLoadingText="Loading gyroid list…"
      errorText={grid.namesError}
      onRetry={grid.retryReloadNames}
      isEmpty={grid.filteredNames.length === 0}
      emptyText={collectedOnly ? "No collected gyroids yet." : "No gyroids match this search."}
      headerLine={headerLine}
      data={grid.visibleNames}
      keyExtractor={(item) => item}
      renderItem={renderGyroidItem as any}
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

export default ACGyroidsGrid;
