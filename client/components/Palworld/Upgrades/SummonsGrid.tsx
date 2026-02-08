// components/Palworld/Upgrades/SummonsGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import LiquidGlass from "@/components/ui/LiquidGlass";
import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { SummoningAltarBoss } from "@/lib/palworld/upgrades/paldbSummonsRaid";
import { getElementStyle } from "@/lib/palworld/elementStyles";
import { safeNum, safeText, clamp } from "../Construction/palGridKit";

type SummonsGridProps = {
  items: SummoningAltarBoss[];
  numColumns?: number;
  emptyText?: string;
};

function titleCase(v: any) {
  const s = safeText(v);
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtMaybe(v: any) {
  const n = safeNum(v);
  return n == null ? "—" : String(n);
}

function fmtHp(v: any) {
  const n = safeNum(v);
  return n == null ? "—" : Number(n).toLocaleString();
}

function fmtPct(v: any) {
  const n = safeNum(v);
  return n == null ? "—" : `${n}%`;
}

export default function SummonsGrid({
  items,
  numColumns = 2,
  emptyText = "No summons found.",
}: SummonsGridProps) {
  const numCols = clamp(Math.floor(numColumns || 2), 1, 3);
  const arr = Array.isArray(items) ? items : [];

  const [selected, setSelected] = useState<SummoningAltarBoss | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openSheet = useCallback((row: SummoningAltarBoss) => {
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
    (r: SummoningAltarBoss, idx: number) => {
      const slabName = safeText(r?.slab?.name) || "Slab";
      const slabIcon = safeText(r?.slab?.iconUrl);

      const bossName = safeText(r?.boss?.name) || "Boss";
      const bossIcon = safeText(r?.boss?.iconUrl);

      const tileMainIcon = slabIcon || bossIcon;

      const key = safeText(r?.slab?.slug) || `${slabName}__${bossName}__${idx}`;

      const level = r?.level;
      const hp = r?.hp;

      const line1Parts: string[] = [slabName];

      const line2Parts: string[] = [];
      if (level != null) line2Parts.push(`Lv ${level}`);
      if (hp != null) line2Parts.push(`HP ${Number(hp).toLocaleString()}`);

      return (
        <View key={key} style={cardOuterStyle}>
          <Pressable
            onPress={() => openSheet(r)}
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
                {tileMainIcon ? (
                  <RemoteIcon uri={tileMainIcon} size={40} />
                ) : (
                  <MaterialCommunityIcons name="seal" size={18} color="#e5e7eb" />
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: "white", fontWeight: "800", fontSize: 13, lineHeight: 16 }}>
                  {bossName}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 16 }}>
                {line1Parts.join(" • ")}
              </Text>

              {line2Parts.length > 0 ? (
                <Text
                  numberOfLines={1}
                  style={{ color: "rgba(255,255,255,0.50)", fontSize: 11, lineHeight: 15, marginTop: 3 }}
                >
                  {line2Parts.join(" • ")}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </View>
      );
    },
    [cardOuterStyle, openSheet]
  );

  const sheetBossName = safeText(selected?.boss?.name) || "Summon Boss";
  const sheetBossIcon = safeText(selected?.boss?.iconUrl);

  const sheetSlabName = safeText(selected?.slab?.name) || "Slab";
  const sheetSlabIcon = safeText(selected?.slab?.iconUrl);

  const sheetLevel = fmtMaybe(selected?.level);
  const sheetHp = fmtHp(selected?.hp);

  const sheetDR = fmtPct(selected?.damageReductionPct);
  const sheetAD = fmtPct(selected?.attackDamagePct);

  const sheetEls = Array.isArray(selected?.elements) ? (selected?.elements as string[]) : [];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -(gap / 2) }}>
          {arr.map(renderCard)}
        </View>
      </ScrollView>

      <BottomSheetModal
        visible={sheetOpen}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 270, paddingBottom: 10 }}
      >
        {selected ? (
          <View style={{ padding: 12, gap: 12 }}>
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
                {sheetBossIcon ? (
                  <RemoteIcon uri={sheetBossIcon} size={50} />
                ) : (
                  <MaterialCommunityIcons name="seal" size={22} color="rgba(255,255,255,0.70)" />
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }} numberOfLines={2}>
                  {sheetBossName}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 10 }}>
                  {sheetSlabIcon ? <RemoteIcon uri={sheetSlabIcon} size={18} /> : null}
                  <Text style={{ color: "rgba(255,255,255,0.6)" }} numberOfLines={2}>
                    {sheetSlabName}
                  </Text>
                </View>
              </View>
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
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "800" }}>Level</Text>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "900", marginTop: 4 }}>{sheetLevel}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "800" }}>HP</Text>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "900", marginTop: 4 }}>{sheetHp}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "800" }}>
                    Damage Reduction
                  </Text>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "900", marginTop: 4 }}>{sheetDR}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "800" }}>Attack Damage</Text>
                  <Text style={{ color: "white", fontSize: 14, fontWeight: "900", marginTop: 4 }}>{sheetAD}</Text>
                </View>
              </View>
            </View>

            {sheetEls.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {sheetEls.slice(0, 6).map((typeName) => {
                  const { bg, text, tint } = getElementStyle(typeName);

                  return (
                    <LiquidGlass
                      key={`sheet-el-${typeName}`}
                      interactive={false}
                      tinted
                      tintColor={tint}
                      showFallbackBackground
                      style={{ borderRadius: 999, marginRight: 8, marginBottom: 8 }}
                    >
                      <View className={`px-4 py-2 rounded-full ${bg}`}>
                        <Text className={`text-[12px] font-semibold ${text}`}>{titleCase(typeName)}</Text>
                      </View>
                    </LiquidGlass>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}
