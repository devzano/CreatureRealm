import React, { useMemo, useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

import PageWrapper from "@/components/PageWrapper";
import { fetchEventsIndex, type NookipediaEventItem } from "@/lib/animalCrossing/nookipediaEvents";
import { useAnimalCrossingCollectionStore, type ACCollectionKind } from "@/store/animalCrossingCollectionStore";

import EventWebModal from "./EventWebModal";
import ACVillagersGrid from "./ACVillagersGrid";
import ACFishSeaView from "./ACFishSeaView";
import ACFurnitureInteriorView from "./ACFurnitureInteriorView";
import ACBugGrid from "@/components/AnimalCrossing/ACBugGrid";
import ACClothingGrid from "./ACClothingGrid";
import ACFossilGrid from "./ACFossilGrid";
import ACGyroidsGrid from "./ACGyroidsGrid";
import ACPhotosGrid from "./ACPhotosGrid";
import ACToolsGrid from "./ACToolsGrid";
import ACArtGrid from "./ACArtGrid";
import ACItemsGrid from "./ACItemsGrid";
import ACRecipesGrid from "./ACRecipesGrid";

import BottomSheetModal from "@/components/ui/BottomSheetModal";

type AnimalCrossingHomeContentProps = {
  onBackToCollections: () => void;
};

type MainTab = "collectibles" | "collected";
type CollectibleTab =
  | "villagers"
  | "furniture"
  | "interior"
  | "fish"
  | "bugs"
  | "sea"
  | "clothing"
  | "fossils"
  | "art"
  | "items"
  | "recipes"
  | "photos"
  | "gyroids"
  | "tools";

type CollectiblesView = "menu" | "grid";
type CollectedView = "menu" | "list";

const KIND_LABELS: Record<ACCollectionKind, string> = {
  villager: "Villagers",
  furniture: "Furniture",
  interior: "Interior",
  fish: "Fish",
  seaCreature: "Sea Creatures",
  bug: "Bugs",
  clothing: "Clothing",
  fossil: "Fossils",
  art: "Art",
  item: "Items",
  recipe: "Recipes",
  photo: "Photos",
  gyroid: "Gyroids",
  tool: "Tools",
};

function parseEntryKey(key: string): { kind: ACCollectionKind; id: string; } | null {
  const s = String(key ?? "");
  const idx = s.indexOf(":");
  if (idx <= 0) return null;
  const kind = s.slice(0, idx) as ACCollectionKind;
  const id = s.slice(idx + 1);
  if (!kind || !id) return null;
  return { kind, id };
}

function parseISODateOnly(s: any): Date | null {
  const raw = String(s ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0); // local noon to avoid TZ edge issues
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function formatMonthShort(d: Date) {
  try {
    return d.toLocaleString(undefined, { month: "short" });
  } catch {
    const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return m[d.getMonth()] ?? "—";
  }
}

function formatDay2(d: Date) {
  const n = d.getDate();
  return n < 10 ? `0${n}` : String(n);
}

const AnimalCrossingHomeContent: React.FC<AnimalCrossingHomeContentProps> = ({ onBackToCollections }) => {
  const [mainTab, setMainTab] = useState<MainTab>("collectibles");
  const [collectiblesView, setCollectiblesView] = useState<CollectiblesView>("menu");
  const [collectibleTab, setCollectibleTab] = useState<CollectibleTab>("villagers");
  const [search, setSearch] = useState("");

  const entries = useAnimalCrossingCollectionStore((s) => s.entries);
  const [collectedView, setCollectedView] = useState<CollectedView>("menu");
  const [collectedKind, setCollectedKind] = useState<ACCollectionKind>("villager");

  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [events, setEvents] = useState<NookipediaEventItem[]>([]);
  const [eventsSheetVisible, setEventsSheetVisible] = useState(false);

  const [eventWebVisible, setEventWebVisible] = useState(false);
  const [eventWebUrl, setEventWebUrl] = useState<string>("");
  const [eventWebTitle, setEventWebTitle] = useState<string>("Event");
  const [eventWebSubtitle, setEventWebSubtitle] = useState<string>("Nookipedia • Event details");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setEventsError(null);
        setEventsLoading(true);

        const items = await fetchEventsIndex();
        if (cancelled) return;

        const cleaned = (Array.isArray(items) ? items : [])
          .filter((x) => !!String((x as any)?.event ?? "").trim())
          .slice();

        cleaned.sort((a: any, b: any) => {
          const da = parseISODateOnly(a?.date)?.getTime() ?? Number.POSITIVE_INFINITY;
          const db = parseISODateOnly(b?.date)?.getTime() ?? Number.POSITIVE_INFINITY;
          return da - db;
        });

        setEvents(cleaned);
      } catch (e) {
        if (cancelled) return;
        console.warn("Events load failed:", e);
        setEventsError(e instanceof Error ? e.message : "Failed to load events.");
        setEvents([]);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const pageTitle = useMemo(() => {
    if (mainTab === "collected") return "Collected";
    if (collectiblesView === "menu") return "Collectibles";

    switch (collectibleTab) {
      case "villagers":
        return "Villagers";
      case "furniture":
      case "interior":
        return "Home";
      case "fish":
      case "sea":
        return "Critterpedia";
      case "bugs":
        return "Bugs";
      case "clothing":
        return "Clothing";
      case "fossils":
        return "Fossils";
      case "art":
        return "Art";
      case "items":
        return "Items";
      case "recipes":
        return "Recipes";
      case "photos":
        return "Photos";
      case "gyroids":
        return "Gyroids";
      case "tools":
        return "Tools";
      default:
        return "Collectibles";
    }
  }, [mainTab, collectiblesView, collectibleTab]);

  const pageSubtitle = useMemo(() => {
    if (mainTab === "collected") return "Coming soon.";
    if (collectiblesView === "menu") return "Choose a category — powered by Nookipedia.";

    switch (collectibleTab) {
      case "villagers":
        return "Villagers • Personalities • Birthdays";
      case "furniture":
      case "interior":
        return "Furniture • Wallpaper • Flooring • Rugs";
      case "fish":
      case "sea":
        return "Fish • Sea Creatures";
      case "bugs":
        return "Bugs";
      case "clothing":
        return "Clothing";
      case "fossils":
        return "Fossils";
      case "art":
        return "Museum Art";
      case "items":
        return "Items & Materials";
      case "recipes":
        return "DIY Recipes";
      case "photos":
        return "Photos";
      case "gyroids":
        return "Gyroids";
      case "tools":
        return "Tools";
      default:
        return "Powered by Nookipedia.";
    }
  }, [mainTab, collectiblesView, collectibleTab]);

  const placeholder = useMemo(() => {
    if (mainTab === "collected") return "Search collected…";
    if (collectiblesView === "menu") return "Search collectibles…";

    if (collectibleTab === "villagers") return "Search villagers (name…)";
    if (collectibleTab === "furniture" || collectibleTab === "interior")
      return "Search furniture/interior (name / category…)";
    if (collectibleTab === "fish" || collectibleTab === "sea") return "Search critterpedia (name…)";
    if (collectibleTab === "bugs") return "Search bugs (name…)";
    if (collectibleTab === "clothing") return "Search clothing (name…)";
    if (collectibleTab === "fossils") return "Search fossils (name…)";
    if (collectibleTab === "art") return "Search art (name…)";
    if (collectibleTab === "items") return "Search items (name…)";
    if (collectibleTab === "recipes") return "Search recipes (name…)";
    if (collectibleTab === "photos") return "Search photos (name…)";
    if (collectibleTab === "gyroids") return "Search gyroids (name…)";
    if (collectibleTab === "tools") return "Search tools (name…)";

    return "Search…";
  }, [mainTab, collectiblesView, collectibleTab]);

  const collectedItems = useMemo(() => {
    // treat "owned" as count > 0 (your store logic sets count=0 when uncollected)
    const out: Array<{ kind: ACCollectionKind; id: string; count: number; }> = [];

    for (const [key, entry] of Object.entries(entries || {})) {
      const parsed = parseEntryKey(key);
      if (!parsed) continue;

      const count = Math.max(Number(entry?.count || 0), 0);
      const collected = !!entry?.collected;

      if (count > 0 || collected) {
        out.push({ kind: parsed.kind, id: parsed.id, count });
      }
    }

    // stable ordering: by kind then id
    out.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.id.localeCompare(b.id);
    });

    return out;
  }, [entries]);

  const collectedCountsByKind = useMemo(() => {
    const map: Partial<Record<ACCollectionKind, number>> = {};
    for (const x of collectedItems) {
      map[x.kind] = (map[x.kind] ?? 0) + 1;
    }
    return map;
  }, [collectedItems]);

  const collectedListForSelectedKind = useMemo(() => {
    return collectedItems.filter((x) => x.kind === collectedKind);
  }, [collectedItems, collectedKind]);

  const openCollectedKind = useCallback((kind: ACCollectionKind) => {
    setCollectedKind(kind);
    setCollectedView("list");
  }, []);

  const backToCollectedMenu = useCallback(() => {
    setCollectedView("menu");
  }, []);

  const openCollectible = useCallback((tab: CollectibleTab) => {
    setCollectibleTab(tab);
    setCollectiblesView("grid");
  }, []);

  const backToMenu = useCallback(() => {
    setCollectiblesView("menu");
  }, []);

  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
    [now]
  );

  const futureEvents = useMemo(() => {
    return events
      .map((e) => ({ e, d: parseISODateOnly((e as any)?.date) }))
      .filter((x) => !!x.d && x.d!.getTime() >= todayStart.getTime())
      .sort((a, b) => a.d!.getTime() - b.d!.getTime())
      .map((x) => x.e);
  }, [events, todayStart]);

  const topEvents = useMemo(() => {
    return futureEvents.slice(0, 3);
  }, [futureEvents]);

  const openEventsSheet = useCallback(() => setEventsSheetVisible(true), []);
  const closeEventsSheet = useCallback(() => setEventsSheetVisible(false), []);

  const openEventWeb = useCallback((item: NookipediaEventItem) => {
    const url = String((item as any)?.url ?? "").trim();
    if (!url) return;

    const title = String((item as any)?.event ?? "Event").trim() || "Event";
    const type = String((item as any)?.type ?? "Event").trim() || "Event";

    setEventWebUrl(url);
    setEventWebTitle(title);
    setEventWebSubtitle(`${type} • Nookipedia`);

    setEventsSheetVisible(false);
    setEventWebVisible(true);
  }, []);

  const closeEventWeb = useCallback(() => {
    setEventWebVisible(false);
  }, []);

  const EventRow = ({ item }: { item: NookipediaEventItem; }) => {
    const dt = parseISODateOnly((item as any)?.date);
    const title = String((item as any)?.event ?? "").trim();
    if (!title) return null;

    const month = dt ? formatMonthShort(dt) : "—";
    const day = dt ? formatDay2(dt) : "—";

    const url = String((item as any)?.url ?? "").trim();
    const hasUrl = !!url;

    return (
      <Pressable
        onPress={hasUrl ? () => openEventWeb(item) : undefined}
        className="flex-row items-center py-2 border-b border-slate-800/70"
      >
        <View className="w-[54px] items-center justify-center">
          <Text className="text-[10px] text-slate-500 font-semibold">{month.toUpperCase()}</Text>
          <Text className="text-[16px] text-slate-100 font-semibold">{day}</Text>
        </View>

        <View className="flex-1 pl-3">
          <Text className="text-[12px] text-slate-100 font-semibold" numberOfLines={2}>
            {title}
          </Text>
          <Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={1}>
            {String((item as any)?.type ?? "Event")}
          </Text>
        </View>

        {hasUrl ? (
          <View className="ml-2">
            <Feather name="external-link" size={16} color="#94a3b8" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const CategoryTile = ({
    title,
    subtitle,
    tab,
  }: {
    title: string;
    subtitle: string;
    tab: CollectibleTab;
  }) => {
    return (
      <Pressable
        onPress={() => openCollectible(tab)}
        className="flex-1 rounded-3xl bg-slate-900/80 border border-slate-700 px-3 py-3"
        style={{ minHeight: 78 }}
      >
        <View className="flex-1">
          <Text className="text-[12px] font-semibold text-slate-50" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-[10px] text-slate-400 mt-1" numberOfLines={1}>
            {subtitle}
          </Text>

          <View className="flex-row items-center mt-2">
            <Text className="text-[10px] text-slate-500">Open</Text>
            <View className="ml-1">
              <Feather name="chevron-right" size={14} color="#94a3b8" />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const gridLabel =
    collectibleTab === "villagers"
      ? "Villagers"
      : collectibleTab === "furniture" || collectibleTab === "interior"
        ? "Home"
        : collectibleTab === "fish" || collectibleTab === "sea"
          ? "Critterpedia"
          : collectibleTab === "bugs"
            ? "Bugs"
            : collectibleTab === "clothing"
              ? "Clothing"
              : collectibleTab === "fossils"
                ? "Fossils"
                : collectibleTab === "art"
                  ? "Art"
                  : collectibleTab === "items"
                    ? "Items"
                    : collectibleTab === "recipes"
                      ? "Recipes"
                      : collectibleTab === "photos"
                        ? "Photos"
                        : collectibleTab === "gyroids"
                          ? "Gyroids"
                          : "Tools";

  const showEventsCard = mainTab === "collectibles" && collectiblesView === "menu";

  return (
    <>
      <PageWrapper
        scroll={false}
        hideBackButton
        title={pageTitle}
        subtitle={pageSubtitle}
        leftActions={
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Animal Crossing
          </Text>
        }
        rightActions={
          <Pressable
            onPress={onBackToCollections}
            className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700"
          >
            <Text className="text-[11px] text-slate-300 font-semibold">Change Collection</Text>
          </Pressable>
        }
      >
        {showEventsCard ? (
          <View className="mt-4 mb-2">
            <View className="flex-row items-center justify-between px-1 mb-2">
              <View className="flex-row items-center">
                <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
                <View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Events
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">Today & upcoming • Nookipedia</Text>
                </View>
              </View>

              <Pressable
                onPress={openEventsSheet}
                className="px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700 flex-row items-center"
              >
                <Text className="text-[11px] text-slate-200 font-semibold mr-2">View All</Text>
                <Feather name="chevron-up" size={14} color="#cbd5e1" />
              </Pressable>
            </View>

            <View className="rounded-3xl bg-slate-900/80 border border-slate-700 px-4 py-3">
              {eventsLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator />
                  <Text className="ml-3 text-[11px] text-slate-400">Loading events…</Text>
                </View>
              ) : eventsError ? (
                <Text className="text-[11px] text-rose-300">{eventsError}</Text>
              ) : topEvents.length === 0 ? (
                <Text className="text-[11px] text-slate-400">No upcoming events found.</Text>
              ) : (
                <View>
                  {topEvents.map((e, idx) => (
                    <View key={`${String((e as any)?.event ?? "")}::${idx}`}>
                      <EventRow item={e} />
                    </View>
                  ))}
                  <Text className="text-[10px] text-slate-600 mt-2">
                    Showing {topEvents.length} • Tap “View All” for the full list.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Search bar */}
        <View className="mb-2">
          <View className="flex-row items-center rounded-2xl bg-slate-900 px-3 py-2 border border-slate-800">
            <Feather name="search" size={18} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={placeholder}
              placeholderTextColor="#6B7280"
              className="flex-1 ml-2 text-[13px] text-slate-100"
            />

            {search.trim().length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                hitSlop={10}
                className="ml-1 rounded-full p-1 bg-slate-800/80"
              >
                <Feather name="x" size={14} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* MAIN TABS */}
          <View className="flex-row items-center rounded-full bg-slate-900/80 border border-slate-700 p-1 mt-2">
            <Pressable
              onPress={() => setMainTab("collectibles")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${mainTab === "collectibles" ? "bg-slate-800" : ""
                }`}
            >
              <Text
                className={`text-[11px] font-semibold ${mainTab === "collectibles" ? "text-slate-50" : "text-slate-400"
                  }`}
              >
                Collectibles
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMainTab("collected")}
              className={`flex-1 rounded-full px-3 py-1.5 items-center justify-center ${mainTab === "collected" ? "bg-slate-800" : ""
                }`}
            >
              <Text
                className={`text-[11px] font-semibold ${mainTab === "collected" ? "text-slate-50" : "text-slate-400"
                  }`}
              >
                Collected
              </Text>
            </Pressable>
          </View>

          {/* Back to menu when in grid */}
          {mainTab === "collectibles" && collectiblesView === "grid" ? (
            <View className="mt-2 flex-row items-center justify-between">
              <Pressable
                onPress={backToMenu}
                className="px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700 flex-row items-center"
              >
                <Feather name="arrow-left" size={14} color="#cbd5e1" />
                <Text className="ml-2 text-[11px] text-slate-200 font-semibold">
                  Back to Collectibles
                </Text>
              </Pressable>

              <View className="px-3 py-2 rounded-2xl bg-slate-900/60 border border-slate-800">
                <Text className="text-[11px] text-slate-400">{gridLabel}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {mainTab === "collected" ? (
          <View className="flex-1">
            {collectedView === "menu" ? (
              <>
                <View className="flex-row items-center mb-2 px-1 mt-2">
                  <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
                  <View className="flex-1">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Collected
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      Your saved items by category
                    </Text>
                  </View>
                </View>

                {collectedItems.length === 0 ? (
                  <View className="rounded-3xl bg-slate-900/80 border border-slate-700 px-4 py-4">
                    <Text className="text-[12px] text-slate-200 font-semibold">Nothing collected yet</Text>
                    <Text className="text-[11px] text-slate-500 mt-1">
                      Go to Collectibles, open a category, and mark items as collected.
                    </Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 70 }}>
                    <View className="px-1" style={{ gap: 8 }}>
                      {(
                        Object.keys(KIND_LABELS) as Array<ACCollectionKind>
                      ).map((kind) => {
                        const count = collectedCountsByKind[kind] ?? 0;
                        if (count <= 0) return null;

                        return (
                          <Pressable
                            key={kind}
                            onPress={() => openCollectedKind(kind)}
                            className="rounded-3xl bg-slate-900/80 border border-slate-700 px-4 py-3"
                          >
                            <View className="flex-row items-center justify-between">
                              <View>
                                <Text className="text-[12px] font-semibold text-slate-50">
                                  {KIND_LABELS[kind]}
                                </Text>
                                <Text className="text-[10px] text-slate-400 mt-1">
                                  {count} collected
                                </Text>
                              </View>

                              <View className="flex-row items-center">
                                <Text className="text-[10px] text-slate-500 mr-1">Open</Text>
                                <Feather name="chevron-right" size={16} color="#94a3b8" />
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                {/* Back + header */}
                <View className="mt-2 flex-row items-center justify-between px-1">
                  <Pressable
                    onPress={backToCollectedMenu}
                    className="px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700 flex-row items-center"
                  >
                    <Feather name="arrow-left" size={14} color="#cbd5e1" />
                    <Text className="ml-2 text-[11px] text-slate-200 font-semibold">
                      Back to Collected
                    </Text>
                  </Pressable>

                  <View className="px-3 py-2 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <Text className="text-[11px] text-slate-400">{KIND_LABELS[collectedKind]}</Text>
                  </View>
                </View>

                {collectedKind === "bug" ? <ACBugGrid search={search} collectedOnly /> : null}
                {collectedKind === "art" ? <ACArtGrid search={search} collectedOnly /> : null}
              </>
            )}
          </View>
        ) : collectiblesView === "menu" ? (
          <View className="flex-1">
            <View className="flex-row items-center mb-2 px-1 mt-2">
              <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
              <View className="flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Categories
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">Choose what to browse</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 70 }}>
              <View className="px-1">
                <View className="flex-row" style={{ gap: 8 }}>
                  <CategoryTile title="Villagers" subtitle="Residents" tab="villagers" />
                  <CategoryTile title="Home" subtitle="Furniture • Interior" tab="furniture" />
                  <CategoryTile title="Fish • Sea" subtitle="Critterpedia" tab="fish" />
                </View>

                <View className="flex-row mt-2" style={{ gap: 8 }}>
                  <CategoryTile title="Bugs" subtitle="Critterpedia" tab="bugs" />
                  <CategoryTile title="Fossils" subtitle="Museum" tab="fossils" />
                  <CategoryTile title="Photos" subtitle="Villagers" tab="photos" />
                </View>

                <View className="flex-row mt-2" style={{ gap: 8 }}>
                  <CategoryTile title="Clothing" subtitle="Apparel" tab="clothing" />
                  <CategoryTile title="Art" subtitle="Museum" tab="art" />
                  <CategoryTile title="Items" subtitle="Materials" tab="items" />
                </View>

                <View className="flex-row mt-2" style={{ gap: 8 }}>
                  <CategoryTile title="Recipes" subtitle="DIY" tab="recipes" />
                  <CategoryTile title="Gyroids" subtitle="Gyroids" tab="gyroids" />
                  <CategoryTile title="Tools" subtitle="Tools" tab="tools" />
                </View>
              </View>
            </ScrollView>
          </View>
        ) : (
          <>
            <View className="flex-row items-center mb-1 px-1 mt-2">
              <View className="w-1.5 h-5 rounded-full mr-2 bg-slate-700" />
              <View className="flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {gridLabel}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">Nookipedia • New Horizons</Text>
              </View>
            </View>

            {collectibleTab === "villagers" ? <ACVillagersGrid search={search} /> : null}

            {collectibleTab === "furniture" || collectibleTab === "interior" ? (
              <ACFurnitureInteriorView
                search={search}
                initialMode={collectibleTab === "interior" ? "interior" : "furniture"}
              />
            ) : null}

            {collectibleTab === "fish" || collectibleTab === "sea" ? (
              <ACFishSeaView search={search} initialMode={collectibleTab === "sea" ? "sea" : "fish"} />
            ) : null}

            {collectibleTab === "bugs" ? <ACBugGrid search={search} /> : null}
            {collectibleTab === "clothing" ? <ACClothingGrid search={search} /> : null}
            {collectibleTab === "fossils" ? <ACFossilGrid search={search} /> : null}
            {collectibleTab === "art" ? <ACArtGrid search={search} /> : null}
            {collectibleTab === "items" ? <ACItemsGrid search={search} /> : null}
            {collectibleTab === "recipes" ? <ACRecipesGrid search={search} /> : null}
            {collectibleTab === "photos" ? <ACPhotosGrid search={search} /> : null}
            {collectibleTab === "gyroids" ? <ACGyroidsGrid search={search} /> : null}
            {collectibleTab === "tools" ? <ACToolsGrid search={search} /> : null}
          </>
        )}
      </PageWrapper>

      <BottomSheetModal visible={eventsSheetVisible} onRequestClose={closeEventsSheet}>
        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] text-slate-100 font-semibold">All Events</Text>
            <Pressable
              onPress={closeEventsSheet}
              className="p-2 rounded-full bg-slate-900/40 border border-slate-700"
            >
              <Feather name="x" size={16} color="#cbd5e1" />
            </Pressable>
          </View>

          <Text className="text-[11px] text-slate-500 mt-1">Today and upcoming events from Nookipedia</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            style={{ marginTop: 12 }}
          >
            <View className="mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Upcoming
              </Text>

              <View className="mt-2 rounded-3xl bg-slate-950/40 border border-slate-800 px-4">
                {eventsLoading ? (
                  <View className="py-4 flex-row items-center">
                    <ActivityIndicator />
                    <Text className="ml-3 text-[11px] text-slate-400">Loading…</Text>
                  </View>
                ) : futureEvents.length === 0 ? (
                  <View className="py-4">
                    <Text className="text-[11px] text-slate-500">No upcoming events found.</Text>
                  </View>
                ) : (
                  futureEvents.slice(0, 200).map((e, idx) => (
                    <View key={`future::${String((e as any)?.event ?? "")}::${idx}`}>
                      {/* @ts-ignore */}
                      <EventRow item={e} />
                    </View>
                  ))
                )}
              </View>

              <Text className="text-[10px] text-slate-600 mt-3">Tip: dates are from the API (YYYY-MM-DD).</Text>
            </View>
          </ScrollView>
        </View>
      </BottomSheetModal>

      <EventWebModal
        visible={eventWebVisible}
        onClose={closeEventWeb}
        title={eventWebTitle}
        subtitle={eventWebSubtitle}
        url={eventWebUrl}
        disclaimer="Viewing Nookipedia in-app. Use Safari if the page doesn’t load correctly."
      />
    </>
  );
};

export default AnimalCrossingHomeContent;
