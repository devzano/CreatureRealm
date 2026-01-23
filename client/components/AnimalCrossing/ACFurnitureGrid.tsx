// components/AnimalCrossing/ACFurnitureGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  fetchFurnitureByName,
  fetchFurnitureNames,
  type NookipediaFurnitureItem,
} from "@/lib/animalCrossing/nookipediaFurniture";

import ACGridWrapper from "@/components/AnimalCrossing/ACGridWrapper";
import { useACNameDetailGrid } from "@/lib/animalCrossing/useACNameDetailGrid";
import { useAnimalCrossingCollectionStore, acMakeKey } from "@/store/animalCrossingCollectionStore";

const PAGE_SIZE = 45;
const THUMB_PRIMARY = 256;
const THUMB_FALLBACK = 128;

const PREFETCH_BUFFER = 6;
const DETAIL_CONCURRENCY = 3;
const INITIAL_PREFETCH = 9;

function uniqStrings(list: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    const v = String(s || "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function buildFurnitureImageCandidates(item?: NookipediaFurnitureItem | null): string[] {
  if (!item) return [];

  const candidates: string[] = [];

  const vars = Array.isArray((item as any).variations) ? (item as any).variations : [];
  for (const v of vars) {
    const sq = (v as any).image_url_square;
    const url = (v as any).image_url ?? (v as any).image;
    if (sq) candidates.push(String(sq));
    if (url) candidates.push(String(url));
  }

  const directSq = (item as any).image_url_square;
  const direct = (item as any).image_url ?? (item as any).image;
  if (directSq) candidates.push(String(directSq));
  if (direct) candidates.push(String(direct));

  return uniqStrings(candidates);
}

type ACFurnitureGridProps = {
  search: string;
  collectedOnly?: boolean;
  collectedIds?: string[];
};

type FurnitureTileProps = {
  name: string;
  detail?: NookipediaFurnitureItem;
  usedThumb?: number;
  isDetailLoading: boolean;
  onNeedFallbackThumb: (name: string) => Promise<void>;
};

const FurnitureTile: React.FC<FurnitureTileProps> = React.memo(
  ({ name, detail, usedThumb, isDetailLoading, onNeedFallbackThumb }) => {
    const router = useRouter();

    const key = useMemo(() => acMakeKey("furniture", name), [name]);

    const entry = useAnimalCrossingCollectionStore(
      useCallback((s: any) => s.entries?.[key], [key])
    );

    const toggleCollected = useAnimalCrossingCollectionStore(
      useCallback((s: any) => s.toggleCollected, [])
    );

    const isCollected = !!entry?.collected;

    const candidates = useMemo(() => buildFurnitureImageCandidates(detail), [detail]);
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
        pathname: "/furniture/[id]",
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

            <View className="flex-row items-center mt-2">
              <Pressable
                onPress={(e) => {
                  (e as any)?.stopPropagation?.();
                  toggleCollected("furniture", name);
                }}
                className={`px-2 py-1 rounded-2xl border ${
                  isCollected ? "bg-emerald-500/15 border-emerald-500/40" : "bg-slate-950/40 border-slate-700"
                }`}
              >
                <Text className={`text-[10px] font-semibold ${isCollected ? "text-emerald-200" : "text-slate-300"}`}>
                  {isCollected ? "Collected" : "Collect"}
                </Text>
              </Pressable>
            </View>

            <Text className="text-xs font-semibold text-slate-50 text-center mt-2" numberOfLines={2}>
              {name}
            </Text>

            <Text className="text-[10px] text-slate-500 mt-1">
              {detail?.category ? String((detail as any).category) : "Furniture"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
);

const ACFurnitureGrid: React.FC<ACFurnitureGridProps> = ({ search, collectedOnly = false, collectedIds }) => {
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

  const grid = useACNameDetailGrid<NookipediaFurnitureItem>({
    search,
    fetchNames: fetchFurnitureNames,
    fetchDetail: fetchFurnitureByName,
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

  const renderFurnitureItem = useCallback(
    ({ item }: { item: string; index: number }) => (
      <FurnitureTile
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
      initialLoadingText="Loading furniture list…"
      errorText={grid.namesError}
      onRetry={grid.retryReloadNames}
      isEmpty={grid.filteredNames.length === 0}
      emptyText={collectedOnly ? "No collected furniture yet." : "No furniture matches this search."}
      headerLine={headerLine}
      data={grid.visibleNames}
      keyExtractor={(item) => item}
      renderItem={renderFurnitureItem as any}
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

export default ACFurnitureGrid;
