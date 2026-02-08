//components/Palworld/Upgrades/PalDungeonsGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { DungeonWithPals } from "@/lib/palworld/upgrades/paldbDungeonsPals";
import { safeText, clamp } from "../Construction/palGridKit";
import { Ionicons } from "@expo/vector-icons";

function containsFold(hay: any, needle: string) {
  const h = safeText(hay).toLowerCase();
  const n = safeText(needle).toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function prettyHeader(v: any) {
  const s = safeText(v);
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function fmtMaybe(v: any) {
  const s = safeText(v);
  return s ? s : "—";
}

type PalDungeonsGridProps = {
  items: DungeonWithPals[];
  emptyText?: string;
  numColumns?: number;
  query?: string;
  onQueryChange?: (q: string) => void;
  hideSearchBar?: boolean;
};

export default function PalDungeonsGrid(props: PalDungeonsGridProps) {
  const {
    items,
    emptyText = "No dungeons found.",
    numColumns: numColumnsRaw = 3,
    query: queryControlled,
    onQueryChange,
    hideSearchBar = false,
  } = props;

  const numColumns = clamp(Math.floor(numColumnsRaw || 3), 2, 6);

  const [queryInternal, setQueryInternal] = useState("");
  const query = queryControlled != null ? queryControlled : queryInternal;
  const setQuery = onQueryChange ?? setQueryInternal;

  const [selected, setSelected] = useState<{
    dungeonSlug: string;
    dungeonName: string;
    dungeonLevelText: string | null;
    palSlug: string | null;
    palName: string;
    iconUrl: string | null;
    palLevelText: string | null;
    source: "boss" | "normal";
  } | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);

  const [selectedTreasure, setSelectedTreasure] = useState<{
    dungeonSlug: string;
    dungeonName: string;
    dungeonLevelText: string | null;
    itemSlug: string | null;
    itemName: string;
    iconUrl: string | null;
    qtyText: string | null;
    rateText: string | null;
  } | null>(null);

  const [treasureSheetOpen, setTreasureSheetOpen] = useState(false);

  const filteredDungeons = useMemo(() => {
    const q = safeText(query);
    const base = items ?? [];

    const ordered = [...base].sort((a, b) => {
      const aIsYak = safeText(a.slug) === "___" || safeText(a.name).toLowerCase() === "yakushima";
      const bIsYak = safeText(b.slug) === "___" || safeText(b.name).toLowerCase() === "yakushima";
      if (aIsYak !== bIsYak) return aIsYak ? 1 : -1;
      return 0;
    });

    if (!q) return ordered;

    return ordered.filter((d) => {
      if (containsFold(d.name, q) || containsFold(d.slug, q) || containsFold(d.levelText, q)) return true;

      for (const p of d.pals ?? []) {
        if (
          containsFold(p.palName, q) ||
          containsFold(p.palSlug, q) ||
          containsFold(p.levelText, q) ||
          containsFold(p.source, q)
        ) {
          return true;
        }
      }

      for (const t of d.treasure ?? []) {
        if (
          containsFold(t.name, q) ||
          containsFold(t.slug, q) ||
          containsFold(t.qtyText, q) ||
          containsFold((t as any).rateText, q) ||
          containsFold(t.weightText, q)
        ) {
          return true;
        }
      }

      return false;
    });
  }, [items, query]);

  const openSheet = useCallback((dungeon: DungeonWithPals, pal: DungeonWithPals["pals"][number]) => {
    setSelected({
      dungeonSlug: dungeon.slug,
      dungeonName: dungeon.name,
      dungeonLevelText: dungeon.levelText,
      palSlug: pal.palSlug,
      palName: pal.palName,
      iconUrl: pal.iconUrl,
      palLevelText: pal.levelText,
      source: pal.source,
    });
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSelected(null);
  }, []);

  const openTreasureSheet = useCallback((dungeon: DungeonWithPals, t: any) => {
    const name = safeText(t?.name) || safeText(t?.slug) || "Item";
    const qtyText = safeText(t?.qtyText) || null;
    const rateText = safeText(t?.rateText) || safeText(t?.weightText) || null;

    setSelectedTreasure({
      dungeonSlug: dungeon.slug,
      dungeonName: dungeon.name,
      dungeonLevelText: dungeon.levelText,
      itemSlug: safeText(t?.slug) ? safeText(t.slug) : null,
      itemName: name,
      iconUrl: t?.iconUrl ?? null,
      qtyText,
      rateText,
    });

    setTreasureSheetOpen(true);
  }, []);

  const closeTreasureSheet = useCallback(() => {
    setTreasureSheetOpen(false);
    setSelectedTreasure(null);
  }, []);

  const gap = 10;
  const cardWPercent = 100 / numColumns;

  const cardOuterStyle = useMemo(
    () => ({
      width: `${cardWPercent}%` as any,
      padding: gap / 2,
    }),
    [cardWPercent]
  );

  const renderPalCard = useCallback(
    (dungeon: DungeonWithPals, pal: DungeonWithPals["pals"][number], idx: number) => {
      const title = safeText(pal.palName) || safeText(pal.palSlug) || "Pal";
      const icon = pal.iconUrl;

      const metaParts: string[] = [];
      if (safeText(pal.levelText)) metaParts.push(fmtMaybe(pal.levelText));
      else if (safeText(dungeon.levelText)) metaParts.push(fmtMaybe(dungeon.levelText));
      if (metaParts.length === 0) metaParts.push("Tap for details");

      return (
        <View key={`${dungeon.slug}__${safeText(pal.palSlug) || title}__${idx}`} style={cardOuterStyle}>
          <Pressable
            onPress={() => openSheet(dungeon, pal)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              padding: 10,
              backgroundColor: "rgba(255,255,255,0.04)",
              height: 68,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginRight: 10,
                }}
              >
                {icon ? <RemoteIcon uri={icon} size={40} /> : <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: "white", fontWeight: "800", fontSize: 13, lineHeight: 16 }}>
                  {title}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      );
    },
    [cardOuterStyle, openSheet]
  );

  const renderTreasureSection = useCallback(
    (d: DungeonWithPals) => {
      const q = safeText(query);

      const all = d.treasure ?? [];
      const treasure =
        !q
          ? all
          : all.filter((t: any) => {
            return (
              containsFold(d.name, q) ||
              containsFold(d.slug, q) ||
              containsFold(d.levelText, q) ||
              containsFold(t.name, q) ||
              containsFold(t.slug, q) ||
              containsFold(t.qtyText, q) ||
              containsFold(t.rateText, q) ||
              containsFold(t.weightText, q)
            );
          });

      const count = treasure.length;
      if (count === 0) return null;

      const COLS = 3;
      const gridGap = 10;
      const tilePad = 8;
      const tileH = 74;
      const maxRows = 4;
      const maxGridHeight = maxRows * tileH + (maxRows - 1) * (gridGap / 2);

      const tileOuterStyle = {
        width: `${100 / COLS}%` as any,
        padding: gridGap / 2,
      };

      return (
        <View style={{ marginTop: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingHorizontal: 6,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "900" }}>Treasure</Text>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              {count} item{count === 1 ? "" : "s"}
            </Text>
          </View>

          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.04)",
              padding: 6,
            }}
          >
            <ScrollView
              style={{ maxHeight: maxGridHeight }}
              contentContainerStyle={{ padding: 6 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -(gridGap / 2) }}>
                {treasure.map((t: any, idx: number) => {
                  const name = safeText(t.name) || safeText(t.slug) || "Item";
                  const qty = safeText(t.qtyText);
                  const rate = safeText(t.rateText) || safeText(t.weightText);

                  const topParts: string[] = [];
                  if (qty) topParts.push(qty);

                  return (
                    <View key={`${safeText(d.slug)}__treasure__${safeText(t.slug)}__${idx}`} style={tileOuterStyle}>
                      <Pressable
                        onPress={() => openTreasureSheet(d, t)}
                        style={{
                          height: tileH,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.10)",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          padding: tilePad,
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                          }}
                        >
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              backgroundColor: "rgba(255,255,255,0.06)",
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.10)",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                            }}
                          >
                            {t.iconUrl ? (
                              <RemoteIcon uri={t.iconUrl} size={28} />
                            ) : (
                              <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>
                            )}
                          </View>

                          <View style={{ marginLeft: 10, flex: 1, alignItems: "flex-end" }}>
                            <Text
                              numberOfLines={1}
                              style={{
                                color: topParts.length ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.35)",
                                fontSize: 11,
                                textAlign: "right",
                              }}
                            >
                              {topParts.length ? topParts.join(" • ") : "—"}
                            </Text>

                            <Text
                              numberOfLines={1}
                              style={{
                                marginTop: 2,
                                color: rate ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)",
                                fontSize: 10,
                                textAlign: "right",
                              }}
                            >
                              {rate || "—"}
                            </Text>
                          </View>
                        </View>

                        <Text
                          numberOfLines={1}
                          style={{
                            color: "white",
                            fontWeight: "800",
                            fontSize: 12,
                            lineHeight: 15,
                          }}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      );
    },
    [query, openTreasureSheet]
  );

  const isEmpty = filteredDungeons.length === 0;

  return (
    <View style={{ flex: 1 }}>
      {!hideSearchBar ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search dungeons, pals, or treasure..."
            placeholderTextColor={"rgba(255,255,255,0.45)"}
            style={{
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

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {isEmpty ? (
          <View style={{ padding: 18 }}>
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>{emptyText}</Text>
          </View>
        ) : (
          filteredDungeons.map((d) => {
            const headerTitle = prettyHeader(d.name || d.slug);
            const q = safeText(query);

            const palsAll =
              !q
                ? d.pals ?? []
                : (d.pals ?? []).filter((p) => {
                  return (
                    containsFold(d.name, q) ||
                    containsFold(d.slug, q) ||
                    containsFold(d.levelText, q) ||
                    containsFold(p.palName, q) ||
                    containsFold(p.palSlug, q) ||
                    containsFold(p.levelText, q) ||
                    containsFold(p.source, q)
                  );
                });

            const bossPals = palsAll.filter((p) => p.source === "boss");
            const normalPals = palsAll.filter((p) => p.source === "normal");

            const renderGroup = (title: string, list: typeof palsAll) => {
              if (list.length === 0) return null;

              return (
                <View style={{ marginTop: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      paddingHorizontal: 6,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "900" }}>{title}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                      {list.length} pal{list.length === 1 ? "" : "s"}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -(gap / 2) }}>
                    {list.map((p, idx) => renderPalCard(d, p, idx))}
                  </View>
                </View>
              );
            };

            const treasureCount = (d.treasure ?? []).length;

            return (
              <View key={d.slug} style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    paddingHorizontal: 6,
                    marginBottom: 6,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                    <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }} numberOfLines={2}>
                      {headerTitle} {safeText(d.levelText) ? (
                        <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 9.5 }} numberOfLines={1}>
                          {fmtMaybe(d.levelText)}
                        </Text>
                      ) : null}
                    </Text>
                  </View>

                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                    {palsAll.length} pal{palsAll.length === 1 ? "" : "s"} • {treasureCount} item{treasureCount === 1 ? "" : "s"}
                  </Text>
                </View>

                {renderGroup("Boss Spawns", bossPals)}
                {renderGroup("Normal Spawns", normalPals)}
                {renderTreasureSection(d)}
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomSheetModal
        visible={sheetOpen}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 250, paddingBottom: 10 }}
      >
        {selected ? (
          <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginRight: 12,
                }}
              >
                {selected.iconUrl ? <RemoteIcon uri={selected.iconUrl} size={50} /> : <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }} numberOfLines={2}>
                  {safeText(selected.palName) || safeText(selected.palSlug) || "Pal"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 2 }} numberOfLines={1}>
                  {prettyHeader(selected.dungeonName || selected.dungeonSlug)}
                </Text>
              </View>

              <Pressable
                onPress={closeSheet}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>

            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                backgroundColor: "rgba(255,255,255,0.04)",
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Dungeon: <Text style={{ color: "white", fontWeight: "800" }}>{prettyHeader(selected.dungeonName || selected.dungeonSlug)}</Text>
              </Text>

              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Dungeon Level: <Text style={{ color: "white", fontWeight: "800" }}>{fmtMaybe(selected.dungeonLevelText)}</Text>
              </Text>

              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Pal Level: <Text style={{ color: "white", fontWeight: "800" }}>{fmtMaybe(selected.palLevelText)}</Text>
              </Text>

              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Source:{" "}
                <Text style={{ color: "white", fontWeight: "800" }}>
                  {selected.source === "boss" ? "Boss Spawns" : "Normal Spawns"}
                </Text>
              </Text>
            </View>
          </ScrollView>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        visible={treasureSheetOpen}
        onRequestClose={closeTreasureSheet}
        sheetStyle={{ maxHeight: "65%", minHeight: 250, paddingBottom: 10 }}
      >
        {selectedTreasure ? (
          <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginRight: 12,
                }}
              >
                {selectedTreasure.iconUrl ? (
                  <RemoteIcon uri={selectedTreasure.iconUrl} size={50} />
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }} numberOfLines={2}>
                  {safeText(selectedTreasure.itemName) || safeText(selectedTreasure.itemSlug) || "Item"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 2 }} numberOfLines={1}>
                  {prettyHeader(selectedTreasure.dungeonName || selectedTreasure.dungeonSlug)}
                </Text>
              </View>

              <Pressable
                onPress={closeSheet}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>

            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                backgroundColor: "rgba(255,255,255,0.04)",
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Dungeon:{" "}
                <Text style={{ color: "white", fontWeight: "800" }}>
                  {prettyHeader(selectedTreasure.dungeonName || selectedTreasure.dungeonSlug)}
                </Text>
              </Text>

              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Dungeon Level:{" "}
                <Text style={{ color: "white", fontWeight: "800" }}>{fmtMaybe(selectedTreasure.dungeonLevelText)}</Text>
              </Text>

              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Quantity: <Text style={{ color: "white", fontWeight: "800" }}>{fmtMaybe(selectedTreasure.qtyText)}</Text>
              </Text>

              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Drop Rate: <Text style={{ color: "white", fontWeight: "800" }}>{fmtMaybe(selectedTreasure.rateText)}</Text>
              </Text>
            </View>
          </ScrollView>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}
