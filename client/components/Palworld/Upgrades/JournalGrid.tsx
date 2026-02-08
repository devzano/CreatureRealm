// components/Palworld/PalJournalGrid.tsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RemoteIcon, { prefetchRemoteIcons } from "@/components/Palworld/RemoteIcon";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

import type { JournalIndexItem, JournalDetail } from "@/lib/palworld/upgrades/paldbJournal";
import { fetchJournalDetail } from "@/lib/palworld/upgrades/paldbJournal";
import { usePalworldCollectionStore } from "@/store/palworldCollectionStore";
import { safeText, clamp } from "../Construction/palGridKit";

type PalJournalGridProps = {
  items: JournalIndexItem[];
  onPressItem?: (item: JournalIndexItem) => void;
  emptyText?: string;
  numColumns?: number;
  prefetchIcons?: boolean;
};

function shortTitle(s: string | undefined) {
  const t = safeText(s);
  if (!t) return "Journal";
  return t;
}

function previewSnippet(detail: JournalDetail | null) {
  const raw = safeText(detail?.bodyText);
  if (!raw) return "—";
  const oneLine = raw.replace(/\s+/g, " ").trim();
  return oneLine || "—";
}

function tileKey(it: JournalIndexItem) {
  const slug = safeText((it as any)?.slug);
  const title = safeText((it as any)?.title);
  return slug || title || Math.random().toString(36).slice(2);
}

function normalizeSlugForFetch(slugOrUrl: string) {
  const s = safeText(slugOrUrl);
  if (!s) return "";

  if (s.includes("/")) {
    const parts = s.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    return decodeURIComponent(last);
  }
  return decodeURIComponent(s);
}

function SheetLabel({ children }: { children: React.ReactNode; }) {
  return <Text className="text-white/80 text-[12px] mb-2">{children}</Text>;
}

function MultilineText({ text }: { text: string; }) {
  const t = safeText(text);
  if (!t) return <Text className="text-white/55 text-[12px] leading-5">—</Text>;

  const lines = t.split("\n");
  return (
    <View style={{ gap: 8 }}>
      {lines.map((ln, idx) => {
        const line = String(ln ?? "").trim();
        if (!line) return <View key={`br-${idx}`} style={{ height: 4 }} />;
        return (
          <Text key={`ln-${idx}`} className="text-white/75 text-[12px] leading-5">
            {line}
          </Text>
        );
      })}
    </View>
  );
}

