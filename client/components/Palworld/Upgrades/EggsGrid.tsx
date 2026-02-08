// components/Palworld/Upgrades/EggsGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { EggRow, EggPalRef } from "@/lib/palworld/upgrades/paldbEggPals";
import { safeText, clamp } from "../Construction/palGridKit";

type PalEggsGridProps = {
  items: EggRow[];
  emptyText?: string;
  numColumns?: number;
};

type EggSection = { tier: string; rows: EggRow[] };

function prettyHeader(v: any) {
  const s = safeText(v);
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function prettyTier(tier: string) {
  const t = safeText(tier).toLowerCase();
  if (t === "huge") return "Huge Eggs";
  if (t === "large") return "Large Eggs";
  if (t === "normal") return "Eggs";
  return prettyHeader(tier);
}

function buildSections(rows: EggRow[]): EggSection[] {
  const map = new Map<string, EggRow[]>();

  for (const r of rows ?? []) {
    const tier = safeText(r?.egg?.tier) || "normal";
    const arr = map.get(tier);
    if (arr) arr.push(r);
    else map.set(tier, [r]);
  }

  const sections: EggSection[] = Array.from(map.entries()).map(([tier, list]) => {
    const sorted = [...list].sort((a, b) => {
      const an = safeText(a?.egg?.name).toLowerCase();
      const bn = safeText(b?.egg?.name).toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return { tier, rows: sorted };
  });

  const tierRank = (t: string) => {
    const k = safeText(t).toLowerCase();
    if (k === "normal") return 0;
    if (k === "large") return 1;
    if (k === "huge") return 2;
    return 9;
  };

  sections.sort((a, b) => {
    const ar = tierRank(a.tier);
    const br = tierRank(b.tier);
    if (ar !== br) return ar - br;
    const ak = safeText(a.tier).toLowerCase();
    const bk = safeText(b.tier).toLowerCase();
    if (ak < bk) return -1;
    if (ak > bk) return 1;
    return 0;
  });

  return sections;
}

function chipTextFromPals(pals: EggPalRef[]) {
  const n = pals?.length ?? 0;
  if (!n) return "No pals";
  if (n === 1) return "1 pal";
  return `${n} pals`;
}

function countPalsInSection(rows: EggRow[]) {
  let n = 0;
  for (const r of rows ?? []) n += (r?.pals?.length ?? 0);
  return n;
}

export default function PalEggsGrid(props: PalEggsGridProps) {
  const { items, emptyText = "No eggs found.", numColumns: numColumnsRaw = 3 } = props;

  const numColumns = clamp(Math.floor(numColumnsRaw || 3), 2, 6);

  const [selected, setSelected] = useState<EggRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sections = useMemo(() => buildSections(items ?? []), [items]);

  const openSheet = useCallback((row: EggRow) => {
    setSelected(row);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSelected(null);
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

  const renderEggCard = useCallback(
    (row: EggRow, idx: number) => {
      const title = safeText(row?.egg?.name) || safeText(row?.egg?.slug) || "Egg";
      const icon = row?.egg?.iconUrl ?? null;
      const pals = row?.pals ?? [];

      const key = `${safeText(row?.egg?.slug) || title}__${idx}`;

      // show up to 3 mini pal icons in the card
      const preview = pals.slice(0, 3);

      return (
        <View key={key} style={cardOuterStyle}>
          <Pressable
            onPress={() => openSheet(row)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              padding: 10,
              backgroundColor: "rgba(255,255,255,0.04)",
              minHeight: 120,
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

                <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 3 }}>
                  {chipTextFromPals(pals)}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              {preview.length ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {preview.map((p, i) => {
                    const k = `${safeText(row?.egg?.slug)}__p__${safeText(p.slug)}__${i}`;
                    return (
                      <View
                        key={k}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.10)",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          marginRight: i === preview.length - 1 ? 0 : 6,
                        }}
                      >
                        {p.iconUrl ? (
                          <RemoteIcon uri={p.iconUrl} size={26} />
                        ) : (
                          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>—</Text>
                        )}
                      </View>
                    );
                  })}

                  {pals.length > preview.length ? (
                    <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginLeft: 6 }}>
                      +{pals.length - preview.length}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>No known hatch pals</Text>
              )}
            </View>
          </Pressable>
        </View>
      );
    },
    [cardOuterStyle, openSheet]
  );

  const isEmpty = sections.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingBottom: 24 }}>
        {isEmpty ? (
          <View style={{ padding: 18 }}>
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>{emptyText}</Text>
          </View>
        ) : (
          sections.map((sec) => {
            const headerTitle = prettyTier(sec.tier);
            const palsCount = countPalsInSection(sec.rows);

            return (
              <View key={sec.tier} style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    paddingHorizontal: 6,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>{headerTitle}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                    {sec.rows.length} egg{sec.rows.length === 1 ? "" : "s"} • {palsCount} pal{palsCount === 1 ? "" : "s"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -(gap / 2) }}>
                  {sec.rows.map(renderEggCard)}
                </View>
              </View>
            );
          })
        )}
      </View>

      <BottomSheetModal
        visible={sheetOpen}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 250, paddingBottom: 10 }}
      >
        {selected ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 12 }}>
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
                  {selected.egg.iconUrl ? (
                    <RemoteIcon uri={selected.egg.iconUrl} size={50} />
                  ) : (
                    <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }} numberOfLines={2}>
                    {safeText(selected.egg.name) || safeText(selected.egg.slug) || "Egg"}
                  </Text>

                  <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 2 }} numberOfLines={1}>
                    {prettyTier(selected.egg.tier)} • {selected.pals?.length ?? 0} pal
                    {(selected.pals?.length ?? 0) === 1 ? "" : "s"}
                  </Text>
                </View>

                <Pressable
                  onPress={closeSheet}
                  style={{
                    height: 40,
                    width: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    marginLeft: 10,
                  }}
                  hitSlop={10}
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
                  gap: 10,
                }}
              >
                {selected.pals?.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
                    {selected.pals.map((p, i) => {
                      const key = `${safeText(selected.egg.slug)}__sheet__${safeText(p.slug)}__${i}`;
                      return (
                        <View key={key} style={{ width: "50%" as any, paddingHorizontal: 6, paddingVertical: 6 }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                backgroundColor: "rgba(255,255,255,0.06)",
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.10)",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                marginRight: 10,
                              }}
                            >
                              {p.iconUrl ? (
                                <RemoteIcon uri={p.iconUrl} size={32} />
                              ) : (
                                <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>
                              )}
                            </View>

                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ color: "white", fontWeight: "800" }} numberOfLines={1}>
                                {safeText(p.name) || safeText(p.slug) || "Pal"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.65)" }}>No pals listed for this egg.</Text>
                )}
              </View>
            </View>
          </ScrollView>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}
