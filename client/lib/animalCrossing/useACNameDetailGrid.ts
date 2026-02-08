// lib/animalCrossing/useACNameDetailGrid.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type UseACNameDetailGridOpts<TDetail> = {
  fetchNames: () => Promise<string[]>;
  fetchDetail: (name: string, opts: { thumbsize: number }) => Promise<TDetail>;
  search: string;
  pageSize?: number;
  thumbPrimary?: number;
  thumbFallback?: number;
  prefetchBuffer?: number;
  detailConcurrency?: number;
  initialPrefetchCount?: number;
  extraFilter?: (name: string) => boolean;
  mergeDetail?: (prev: TDetail, next: TDetail) => TDetail;
};

export function useACNameDetailGrid<TDetail>(opts: UseACNameDetailGridOpts<TDetail>) {
  const {
    fetchNames,
    fetchDetail,
    search,

    pageSize = 45,
    thumbPrimary = 256,
    thumbFallback = 128,
    prefetchBuffer = 6,
    detailConcurrency = 3,
    initialPrefetchCount = 9,

    extraFilter,
    mergeDetail,
  } = opts;

  const normalizedSearch = String(search ?? "").trim().toLowerCase();

  // NOTE: keep internal raw loading state
  const [namesLoadingRaw, setNamesLoadingRaw] = useState(false);
  const [namesError, setNamesError] = useState<string | null>(null);
  const [namesLoadedOnce, setNamesLoadedOnce] = useState(false);
  const [names, setNames] = useState<string[]>([]);

  const [detailsByName, setDetailsByName] = useState<Record<string, TDetail>>({});
  const [detailThumbByName, setDetailThumbByName] = useState<Record<string, number>>({});
  const [detailLoadingByName, setDetailLoadingByName] = useState<Record<string, boolean>>({});

  const [visibleCount, setVisibleCount] = useState(pageSize);

  const pendingRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());
  const pumpRunningRef = useRef(false);

  const detailsByNameRef = useRef(detailsByName);
  useEffect(() => {
    detailsByNameRef.current = detailsByName;
  }, [detailsByName]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [normalizedSearch, pageSize, extraFilter]);

  useEffect(() => {
    if (namesLoadedOnce) return;

    let cancelled = false;

    (async () => {
      try {
        setNamesError(null);
        setNamesLoadingRaw(true);

        const list = await fetchNames();
        if (cancelled) return;

        setNames(list);
        setNamesLoadedOnce(true);
      } catch (e) {
        if (cancelled) return;
        console.warn(e);
        setNamesError(e instanceof Error ? e.message : "Failed to load list.");
      } finally {
        if (!cancelled) setNamesLoadingRaw(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [namesLoadedOnce, fetchNames]);

  // ✅ KEY FIX: prevent the “empty flash” on first render.
  // If we have never loaded once and we currently have no names, treat as loading.
  const namesLoading = namesLoadingRaw || (!namesLoadedOnce && names.length === 0 && !namesError);

  const filteredNames = useMemo(() => {
    let out = names;

    if (normalizedSearch) {
      out = out.filter((n) => String(n).toLowerCase().includes(normalizedSearch));
    }

    if (extraFilter) {
      out = out.filter((n) => {
        try {
          return !!extraFilter(n);
        } catch {
          return true;
        }
      });
    }

    return out;
  }, [names, normalizedSearch, extraFilter]);

  const visibleNames = useMemo(() => filteredNames.slice(0, visibleCount), [filteredNames, visibleCount]);

  const onEndReached = useCallback(() => {
    if (visibleCount >= filteredNames.length) return;
    setVisibleCount((c) => Math.min(c + pageSize, filteredNames.length));
  }, [visibleCount, filteredNames.length, pageSize]);

  const resetDetailsState = useCallback(() => {
    setDetailsByName({});
    setDetailThumbByName({});
    setDetailLoadingByName({});
    pendingRef.current.clear();
    inFlightRef.current.clear();
  }, []);

  const retryReloadNames = useCallback(async () => {
    try {
      setNamesError(null);
      setNamesLoadingRaw(true);

      const list = await fetchNames();
      setNames(list);
      setNamesLoadedOnce(true);

      resetDetailsState();
      setVisibleCount(pageSize);
    } catch (e) {
      console.warn(e);
      setNamesError(e instanceof Error ? e.message : "Failed to load list.");
    } finally {
      setNamesLoadingRaw(false);
    }
  }, [fetchNames, resetDetailsState, pageSize]);

  const setDetailMerged = useCallback(
    (name: string, next: TDetail) => {
      setDetailsByName((prev) => {
        const existing = prev[name];
        const merged = existing && mergeDetail ? mergeDetail(existing, next) : next;
        return { ...prev, [name]: merged };
      });
    },
    [mergeDetail]
  );

  const pumpQueue = useCallback(async () => {
    if (pumpRunningRef.current) return;
    pumpRunningRef.current = true;

    try {
      while (pendingRef.current.size > 0) {
        if (inFlightRef.current.size >= detailConcurrency) {
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }

        const next = pendingRef.current.values().next().value as string | undefined;
        if (!next) break;

        pendingRef.current.delete(next);

        if (detailsByNameRef.current[next] != null) continue;

        inFlightRef.current.add(next);
        setDetailLoadingByName((prev) => (prev[next] ? prev : { ...prev, [next]: true }));

        (async () => {
          try {
            try {
              const itemPrimary = await fetchDetail(next, { thumbsize: thumbPrimary });
              setDetailMerged(next, itemPrimary);
              setDetailThumbByName((prev) => ({ ...prev, [next]: thumbPrimary }));
              return;
            } catch {
              const itemFallback = await fetchDetail(next, { thumbsize: thumbFallback });
              setDetailMerged(next, itemFallback);
              setDetailThumbByName((prev) => ({ ...prev, [next]: thumbFallback }));
            }
          } catch {
            // swallow: bad names should not spam logs
          } finally {
            inFlightRef.current.delete(next);
            setDetailLoadingByName((prev) => {
              if (!prev[next]) return prev;
              const { [next]: _remove, ...rest } = prev;
              return rest;
            });
          }
        })();
      }
    } finally {
      pumpRunningRef.current = false;
    }
  }, [detailConcurrency, fetchDetail, thumbPrimary, thumbFallback, setDetailMerged]);

  const enqueueDetailsForNames = useCallback(
    (xs: string[]) => {
      let addedAny = false;

      for (const n of xs) {
        if (!n) continue;
        if (detailsByNameRef.current[n] != null) continue;
        if (pendingRef.current.has(n)) continue;
        if (inFlightRef.current.has(n)) continue;

        pendingRef.current.add(n);
        addedAny = true;
      }

      if (addedAny) void pumpQueue();
    },
    [pumpQueue]
  );

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 80,
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
      const indices: number[] = [];

      viewableItems.forEach((v) => {
        const i = v.index;
        if (typeof i === "number" && i >= 0) indices.push(i);
      });

      if (indices.length === 0) return;

      const min = Math.max(0, Math.min(...indices) - prefetchBuffer);
      const max = Math.min(visibleNames.length - 1, Math.max(...indices) + prefetchBuffer);

      enqueueDetailsForNames(visibleNames.slice(min, max + 1));
    },
    [visibleNames, enqueueDetailsForNames, prefetchBuffer]
  );

  useEffect(() => {
    if (!namesLoadedOnce) return;
    if (visibleNames.length === 0) return;

    const initial = visibleNames.slice(0, Math.min(initialPrefetchCount, visibleNames.length));
    enqueueDetailsForNames(initial);
  }, [namesLoadedOnce, visibleNames, enqueueDetailsForNames, initialPrefetchCount]);

  const onNeedFallbackThumb = useCallback(
    async (name: string) => {
      const used = detailThumbByName[name] ?? thumbPrimary;
      if (used <= thumbFallback) return;

      setDetailLoadingByName((prev) => (prev[name] ? prev : { ...prev, [name]: true }));

      try {
        const itemFallback = await fetchDetail(name, { thumbsize: thumbFallback });
        setDetailMerged(name, itemFallback);
        setDetailThumbByName((prev) => ({ ...prev, [name]: thumbFallback }));
      } finally {
        setDetailLoadingByName((prev) => {
          if (!prev[name]) return prev;
          const { [name]: _remove, ...rest } = prev;
          return rest;
        });
      }
    },
    [detailThumbByName, fetchDetail, thumbPrimary, thumbFallback, setDetailMerged]
  );

  return {
    namesLoading,
    namesError,
    namesLoadedOnce,
    allNames: names,
    filteredNames,
    visibleNames,
    visibleCount,
    onEndReached,
    retryReloadNames,
    detailsByName,
    detailThumbByName,
    detailLoadingByName,
    onNeedFallbackThumb,
    viewabilityConfigRef,
    onViewableItemsChanged,
  };
}
