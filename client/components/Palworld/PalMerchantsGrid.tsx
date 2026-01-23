// components/Palworld/PalMerchantsGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";

import RemoteIcon from "@/components/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { MerchantOfferRow } from "@/lib/palworld/paldbMerchants";

type PalMerchantsGridProps = {
  items: MerchantOfferRow[];

  emptyText?: string;
  numColumns?: number; // default 3
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeStr(v: any): string {
  return String(v ?? "").trim();
}

function safeNum(v: any): number | null {
  const s = safeStr(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function containsFold(hay: any, needle: string) {
  const h = safeStr(hay).toLowerCase();
  const n = safeStr(needle).toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function fmtMaybe(n: number | null | undefined) {
  return n == null ? "—" : String(n);
}

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return String(Math.trunc(n));
}

function prettyHeader(v: any) {
  const s = safeStr(v);
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

type ShopSection = { shopId: string; rows: MerchantOfferRow[]; };

function buildSections(rows: MerchantOfferRow[]): ShopSection[] {
  const map = new Map<string, MerchantOfferRow[]>();

  for (const r of rows) {
    const shopId = safeStr(r.shopId);
    if (!shopId) continue;
    const arr = map.get(shopId);
    if (arr) arr.push(r);
    else map.set(shopId, [r]);
  }

  const sections: ShopSection[] = Array.from(map.entries()).map(([shopId, list]) => {
    const sorted = [...list].sort((a, b) => {
      const an = safeStr(a.itemName).toLowerCase();
      const bn = safeStr(b.itemName).toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return { shopId, rows: sorted };
  });

  sections.sort((a, b) => {
    const ak = safeStr(a.shopId).toLowerCase();
    const bk = safeStr(b.shopId).toLowerCase();
    if (ak < bk) return -1;
    if (ak > bk) return 1;
    return 0;
  });

  return sections;
}

export default function PalMerchantsGrid(props: PalMerchantsGridProps) {
  const { items, emptyText = "No merchant items found.", numColumns: numColumnsRaw = 3 } = props;
  const numColumns = clamp(Math.floor(numColumnsRaw || 3), 2, 6);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MerchantOfferRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = safeStr(query);
    if (!q) return items;

    return (items ?? []).filter((r) => {
      return (
        containsFold(r.itemName, q) ||
        containsFold(r.itemSlug, q) ||
        containsFold(r.shopId, q) ||
        containsFold(r.merchantName, q)
      );
    });
  }, [items, query]);

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  const openSheet = useCallback((row: MerchantOfferRow) => {
    setSelected(row);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSelected(null);
  }, []);

  // Grid sizing
  const gap = 10;
  const cardWPercent = 100 / numColumns;

  const cardOuterStyle = useMemo(
    () => ({
      width: `${cardWPercent}%` as any,
      padding: gap / 2,
    }),
    [cardWPercent]
  );

  const renderCard = useCallback(
    (row: MerchantOfferRow, idx: number) => {
      const title = safeStr(row.itemName) || safeStr(row.itemSlug) || "Item";
      const icon = row.iconUrl;

      const priceText = fmtPrice(row.price);
      const stockText = fmtMaybe(row.stock);
      const qtyText = fmtMaybe(row.quantity);

      return (
        <View key={`${row.shopId}__${row.itemSlug || title}__${idx}`} style={cardOuterStyle}>
          <Pressable
            onPress={() => openSheet(row)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              padding: 10,
              backgroundColor: "rgba(255,255,255,0.04)",
              minHeight: 112,
            }}
          >
            {/* Row 1: image + title */}
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
                {icon ? (
                  <RemoteIcon uri={icon} size={40} />
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: "white", fontWeight: "800", fontSize: 13, lineHeight: 16 }}>
                  {title}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              {(() => {
                const parts: string[] = [];

                parts.push(`Price: ${fmtPrice(row.price)}`);

                const stock = safeNum(row.stock);
                if (stock != null) parts.push(`Stock: ${stock}`);

                parts.push(`Qty: ${fmtMaybe(safeNum(row.quantity) ?? safeNum((row as any).quantity) ?? (row as any).quantity)}`);

                return (
                  <Text numberOfLines={2} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 16 }}>
                    {parts.join(" • ")}
                  </Text>
                );
              })()}

              {safeStr(row.merchantName) ? (
                <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.50)", fontSize: 11, marginTop: 4 }}>
                  {safeStr(row.merchantName)}
                </Text>
              ) : null}
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
      {/* Search */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search merchant items..."
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

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {isEmpty ? (
          <View style={{ padding: 18 }}>
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>{emptyText}</Text>
          </View>
        ) : (
          sections.map((sec) => {
            const headerTitle = prettyHeader(sec.shopId);

            return (
              <View key={sec.shopId} style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                {/* SECTION HEADER */}
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
                    {sec.rows.length} item{sec.rows.length === 1 ? "" : "s"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -(gap / 2) }}>
                  {sec.rows.map(renderCard)}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* BottomSheet (NO extra props added) */}
      <BottomSheetModal
        visible={sheetOpen}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        {selected ? (
          <View style={{ padding: 12, gap: 10 }}>
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
                {selected.iconUrl ? (
                  <RemoteIcon uri={selected.iconUrl} size={50} />
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }} numberOfLines={2}>
                  {safeStr(selected.itemName) || safeStr(selected.itemSlug) || "Item"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 2 }} numberOfLines={1}>
                  {safeStr(selected.merchantName)}
                  {selected.merchantCount != null ? ` /${selected.merchantCount}` : ""}
                </Text>
              </View>
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
                Shop ID: <Text style={{ color: "white", fontWeight: "800" }}>{prettyHeader(selected.shopId)}</Text>
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Price: <Text style={{ color: "white", fontWeight: "800" }}>{fmtPrice(selected.price)}</Text>
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Stock: <Text style={{ color: "white", fontWeight: "800" }}>{fmtMaybe(selected.stock)}</Text>
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                Quantity: <Text style={{ color: "white", fontWeight: "800" }}>{fmtMaybe(selected.quantity)}</Text>
              </Text>

              {selected.itemSlug ? (
                <Text style={{ color: "rgba(255,255,255,0.55)" }}>slug: {safeStr(selected.itemSlug)}</Text>
              ) : null}

              {selected.hoverRef ? (
                <Text style={{ color: "rgba(255,255,255,0.55)" }}>hoverRef: {safeStr(selected.hoverRef)}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}
