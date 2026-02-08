// components/AnimalCrossing/ACBoatTourIslandsGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import LocalIcon from "@/components/LocalIcon";

import {
  fetchBoatTourIndex,
  islandTypeMatchesSearch,
  type BoatTourIslandType,
  type BoatTourGalleryImage,
  type BoatTourDateRule,
  type BoatTourSpecialTable,
  type BoatTourIndex,
} from "@/lib/animalCrossing/nookBoatTour";

type ACBoatTourIslandsGridProps = {
  search: string;
  numColumns?: number;
  emptyText?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function safeText(v: any): string {
  if (v == null) return "";
  return String(v);
}

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function tileKey(it: BoatTourIslandType) {
  return (
    safeText((it as any).id) ||
    safeText((it as any).internalId) ||
    safeText(it.name) ||
    Math.random().toString(36).slice(2)
  );
}

function isRemoteImage(src: string | null | undefined) {
  const s = String(src ?? "");
  return s.startsWith("http://") || s.startsWith("https://");
}

function fmtChance(v: number) {
  if (!Number.isFinite(v) || v <= 0) return null;
  const s = String(v);
  const dec = s.includes(".") ? Number(v).toFixed(2) : String(v);
  return `${dec}%`;
}

function fmtDateRule(r: BoatTourDateRule) {
  if (r.kind === "gameTime") return "Game time";
  const time = r.timeOfDay ? ` • ${r.timeOfDay}` : "";
  return `NH ${r.north} • SH ${r.south}${time}`;
}

function kindLabel(kind: BoatTourIslandType["category"]) {
  return kind === "rare" ? "Rare" : "Normal";
}

function kindPillClasses(kind: BoatTourIslandType["category"]) {
  return kind === "rare" ? "border-violet-500/30 bg-violet-500/10" : "border-sky-500/30 bg-sky-500/10";
}

function kindTextClasses(kind: BoatTourIslandType["category"]) {
  return kind === "rare" ? "text-violet-200" : "text-sky-200";
}

function SmartImage({
  source,
  size,
  rounded = 16,
  contentFit = "cover",
  style,
}: {
  source: string;
  size: number;
  rounded?: number;
  contentFit?: "cover" | "contain";
  style?: any;
}) {
  if (isRemoteImage(source)) {
    return (
      <ExpoImage
        source={{ uri: source }}
        style={[{ width: size, height: size, borderRadius: rounded }, style]}
        contentFit={contentFit}
      />
    );
  }

  return (
    <LocalIcon
      source={source}
      size={size}
      roundedClassName={`rounded-[${rounded}px]`}
      placeholderClassName="bg-white/5 border border-white/10"
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <Text className="text-[11px] text-white/60">—</Text>;
  return (
    <View style={{ gap: 6 }}>
      {items.map((t, idx) => (
        <View key={`${t}::${idx}`} className="flex-row">
          <Text className="text-[11px] text-white/50 mr-2">•</Text>
          <Text className="text-[11px] text-white/80 flex-1">{t}</Text>
        </View>
      ))}
    </View>
  );
}

function IntroSectionBlock({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  if (!paragraphs || paragraphs.length === 0) return null;

  return (
    <View className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <Text className="text-white text-[14px] font-semibold">{title}</Text>

      <View className="mt-2" style={{ gap: 8 }}>
        {paragraphs.map((p, i) => (
          <Text key={`${title}-${i}`} className="text-[12px] text-white/75 leading-5">
            {p}
          </Text>
        ))}
      </View>
    </View>
  );
}

function GalleryPairBlock({
  maps,
  screenshots,
}: {
  maps: BoatTourGalleryImage[];
  screenshots: BoatTourGalleryImage[];
}) {
  const map = Array.isArray(maps) ? maps[0] : null;
  const shot = Array.isArray(screenshots) ? screenshots[0] : null;
  if (!map || !shot) return null;

  return (
    <View className="mt-4">
      <View className="flex-row" style={{ gap: 10 }}>
        {/* Map */}
        <View style={{ flex: 1 }}>
          <SectionLabel>Map</SectionLabel>

          <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            {isRemoteImage(map.imageUrl) ? (
              <ExpoImage
                source={{ uri: map.imageUrl }}
                style={{ width: "100%", height: 92, borderRadius: 16 }}
                contentFit="cover"
              />
            ) : (
              <View style={{ width: "100%", height: 92, borderRadius: 16, overflow: "hidden" as any }}>
                <LocalIcon
                  source={map.imageUrl}
                  size={140}
                  roundedClassName="rounded-2xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                />
              </View>
            )}

            {map.title ? (
              <Text className="text-[10px] text-white/50 mt-2" numberOfLines={1}>
                {map.title}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Screenshot */}
        <View style={{ flex: 1 }}>
          <SectionLabel>Screenshot</SectionLabel>

          <View className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            {isRemoteImage(shot.imageUrl) ? (
              <ExpoImage
                source={{ uri: shot.imageUrl }}
                style={{ width: "100%", height: 92, borderRadius: 16 }}
                contentFit="cover"
              />
            ) : (
              <View style={{ width: "100%", height: 92, borderRadius: 16, overflow: "hidden" as any }}>
                <LocalIcon
                  source={shot.imageUrl}
                  size={140}
                  roundedClassName="rounded-2xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                />
              </View>
            )}

            {shot.title ? (
              <Text className="text-[10px] text-white/50 mt-2" numberOfLines={1}>
                {shot.title}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function GalleryStrip({ title, items }: { title: string; items: BoatTourGalleryImage[] }) {
  if (!items || items.length === 0) return null;

  return (
    <View className="mt-4">
      <SectionLabel>{title}</SectionLabel>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
        <View className="flex-row" style={{ gap: 10 }}>
          {items.map((img, idx) => (
            <View
              key={`${img.id}::${img.imageUrl}::${idx}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-2"
            >
              {isRemoteImage(img.imageUrl) ? (
                <ExpoImage
                  source={{ uri: img.imageUrl }}
                  style={{ width: 140, height: 92, borderRadius: 16 }}
                  contentFit="cover"
                />
              ) : (
                <LocalIcon
                  source={img.imageUrl}
                  size={140}
                  roundedClassName="rounded-2xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                />
              )}

              {img.title ? (
                <Text className="text-[10px] text-white/50 mt-2" numberOfLines={1} style={{ width: 140 }}>
                  {img.title}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function TableBlock({ rows }: { rows: BoatTourIslandType["tables"] }) {
  if (!rows || rows.length === 0) return null;

  return (
    <View className="mt-4">
      <SectionLabel>Island Data</SectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <View style={{ gap: 12 }}>
          {rows.map((r) => (
            <View key={r.label}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  {r.iconKey ? <SmartImage source={r.iconKey} size={18} rounded={6} contentFit="contain" /> : null}
                  <Text className="text-[12px] text-white font-semibold">{r.label}</Text>
                </View>

                {r.note ? (
                  <Text className="text-[10px] text-white/50" numberOfLines={1}>
                    {r.note}
                  </Text>
                ) : null}
              </View>

              <View className="mt-2">
                <BulletList items={r.items} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function SpecialTablesBlock({ tables }: { tables: BoatTourSpecialTable[] }) {
  if (!tables || tables.length === 0) return null;

  function stripFragmentName(name: any) {
    const s = safeText(name);
    if (!s) return "—";
    return s
      .replace(/\bfragment\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([)\],.])/g, "$1")
      .trim();
  }

  return (
    <View className="mt-4">
      <SectionLabel>Drops</SectionLabel>

      <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
        <View style={{ gap: 16 }}>
          {tables.map((t, ti) => (
            <View key={`${t.label}::${ti}`}>
              <Text className="text-[12px] text-white font-semibold mb-2">{safeText(t.label) || "Fragments"}</Text>

              <View className="flex-row flex-wrap -mx-1">
                {(t.rows ?? []).map((r, ri) => (
                  <View key={`${r.name}::${r.probability}::${ri}`} className="px-1 mb-2" style={{ width: "50%" }}>
                    <View className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                      <View className="flex-row items-center justify-between" style={{ gap: 10 }}>
                        <View className="flex-row items-center flex-1 pr-2" style={{ gap: 8 }}>
                          {r.iconUrl ? (
                            <SmartImage source={r.iconUrl} size={20} rounded={6} contentFit="contain" />
                          ) : null}

                          <Text className="text-[12px] text-white/85 flex-1" numberOfLines={1}>
                            {stripFragmentName(r.name)}
                          </Text>
                        </View>

                        <Text className="text-[12px] text-white/70 font-semibold" numberOfLines={1}>
                          {safeText(r.probability) || "—"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function IslandTypeTile({
  it,
  cols,
  tileH,
  onPressOpen,
}: {
  it: BoatTourIslandType;
  cols: number;
  tileH: number;
  onPressOpen: (it: BoatTourIslandType) => void;
}) {
  const title = safeText(it.name) || "Island";
  const thumb = it.maps?.[0]?.imageUrl ?? it.screenshots?.[0]?.imageUrl ?? null;

  const chance = fmtChance(safeNum((it as any).chancePct) ?? 0);
  const idVal = safeText((it as any).internalId) || safeText((it as any).id) || "—";

  const IMG_H = 70;

  return (
    <View key={tileKey(it)} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
      <Pressable
        onPress={() => onPressOpen(it)}
        className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden active:opacity-90"
        style={{ height: tileH }}
      >
        <View className="flex-1 px-3 pt-3 pb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className={["px-2 py-0.5 rounded-full border", kindPillClasses(it.category)].join(" ")}>
              <Text className={["text-[10px] font-semibold", kindTextClasses(it.category)].join(" ")}>
                {kindLabel(it.category)}
              </Text>
            </View>

            {chance ? (
              <View className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
                <Text className="text-white/70 text-[10px] font-semibold">{chance}</Text>
              </View>
            ) : (
              <Ionicons name="navigate-outline" size={14} color="rgba(255,255,255,0.3)" />
            )}
          </View>

          <View className="flex-1">
            <View className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]">
              {thumb ? (
                <SmartImage
                  source={thumb}
                  size={IMG_H}
                  rounded={0}
                  contentFit="cover"
                  style={{ width: "100%", height: IMG_H, borderRadius: 0 }}
                />
              ) : (
                <View className="items-center justify-center" style={{ width: "100%", height: IMG_H }}>
                  <Text className="text-[22px]">{it.emoji ?? "🏝️"}</Text>
                </View>
              )}
            </View>

            <View className="mt-2">
              <Text numberOfLines={1} className="text-white text-[13px] font-bold leading-4">
                {title}
              </Text>

              <View className="flex-row items-center justify-between">
                <Text numberOfLines={1} className="text-white/45 text-[11px] mt-1">
                  ID: {idVal}
                </Text>

                {chance ? (
                  <Text className="text-white/60 text-[11px] mt-1 font-semibold">{chance}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function ACBoatTourIslandsGrid({
  search,
  numColumns = 2,
  emptyText = "No island types found.",
}: ACBoatTourIslandsGridProps) {
  const cols = clamp(numColumns, 1, 2);
  const TILE_H = 160;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<BoatTourIslandType[]>([]);
  const [intro, setIntro] = useState<BoatTourIndex["intro"]>([]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<BoatTourIslandType | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        const idx = await fetchBoatTourIndex();
        if (cancelled) return;

        setIntro(idx.intro ?? []);
        setTypes(idx.islands ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load boat tour island types.");
        setIntro([]);
        setTypes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(types) ? types : [];
    const out = list.filter((x) => islandTypeMatchesSearch(x, search));

    out.sort((a, b) => {
      if (a.category !== b.category) return a.category === "normal" ? -1 : 1;
      const ca = Number((a as any).chancePct ?? 0);
      const cb = Number((b as any).chancePct ?? 0);
      if (cb !== ca) return cb - ca;
      return safeText(a.name).localeCompare(safeText(b.name));
    });

    return out;
  }, [types, search]);

  const introOverview = useMemo(() => {
    const list = Array.isArray(intro) ? intro : [];
    return list.find((s) => norm((s as any)?.title) === "overview") ?? null;
  }, [intro]);

  const introProbability = useMemo(() => {
    const list = Array.isArray(intro) ? intro : [];
    return list.find((s) => norm((s as any)?.title) === "probability") ?? null;
  }, [intro]);

  const introCommon = useMemo(() => {
    const list = Array.isArray(intro) ? intro : [];
    // Nookipedia heading is "Common factors"
    return list.find((s) => norm((s as any)?.title) === "common factors") ?? null;
  }, [intro]);

  const openSheet = useCallback((it: BoatTourIslandType) => {
    setSelected(it);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setSelected(null), 180);
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <ActivityIndicator />
        <Text className="text-[11px] text-white/50 mt-3">Loading Islands…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 py-6 px-4">
        <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <Text className="text-[12px] text-rose-300 font-semibold">Couldn’t load island types</Text>
          <Text className="text-[11px] text-white/50 mt-1">{error}</Text>
        </View>
      </View>
    );
  }

  if (!filtered.length) {
    return (
      <View className="py-10 items-center px-6">
        <Text className="text-white/70 text-sm text-center">{emptyText}</Text>
      </View>
    );
  }

  const sel = selected;

  const sheetThumb = sel?.maps?.[0]?.imageUrl ?? sel?.screenshots?.[0]?.imageUrl ?? null;

  const chanceText = sel ? fmtChance(safeNum((sel as any).chancePct) ?? 0) : null;
  const kindText = sel ? kindLabel(sel.category) : "—";
  const dateText = sel ? fmtDateRule(sel.dateRule) : "—";
  const idText = sel?.internalId ? String(sel.internalId) : "—";

  const hasWeather = (sel?.weatherPatterns?.length ?? 0) > 0;
  const hasTables = (sel?.tables?.length ?? 0) > 0;
  const hasSpecial = (sel?.specialTables?.length ?? 0) > 0;
  const hasNotes = (sel?.notes?.length ?? 0) > 0;

  return (
    <>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 26 }}>
        <View className="px-4">
          {/* Intro blocks */}
          {introOverview ? (
            <IntroSectionBlock title="Overview" paragraphs={introOverview.paragraphs ?? []} />
          ) : null}

          {introProbability ? (
            <IntroSectionBlock title="Probability" paragraphs={introProbability.paragraphs ?? []} />
          ) : null}

          {introCommon ? (
            <IntroSectionBlock title="Common factors" paragraphs={introCommon.paragraphs ?? []} />
          ) : null}

          <View className="flex-row flex-wrap -mx-2 mt-2">
            {filtered.map((it) => (
              <IslandTypeTile key={tileKey(it)} it={it} cols={cols} tileH={TILE_H} onPressOpen={openSheet} />
            ))}
          </View>
        </View>
      </ScrollView>

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3" style={{ gap: 12 }}>
              {sheetThumb ? (
                <View className="rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  <SmartImage source={sheetThumb} size={56} rounded={12} contentFit="cover" />
                </View>
              ) : (
                <View className="h-[56px] w-[56px] rounded-xl border border-white/10 bg-white/[0.04] items-center justify-center">
                  <Text className="text-[22px]">{sel?.emoji ?? "🏝️"}</Text>
                </View>
              )}

              <View className="flex-1">
                {sel?.category ? (
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <View className={["px-2 py-0.5 rounded-full border", kindPillClasses(sel.category)].join(" ")}>
                      <Text className={["text-[10px] font-semibold", kindTextClasses(sel.category)].join(" ")}>
                        {kindLabel(sel.category)} Island
                      </Text>
                    </View>

                    {chanceText ? (
                      <View className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
                        <Text className="text-white/70 text-[10px] font-semibold">{chanceText}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <Text className="text-white text-[16px] font-semibold mt-1" numberOfLines={2}>
                  {safeText(sel?.name) || "Island Type"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={2}>
                  {`Date: ${dateText} • ID: ${idText} • Kind: ${kindText}`}
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

          {hasWeather ? (
            <View className="mt-4">
              <SectionLabel>Weather patterns</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <BulletList items={sel?.weatherPatterns ?? []} />
              </View>
            </View>
          ) : null}

          {hasTables ? <TableBlock rows={sel?.tables ?? []} /> : null}

          {hasSpecial ? <SpecialTablesBlock tables={sel?.specialTables ?? []} /> : null}

          {hasNotes ? (
            <View className="mt-4">
              <SectionLabel>Notes</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <BulletList items={sel?.notes ?? []} />
              </View>
            </View>
          ) : null}

          {(sel?.maps?.length ?? 0) === 1 && (sel?.screenshots?.length ?? 0) === 1 ? (
            <GalleryPairBlock maps={sel?.maps ?? []} screenshots={sel?.screenshots ?? []} />
          ) : (
            <>
              <GalleryStrip title="Maps" items={sel?.maps ?? []} />
              <GalleryStrip title="Screenshots" items={sel?.screenshots ?? []} />
            </>
          )}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