function JournalTile({
  it,
  cols,
  tileH,
  onPressOpen,
  imageUrl,
  isCollected,
  onToggleCollected,
}: {
  it: JournalIndexItem;
  cols: number;
  tileH: number;
  onPressOpen: (it: JournalIndexItem) => void;
  imageUrl: string | null;
  isCollected: boolean;
  onToggleCollected: () => void;
}) {
  const title = shortTitle((it as any)?.title);
  const IMG_H = 56;

  return (
    <View key={tileKey(it)} className="px-2 mb-4" style={{ width: `${100 / cols}%` as any }}>
      <Pressable
        onPress={() => onPressOpen(it)}
        className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden active:opacity-90"
        style={{ height: tileH }}
      >
        <View className="flex-1 px-3 pt-3 pb-3">
          <View className="flex-row items-center justify-between mb-3">
            <View className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
              <Text className="text-[10px] font-semibold text-white/70">Journal</Text>
            </View>
            <Ionicons name="book-outline" size={14} color="rgba(255,255,255,0.3)" />
          </View>

          <View className="flex-1">
            <View className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]">
              {imageUrl ? (
                <RemoteIcon
                  uri={imageUrl}
                  size={IMG_H}
                  roundedClassName="rounded-none"
                  placeholderClassName="bg-white/5"
                  contentFit="cover"
                  style={{ width: "100%", height: IMG_H }}
                />
              ) : (
                <View className="items-center justify-center" style={{ width: "100%", height: IMG_H }}>
                  <Ionicons name="book-outline" size={22} color="white" />
                </View>
              )}
            </View>

            <View className="mt-2">
              <Text numberOfLines={1} className="text-white text-[13px] font-bold leading-4">
                {title}
              </Text>
            </View>
          </View>

          <View className="mt-2 flex-row items-center justify-center" style={{ gap: 10 }}>
            <Pressable
              onPress={() => onPressOpen(it)}
              className="h-9 flex-1 rounded-xl border border-white/10 bg-white/[0.04] items-center justify-center active:opacity-80"
            >
              <Ionicons name="open-outline" size={16} color="white" />
            </Pressable>

            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                onToggleCollected();
              }}
              onPressIn={(e) => {
                e?.stopPropagation?.();
              }}
              className={[
                "h-9 flex-1 rounded-xl border items-center justify-center active:opacity-80",
                isCollected ? "border-emerald-500/40 bg-emerald-500/15" : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <Ionicons
                name={isCollected ? "checkbox" : "checkbox-outline"}
                size={16}
                color={isCollected ? "#6EE7B7" : "white"}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function PalJournalGrid({
  items,
  onPressItem,
  emptyText = "No journal entries found.",
  numColumns = 2,
  prefetchIcons = true,
}: PalJournalGridProps) {
  const cols = clamp(numColumns, 1, 3);
  const TILE_H = 170;

  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selected, setSelected] = useState<JournalIndexItem | null>(null);

  const [detail, setDetail] = useState<JournalDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const thumbsRef = useRef<Record<string, string>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const storeSnap = usePalworldCollectionStore((s) => s);
  const toggleCollected = usePalworldCollectionStore((s) => s.toggleJournal);

  useEffect(() => {
    thumbsRef.current = thumbs;
  }, [thumbs]);

  const setThumb = useCallback((slug: string, url: string) => {
    if (!slug || !url) return;
    setThumbs((prev) => {
      if (prev[slug]) return prev;
      return { ...prev, [slug]: url };
    });
  }, []);

  const loadThumb = useCallback(
    async (slug: string) => {
      if (!slug) return;

      if (thumbsRef.current[slug]) return;

      if (inFlightRef.current.has(slug)) return;
      inFlightRef.current.add(slug);

      try {
        const d = await fetchJournalDetail(slug);
        const img = safeText(d?.imageUrl);
        if (img) {
          setThumb(slug, img);
          if (prefetchIcons) prefetchRemoteIcons([img]);
        }
      } catch {
        // ignore thumbnail failures
      } finally {
        inFlightRef.current.delete(slug);
      }
    },
    [prefetchIcons, setThumb]
  );

  const openSheet = useCallback(
    (it: JournalIndexItem) => {
      onPressItem?.(it);
      setSelected(it);
      setSheetVisible(true);

      setDetail(null);
      setDetailErr(null);
      setDetailLoading(true);

      const slug = normalizeSlugForFetch(it.slug || it.url || it.title);

      fetchJournalDetail(slug)
        .then((d) => {
          setDetail(d);
          setDetailLoading(false);

          const img = safeText(d?.imageUrl);
          if (slug && img) {
            setThumb(slug, img);
            if (prefetchIcons) prefetchRemoteIcons([img]);
          }
        })
        .catch((e) => {
          setDetailErr(String(e?.message ?? e ?? "Failed to load journal detail"));
          setDetailLoading(false);
        });
    },
    [onPressItem, prefetchIcons, setThumb]
  );

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  useEffect(() => {
    if (!prefetchIcons) return;
    const url = detail?.imageUrl ? [detail.imageUrl] : [];
    if (url.length) prefetchRemoteIcons(url);
  }, [prefetchIcons, detail?.imageUrl]);

  useEffect(() => {
    if (!prefetchIcons) return;
    if (!list.length) return;

    let cancelled = false;

    const CONCURRENCY = 4;
    const slugs = list
      .map((it) => normalizeSlugForFetch(it.slug || it.url || it.title))
      .filter(Boolean);

    (async () => {
      let idx = 0;

      async function worker() {
        while (!cancelled) {
          const i = idx++;
          if (i >= slugs.length) return;
          const slug = slugs[i];
          if (!slug) continue;
          if (thumbsRef.current[slug]) continue;
          await loadThumb(slug);
        }
      }

      const workers = Array.from({ length: CONCURRENCY }, () => worker());
      await Promise.all(workers);
    })();

    return () => {
      cancelled = true;
    };
  }, [prefetchIcons, list, loadThumb]);

  if (!list.length) {
    return (
      <View className="py-10 items-center px-6">
        <Text className="text-white/70 text-sm text-center">{emptyText}</Text>
      </View>
    );
  }

  const sel = selected;
  const selTitle = shortTitle(sel?.title);

  const journalKey = sel ? `journal:${normalizeSlugForFetch(sel.slug || sel.url || sel.title)}` : "";
  const collected = journalKey ? storeSnap.getEntry(journalKey).journal : false;

  return (
    <>
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-2">
          {list.map((it) => {
            const slug = normalizeSlugForFetch(it.slug || it.url || it.title);
            const imageUrl = slug ? thumbs[slug] ?? null : null;

            const key = slug ? `journal:${slug}` : "";
            const isCollected = key ? storeSnap.getEntry(key).journal : false;

            return (
              <JournalTile
                key={tileKey(it)}
                it={it}
                cols={cols}
                tileH={TILE_H}
                onPressOpen={openSheet}
                imageUrl={imageUrl}
                isCollected={isCollected}
                onToggleCollected={() => {
                  if (!key) return;
                  toggleCollected(key);
                }}
              />
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
            <View className="flex-row items-center flex-1 pr-3">
              {detail?.imageUrl ? (
                <RemoteIcon
                  uri={detail.imageUrl}
                  size={56}
                  roundedClassName="rounded-xl"
                  placeholderClassName="bg-white/5 border border-white/10"
                  contentFit="cover"
                />
              ) : (
                <View className="h-[56px] w-[56px] rounded-xl border border-white/10 bg-white/[0.04] items-center justify-center">
                  <Ionicons name="book-outline" size={22} color="white" />
                </View>
              )}

              <View className="ml-3 flex-1">
                <Text className="text-white text-[16px] font-semibold" numberOfLines={2}>
                  {safeText(detail?.title) || selTitle || "Journal"}
                </Text>

                <Text className="text-white/60 text-[12px] mt-0.5" numberOfLines={1}>
                  Journal Entry
                </Text>

                <View className="mt-2 flex-row">
                  <Pressable
                    onPress={() => {
                      if (!journalKey) return;
                      toggleCollected(journalKey);
                    }}
                    className={[
                      "px-3 py-1.5 rounded-full border",
                      collected ? "border-emerald-500/40 bg-emerald-500/15" : "border-white/10 bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <Text
                      className={["text-[11px] font-semibold", collected ? "text-emerald-200" : "text-white/75"].join(" ")}
                    >
                      {collected ? "Collected ✓" : "Mark Collected"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable
              onPress={closeSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {detailLoading ? (
            <View className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <Text className="text-white/70 text-[12px]">Loading…</Text>
              <Text className="text-white/40 text-[11px] mt-1" numberOfLines={2}>
                {selTitle}
              </Text>
            </View>
          ) : detailErr ? (
            <View className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3">
              <Text className="text-red-100 text-[12px] font-semibold">Failed to load</Text>
              <Text className="text-red-100/80 text-[11px] mt-1">{detailErr}</Text>

              <View className="mt-3">
                <Pressable
                  onPress={() => {
                    if (!sel) return;
                    setDetail(null);
                    setDetailErr(null);
                    setDetailLoading(true);

                    const slug = normalizeSlugForFetch(sel.slug || sel.url || sel.title);
                    fetchJournalDetail(slug)
                      .then((d) => {
                        setDetail(d);
                        setDetailLoading(false);
                      })
                      .catch((e) => {
                        setDetailErr(String(e?.message ?? e ?? "Failed to load journal detail"));
                        setDetailLoading(false);
                      });
                  }}
                  className="px-3 py-2 rounded-full border border-white/10 bg-white/[0.06] self-start"
                >
                  <Text className="text-white/80 text-[12px]">Retry</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View className="mt-5">
                <SheetLabel>Preview</SheetLabel>
                <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <Text numberOfLines={4} className="text-white/70 text-[12px] leading-5">
                    {previewSnippet(detail)}
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <SheetLabel>Entry</SheetLabel>
                <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <MultilineText text={detail?.bodyText ?? ""} />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
