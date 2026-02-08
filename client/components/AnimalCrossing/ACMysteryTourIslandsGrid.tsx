// components/AnimalCrossing/ACMysteryTourIslandsGrid.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import LocalIcon from "@/components/LocalIcon";

import {
  fetchMysteryTourIndex,
  type MysteryTourIndex,
  type MysteryTourIslandType,
  type MysteryTourGalleryImage,
  type MysteryTourIslandCategory,
} from "@/lib/animalCrossing/nookMysteryTour";

type ACMysteryTourIslandsGridProps = {
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

function isRemoteImage(src: string | null | undefined) {
  const s = String(src ?? "");
  return s.startsWith("http://") || s.startsWith("https://");
}

function tileKey(it: MysteryTourIslandType) {
  return safeText((it as any).id) || safeText(it.name) || Math.random().toString(36).slice(2);
}

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function containsFold(hay: any, needle: any) {
  const h = norm(hay);
  const n = norm(needle);
  if (!n) return true;
  return h.includes(n);
}

function islandMatchesSearch(type: MysteryTourIslandType, search: string) {
  const q = norm(search);
  if (!q) return true;

  const blobs: string[] = [
    type.id,
    type.category,
    type.name,
    String(type.chancePct),
    type.internalId,
    ...(type.requirements ?? []),
    ...(type.notes ?? []),
    ...((type.tables ?? []).flatMap((t) => [t.label, ...(t.items ?? []), t.note ?? "", t.iconKey ?? ""])),
    ...((type.screenshots ?? []).flatMap((x) => [x.title ?? "", x.imageUrl])),
  ];

  return blobs.some((b) => containsFold(b, q));
}

function fmtChance(v: number) {
  if (!Number.isFinite(v) || v <= 0) return null;
  const s = String(v);
  const dec = s.includes(".") ? Number(v).toFixed(2) : String(v);
  return `${dec}%`;
}

function kindLabel(kind: MysteryTourIslandCategory) {
  return kind === "previous" ? "Previous" : "Current";
}

function kindPillClasses(kind: MysteryTourIslandCategory) {
  return kind === "previous" ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10";
}

function kindTextClasses(kind: MysteryTourIslandCategory) {
  return kind === "previous" ? "text-amber-200" : "text-emerald-200";
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
      <ExpoImage source={{ uri: source }} style={[{ width: size, height: size, borderRadius: rounded }, style]} contentFit={contentFit} />
    );
  }

  return (
    <LocalIcon source={source} size={size} roundedClassName={`rounded-[${rounded}px]`} placeholderClassName="bg-white/5 border border-white/10" />
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

function IntroBlock({ title, paragraphs }: { title: string; paragraphs: string[] }) {
  if (!paragraphs || paragraphs.length === 0) return null;
  return (
    <View className="mt-4 mb-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
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

function GalleryStrip({ title, items }: { title: string; items: MysteryTourGalleryImage[] }) {
  if (!items || items.length === 0) return null;

  return (
    <View className="mt-4">
      <SectionLabel>{title}</SectionLabel>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
        <View className="flex-row" style={{ gap: 10 }}>
          {items.map((img, idx) => (
            <View key={`${img.id}::${img.imageUrl}::${idx}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              {isRemoteImage(img.imageUrl) ? (
                <ExpoImage source={{ uri: img.imageUrl }} style={{ width: 140, height: 92, borderRadius: 16 }} contentFit="cover" />
              ) : (
                <LocalIcon source={img.imageUrl} size={140} roundedClassName="rounded-2xl" placeholderClassName="bg-white/5 border border-white/10" />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function TableBlock({ rows }: { rows: MysteryTourIslandType["tables"] }) {
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

function reqSummary(reqs: any): string {
  const list = Array.isArray(reqs) ? reqs.map((x) => safeText(x)).filter(Boolean) : [];
  if (list.length === 0) return "—";
  return list.join(" • ");
}

function IslandTypeTile({
  it,
  cols,
  tileH,
  onPressOpen,
}: {
  it: MysteryTourIslandType;
  cols: number;
  tileH: number;
  onPressOpen: (it: MysteryTourIslandType) => void;
}) {
  const title = safeText(it.name) || "Mystery Island";
  const thumb = it.screenshots?.[0]?.imageUrl ?? null;

  const chance = fmtChance(safeNum((it as any).chancePct) ?? 0);
  const reqText = reqSummary(it.requirements);

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
                <SmartImage source={thumb} size={IMG_H} rounded={0} contentFit="cover" style={{ width: "100%", height: IMG_H, borderRadius: 0 }} />
              ) : (
                <View className="items-center justify-center" style={{ width: "100%", height: IMG_H }}>
                  <Text className="text-[22px]">✈️</Text>
                </View>
              )}
            </View>

            <View className="mt-2">
              <Text numberOfLines={1} className="text-white text-[13px] font-bold leading-4">
                {title}
              </Text>

              <Text numberOfLines={1} className="text-white/45 text-[11px] mt-1">
                {reqText}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function ACMysteryTourIslandsGrid({
  search,
  numColumns = 2,
  emptyText = "No mystery islands found.",
}: ACMysteryTourIslandsGridProps) {
  const cols = clamp(numColumns, 1, 2);
  const TILE_H = 160;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<MysteryTourIslandType[]>([]);
  const [intro, setIntro] = useState<MysteryTourIndex["intro"]>([]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<MysteryTourIslandType | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        const idx = await fetchMysteryTourIndex();
        if (cancelled) return;

        setIntro(idx.intro ?? []);
        setTypes(idx.islands ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load mystery tour island types.");
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
    const out = list.filter((x) => islandMatchesSearch(x, search));

    out.sort((a, b) => {
      if (a.category !== b.category) return a.category === "current" ? -1 : 1;
      const ca = Number((a as any).chancePct ?? 0);
      const cb = Number((b as any).chancePct ?? 0);
      if (cb !== ca) return cb - ca;
      return safeText(a.name).localeCompare(safeText(b.name));
    });

    return out;
  }, [types, search]);

  const overview = useMemo(() => {
    const list = Array.isArray(intro) ? intro : [];
    return list.find((s) => norm((s as any)?.title) === "overview") ?? null;
  }, [intro]);

  const characteristics = useMemo(() => {
    const list = Array.isArray(intro) ? intro : [];
    return list.find((s) => norm((s as any)?.title) === "characteristics") ?? null;
  }, [intro]);

  const openSheet = useCallback((it: MysteryTourIslandType) => {
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
        <Text className="text-[11px] text-white/50 mt-3">Loading Mystery Islands…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 py-6 px-4">
        <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <Text className="text-[12px] text-rose-300 font-semibold">Couldn’t load mystery islands</Text>
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
  const sheetThumb = sel?.screenshots?.[0]?.imageUrl ?? null;

  const chanceText = sel ? fmtChance(safeNum((sel as any).chancePct) ?? 0) : null;
  const kindText = sel ? kindLabel(sel.category) : "—";
  const idText = sel?.internalId ? String(sel.internalId) : "—";

  const hasReqs = (sel?.requirements?.length ?? 0) > 0;
  const hasReqIcon = !!sel?.requirementsIconUrl;
  const hasTables = (sel?.tables?.length ?? 0) > 0;
  const hasNotes = (sel?.notes?.length ?? 0) > 0;

  return (
    <>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 26 }}>
        <View className="px-4">
          {overview ? <IntroBlock title="Overview" paragraphs={(overview as any).paragraphs ?? []} /> : null}

          {characteristics ? <IntroBlock title="Characteristics" paragraphs={(characteristics as any).paragraphs ?? []} /> : null}

          <View className="flex-row flex-wrap -mx-2">
            {filtered.map((it) => (
              <IslandTypeTile key={tileKey(it)} it={it} cols={cols} tileH={TILE_H} onPressOpen={openSheet} />
            ))}
          </View>
        </View>
      </ScrollView>

      <BottomSheetModal visible={sheetVisible} onRequestClose={closeSheet} sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}>
        <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 26 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3" style={{ gap: 12 }}>
              {sheetThumb ? (
                <View className="rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  <SmartImage source={sheetThumb} size={56} rounded={12} contentFit="cover" />
                </View>
              ) : (
                <View className="h-[56px] w-[56px] rounded-xl border border-white/10 bg-white/[0.04] items-center justify-center">
                  <Text className="text-[22px]">✈️</Text>
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
                  {safeText(sel?.name) || "Mystery Island"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={2}>
                  {`ID: ${idText} • Kind: ${kindText}`}
                </Text>
              </View>
            </View>

            <Pressable onPress={closeSheet} className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {hasReqs ? (
            <View className="mt-4">
              <SectionLabel>Requirements</SectionLabel>

              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  {hasReqIcon ? <SmartImage source={String(sel?.requirementsIconUrl)} size={18} rounded={6} contentFit="contain" /> : null}

                  <Text className="text-[12px] text-white/80 flex-1">
                    {(sel?.requirements ?? []).map((x) => safeText(x)).filter(Boolean).join(" • ") || "—"}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {hasTables ? <TableBlock rows={sel?.tables ?? []} /> : null}

          {hasNotes ? (
            <View className="mt-4">
              <SectionLabel>Notes</SectionLabel>
              <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <BulletList items={sel?.notes ?? []} />
              </View>
            </View>
          ) : null}

          <GalleryStrip title="Screenshots" items={sel?.screenshots ?? []} />
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
