// components/AnimalCrossing/ACInteriorGrid.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";

import { fetchInteriorIndex, type NookipediaInteriorIndexItem } from "@/lib/animalCrossing/nookipediaInterior";
import ACGridWrapper from "@/components/AnimalCrossing/ACGridWrapper";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";
import LocalIcon from "@/components/LocalIcon";

type ACInteriorGridProps = {
  search: string;
  collectedOnly?: boolean;
  collectedIds?: string[];
};

const PAGE_SIZE = 45;
const THUMB = 60;

type InteriorTileProps = {
  item: NookipediaInteriorIndexItem;
  onPress: (name: string) => void;
};

const InteriorTile: React.FC<InteriorTileProps> = React.memo(({ item, onPress }) => {
  const name = useMemo(() => String(item?.name ?? "").trim(), [item?.name]);
  const category = useMemo(() => String((item as any)?.category ?? "").trim(), [item]);
  const uri = useMemo(() => String((item as any)?.image_url ?? "").trim(), [item]);

  const key = useMemo(() => `interior:${name}`, [name]);

  const entry = useAnimalCrossingCollectionStore(useCallback((s: any) => s.entries?.[key], [key]));
  const toggleCollected = useAnimalCrossingCollectionStore(useCallback((s: any) => s.toggleCollected, []));

  const isCollected = !!entry?.collected;

  useEffect(() => {
    if (!uri) return;
    ExpoImage.prefetch(uri).catch(() => {});
  }, [uri]);

  const onToggle = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      if (!name) return;
      toggleCollected("interior", name);
    },
    [toggleCollected, name]
  );

  return (
    <View className="w-1/3 p-1">
      <View className="rounded-3xl p-3 border mb-1 bg-slate-900/80 border-slate-700 items-center">
        <Pressable onPress={() => (name ? onPress(name) : null)} className="items-center">
          <View style={{ width: THUMB, height: THUMB, alignItems: "center", justifyContent: "center" }}>
            {uri ? (
              <ExpoImage
                source={{ uri }}
                style={{ width: THUMB, height: THUMB }}
                contentFit="contain"
                transition={120}
                cachePolicy="disk"
              />
            ) : (
              <View style={{ width: THUMB, height: THUMB, alignItems: "center", justifyContent: "center" }}>
                <LocalIcon
                  source={null}
                  size={THUMB}
                  roundedClassName="rounded-2xl"
                  placeholderClassName="bg-slate-950/60 border border-slate-700"
                />
                <View style={{ position: "absolute" }}>
                  <Feather name="image" size={18} color="#64748b" />
                </View>
              </View>
            )}
          </View>

          <View className="flex-row items-center mt-2">
            <Pressable
              onPress={onToggle}
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

          <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
            {category}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const ACInteriorGrid: React.FC<ACInteriorGridProps> = ({ search, collectedOnly = false, collectedIds }) => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<NookipediaInteriorIndexItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const normalizedSearch = useMemo(() => String(search ?? "").trim().toLowerCase(), [search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [normalizedSearch, collectedOnly, Array.isArray(collectedIds) ? collectedIds.length : 0]);

  const load = useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);
      const data = await fetchInteriorIndex();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Interior index failed:", e);
      setErr(e instanceof Error ? e.message : "Failed to load interior.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      if (!String(key).startsWith("interior:")) continue;

      const isCollected = !!(entry as any)?.collected;
      const count = Math.max(Number((entry as any)?.count || 0), 0);
      if (!isCollected && count <= 0) continue;

      const name = String(key).slice("interior:".length).trim();
      if (name) set.add(name);
    }

    return set;
  }, [entries, collectedOnly, collectedIds]);

  const baseFiltered = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    if (!normalizedSearch) return base;

    return base.filter((it) => {
      const name = String(it?.name ?? "").toLowerCase();
      const cat = String((it as any)?.category ?? "").toLowerCase();
      return name.includes(normalizedSearch) || cat.includes(normalizedSearch);
    });
  }, [items, normalizedSearch]);

  const filtered = useMemo(() => {
    if (!collectedOnly) return baseFiltered;
    if (collectedSet.size <= 0) return [];
    return baseFiltered.filter((it) => collectedSet.has(String(it?.name ?? "").trim()));
  }, [baseFiltered, collectedOnly, collectedSet]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const onEndReached = useCallback(() => {
    if (visibleCount >= filtered.length) return;
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
  }, [visibleCount, filtered.length]);

  const open = useCallback(
    (name: string) => {
      router.push({
        pathname: "/interior/[id]",
        params: { id: encodeURIComponent(String(name ?? "").trim()) },
      } as any);
    },
    [router]
  );

  const headerLine = useMemo(() => {
    const label = collectedOnly ? "collected interior" : "interior";
    return `Showing ${visibleItems.length} / ${filtered.length} ${label}`;
  }, [visibleItems.length, filtered.length, collectedOnly]);

  return (
    <ACGridWrapper<NookipediaInteriorIndexItem>
      isInitialLoading={loading}
      initialLoadingText={collectedOnly ? "Loading your collected interior…" : "Loading interior…"}
      errorText={err}
      onRetry={load}
      isEmpty={filtered.length === 0}
      emptyText={collectedOnly ? "No collected interior yet." : "No interior matches this search."}
      headerLine={headerLine}
      data={visibleItems}
      keyExtractor={(it, idx) => `${String(it?.name ?? "item")}::${idx}`}
      renderItem={({ item }) => <InteriorTile item={item} onPress={open} />}
      footerMode={visibleCount < filtered.length ? "more" : "end"}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.65}
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

export default ACInteriorGrid;
