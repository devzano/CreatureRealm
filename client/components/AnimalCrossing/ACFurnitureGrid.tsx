// components/AnimalCrossing/ACFurnitureGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import {
  fetchFurnitureByName,
  fetchFurnitureNames,
  normalizeFurnitureCategory,
  type NookipediaFurnitureItem,
  type NookipediaFurnitureCategory,
  type NookipediaFurnitureColor,
} from "@/lib/animalCrossing/nookipediaFurniture";

import ACGridWrapper from "@/components/AnimalCrossing/ACGridWrapper";
import { useACNameDetailGrid } from "@/lib/animalCrossing/useACNameDetailGrid";
import { useAnimalCrossingCollectionStore, acMakeKey } from "@/store/animalCrossingCollectionStore";
import LocalIcon from "@/components/LocalIcon";

const PAGE_SIZE = 45;

const THUMB_PRIMARY = 128;
const THUMB_FALLBACK = 64;

const PREFETCH_BUFFER = 12;
const DETAIL_CONCURRENCY = 2;
const INITIAL_PREFETCH = 6;

const CATEGORY_OPTIONS: Array<"All" | NookipediaFurnitureCategory> = [
  "All",
  "Housewares",
  "Miscellaneous",
  "Wall-mounted",
  "Ceiling decor",
];

const COLOR_OPTIONS: Array<"All" | NookipediaFurnitureColor> = [
  "All",
  "Aqua",
  "Beige",
  "Black",
  "Blue",
  "Brown",
  "Colorful",
  "Gray",
  "Green",
  "Orange",
  "Pink",
  "Purple",
  "Red",
  "White",
  "Yellow",
];

const CATEGORY_SET = new Set<NookipediaFurnitureCategory>(
  CATEGORY_OPTIONS.filter((x): x is NookipediaFurnitureCategory => x !== "All")
);
const COLOR_SET = new Set<NookipediaFurnitureColor>(
  COLOR_OPTIONS.filter((x): x is NookipediaFurnitureColor => x !== "All")
);

function isFurnitureCategory(v: any): v is NookipediaFurnitureCategory {
  return CATEGORY_SET.has(v as any);
}

function isFurnitureColor(v: any): v is NookipediaFurnitureColor {
  return COLOR_SET.has(v as any);
}

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

