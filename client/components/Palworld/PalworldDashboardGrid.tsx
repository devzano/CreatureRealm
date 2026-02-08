// components/Palworld/PalworldDashboardGrid.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, LayoutChangeEvent, Modal, TextInput, ActivityIndicator, InteractionManager } from "react-native";

export type DashboardRenderCtx = {
  scrollRef: React.RefObject<ScrollView | null>;
  scrollTo: (y: number, animated?: boolean) => void;

  getLocalSearch: (key: string) => string;
  setLocalSearch: (key: string, value: string) => void;
};

export type DashboardCategory<K extends string> = {
  key: K;
  title: string;
  subtitle: string;
  shown: number;
  total: number;
  items: any[];
  previewItems?: any[];
  render: (items: any[], ctx: DashboardRenderCtx) => React.ReactNode;
};

function safeName(x: any): string {
  const name =
    String(x?.name ?? "").trim() ||
    String(x?.title ?? "").trim() ||
    String(x?.label ?? "").trim() ||
    String(x?.categoryText ?? "").trim();
  if (name) return name;

  const slug = String(x?.slug ?? "").trim();
  return slug ? slug.replace(/_/g, " ").trim() : "Unknown";
}

function uniqOrder<K extends string>(order: K[], keysPresent: K[]) {
  const set = new Set<K>();
  const out: K[] = [];
  for (const k of order) {
    if (!keysPresent.includes(k)) continue;
    if (set.has(k)) continue;
    set.add(k);
    out.push(k);
  }
  for (const k of keysPresent) {
    if (!set.has(k)) {
      set.add(k);
      out.push(k);
    }
  }
  return out;
}

