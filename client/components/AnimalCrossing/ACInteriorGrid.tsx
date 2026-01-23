// components/AnimalCrossing/ACInteriorGrid.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { fetchInteriorIndex, type NookipediaInteriorIndexItem } from "@/lib/animalCrossing/nookipediaInterior";
import ACGridWrapper from "@/components/AnimalCrossing/ACGridWrapper";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";

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
  const { getEntry, toggleCollected, incrementCount, decrementCount } = useAnimalCrossingCollectionStore();

  const name = String(item?.name ?? "").trim();
  const category = String(item?.category ?? "").trim();
  const uri = String((item as any)?.image_url ?? "").trim();

  const entry = getEntry("interior", name);
  const isCollected = !!entry?.collected;
  const count = Number(entry?.count || 0);

  return (
    <View className="w-1/3 p-1">
      <View className="rounded-3xl p-3 border mb-1 bg-slate-900/80 border-slate-700 items-center">
        <Pressable onPress={() => (name ? onPress(name) : null)} className="items-center">
          <View style={{ width: THUMB, height: THUMB, alignItems: "center", justifyContent: "center" }}>
            {uri ? (
              <Image source={{ uri }} style={{ width: THUMB, height: THUMB }} resizeMode="contain" />
            ) : (
              <View className="w-[60px] h-[60px] rounded-2xl bg-slate-950/60 border border-slate-700 items-center justify-center">
                <Feather name="image" size={18} color="#64748b" />
              </View>
            )}
          </View>

          {/* Collected + Count controls */}
          <View className="flex-row items-center mt-2">
            <Pressable
              onPress={(e) => {
                (e as any)?.stopPropagation?.();
                if (!name) return;
                toggleCollected("interior", name);
              }}
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
                  onPress={(e) => {
                    (e as any)?.stopPropagation?.();
                    if (!name) return;
                    decrementCount("interior", name);
                  }}
                  className="w-6 h-6 rounded-xl bg-slate-950/60 border border-slate-700 items-center justify-center"
                >
                  <Text className="text-slate-100 text-[12px] font-bold">−</Text>
                </Pressable>

                <View className="px-2">
                  <Text className="text-[11px] text-slate-200 font-semibold">{count}</Text>
                </View>

                <Pressable
                  onPress={(e) => {
                    (e as any)?.stopPropagation?.();
                    if (!name) return;
                    incrementCount("interior", name);
                  }}
                  className="w-6 h-6 rounded-xl bg-slate-950/60 border border-slate-700 items-center justify-center"
                >
                  <Text className="text-slate-100 text-[12px] font-bold">+</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Text className="text-xs font-semibold text-slate-50 text-center mt-2" numberOfLines={2}>
            {name || "Unknown"}
          </Text>

          <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
            {category || "Interior"}
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

  const collectedSet = useMemo(() => {
    const xs = Array.isArray(collectedIds) ? collectedIds : [];
    const set = new Set<string>();
    xs.forEach((x) => {
      const s = String(x ?? "").trim();
      if (s) set.add(s);
    });
    return set;
  }, [collectedIds]);

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

    if (collectedSet.size > 0) {
      return baseFiltered.filter((it) => collectedSet.has(String(it?.name ?? "").trim()));
    }

    return [];
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
    const label = collectedOnly ? "collected" : "items";
    return `Showing ${visibleItems.length} / ${filtered.length} ${label}`;
  }, [visibleItems.length, filtered.length, collectedOnly]);

  return (
    <ACGridWrapper<NookipediaInteriorIndexItem>
      isInitialLoading={loading}
      initialLoadingText="Loading interior…"
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
