// components/Palworld/Upgrades/RaidsGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import RemoteIcon from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { RaidEvent } from "@/lib/palworld/upgrades/paldbSummonsRaid";
import { safeNum, safeText, clamp } from "../Construction/palGridKit";

type RaidsGridProps = {
  items: RaidEvent[];
  numColumns?: number;
  emptyText?: string;
};

function fmtMaybe(v: any) {
  const n = safeNum(v);
  return n == null ? "—" : String(n);
}

function fmtMaybeText(v: any) {
  const s = safeText(v);
  return s || "—";
}

export default function RaidsGrid({
  items,
  numColumns = 2,
  emptyText = "No raids found.",
}: RaidsGridProps) {
  const numCols = clamp(Math.floor(numColumns || 2), 1, 3);
  const arr = Array.isArray(items) ? items : [];

  const [selected, setSelected] = useState<RaidEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openSheet = useCallback((row: RaidEvent) => {
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
    (r: RaidEvent, idx: number) => {
      const title = safeText(r?.title) || "Raid";
      const grade = fmtMaybeText(r?.gradeText);
      const weight = fmtMaybe(r?.weight);

      const members = Array.isArray(r?.members) ? r.members : [];
      const firstUnitIcon = safeText(members?.[0]?.unit?.iconUrl);

      const key = `${title}__${grade}__${idx}`;

      const line1Parts: string[] = [];
      if (r?.gradeText) line1Parts.push(`Grade ${grade}`);
      if (r?.weight != null) line1Parts.push(`Weight ${weight}`);

      const line2Parts: string[] = [];
      if (members.length) line2Parts.push(`${members.length} member${members.length === 1 ? "" : "s"}`);

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
                {firstUnitIcon ? (
                  <RemoteIcon uri={firstUnitIcon} size={40} />
                ) : (
                  <MaterialCommunityIcons name="skull-crossbones" size={18} color="#e5e7eb" />
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: "white", fontWeight: "800", fontSize: 13, lineHeight: 16 }}>
                  {title}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              {line1Parts.length > 0 ? (
                <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 16 }}>
                  {line1Parts.join(" • ")}
                </Text>
              ) : (
                <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 16 }}>
                  Tap for details
                </Text>
              )}

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

  const sheetTitle = safeText(selected?.title) || "Raid";
  const sheetGrade = fmtMaybeText(selected?.gradeText);
  const sheetWeight = fmtMaybe(selected?.weight);
  const sheetMembers = Array.isArray(selected?.members) ? selected!.members : [];
  const memberCols = 3;
  const memberGap = 8;
  const memberWPercent = 100 / memberCols;

  const MemberTile = useCallback(
    ({ m, idx }: { m: any; idx: number }) => {
      const unitName = safeText(m?.unit?.name) || "Unit";
      const unitIcon = safeText(m?.unit?.iconUrl);

      const lvMin = safeNum(m?.levelMin);
      const lvMax = safeNum(m?.levelMax);
      const count = safeNum(m?.count);

      const metaParts: string[] = [];
      if (lvMin != null && lvMax != null) metaParts.push(`Lv ${lvMin}${lvMax !== lvMin ? `–${lvMax}` : ""}`);
      else if (lvMin != null) metaParts.push(`Lv ${lvMin}`);
      if (count != null) metaParts.push(`x${count}`);

      return (
        <View
          style={{
            width: `${memberWPercent}%` as any,
            padding: memberGap / 2,
          }}
        >
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.03)",
              paddingVertical: 8,
              paddingHorizontal: 8,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {unitIcon ? (
                <RemoteIcon uri={unitIcon} size={40} />
              ) : (
                <MaterialCommunityIcons name="account" size={18} color="rgba(255,255,255,0.75)" />
              )}
            </View>

            <Text
              style={{ color: "white", fontSize: 11, fontWeight: "900", marginTop: 7, textAlign: "center" }}
              numberOfLines={1}
            >
              {unitName}
            </Text>

            <Text
              style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, marginTop: 3, textAlign: "center" }}
              numberOfLines={1}
            >
              {metaParts.length ? metaParts.join(" • ") : "—"}
            </Text>
          </View>
        </View>
      );
    },
    [memberWPercent]
  );

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
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 18 }}>
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
                  <MaterialCommunityIcons name="skull-crossbones" size={22} color="rgba(255,255,255,0.70)" />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }} numberOfLines={2}>
                    {sheetTitle}
                  </Text>

                  <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 2 }} numberOfLines={2}>
                    {`Grade ${sheetGrade} • Weight ${sheetWeight}`}
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
                }}
              >
                {sheetMembers.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -(memberGap / 2) }}>
                    {sheetMembers.slice(0, 24).map((m, idx) => (
                      <MemberTile key={`${safeText(m?.unit?.slug) || safeText(m?.unit?.name) || "u"}__${idx}`} m={m} idx={idx} />
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>—</Text>
                )}
              </View>
            </View>
          </ScrollView>
        ) : null}
      </BottomSheetModal>
    </View>
  );
}
