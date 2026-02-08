// components/Palworld/Upgrades/TowerBossGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import LiquidGlass from "@/components/ui/LiquidGlass";

import type { TowerBossRow } from "@/lib/palworld/upgrades/paldbTowerBosses";
import { getElementStyle } from "@/lib/palworld/elementStyles";
import { clamp, safeNum, safeText } from "../Construction/palGridKit";

type TowerBossGridProps = {
  items: TowerBossRow[];
  numColumns?: number; // default 2
  emptyText?: string;
};

function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function fmtMaybe(v: any) {
  const n = safeNum(v);
  return n == null ? "—" : String(n);
}

function fmtHp(v: any) {
  const n = safeNum(v);
  return n == null ? "—" : Number(n).toLocaleString();
}

function wrapParensOnce(v: any): string {
  const s = safeText(v);
  if (!s) return "";
  if (/^\(\s*.*\s*\)$/.test(s)) return s; // already "(Hard)"
  return `(${s})`;
}

function ElementPill({
  typeName,
  compact = false,
}: {
  typeName: string;
  compact?: boolean;
}) {
  const { bg, text, tint } = getElementStyle(typeName);

  return (
    <LiquidGlass
      interactive={false}
      tinted
      tintColor={tint}
      showFallbackBackground
      style={{
        borderRadius: 999,
        marginRight: compact ? 6 : 8,
        marginBottom: compact ? 6 : 8,
      }}
    >
      <View className={`${compact ? "px-3 py-1.5" : "px-4 py-2"} rounded-full ${bg}`}>
        <Text className={`${compact ? "text-[11px]" : "text-[12px]"} font-semibold ${text}`}>
          {capitalize(typeName)}
        </Text>
      </View>
    </LiquidGlass>
  );
}

export default function TowerBossGrid({
  items,
  numColumns = 2,
  emptyText = "No tower bosses found.",
}: TowerBossGridProps) {
  const numCols = clamp(Math.floor(numColumns || 2), 1, 3);
  const arr = Array.isArray(items) ? items : [];

  const [selected, setSelected] = useState<TowerBossRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openSheet = useCallback((row: TowerBossRow) => {
    setSelected(row);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSelected(null);
  }, []);

  if (!arr.length) {
    return (
      <View className="rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-3">
        <Text className="text-[12px] text-slate-300">{emptyText}</Text>
      </View>
    );
  }

  // MerchantGrid-like layout math
  const gap = 10;
  const cardWPercent = 100 / numCols;

  const cardOuterStyle = useMemo(
    () => ({
      width: `${cardWPercent}%` as any,
      padding: gap / 2,
    }),
    [cardWPercent]
  );

  const renderCard = useCallback(
    (b: TowerBossRow, idx: number) => {
      const key = safeText((b as any)?.key) || `${safeText((b as any)?.name)}__${idx}`;
      const name = safeText((b as any)?.name) || safeText((b as any)?.bossName) || "Tower Boss";
      const icon = safeText((b as any)?.iconUrl);

      const towerText = safeText((b as any)?.towerText);
      const diff = wrapParensOnce((b as any)?.difficultyText);

      const level = (b as any)?.level;
      const hp = (b as any)?.hp;

      const els = Array.isArray((b as any)?.elements) ? ((b as any)?.elements as string[]) : [];
      const shownEls = els.slice(0, 3);

      // 2-line body:
      // tower
      // (Diff) • Lv • HP
      const line2Parts: string[] = [];
      if (diff) line2Parts.push(diff);
      if (level != null) line2Parts.push(`Lv ${level}`);
      if (hp != null) line2Parts.push(`HP ${fmtHp(hp)}`);

      return (
        <View key={key} style={cardOuterStyle}>
          <Pressable
            onPress={() => openSheet(b)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              padding: 10,
              backgroundColor: "rgba(255,255,255,0.04)",
              minHeight: 132,
            }}
          >
            {/* HEADER ROW (icon + title inline) */}
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
                  <MaterialCommunityIcons name="sword" size={18} color="#e5e7eb" />
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: "white", fontWeight: "800", fontSize: 13, lineHeight: 16 }}>
                  {name}
                </Text>
              </View>
            </View>

            {/* BODY (tower on its own line, then diff/lv/hp) */}
            <View style={{ marginTop: 8 }}>
              {towerText ? (
                <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 14 }}>
                  {towerText}
                </Text>
              ) : null}

              <Text
                numberOfLines={1}
                style={{
                  color: "rgba(255,255,255,0.70)",
                  fontSize: 12,
                  lineHeight: 16,
                  marginTop: towerText ? 4 : 0,
                }}
              >
                {line2Parts.length ? line2Parts.join(" • ") : "Tap for details"}
              </Text>
            </View>

            {/* Elements centered underneath */}
            {shownEls.length > 0 ? (
              <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
                {shownEls.map((el) => (
                  <ElementPill key={`${key}__el__${el}`} typeName={el} compact />
                ))}
              </View>
            ) : null}
          </Pressable>
        </View>
      );
    },
    [cardOuterStyle, openSheet]
  );

  const selectedEls = Array.isArray((selected as any)?.elements) ? (((selected as any)?.elements ?? []) as string[]) : [];
  const selFirstEl = selectedEls[0] ?? "";

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -(gap / 2) }}>
          {arr.map(renderCard)}
        </View>
      </ScrollView>

      {/* Bottom sheet (merchant-style) */}
      <BottomSheetModal
        visible={sheetOpen}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 300, paddingBottom: 10 }}
      >
        {selected ? (
          <View style={{ padding: 12, gap: 10 }}>
            {/* Header row */}
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
                {safeText((selected as any)?.iconUrl) ? (
                  <RemoteIcon uri={safeText((selected as any)?.iconUrl)} size={50} />
                ) : (
                  <MaterialCommunityIcons name="sword" size={22} color="rgba(255,255,255,0.70)" />
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }} numberOfLines={2}>
                  {safeText((selected as any)?.name) || safeText((selected as any)?.bossName) || "Tower Boss"}
                </Text>

                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 2 }} numberOfLines={2}>
                  {safeText((selected as any)?.towerText)}
                </Text>
              </View>
            </View>

            {/* Details card: exactly the layout you asked */}
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
              {/* Row 1: level | diff */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 2 }}>Level</Text>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                    {fmtMaybe((selected as any)?.level)}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 2 }}>Difficulty</Text>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                    {wrapParensOnce((selected as any)?.difficultyText) || "—"}
                  </Text>
                </View>
              </View>

              {/* Row 2: hp | element */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 6 }}>HP</Text>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>{fmtHp((selected as any)?.hp)}</Text>
                </View>

                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginBottom: 6 }}>Element</Text>
                  {selFirstEl ? (
                    <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                      <ElementPill typeName={selFirstEl} />
                    </View>
                  ) : (
                    <Text style={{ color: "rgba(255,255,255,0.65)" }}>—</Text>
                  )}
                </View>
              </View>
            </View>

            {/* If there are multiple elements, show the rest (same matchup style), centered */}
            {selectedEls.length > 1 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
                {selectedEls.slice(1, 6).map((el) => (
                  <ElementPill key={`sheet-el-${safeText((selected as any)?.key)}-${el}`} typeName={el} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}