function moveIndex<T>(arr: T[], from: number, to: number) {
  const out = arr.slice();
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

export type PalworldDashboardGridProps<K extends string> = {
  search: string;
  totalShown: number;
  totalAll: number;
  categories: DashboardCategory<K>[];
  reorderEnabled?: boolean;
  order?: K[];
  onOrderChange?: (order: K[]) => void;
  defaultOrder?: K[];
  previewMax?: number;
};

export default function PalworldDashboardGrid<K extends string>(props: PalworldDashboardGridProps<K>) {
  const {
    search,
    totalShown,
    totalAll,
    categories,
    reorderEnabled = false,
    order,
    onOrderChange,
    defaultOrder,
    previewMax = 3,
  } = props;

  const normalizedSearch = (search ?? "").trim().toLowerCase();

  const scrollRef = useRef<ScrollView | null>(null);
  const headerHRef = useRef(0);

  const scrollTo = useCallback((y: number, animated: boolean = true) => {
    scrollRef.current?.scrollTo({ y: Math.max(y, 0), animated });
  }, []);

  const [localSearch, setLocalSearchState] = useState<Record<string, string>>({});

  const getLocalSearch = useCallback((key: string) => localSearch[key] ?? "", [localSearch]);

  const setLocalSearch = useCallback((key: string, value: string) => {
    setLocalSearchState((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  }, []);

  const renderCtx = useMemo<DashboardRenderCtx>(
    () => ({ scrollRef, scrollTo, getLocalSearch, setLocalSearch }),
    [scrollTo, getLocalSearch, setLocalSearch]
  );

  const [selected, setSelected] = useState<K | "all">("all");
  const [isReorderOpen, setIsReorderOpen] = useState(false);

  const [navBusy, setNavBusy] = useState(false);
  const navBusyRef = useRef(false);
  const busyTokenRef = useRef(0);

  const setNavBusySafe = useCallback((v: boolean) => {
    navBusyRef.current = v;
    setNavBusy(v);
  }, []);

  const beginNav = useCallback(
    (nextSelected: K | "all") => {
      // prevent double-taps stacking
      if (navBusyRef.current) return;

      const token = ++busyTokenRef.current;
      setNavBusySafe(true);

      InteractionManager.runAfterInteractions(() => {
        if (busyTokenRef.current !== token) return;

        setSelected(nextSelected);

        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);

        const MIN_MS = 220;
        const start = Date.now();

        const clear = () => {
          if (busyTokenRef.current !== token) return;

          const elapsed = Date.now() - start;
          const remaining = Math.max(0, MIN_MS - elapsed);

          setTimeout(() => {
            if (busyTokenRef.current !== token) return;
            setNavBusySafe(false);
          }, remaining);
        };

        requestAnimationFrame(clear);
      });
    },
    [setNavBusySafe]
  );

  const onStickyHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    headerHRef.current = e.nativeEvent.layout.height || 0;
  }, []);

  const categoryKeysPresent = useMemo(() => categories.map((c) => c.key), [categories]);

  const [internalOrder, setInternalOrder] = useState<K[]>(
    () => uniqOrder((defaultOrder ?? categoryKeysPresent) as K[], categoryKeysPresent)
  );

  useEffect(() => {
    const base = (order ?? internalOrder) as K[];
    const merged = uniqOrder(base, categoryKeysPresent);

    if (order) {
      const same = merged.length === order.length && merged.every((k, i) => k === order[i]);
      if (!same) onOrderChange?.(merged);
      return;
    }

    const same = merged.length === internalOrder.length && merged.every((k, i) => k === internalOrder[i]);
    if (!same) setInternalOrder(merged);
  }, [categoryKeysPresent, order, onOrderChange, internalOrder]);

  const currentOrder = (order ?? internalOrder) as K[];

  const setOrder = useCallback(
    (next: K[]) => {
      if (order) {
        onOrderChange?.(next);
        return;
      }
      setInternalOrder(next);
    },
    [order, onOrderChange]
  );

  const orderedCategories = useMemo(() => {
    const ord = uniqOrder(currentOrder, categoryKeysPresent);
    const map = new Map<K, DashboardCategory<K>>();
    for (const c of categories) map.set(c.key, c);
    return ord.map((k) => map.get(k)).filter(Boolean) as DashboardCategory<K>[];
  }, [categories, currentOrder, categoryKeysPresent]);

  const visibleCards = useMemo(() => {
    const base = orderedCategories;
    if (!normalizedSearch) return base;
    return base.filter((c) => c.shown > 0);
  }, [orderedCategories, normalizedSearch]);

  const handlePillPress = useCallback(
    (key: K | "all") => {
      if (key === selected) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      beginNav(key);
    },
    [beginNav, selected]
  );

  const renderCategoryHeader = useCallback(
    (title: string, subtitle: string, shown: number, total: number) => (
      <View className="px-4 mt-4 mb-2">
        <View className="flex-row items-center">
          <View className="w-1.5 h-5 rounded-full mr-2 bg-white/10" />
          <View className="flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{title}</Text>
            <Text className="text-[11px] text-white/45 mt-0.5">
              {subtitle} • {shown} / {total}
            </Text>
          </View>

          <Pressable
            onPress={() => beginNav("all")}
            className="ml-2 px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] active:opacity-90"
          >
            <Text className="text-[10px] text-white/60">Back</Text>
          </Pressable>
        </View>
      </View>
    ),
    [beginNav]
  );

  const renderSingleCategory = useCallback(() => {
    if (selected === "all") return null;

    const cat = orderedCategories.find((c) => c.key === selected);
    if (!cat) return null;

    const isEmpty = cat.shown === 0;

    return (
      <View>
        {renderCategoryHeader(cat.title, cat.subtitle, cat.shown, cat.total)}
        {isEmpty ? (
          <View className="px-4">
            <EmptyState
              title={`No ${cat.title.toLowerCase()} found`}
              subtitle={normalizedSearch ? "Try a different search." : "Nothing in this category yet."}
            />
          </View>
        ) : (
          cat.render(cat.items, renderCtx)
        )}
        <View className="h-10" />
      </View>
    );
  }, [orderedCategories, selected, normalizedSearch, renderCategoryHeader, renderCtx]);

  const canOpenReorder = reorderEnabled && selected === "all";

  const moveKey = useCallback(
    (key: K, dir: -1 | 1) => {
      const base = uniqOrder(currentOrder, categoryKeysPresent);
      const idx = base.indexOf(key);
      if (idx < 0) return;
      const nextIdx = Math.max(0, Math.min(base.length - 1, idx + dir));
      if (nextIdx === idx) return;
      setOrder(moveIndex(base, idx, nextIdx));
    },
    [currentOrder, categoryKeysPresent, setOrder]
  );

  const moveKeyToTop = useCallback(
    (key: K) => {
      const base = uniqOrder(currentOrder, categoryKeysPresent);
      const idx = base.indexOf(key);
      if (idx <= 0) return;
      setOrder(moveIndex(base, idx, 0));
    },
    [currentOrder, categoryKeysPresent, setOrder]
  );

  const resetOrder = useCallback(() => {
    const base = (defaultOrder ?? categoryKeysPresent) as K[];
    setOrder(uniqOrder(base, categoryKeysPresent));
  }, [defaultOrder, categoryKeysPresent, setOrder]);

  const reorderList = useMemo(() => {
    const ord = uniqOrder(currentOrder, categoryKeysPresent);
    const map = new Map<K, DashboardCategory<K>>();
    for (const c of categories) map.set(c.key, c);
    return ord.map((k) => map.get(k)).filter(Boolean) as DashboardCategory<K>[];
  }, [categories, currentOrder, categoryKeysPresent]);

  const showMerchantPinnedSearch = selected === ("merchants" as any);
  const showDungeonPinnedSearch = selected === ("dungeons" as any);

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 44 }}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        <View onLayout={onStickyHeaderLayout} className="px-4 pt-2 pb-3 bg-black/60 border-b border-white/10">
          <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-white/60">
                Showing <Text className="text-white/85 font-semibold">{totalShown}</Text> /{" "}
                <Text className="text-white/75">{totalAll}</Text> items
              </Text>

              {reorderEnabled && (
                <Pressable
                  onPress={() => {
                    if (!canOpenReorder) return;
                    setIsReorderOpen(true);
                  }}
                  className={[
                    "ml-3 px-2 py-1 rounded-full border",
                    canOpenReorder ? "border-white/15 bg-white/[0.05]" : "border-white/10 bg-white/[0.03] opacity-60",
                  ].join(" ")}
                >
                  <Text className="text-[10px] text-white/70">Reorder</Text>
                </Pressable>
              )}
            </View>

            {!!normalizedSearch && (
              <Text className="text-[11px] text-white/40 mt-0.5" numberOfLines={1}>
                Search: “{(search ?? "").trim()}”
              </Text>
            )}

            <View className="mt-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Pill label="Dashboard" count={totalShown} active={selected === "all"} onPress={() => handlePillPress("all")} />
                {orderedCategories.map((c) => (
                  <Pill key={String(c.key)} label={c.title} count={c.shown} active={selected === c.key} onPress={() => handlePillPress(c.key)} />
                ))}
              </ScrollView>
            </View>

            {showMerchantPinnedSearch ? (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  value={getLocalSearch("merchants")}
                  onChangeText={(t) => setLocalSearch("merchants", t)}
                  placeholder="Search merchant items..."
                  placeholderTextColor={"rgba(255,255,255,0.45)"}
                  style={{
                    height: 40,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                />
              </View>
            ) : showDungeonPinnedSearch ? (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  value={getLocalSearch("dungeons")}
                  onChangeText={(t) => setLocalSearch("dungeons", t)}
                  placeholder="Search dungeons, pals, or treasure..."
                  placeholderTextColor={"rgba(255,255,255,0.45)"}
                  style={{
                    height: 40,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>

        {selected !== "all" ? (
          <View>{renderSingleCategory()}</View>
        ) : (
          <View className="px-4 pt-4">
            {visibleCards.length === 0 ? (
              <EmptyState title="No results" subtitle={normalizedSearch ? "Try a different search." : "No items available."} />
            ) : (
              <>
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {visibleCards.map((c) => {
                    const source = (c.previewItems ?? c.items ?? []) as any[];
                    const topNames = source.slice(0, previewMax).map(safeName);
                    const hasMore = c.shown > previewMax;

                    return (
                      <Pressable
                        key={String(c.key)}
                        onPress={() => beginNav(c.key)}
                        disabled={navBusy}
                        className={[
                          "rounded-3xl border border-white/10 bg-white/[0.03]",
                          navBusy ? "opacity-70" : "active:opacity-90",
                        ].join(" ")}
                        style={{ width: "48%" }}
                      >
                        <DashboardCard
                          title={c.title}
                          subtitle={c.subtitle}
                          shown={c.shown}
                          topNames={topNames}
                          hasMore={hasMore}
                          moreCount={c.shown - previewMax}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <View className="h-10" />
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Dim + loader overlay */}
      {navBusy ? (
        <View
          pointerEvents="auto"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(0,0,0,0.55)",
            }}
          >
            <ActivityIndicator />
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 8, fontSize: 12, fontWeight: "600" }}>
              Opening…
            </Text>
          </View>
        </View>
      ) : null}

      <Modal visible={isReorderOpen} transparent animationType="fade" onRequestClose={() => setIsReorderOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.70)" }} className="px-4 justify-end">
          <View className="rounded-3xl border border-white/10 bg-black/90 overflow-hidden">
            <View className="px-4 py-3 border-b border-white/10 flex-row items-center justify-between">
              <View>
                <Text className="text-[12px] text-white/85 font-semibold">Reorder dashboard</Text>
                <Text className="text-[10px] text-white/45 mt-0.5">Use Up/Down to change category order.</Text>
              </View>

              <Pressable
                onPress={() => setIsReorderOpen(false)}
                className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] active:opacity-90"
              >
                <Text className="text-[10px] text-white/70">Done</Text>
              </Pressable>
            </View>

            <View className="px-4 py-2 flex-row items-center justify-between">
              <Pressable onPress={resetOrder} className="px-3 py-2 rounded-2xl border border-white/10 bg-white/[0.04] active:opacity-90">
                <Text className="text-[11px] text-white/70">Reset to default</Text>
              </Pressable>

              {!!normalizedSearch && (
                <Text className="text-[10px] text-white/40 ml-3 flex-1 text-right">Tip: clear search to see dashboard cards.</Text>
              )}
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              {reorderList.map((c, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === reorderList.length - 1;

                return (
                  <View key={String(c.key)} className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <View className="flex-row items-center justify-between">
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text className="text-[12px] text-white/85 font-semibold" numberOfLines={1}>
                          {c.title}
                        </Text>
                        <Text className="text-[10px] text-white/45 mt-0.5" numberOfLines={1}>
                          {c.subtitle} • {c.shown} / {c.total}
                        </Text>
                      </View>

                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <Pressable
                          onPress={() => moveKeyToTop(c.key)}
                          className={[
                            "px-2 py-2 rounded-xl border",
                            isFirst ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/[0.04]",
                          ].join(" ")}
                          disabled={isFirst}
                        >
                          <Text className="text-[10px] text-white/70">Top</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => moveKey(c.key, -1)}
                          className={[
                            "px-2 py-2 rounded-xl border",
                            isFirst ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/[0.04]",
                          ].join(" ")}
                          disabled={isFirst}
                        >
                          <Text className="text-[10px] text-white/70">Up</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => moveKey(c.key, 1)}
                          className={[
                            "px-2 py-2 rounded-xl border",
                            isLast ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/[0.04]",
                          ].join(" ")}
                          disabled={isLast}
                        >
                          <Text className="text-[10px] text-white/70">Down</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <View className="h-8" />
        </View>
      </Modal>
    </View>
  );
}

function DashboardCard(props: {
  title: string;
  subtitle: string;
  shown: number;
  topNames: string[];
  hasMore: boolean;
  moreCount: number;
}) {
  const { title, subtitle, shown, topNames, hasMore, moreCount } = props;

  return (
    <View className="p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] text-white/85 font-semibold">{title}</Text>
        <View className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.04]">
          <Text className="text-[10px] text-white/60">{shown}</Text>
        </View>
      </View>

      <Text className="text-[11px] text-white/45 mt-0.5" numberOfLines={1}>
        {subtitle}
      </Text>

      <View className="mt-3">
        {topNames.length === 0 ? (
          <Text className="text-[11px] text-white/35">Nothing here yet</Text>
        ) : (
          <View style={{ gap: 4 }}>
            {topNames.map((n, idx) => (
              <Text key={`${title}-n-${idx}`} className="text-[11px] text-white/60" numberOfLines={1}>
                • {n}
              </Text>
            ))}
            {hasMore && (
              <Text className="text-[11px] text-white/35" numberOfLines={1}>
                + {moreCount} more
              </Text>
            )}
          </View>
        )}
      </View>

      <View className="mt-3">
        <View className="rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
          <Text className="text-[11px] text-white/70">Open {title}</Text>
        </View>
      </View>
    </View>
  );
}

function Pill(props: { label: string; count: number; active: boolean; onPress: () => void }) {
  const { label, count, active, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      className={[
        "px-3 py-1.5 rounded-full border",
        active ? "border-white/25 bg-white/[0.08]" : "border-white/10 bg-white/[0.04]",
      ].join(" ")}
    >
      <Text className={["text-[11px]", active ? "text-white/85 font-semibold" : "text-white/60"].join(" ")}>
        {label} <Text className="text-white/35">({count})</Text>
      </Text>
    </Pressable>
  );
}

function EmptyState(props: { title: string; subtitle?: string }) {
  const { title, subtitle } = props;
  return (
    <View className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <Text className="text-[12px] text-white/80 font-semibold">{title}</Text>
      {!!subtitle && <Text className="text-[11px] text-white/45 mt-1">{subtitle}</Text>}
    </View>
  );
}
