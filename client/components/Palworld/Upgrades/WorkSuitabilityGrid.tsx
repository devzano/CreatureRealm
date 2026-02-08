// components/Palworld/PalworldDetails/WorkSuitabilityGrid.tsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type {
  WorkSuitabilityItem,
  WorkSuitabilityDetail,
  WorkSuitabilityLevelStat,
  WorkStructureRef,
  WorkPalRef,
  WorkResearchItem,
  WorkResearchIngredient,
} from "@/lib/palworld/upgrades/paldbWorkSuitability";
import { fetchWorkSuitabilityDetail } from "@/lib/palworld/upgrades/paldbWorkSuitability";
import { safeName, clamp, safeText } from "../Construction/palGridKit";

type WorkSuitabilityGridProps = {
  items: WorkSuitabilityItem[];
  onPressItem?: (item: WorkSuitabilityItem) => void;
  emptyText?: string;
  numColumns?: number;
  prefetchIcons?: boolean;
};

function ringForIconId(iconId: number) {
  if (iconId >= 10) return "border-sky-300/60";
  if (iconId >= 7) return "border-violet-300/60";
  if (iconId >= 4) return "border-emerald-300/60";
  return "border-amber-300/60";
}

function fmtNum(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString();
}

function pct(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 1000) / 10}%`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function Box({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">{children}</View>;
}

function StatRow({ it }: { it: WorkSuitabilityLevelStat }) {
  const lv = it?.level ?? 0;
  const power = it?.power != null ? fmtNum(it.power) : "—";
  const dmg = it?.damageRate != null ? pct(it.damageRate) : null;

  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-white/75 text-[12px]">Lv {lv}</Text>
      <Text className="text-white/60 text-[12px]">
        {power}
        {dmg ? <Text className="text-white/40">{`  •  Damage ${dmg}`}</Text> : null}
      </Text>
    </View>
  );
}

function ResearchCard({ it }: { it: WorkResearchItem }) {
  const title = safeText(it?.title) || "Research";
  const effect = safeText(it?.effectText) || null;
  const ingredients = Array.isArray(it?.ingredients) ? it.ingredients : [];

  return (
    <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 mb-3">
      <View className="flex-row items-baseline justify-between gap-x-3">
        <Text className="text-white/80 text-[12px] font-semibold flex-1" numberOfLines={2}>
          {title}
        </Text>

        {!!effect && <Text className="text-white/60 text-[11px] leading-4 text-right shrink-0">{effect}</Text>}
      </View>

      {ingredients.length ? (
        <View className="mt-3 pt-2 border-t border-white/10">
          <Text className="text-white/55 text-[10px] mb-2">Ingredients</Text>

          <EggGrid
            variant="flat"
            items={ingredients}
            emptyText="No ingredients listed."
            render={(x: WorkResearchIngredient, idx: number) => {
              const key = `${safeText(x?.slug ?? x?.name ?? "ing")}__work__ingredients__${idx}`;
              const title = safeText(x?.name) || safeText(x?.slug) || "—";
              const qtyText = x?.qtyText != null ? safeText(x.qtyText) : x?.qty != null ? fmtNum(x.qty) : "—";

              return {
                key,
                iconUrl: x?.iconUrl ?? null,
                title,
                rightText: qtyText || "—",
              };
            }}
          />
        </View>
      ) : (
        <Text className="text-white/35 text-[10px] mt-3">No ingredients listed.</Text>
      )}
    </View>
  );
}

function EggGrid({
  items,
  emptyText,
  render,
  variant = "card",
}: {
  items: any[];
  emptyText: string;
  render: (it: any, index: number) => {
    key: string;
    iconUrl: string | null;
    title: string;
    rightText: string;

    iconSize?: number; // default 32
    badgeIconUrl?: string | null; // ranch badge (bottom-right)
    subtitle?: string | null;
  };
  variant?: "card" | "flat";
}) {
  const content = items.length ? (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
      {items.map((it, i) => {
        const row = render(it, i);
        const iconSize = Number(row.iconSize) > 0 ? Number(row.iconSize) : 32;

        const containerSize = iconSize + 6;
        const radius = containerSize / 2;

        const badge = safeText(row.badgeIconUrl);

        // --- badge tuning ---
        // bigger + hangs outside the pal icon, so you see the bottom edge
        const badgeSize = 22;
        const badgeIconSize = 18;
        const badgeOffset = -6; // negative => hangs outside

        return (
          <View key={row.key} style={{ width: "50%" as any, paddingHorizontal: 6, paddingVertical: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: containerSize,
                  height: containerSize,
                  borderRadius: radius,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "visible", // allow badge to hang out
                  marginRight: 10,
                }}
              >
                {/* keep only the image clipped */}
                <View style={{ width: containerSize, height: containerSize, borderRadius: radius, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  {row.iconUrl ? <RemoteIcon uri={row.iconUrl} size={iconSize} /> : <Text style={{ color: "rgba(255,255,255,0.5)" }}>—</Text>}
                </View>

                {!!badge ? (
                  <View
                    style={{
                      position: "absolute",
                      right: badgeOffset,
                      bottom: badgeOffset,
                      width: badgeSize,
                      height: badgeSize,
                      borderRadius: 9,
                      backgroundColor: "rgba(0,0,0,0.45)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.22)",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <RemoteIcon uri={badge} size={badgeIconSize} />
                  </View>
                ) : null}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: "white", fontWeight: "800" }} numberOfLines={1}>
                  {row.title || "—"}
                </Text>

                <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 2, fontSize: 11 }} numberOfLines={1}>
                  {row.rightText || "—"}
                </Text>

                {!!row.subtitle ? (
                  <Text style={{ color: "rgba(255,255,255,0.35)", marginTop: 6, fontSize: 10 }} numberOfLines={2}>
                    {row.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  ) : (
    <Text style={{ color: "rgba(255,255,255,0.65)" }}>{emptyText}</Text>
  );

  if (variant === "flat") {
    return <View style={{ gap: 10 }}>{content}</View>;
  }

  return (
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
      {content}
    </View>
  );
}

function statsPowerByLevel(detail?: WorkSuitabilityDetail) {
  if (!detail) return null;

  const levels = Array.isArray(detail?.stats?.levels) ? detail!.stats.levels : [];
  const out = { 1: null, 2: null, 3: null, 4: null, 5: null } as Record<number, number | null>;

  for (const s of levels) {
    const lv = s?.level != null ? Number(s.level) : NaN;
    if (!Number.isFinite(lv)) continue;
    if (lv < 1 || lv > 5) continue;

    const p = s?.power != null ? Number(s.power) : null;
    if (p != null && Number.isFinite(p)) out[lv] = p;
  }

  return out;
}

function formatPalExtras(p: WorkPalRef, cols: { key: string; label: string }[]): { subtitle: string | null; ranchBadgeUrl: string | null } {
  if (!p || !cols?.length) return { subtitle: null, ranchBadgeUrl: null };

  const extras: any = p.extras ?? {};
  const parts: string[] = [];

  let ranchBadgeUrl: string | null = null;

  for (const c of cols) {
    const cell: any = extras[c.key];
    const text = safeText(cell?.text);
    if (!text) continue;

    // ranch badge: first link iconUrl becomes corner badge
    const maybeIcon = safeText(cell?.link?.iconUrl);
    if (!ranchBadgeUrl && maybeIcon) {
      ranchBadgeUrl = maybeIcon;
      continue;
    }

    // keep other extras (transporting, etc.) as subtitle
    const label = safeText(c.label) || safeText(c.key) || "Extra";
    parts.push(`${label}: ${text}`);
  }

  return { subtitle: parts.length ? parts.join("  •  ") : null, ranchBadgeUrl };
}

function SuitabilityTile({
  it,
  cols,
  tileH,
  onPress,
  detail,
}: {
  it: WorkSuitabilityItem;
  cols: number;
  tileH: number;
  onPress: (it: WorkSuitabilityItem) => void;
  detail?: WorkSuitabilityDetail;
}) {
  const ring = ringForIconId(it.iconId);
  const powerByLv = statsPowerByLevel(detail);

  const row = (lv: number) => {
    const val = powerByLv ? fmtNum(powerByLv[lv]) : "—";
    return (
      <View key={`lv-${lv}`} className="flex-row items-center justify-between">
        <Text className="text-white/55 text-[10px]">{`Lv ${lv}`}</Text>
        <Text className="text-white/70 text-[10px] font-semibold">{val}</Text>
      </View>
    );
  };

  return (
    <View key={it.slug} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
      <Pressable
        onPress={() => onPress(it)}
        className={["rounded-2xl border bg-white/[0.03] overflow-hidden active:opacity-90", ring].join(" ")}
        style={{ height: tileH }}
      >
        <View className="flex-1 px-3 pt-3 pb-3">
          <View className="flex-row items-center justify-between gap-x-3">
            <Text numberOfLines={2} className="flex-1 text-white text-[12px] leading-4">
              {safeName(it as any)}
            </Text>

            <View className="shrink-0">
              {it.iconUrl ? (
                <RemoteIcon
                  uri={it.iconUrl}
                  size={18}
                  roundedClassName="rounded-md"
                  placeholderClassName="bg-white/5 border border-white/10"
                  contentFit="contain"
                />
              ) : (
                <View className="h-[18px] w-[18px] rounded-md border border-white/10 bg-white/[0.04]" />
              )}
            </View>
          </View>

          <View className="mt-3 gap-y-1">
            {row(1)}
            {row(2)}
            {row(3)}
            {row(4)}
            {row(5)}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function WorkSuitabilityGrid({
  items,
  onPressItem,
  emptyText = "No work suitabilities found.",
  numColumns = 3,
  prefetchIcons = true,
}: WorkSuitabilityGridProps) {
  const cols = clamp(numColumns, 2, 4);
  const TILE_H = 134;

  const arr = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<WorkSuitabilityItem | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailBySlug, setDetailBySlug] = useState<Record<string, WorkSuitabilityDetail | undefined>>({});

  const inFlightRef = useRef<Set<string>>(new Set());

  const openSheet = useCallback(
    (it: WorkSuitabilityItem) => {
      onPressItem?.(it);
      setSelected(it);
      setSheetVisible(true);
    },
    [onPressItem]
  );

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  useEffect(() => {
    if (!prefetchIcons) return;
    prefetchRemoteIcons(arr.map((x) => x.iconUrl));
  }, [prefetchIcons, arr]);

  useEffect(() => {
    let cancelled = false;

    async function warmOne(slugKey: string, slugRaw: string) {
      if (cancelled) return;
      if (detailBySlug[slugKey]) return;
      if (inFlightRef.current.has(slugKey)) return;

      inFlightRef.current.add(slugKey);
      try {
        const d = await fetchWorkSuitabilityDetail(slugRaw);
        if (cancelled) return;

        setDetailBySlug((prev) => {
          if (prev[slugKey]) return prev;
          return { ...prev, [slugKey]: d };
        });
      } catch {
        // silent: tile will show "—"
      } finally {
        inFlightRef.current.delete(slugKey);
      }
    }

    (async () => {
      const FIRST_N = 10;
      for (let i = 0; i < Math.min(FIRST_N, arr.length); i++) {
        const it = arr[i];
        const slugRaw = safeText(it?.slug);
        const slugKey = slugRaw.toLowerCase();
        if (!slugKey) continue;

        await warmOne(slugKey, slugRaw);
        await sleep(80);
      }

      const BATCH = 4;
      const PAUSE_MS = 220;

      for (let start = FIRST_N; start < arr.length; start += BATCH) {
        if (cancelled) return;

        const slice = arr.slice(start, start + BATCH);
        for (const it of slice) {
          const slugRaw = safeText(it?.slug);
          const slugKey = slugRaw.toLowerCase();
          if (!slugKey) continue;

          await warmOne(slugKey, slugRaw);
          await sleep(80);
        }

        await sleep(PAUSE_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [arr, detailBySlug]);

  useEffect(() => {
    const sel = selected;
    if (!sheetVisible || !sel?.slug) return;

    const slugKey = safeText(sel.slug).toLowerCase();
    if (!slugKey) return;

    if (detailBySlug[slugKey]) {
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    if (inFlightRef.current.has(slugKey)) return;

    let cancelled = false;

    (async () => {
      try {
        setDetailError(null);
        setDetailLoading(true);

        inFlightRef.current.add(slugKey);
        const d = await fetchWorkSuitabilityDetail(sel.slug);
        if (cancelled) return;

        setDetailBySlug((prev) => ({ ...prev, [slugKey]: d }));
      } catch {
        if (!cancelled) setDetailError("Failed to load detail.");
      } finally {
        inFlightRef.current.delete(slugKey);
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sheetVisible, selected, detailBySlug]);

  const retryDetail = useCallback(async () => {
    const sel = selected;
    if (!sel?.slug) return;

    const slugKey = safeText(sel.slug).toLowerCase();
    if (!slugKey) return;

    if (inFlightRef.current.has(slugKey)) return;

    try {
      setDetailError(null);
      setDetailLoading(true);

      inFlightRef.current.add(slugKey);
      const d = await fetchWorkSuitabilityDetail(sel.slug);
      setDetailBySlug((prev) => ({ ...prev, [slugKey]: d }));
    } catch {
      setDetailError("Failed to load detail.");
    } finally {
      inFlightRef.current.delete(slugKey);
      setDetailLoading(false);
    }
  }, [selected]);

  if (!arr.length) {
    return (
      <View className="py-10 items-center">
        <Text className="text-white/70 text-sm">{emptyText}</Text>
      </View>
    );
  }

  const sel = selected;
  const selKey = sel?.slug ? safeText(sel.slug).toLowerCase() : "";
  const detail = selKey ? detailBySlug[selKey] : undefined;

  const headerIcon = detail?.iconUrl ?? sel?.iconUrl ?? null;
  const headerName = detail?.name ?? sel?.name ?? "—";

  const stats = detail?.stats ?? null;
  const structures = Array.isArray(detail?.structures) ? detail!.structures : [];
  const pals = Array.isArray(detail?.pals) ? detail!.pals : [];
  const palExtraCols = Array.isArray(detail?.palExtraColumns) ? detail!.palExtraColumns : [];
  const research = Array.isArray(detail?.research) ? detail!.research : [];

  const hasStructures = structures.length > 0;
  const hasPals = pals.length > 0;
  const hasResearch = research.length > 0;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {arr.map((it) => {
            const k = safeText(it.slug).toLowerCase();
            const tileDetail = k ? detailBySlug[k] : undefined;

            return (
              <SuitabilityTile
                key={it.slug}
                it={it}
                cols={cols}
                tileH={TILE_H}
                onPress={openSheet}
                detail={tileDetail}
              />
            );
          })}
        </View>
      </View>

      <BottomSheetModal visible={sheetVisible} onRequestClose={closeSheet} sheetStyle={{ maxHeight: "92%", minHeight: 220, paddingBottom: 10 }}>
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3">
              {headerIcon ? (
                <RemoteIcon
                  uri={headerIcon}
                  size={44}
                  roundedClassName="rounded-xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                  contentFit="contain"
                />
              ) : (
                <View className="h-[44px] w-[44px] rounded-xl border border-white/10 bg-white/[0.04]" />
              )}

              <View className="ml-3 flex-1">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {headerName}
                </Text>
              </View>
            </View>

            <Pressable onPress={closeSheet} className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {/* Loading / Error */}
          {detailLoading && !detail ? (
            <View className="mt-5">
              <SectionTitle>Loading</SectionTitle>
              <Box>
                <Text className="text-white/70 text-[12px] leading-5">fetching details…</Text>
              </Box>
            </View>
          ) : detailError ? (
            <View className="mt-5">
              <SectionTitle>Error</SectionTitle>
              <Box>
                <Text className="text-rose-200 text-[12px] leading-5">{detailError}</Text>

                <Pressable onPress={retryDetail} className="mt-3 px-3 py-2 rounded-2xl bg-white/[0.06] border border-white/10 self-start">
                  <Text className="text-white text-[12px] font-semibold">Retry</Text>
                </Pressable>
              </Box>
            </View>
          ) : !detail ? (
            <View className="mt-5">
              <SectionTitle>Details</SectionTitle>
              <Box>
                <Text className="text-white/65 text-[12px] leading-5">Select an entry to load details.</Text>
              </Box>
            </View>
          ) : (
            <>
              {/* Stats */}
              <View className="mt-5">
                <SectionTitle>Stats</SectionTitle>
                <Box>
                  <Text className="text-white/60 text-[11px]" numberOfLines={2}>
                    {safeText(stats?.type) || "—"}
                  </Text>

                  <View className="mt-2 border-t border-white/10 pt-2">
                    {Array.isArray(stats?.levels) && stats!.levels.length ? (
                      stats!.levels.map((lv, idx) => (
                        <View key={`lv-${lv.level}-${idx}`} className={idx === 0 ? "" : "border-t border-white/5"}>
                          <StatRow it={lv} />
                        </View>
                      ))
                    ) : (
                      <Text className="text-white/45 text-[11px]">No level scaling found.</Text>
                    )}
                  </View>
                </Box>
              </View>

              {/* Structures (hide if empty) */}
              {hasStructures ? (
                <View className="mt-4">
                  <SectionTitle>Structures</SectionTitle>
                  <EggGrid
                    items={structures}
                    emptyText=""
                    render={(s: WorkStructureRef, i: number) => {
                      const key = `${safeText(s?.slug)}__work__structures__${i}`;
                      const title = safeText(s?.name) || safeText(s?.slug) || "Structure";
                      const rightText = s?.requiredLevel != null ? `Req Lv ${s.requiredLevel}` : "Req Lv —";
                      return { key, iconUrl: s?.iconUrl ?? null, title, rightText };
                    }}
                  />
                </View>
              ) : null}

              {/* Pals (hide if empty) */}
              {hasPals ? (
                <View className="mt-4">
                  <SectionTitle>Pals</SectionTitle>
                  <EggGrid
                    items={pals}
                    emptyText=""
                    render={(p: WorkPalRef, i: number) => {
                      const key = `${safeText(p?.slug)}__work__pals__${i}`;
                      const title = safeText(p?.name) || safeText(p?.slug) || "Pal";
                      const rightText = `${p?.level != null ? `Lv ${p.level}` : "Lv —"}${p?.nocturnal ? " • Nocturnal" : ""}`;

                      const { subtitle, ranchBadgeUrl } = formatPalExtras(p, palExtraCols);

                      return {
                        key,
                        iconUrl: p?.iconUrl ?? null,
                        title,
                        rightText,
                        iconSize: 44, // bigger pal image
                        badgeIconUrl: ranchBadgeUrl, // ranch badge
                        subtitle, // transporting etc stays as subtitle
                      };
                    }}
                  />
                </View>
              ) : null}

              {/* Research (hide if empty) */}
              {hasResearch ? (
                <View className="mt-4">
                  <SectionTitle>Research</SectionTitle>
                  <View>
                    {research.map((r, idx) => (
                      <ResearchCard key={`${r?.title ?? "research"}-${idx}`} it={r as any} />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
