// components/palworld/AmmoGrid.tsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";

import { type AmmoIndexItem, type AmmoDetail, fetchAmmoDetail } from "@/lib/palworld/items/paldbAmmo";
import RemoteIcon, { prefetchRemoteIcons } from "@/components/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

type AmmoGridProps = {
  items: AmmoIndexItem[];
  onPressItem?: (item: AmmoIndexItem) => void;

  emptyText?: string;
  showUnavailable?: boolean; // default false
  numColumns?: number; // default 3

  prefetchIcons?: boolean; // default true
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function rarityRing(rarityRaw?: string | null) {
  const r = (rarityRaw ?? "").toLowerCase();
  if (r.includes("legend")) return "border-amber-400/70";
  if (r.includes("epic")) return "border-fuchsia-400/70";
  if (r.includes("rare")) return "border-sky-400/70";
  if (r.includes("uncommon")) return "border-emerald-400/70";
  return "border-white/10";
}

function prettyRarity(r?: string | null) {
  const s = (r ?? "").trim();
  return s || "Common";
}

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function slugToKind(slug: string) {
  const s = (slug ?? "").trim();
  if (!s) return "Unknown";

  const last = s.split("/").filter(Boolean).slice(-1)[0] ?? s;
  const base = last.replace(/[#?].*$/, "");

  const decoded = (() => {
    try {
      return decodeURIComponent(base);
    } catch {
      return base;
    }
  })();

  return decoded.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function stripTrailingAmmo(name: string) {
  const s = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  return s.replace(/\s*ammo\s*$/i, "").trim();
}

function buildTwoLineTitle(nameRaw: string) {
  const base = stripTrailingAmmo(nameRaw);
  const line1 = base || "Ammo";
  const line2 = "Ammo";
  return { line1, line2 };
}

export default function AmmoGrid({
  items,
  onPressItem,
  emptyText = "No ammo found.",
  showUnavailable = false,
  numColumns = 3,
  prefetchIcons = true,
}: AmmoGridProps) {
  const cols = clamp(numColumns, 2, 4);

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return showUnavailable ? arr : arr.filter((x) => x.isAvailable);
  }, [items, showUnavailable]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<AmmoIndexItem | null>(null);

  const detailCache = useRef<Map<string, AmmoDetail>>(new Map());
  const [detail, setDetail] = useState<AmmoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openSheet = useCallback(
    async (it: AmmoIndexItem) => {
      onPressItem?.(it);

      setSelected(it);
      setSheetVisible(true);
      setDetailError(null);

      const key = String(it.slug ?? "").trim();
      if (!key) return;

      const cached = detailCache.current.get(key);
      if (cached) {
        setDetail(cached);
        return;
      }

      setDetail(null);
      setDetailLoading(true);
      try {
        const d = await fetchAmmoDetail(key);
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
    prefetchRemoteIcons(filtered.map((x) => x.iconUrl));
  }, [prefetchIcons, filtered]);

  if (!filtered.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const sheetKind = selected ? slugToKind(selected.slug) : "—";
  const sheetRarity = selected ? prettyRarity(selected.rarity) : "—";
  const sheetTech = selected ? safeNum(selected.technology) : null;

  const TILE_H = 154;

  // ---- sections (ONLY render if non-empty) ----
  const description = (detail?.description ?? selected?.description ?? "").trim();
  const effects = (detail as any)?.effects ?? [];
  const hasEffects = Array.isArray(effects) && effects.length > 0;

  const producedAt = (detail as any)?.producedAt ?? [];
  const hasProducedAt = Array.isArray(producedAt) && producedAt.length > 0;

  const quickRecipe = selected?.recipes ?? [];
  const hasQuickRecipe = Array.isArray(quickRecipe) && quickRecipe.length > 0;

  // optional: if ammo detail exposes stats/others, show them too (without empty sections)
  const stats = (detail as any)?.stats ?? [];
  const hasStats = Array.isArray(stats) && stats.length > 0;

  const others = (detail as any)?.others ?? [];
  const hasOthers = Array.isArray(others) && others.length > 0;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {filtered.map((it) => {
            const disabled = !it.isAvailable;
            const ring = rarityRing(it.rarity);

            const tech = safeNum(it.technology);
            const title = buildTwoLineTitle(it.name);

            return (
              <View key={it.slug} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
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
                          uri={it.iconUrl}
                          size={58}
                          roundedClassName="rounded-xl"
                          placeholderClassName="bg-white/5 border border-white/10"
                        />

                        {!it.isAvailable && (
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

                    <View className="items-center mt-2">
                      <Text className="text-[10px] text-white/60">Tech</Text>
                      <View className="mt-1 px-3 py-[3px] rounded-full border bg-white/5 border-white/10">
                        <Text className="text-[10px] text-white/85">{tech != null ? String(tech) : "—"}</Text>
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
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <RemoteIcon
                uri={selected?.iconUrl ?? null}
                size={56}
                roundedClassName="rounded-xl"
                placeholderClassName="bg-white/5 border border-white/10"
              />

              <View className="ml-3 flex-1 pr-3">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {selected?.name ?? "—"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={1}>
                  Tech {sheetTech ?? "—"}
                </Text>
              </View>
            </View>

            {selected ? (
              <Pressable
                onPress={() => {
                  const slug = String(selected.slug ?? "").trim();
                  if (!slug) return;
                  closeSheet();
                  router.push({ pathname: "/ammo/[id]", params: { id: slug } });
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2"
                style={{ minWidth: 92 }}
              >
                <Text className="text-white text-[12px] font-semibold text-center">Details</Text>
                <Text className="text-white/45 text-[10px] text-center mt-0.5" numberOfLines={1}>
                  {selected?.name ?? ""}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Pills */}
          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Kind: <Text className="text-white">{sheetKind}</Text>
              </Text>
            </View>

            <View className="px-3 py-2 rounded-full border border-white/10 bg-white/5">
              <Text className="text-white/80 text-[12px]">
                Rarity: <Text className="text-white">{sheetRarity}</Text>
              </Text>
            </View>

            {!selected?.isAvailable ? (
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

          {/* About (only if has text) */}
          {!!description && (
            <View className="mt-5">
              <Text className="text-white/80 text-[12px] mb-2">About</Text>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <Text className="text-white/80 text-[13px] leading-5">{description}</Text>
              </View>
            </View>
          )}

          {/* Effects (only if any) */}
          {hasEffects && (
            <View className="mt-4">
              <Text className="text-white/80 text-[12px] mb-2">Effects</Text>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                {effects.map((e: string, idx: number) => (
                  <View
                    key={`${e}:${idx}`}
                    className={["px-3 py-2", idx !== effects.length - 1 ? "border-b border-white/5" : ""].join(" ")}
                  >
                    <Text className="text-white/85 text-[13px] leading-5">{e}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats (only if present in detail) */}
          {hasStats && (
            <View className="mt-5">
              <Text className="text-white/80 text-[12px] mb-2">Stats</Text>

              <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                {(stats as any[]).map((row, idx) => (
                  <View
                    key={`${String(row?.key ?? "k")}:${idx}`}
                    className={[
                      "flex-row items-center justify-between py-3 px-3",
                      idx !== (stats as any[]).length - 1 ? "border-b border-white/5" : "",
                    ].join(" ")}
                  >
                    <Text className="text-white/70 text-[12px] flex-1 pr-3" numberOfLines={1}>
                      {row?.key ?? "—"}
                    </Text>
                    <Text className="text-white/85 text-[12px]" numberOfLines={1}>
                      {row?.valueText ?? row?.valueItem?.name ?? "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Produced At (only if any) */}
          {hasProducedAt && (
            <View className="mt-5">
              <Text className="text-white/80 text-[12px] mb-2">Produced At</Text>

              <View className="flex-row flex-wrap gap-2">
                {(producedAt as any[]).map((p) => (
                  <View
                    key={String(p.slug ?? p.name ?? "")}
                    className="flex-row items-center px-3 py-2 rounded-full border border-white/10 bg-white/5"
                  >
                    <RemoteIcon
                      uri={p.iconUrl ?? null}
                      size={18}
                      roundedClassName="rounded-md"
                      placeholderClassName="bg-white/5 border border-white/10"
                      contentFit="contain"
                    />
                    <Text className="ml-2 text-white/85 text-[12px]" numberOfLines={1}>
                      {p.name ?? "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quick Recipe (only if any) */}
          {hasQuickRecipe && (
            <View className="mt-5">
              <Text className="text-white/80 text-[12px] mb-2">Quick Recipe</Text>

              <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                {quickRecipe.map((r, idx) => (
                  <View
                    key={`${r.slug}:${idx}`}
                    className={[
                      "flex-row items-center justify-between py-2 px-3",
                      idx !== quickRecipe.length - 1 ? "border-b border-white/5" : "",
                    ].join(" ")}
                  >
                    <View className="flex-row items-center flex-1">
                      <RemoteIcon
                        uri={r.iconUrl}
                        size={28}
                        roundedClassName="rounded-lg"
                        placeholderClassName="bg-white/5 border border-white/10"
                      />
                      <Text className="ml-3 text-white/90 text-[13px]" numberOfLines={1}>
                        {r.name}
                      </Text>
                    </View>
                    <Text className="text-white/70 text-[13px] ml-3">x{r.qty}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Others (only if present in detail) */}
          {hasOthers && (
            <View className="mt-5">
              <Text className="text-white/80 text-[12px] mb-2">Others</Text>

              <View className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                {(others as any[]).map((row, idx) => (
                  <View
                    key={`${String(row?.key ?? "k")}:${idx}`}
                    className={[
                      "flex-row items-center justify-between py-3 px-3",
                      idx !== (others as any[]).length - 1 ? "border-b border-white/5" : "",
                    ].join(" ")}
                  >
                    <Text className="text-white/70 text-[12px] flex-1 pr-3" numberOfLines={1}>
                      {row?.key ?? "—"}
                    </Text>
                    <Text className="text-white/85 text-[12px]" numberOfLines={1}>
                      {row?.valueText ?? row?.valueItem?.name ?? "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
