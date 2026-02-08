// components/Palworld/Upgrades/MerchantsGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { MerchantOfferRow } from "@/lib/palworld/upgrades/paldbMerchants";
import { safeNum, safeText, clamp } from "../Construction/palGridKit";

type PalMerchantsGridProps = {
  items: MerchantOfferRow[];
  emptyText?: string;
  numColumns?: number;
  query?: string;
  onQueryChange?: (q: string) => void;
  hideSearchBar?: boolean;
};

function containsFold(hay: any, needle: string) {
  const h = safeText(hay).toLowerCase();
  const n = safeText(needle).toLowerCase();
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
  const s = safeText(v);
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function isPositive(v: any): v is number {
  const n = safeNum(v);
  return n != null && n > 0;
}

type ShopSection = { shopId: string; rows: MerchantOfferRow[] };

function buildSections(rows: MerchantOfferRow[]): ShopSection[] {
  const map = new Map<string, MerchantOfferRow[]>();

  for (const r of rows) {
    const shopId = safeText(r.shopId);
    if (!shopId) continue;
    const arr = map.get(shopId);
    if (arr) arr.push(r);
    else map.set(shopId, [r]);
  }

  const sections: ShopSection[] = Array.from(map.entries()).map(([shopId, list]) => {
    const sorted = [...list].sort((a, b) => {
      const an = safeText(a.itemName).toLowerCase();
      const bn = safeText(b.itemName).toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return { shopId, rows: sorted };
  });

  sections.sort((a, b) => {
    const ak = safeText(a.shopId).toLowerCase();
    const bk = safeText(b.shopId).toLowerCase();
    if (ak < bk) return -1;
    if (ak > bk) return 1;
    return 0;
  });

  return sections;
}

export default function PalMerchantsGrid(props: PalMerchantsGridProps) {
  const {
    items,
    emptyText = "No merchant items found.",
    numColumns: numColumnsRaw = 3,
    query: queryControlled,
    onQueryChange,
    hideSearchBar = false,
  } = props;

  const numColumns = clamp(Math.floor(numColumnsRaw || 3), 2, 6);

  const [queryInternal, setQueryInternal] = useState("");
  const query = queryControlled != null ? queryControlled : queryInternal;
  const setQuery = onQueryChange ?? setQueryInternal;

  const [selected, setSelected] = useState<MerchantOfferRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = safeText(query);
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
      const title = safeText(row.itemName) || safeText(row.itemSlug) || "Item";
      const icon = row.iconUrl;

      const priceN = safeNum((row as any)?.price);
      const stockN = safeNum((row as any)?.stock);
      const qtyN =
        safeNum((row as any)?.quantity) ??
        safeNum((row as any)?.qty) ??
        safeNum((row as any)?.count) ??
        null;

      const parts: string[] = [];
      if (isPositive(priceN)) parts.push(`Price: ${fmtPrice(priceN)}`);
      if (isPositive(stockN)) parts.push(`Stock: ${stockN}`);
      if (isPositive(qtyN)) parts.push(`Qty: ${qtyN}`);

      const key = `${safeText(row.shopId)}__${safeText(row.itemSlug) || title}__${idx}`;

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
              minHeight: 112,
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

            <View style={{ marginTop: 8 }}>
              {parts.length ? (
                <Text numberOfLines={2} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 16 }}>
                  {parts.join(" • ")}
                </Text>
              ) : null}

              {safeText(row.merchantName) ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: parts.length ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.65)",
                    fontSize: parts.length ? 11 : 12,
                    marginTop: parts.length ? 4 : 0,
                  }}
                >
                  {safeText(row.merchantName)}
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
      {!hideSearchBar ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}>
          {/* leaving this out in your case because parent will pin it */}
        </View>
      ) : null}

      <View style={{ paddingBottom: 24 }}>
        {isEmpty ? (
          <View style={{ padding: 18 }}>
            <Text style={{ color: "rgba(255,255,255,0.65)" }}>{emptyText}</Text>
          </View>
        ) : (
          sections.map((sec) => {
            const headerTitle = prettyHeader(sec.shopId);

            return (
              <View key={sec.shopId} style={{ paddingHorizontal: 12, paddingTop: 10 }}>
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
      </View>

      <BottomSheetModal
        visible={sheetOpen}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 250, paddingBottom: 10 }}
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
                  {safeText(selected.itemName) || safeText(selected.itemSlug) || "Item"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 2 }} numberOfLines={1}>
                  {safeText(selected.merchantName)}
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
            </View>
          </View>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}
