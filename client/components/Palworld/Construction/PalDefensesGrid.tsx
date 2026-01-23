// components/Palworld/PalDefensesGrid.tsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import { fetchDefensesDetail, type DefensesIndexItem, type DefensesDetail } from "@/lib/palworld/construction/paldbDefenses";
import type { TreantNode } from "@/lib/palworld/paldbDetailKit";

type PalDefensesGridProps = {
  items: DefensesIndexItem[];
  onPressItem?: (item: DefensesIndexItem) => void;

  emptyText?: string;
  showUnavailable?: boolean; // default false
  numColumns?: number; // default 3

  prefetchIcons?: boolean; // default true
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeText(v: any): string {
  return String(v ?? "").trim();
}

function safeName(x: any): string {
  const s = safeText(x?.name);
  return s || "Unknown";
}

function stripTrailingDefenses(name: string) {
  const s = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  return s.replace(/\s*defenses?\s*$/i, "").trim();
}

function buildTwoLineTitle(nameRaw: string, categoryText?: string | null) {
  const base = stripTrailingDefenses(nameRaw);
  const line1 = base || "Defense";
  const line2 = safeText(categoryText) || "Defenses";
  return { line1, line2 };
}

function formatPillNumber(v: any): string {
  const n = safeNum(v);
  if (n == null) return "—";

  const abs = Math.abs(n);
  if (abs < 1000) {
    const isInt = Math.abs(n - Math.trunc(n)) < 1e-9;
    return isInt ? String(Math.trunc(n)) : String(Number(n.toFixed(2)));
  }

  const k = n / 1000;
  const txt = Math.abs(k) >= 10 ? k.toFixed(0) : k.toFixed(1);
  return `${txt.replace(/\.0$/, "")}k`;
}

function sumRecipeQty(rows: any[]): number | null {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;

  let sum = 0;
  let seenAny = false;
  for (const r of list) {
    const q = safeNum((r as any)?.qty);
    if (q == null) continue;
    sum += q;
    seenAny = true;
  }
  return seenAny ? sum : null;
}

/** ---------------- Sheet helpers (NO EMPTY SECTIONS) ---------------- */

function SheetLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function DescriptionSection({ text }: { text: string | null | undefined }) {
  const s = String(text ?? "").trim();
  if (!s) return null;

  return (
    <View className="mt-5">
      <SheetLabel>About</SheetLabel>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <Text className="text-white/80 text-[12px] leading-5">{s}</Text>
      </View>
    </View>
  );
}

function RecipeSection({
  rows,
}: {
  rows: Array<{ slug?: string; name?: string; iconUrl?: string | null; qty?: any }>;
}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;

  return (
    <View className="mt-5">
      <SheetLabel>Recipe</SheetLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {list.map((r, idx) => {
          const key = String(r?.slug ?? `${r?.name ?? "r"}:${idx}`);
          const nm = safeText(r?.name) || "—";
          const qty = r?.qty;

          return (
            <View
              key={key}
              className={[
                "flex-row items-center justify-between py-2 px-3",
                idx !== list.length - 1 ? "border-b border-white/5" : "",
              ].join(" ")}
            >
              <View className="flex-row items-center flex-1">
                <RemoteIcon
                  uri={r?.iconUrl ?? null}
                  size={28}
                  roundedClassName="rounded-lg"
                  placeholderClassName="bg-white/5 border border-white/10"
                />
                <Text className="ml-3 text-white/90 text-[13px]" numberOfLines={1}>
                  {nm}
                </Text>
              </View>

              <Text className="text-white/70 text-[13px] ml-3">{qty != null ? `x${qty}` : "—"}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function renderTreant(node: TreantNode, depth: number) {
  const pad = Math.min(22, depth * 12);
  const qtyLabel = node?.qty != null ? `x${node.qty}` : "—";

  return (
    <View key={`${node.slug ?? "node"}:${depth}:${node.iconUrl ?? ""}`} style={{ marginLeft: pad }}>
      <View className="flex-row items-center py-1">
        <RemoteIcon
          uri={node.iconUrl ?? null}
          size={18}
          roundedClassName="rounded-md"
          placeholderClassName="bg-white/5 border border-white/10"
          contentFit="contain"
        />
        <Text className="ml-2 text-white/85 text-[12px]">{qtyLabel}</Text>

        {!!node.slug && (
          <Text className="text-white/35 text-[11px] ml-2" numberOfLines={1}>
            {String(node.slug).replace(/^\/?en\//i, "")}
          </Text>
        )}
      </View>

      {!!node.children?.length && node.children.map((c) => renderTreant(c, depth + 1))}
    </View>
  );
}

function DependencyTreeSection({ treant }: { treant: TreantNode | null | undefined }) {
  if (!treant) return null;

  return (
    <View className="mt-5">
      <SheetLabel>Dependency Tree</SheetLabel>
      <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="pr-6">{renderTreant(treant, 0)}</View>
        </ScrollView>
      </View>
    </View>
  );
}

/** ---------------- Component ---------------- */

export default function PalDefensesGrid({
  items,
  onPressItem,
  emptyText = "No defenses found.",
  showUnavailable = false,
  numColumns = 3,
  prefetchIcons = true,
}: PalDefensesGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    if (showUnavailable) return arr;

    return arr.filter((x: any) => {
      if (typeof x?.notAvailable === "boolean") return !x.notAvailable;
      if (typeof x?.isAvailable === "boolean") return !!x.isAvailable;
      return true;
    });
  }, [items, showUnavailable]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<DefensesIndexItem | null>(null);

  const detailCache = useRef<Map<string, DefensesDetail>>(new Map());
  const [detail, setDetail] = useState<DefensesDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openSheet = useCallback(
    async (it: DefensesIndexItem) => {
      onPressItem?.(it);

      setSelected(it);
      setSheetVisible(true);
      setDetailError(null);

      const key = String((it as any)?.slug ?? "").trim();
      if (!key) return;

      const cached = detailCache.current.get(key);
      if (cached) {
        setDetail(cached);
        return;
      }

      setDetail(null);
      setDetailLoading(true);
      try {
        const d = await fetchDefensesDetail(key);
        detailCache.current.set(key, d);
        setDetail(d);
      } catch (e: any) {
        setDetailError(e?.message ? String(e.message) : "Failed to load details.");
      } finally {
        setDetailLoading(false);
      }
    },
    [onPressItem]
  );

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  useEffect(() => {
    if (!prefetchIcons) return;
    prefetchRemoteIcons(filtered.map((x) => (x as any)?.iconUrl).filter(Boolean));
  }, [prefetchIcons, filtered]);

  if (!filtered.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const TILE_H = 154;

  const sel = selected;
  const d = detail ?? sel;

  const notAvailable =
    !!(sel as any)?.notAvailable ||
    (typeof (sel as any)?.isAvailable === "boolean" ? !(sel as any)?.isAvailable : false);

  const tech = safeNum((d as any)?.technologyLevel ?? (sel as any)?.technologyLevel ?? (sel as any)?.technology);
  const categoryText = safeText((d as any)?.categoryText ?? (sel as any)?.categoryText);
  const description = safeText((d as any)?.description ?? (sel as any)?.description);
  const recipeRows = ((d as any)?.recipe ?? (sel as any)?.recipe ?? []) as any[];
  const treant = (detail as any)?.treant ?? null;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {filtered.map((it: any) => {
            const disabled =
              !!it?.notAvailable || (typeof it?.isAvailable === "boolean" ? !it.isAvailable : false);

            const title = buildTwoLineTitle(safeName(it), it?.categoryText ?? null);
            const t = safeNum(it?.technologyLevel ?? it?.technology);
            const mats = sumRecipeQty((it?.recipe ?? []) as any[]);

            const ring = "border-white/10";

            return (
              <View key={String(it?.slug)} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
                <Pressable
                  onPress={() => openSheet(it)}
                  disabled={disabled}
                  className={[
                    "rounded-2xl border bg-white/[0.03] overflow-hidden",
                    ring,
                    disabled ? "opacity-50" : "opacity-100",
                  ].join(" ")}
                  style={{ height: TILE_H }}
                >
                  <View className="flex-1 px-3 pt-3 pb-3">
                    <View className="items-center justify-center">
                      <View className="relative">
                        <RemoteIcon
                          uri={it?.iconUrl ?? null}
                          size={58}
                          roundedClassName="rounded-xl"
                          placeholderClassName="bg-white/5 border border-white/10"
                          contentFit="contain"
                        />

                        {disabled && (
                          <View className="absolute -top-1 -right-1 px-2 py-[2px] rounded-full border bg-red-500/15 border-red-500/35">
                            <Text className="text-red-200 text-[10px] font-semibold">N/A</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="mt-2 items-center">
                      <Text numberOfLines={1} className="text-white text-[12px] leading-4 text-center">
                        {title.line1}
                      </Text>
                      <Text numberOfLines={1} className="text-white/50 text-[10px] text-center mt-0.5">
                        {title.line2}
                      </Text>
                    </View>

                    <View className="flex-1" />

                    <View className="flex-row items-end justify-between mt-2">
                      <View className="flex-1 items-center">
                        <Text className="text-[10px] text-white/60">Tech</Text>
                        <View className="mt-1 px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
                          <Text
                            className="text-[10px] text-white/85"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                          >
                            {formatPillNumber(t)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={(sel as any)?.iconUrl ?? null}
                size={56}
                roundedClassName="rounded-xl"
                placeholderClassName="bg-white/5 border border-white/10"
                contentFit="contain"
              />

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {sel?.name ?? "—"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={1}>
                  Tech {tech != null ? formatPillNumber(tech) : "—"}
                  {categoryText ? (
                    <>
                      {" "}
                      <Text className="text-white/40">•</Text> {categoryText}
                    </>
                  ) : null}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {/* Pills */}
          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Type: <Text className="text-white">Defenses</Text>
              </Text>
            </View>

            {tech != null ? (
              <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
                <Text className="text-white/80 text-[12px]">
                  Tech: <Text className="text-white">{formatPillNumber(tech)}</Text>
                </Text>
              </View>
            ) : null}

            {notAvailable ? (
              <View className="px-3 py-2 rounded-full border border-red-500/30 bg-red-500/10">
                <Text className="text-red-200 text-[12px]">Not available</Text>
              </View>
            ) : null}
          </View>

          {/* Detail loading/error */}
          {detailLoading ? (
            <View className="mt-5 items-center">
              <ActivityIndicator />
              <Text className="text-white/60 text-[12px] mt-2">Loading details…</Text>
            </View>
          ) : detailError ? (
            <View className="mt-5">
              <Text className="text-red-200 text-[12px]">{detailError}</Text>
            </View>
          ) : null}

          {/* Sections (NO EMPTY) */}
          <DescriptionSection text={description} />
          <DependencyTreeSection treant={treant} />
          <RecipeSection rows={recipeRows as any} />
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
