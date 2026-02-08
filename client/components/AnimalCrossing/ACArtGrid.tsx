// components/AnimalCrossing/ACArtGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import { fetchArtByName, fetchArtNames, type NookipediaArtItem } from "@/lib/animalCrossing/nookipediaArt";
import ACGridWrapper from "@/components/AnimalCrossing/ACGridWrapper";
import { useAnimalCrossingCollectionStore, acMakeKey } from "@/store/animalCrossingCollectionStore";
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

function buildArtImageCandidates(item?: NookipediaArtItem | null): string[] {
  if (!item) return [];

  const candidates: any[] = [];

  const realImg = (item as any)?.real_info?.image_url;
  const fakeImg = (item as any)?.fake_info?.image_url;

  const realTex = (item as any)?.real_info?.texture_url;
  const fakeTex = (item as any)?.fake_info?.texture_url;

  if (realImg) candidates.push(realImg);
  if (fakeImg) candidates.push(fakeImg);

  if (realTex) candidates.push(realTex);
  if (fakeTex) candidates.push(fakeTex);

  return uniqStrings(candidates);
}

type ACArtGridProps = {
  search: string;
  collectedOnly?: boolean;
  collectedIds?: string[];
};

type ArtTileProps = {
  name: string;
  detail?: NookipediaArtItem;
  usedThumb?: number;
  isDetailLoading: boolean;
  onNeedFallbackThumb: (name: string) => Promise<void>;
};

const ArtTile: React.FC<ArtTileProps> = React.memo(({ name, detail, usedThumb, isDetailLoading, onNeedFallbackThumb }) => {
  const router = useRouter();

  const key = useMemo(() => acMakeKey("art", name), [name]);

  const entry = useAnimalCrossingCollectionStore(useCallback((s: any) => s.entries?.[key], [key]));
  const toggleCollected = useAnimalCrossingCollectionStore(useCallback((s: any) => s.toggleCollected, []));

  const isCollected = !!entry?.collected;

  const candidates = useMemo(() => buildArtImageCandidates(detail), [detail]);
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
    router.push({
      pathname: "/art/[id]",
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

  const artType = detail?.art_type ? String((detail as any).art_type) : "Art";
  const hasFake = (detail as any)?.has_fake === true ? "Has fake" : "No fake";

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
            {artType} • {hasFake}
          </Text>
        </Pressable>

        <View className="mt-2">
          <Pressable
            onPress={() => toggleCollected("art", name)}
            className={`px-2 py-1 rounded-2xl border ${
              isCollected ? "bg-emerald-500/15 border-emerald-500/40" : "bg-slate-950/40 border-slate-700"
            }`}
          >
            <Text className={`text-[10px] font-semibold ${isCollected ? "text-emerald-200" : "text-slate-300"}`}>
              {isCollected ? "Collected" : "Collect"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const ACArtGrid: React.FC<ACArtGridProps> = ({ search, collectedOnly = false, collectedIds }) => {
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
      if (!String(key).startsWith("art:")) continue;

      const isCollected = !!(entry as any)?.collected;
      const count = Math.max(Number((entry as any)?.count || 0), 0);
      if (!isCollected && count <= 0) continue;

      const name = String(key).slice("art:".length).trim();
      if (name) set.add(name);
    }

    return set;
  }, [entries, collectedOnly, collectedIds]);

  const extraFilter = useMemo(() => {
    if (!collectedOnly) return undefined;
    if (collectedSet.size <= 0) return () => false;
    return (name: string) => collectedSet.has(String(name));
  }, [collectedOnly, collectedSet]);

  const grid = useACNameDetailGrid<NookipediaArtItem>({
    search,
    fetchNames: fetchArtNames,
    fetchDetail: fetchArtByName,
    pageSize: PAGE_SIZE,
    thumbPrimary: THUMB_PRIMARY,
    thumbFallback: THUMB_FALLBACK,
    prefetchBuffer: PREFETCH_BUFFER,
    detailConcurrency: DETAIL_CONCURRENCY,
    initialPrefetchCount: INITIAL_PREFETCH,
    extraFilter,
  });

  const headerLine = useMemo(() => {
    const label = collectedOnly ? "collected art" : "art";
    return `Showing ${grid.visibleNames.length} / ${grid.filteredNames.length} ${label}${
      Object.keys(grid.detailLoadingByName).length > 0 ? " • loading…" : ""
    }`;
  }, [grid.visibleNames.length, grid.filteredNames.length, grid.detailLoadingByName, collectedOnly]);

  const renderArtItem = useCallback(
    ({ item }: { item: string; index: number }) => (
      <ArtTile
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
      initialLoadingText={collectedOnly ? "Loading your collected art…" : "Loading art list…"}
      errorText={grid.namesError}
      onRetry={grid.retryReloadNames}
      isEmpty={grid.filteredNames.length === 0}
      emptyText={collectedOnly ? "No collected art yet." : "No art matches this search."}
      headerLine={headerLine}
      data={grid.visibleNames}
      keyExtractor={(item) => item}
      renderItem={renderArtItem as any}
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

export default ACArtGrid;