function extractFurnitureColors(detail: any): NookipediaFurnitureColor[] {
  const out: NookipediaFurnitureColor[] = [];

  const push = (v: any) => {
    const s = String(v ?? "").trim();
    if (isFurnitureColor(s)) out.push(s);
  };

  const pushMany = (xs: any) => {
    if (!Array.isArray(xs)) return;
    for (const x of xs) push(x);
  };

  pushMany(detail?.colors);
  push(detail?.color_1 ?? detail?.color1);
  push(detail?.color_2 ?? detail?.color2);
  push(detail?.color);

  const vars = Array.isArray(detail?.variations) ? detail.variations : [];
  for (const v of vars) {
    pushMany(v?.colors);
    push(v?.color_1 ?? v?.color1);
    push(v?.color_2 ?? v?.color2);
    push(v?.color);
  }

  return Array.from(new Set(out));
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

    const entry = useAnimalCrossingCollectionStore(useCallback((s: any) => s.entries?.[key], [key]));
    const toggleCollected = useAnimalCrossingCollectionStore(useCallback((s: any) => s.toggleCollected, []));

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
      ExpoImage.prefetch(currentUri).catch(() => {});
    }, [currentUri]);

    const goDetails = useCallback(() => {
      router.push(
        {
          pathname: "/furniture/[id]",
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
                  {isCollected ? "In Storage" : "Need This"}
                </Text>
              </Pressable>
            </View>

            <Text className="text-xs font-semibold text-slate-50 text-center mt-2" numberOfLines={1}>
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

type PillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

const Pill: React.FC<PillProps> = React.memo(({ label, selected, onPress }) => {
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

type ACFurnitureGridInnerProps = ACFurnitureGridProps & {
  categoryFilter: "All" | NookipediaFurnitureCategory;
  colorFilter: NookipediaFurnitureColor[]; // 0–2
};

const ACFurnitureGridInner: React.FC<ACFurnitureGridInnerProps> = ({
  search,
  collectedOnly = false,
  collectedIds,
  categoryFilter,
  colorFilter,
}) => {
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
      if (!String(key).startsWith("furniture:")) continue;

      const isCollected = !!(entry as any)?.collected;
      const count = Math.max(Number((entry as any)?.count || 0), 0);
      if (!isCollected && count <= 0) continue;

      const name = String(key).slice("furniture:".length).trim();
      if (name) set.add(name);
    }

    return set;
  }, [entries, collectedOnly, collectedIds]);

  const extraFilter = useMemo(() => {
    if (!collectedOnly) return undefined;
    if (collectedSet.size <= 0) return () => false;
    return (name: string) => collectedSet.has(String(name));
  }, [collectedOnly, collectedSet]);

  const fetchNamesWithFilters = useCallback(async () => {
    return await fetchFurnitureNames({
      category: categoryFilter === "All" ? undefined : categoryFilter,
      color: colorFilter.length ? colorFilter : undefined,
    });
  }, [categoryFilter, colorFilter]);

  const grid = useACNameDetailGrid<NookipediaFurnitureItem>({
    search,
    fetchNames: fetchNamesWithFilters,
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
    const label = collectedOnly ? "collected furniture" : "furniture";
    const loadingSuffix = Object.keys(grid.detailLoadingByName).length > 0 ? " • loading…" : "";
    return `Showing ${grid.visibleNames.length} / ${grid.filteredNames.length} ${label}${loadingSuffix}`;
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

  const trimmedSearch = String(search ?? "").trim();
  const isEmpty = !grid.namesLoading && grid.filteredNames.length === 0;
  const hasAnyFilters = categoryFilter !== "All" || colorFilter.length > 0;

  const emptyText = collectedOnly
    ? "No collected furniture yet."
    : trimmedSearch.length > 0
    ? "No furniture matches this search."
    : hasAnyFilters
    ? "No furniture matches these filters."
    : "No furniture found.";

  return (
    <ACGridWrapper<string>
      isInitialLoading={grid.namesLoading && !grid.namesLoadedOnce}
      initialLoadingText={collectedOnly ? "Loading your collected furniture…" : "Loading furniture list…"}
      errorText={grid.namesError}
      onRetry={grid.retryReloadNames}
      isEmpty={isEmpty}
      emptyText={emptyText}
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

const ACFurnitureGrid: React.FC<ACFurnitureGridProps> = (props) => {
  const { collectedOnly = false, collectedIds } = props;

  const [categoryFilter, setCategoryFilter] = useState<"All" | NookipediaFurnitureCategory>("All");
  const [colorFilter, setColorFilter] = useState<NookipediaFurnitureColor[]>([]); // max 2

  const [metaLoading, setMetaLoading] = useState(false);
  const [collectedCats, setCollectedCats] = useState<Set<NookipediaFurnitureCategory>>(new Set());
  const [collectedColors, setCollectedColors] = useState<Set<NookipediaFurnitureColor>>(new Set());

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
      if (!String(key).startsWith("furniture:")) continue;

      const isCollected = !!(entry as any)?.collected;
      const count = Math.max(Number((entry as any)?.count || 0), 0);
      if (!isCollected && count <= 0) continue;

      const name = String(key).slice("furniture:".length).trim();
      if (name) set.add(name);
    }

    return set;
  }, [entries, collectedOnly, collectedIds]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!collectedOnly) {
        setCollectedCats(new Set());
        setCollectedColors(new Set());
        setMetaLoading(false);
        return;
      }

      if (collectedSet.size <= 0) {
        setCollectedCats(new Set());
        setCollectedColors(new Set());
        setMetaLoading(false);
        return;
      }

      try {
        setMetaLoading(true);

        const names = Array.from(collectedSet);

        const concurrency = 4;
        const cats = new Set<NookipediaFurnitureCategory>();
        const cols = new Set<NookipediaFurnitureColor>();

        let idx = 0;
        const workers = Array.from({ length: concurrency }).map(async () => {
          while (!cancelled && idx < names.length) {
            const i = idx++;
            const name = names[i];
            try {
              const d: any = await fetchFurnitureByName(name, { thumbsize: THUMB_FALLBACK } as any);

              const catNorm = normalizeFurnitureCategory(d?.category) as any;
              if (isFurnitureCategory(catNorm)) cats.add(catNorm);

              for (const c of extractFurnitureColors(d)) cols.add(c);
            } catch {
              // ignore per-item failures
            }
          }
        });

        await Promise.all(workers);

        if (cancelled) return;
        setCollectedCats(cats);
        setCollectedColors(cols);
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [collectedOnly, collectedSet]);

  const visibleCategoryOptions = useMemo((): Array<"All" | NookipediaFurnitureCategory> => {
    if (!collectedOnly) return CATEGORY_OPTIONS;

    if (collectedCats.size <= 0) return ["All"];

    const out: Array<"All" | NookipediaFurnitureCategory> = ["All"];
    for (const c of CATEGORY_OPTIONS) {
      if (c === "All") continue;
      if (collectedCats.has(c)) out.push(c);
    }
    return out;
  }, [collectedOnly, collectedCats]);

  const visibleColorOptions = useMemo((): Array<"All" | NookipediaFurnitureColor> => {
    if (!collectedOnly) return COLOR_OPTIONS;

    if (collectedColors.size <= 0) return ["All"];

    const out: Array<"All" | NookipediaFurnitureColor> = ["All"];
    for (const c of COLOR_OPTIONS) {
      if (c === "All") continue;
      if (collectedColors.has(c)) out.push(c);
    }
    return out;
  }, [collectedOnly, collectedColors]);

  useEffect(() => {
    if (!collectedOnly) return;

    if (categoryFilter !== "All" && !visibleCategoryOptions.includes(categoryFilter)) {
      setCategoryFilter("All");
    }

    if (colorFilter.length > 0) {
      setColorFilter((prev) => prev.filter((c) => visibleColorOptions.includes(c)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectedOnly, visibleCategoryOptions, visibleColorOptions]);

  const toggleColor = useCallback((c: "All" | NookipediaFurnitureColor) => {
    if (c === "All") {
      setColorFilter([]);
      return;
    }

    setColorFilter((prev) => {
      const exists = prev.includes(c);
      if (exists) return prev.filter((x) => x !== c);

      if (prev.length >= 2) {
        const keep = prev.slice(prev.length - 1);
        return [...keep, c];
      }
      return [...prev, c];
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setCategoryFilter("All");
    setColorFilter([]);
  }, []);

  const filterKey = useMemo(() => {
    const cat = categoryFilter;
    const cols = colorFilter.slice().sort().join("|");
    return `cat=${cat}__colors=${cols}`;
  }, [categoryFilter, colorFilter]);

  const showClear = categoryFilter !== "All" || colorFilter.length > 0;

  return (
    <View className="flex-1">
      <View className="px-3 pb-2">
        <View className="mt-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {visibleCategoryOptions.map((c) => (
              <Pill
                key={c}
                label={c}
                selected={c === categoryFilter}
                onPress={() => setCategoryFilter(c === "All" ? "All" : c)}
              />
            ))}
          </ScrollView>
        </View>

        <View className="mt-2 flex-row items-center">
          <View style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {visibleColorOptions.map((c) => {
                const selected = c === "All" ? colorFilter.length === 0 : colorFilter.includes(c);
                return <Pill key={c} label={c} selected={selected} onPress={() => toggleColor(c)} />;
              })}
            </ScrollView>
          </View>

          {showClear ? (
            <Pressable
              onPress={clearAllFilters}
              className="ml-2 px-3 py-2 rounded-full border bg-slate-950/30 border-slate-700"
              hitSlop={8}
            >
              <Text className="text-[11px] font-semibold text-slate-200">Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {collectedOnly && metaLoading ? (
          <Text className="mt-2 text-[10px] text-slate-400/70">Filtering options…</Text>
        ) : colorFilter.length > 0 ? (
          <Text className="mt-2 text-[10px] text-slate-400/70">Colors: {colorFilter.join(" • ")} (max 2)</Text>
        ) : null}
      </View>

      <ACFurnitureGridInner key={filterKey} {...props} categoryFilter={categoryFilter} colorFilter={colorFilter} />
    </View>
  );
};

export default ACFurnitureGrid;
