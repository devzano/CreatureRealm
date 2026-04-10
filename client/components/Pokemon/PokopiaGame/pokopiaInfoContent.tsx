import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import type { PokopiaCloudIslandsPage } from "@/lib/pokemon/pokopia/cloudIslands";
import type { PokopiaDreamIslandDetail } from "@/lib/pokemon/pokopia/dreamIslandDetail";
import type { PokopiaDreamIslandsPage } from "@/lib/pokemon/pokopia/dreamIslands";
import type { PokopiaEventDetail } from "@/lib/pokemon/pokopia/eventDetail";
import type { PokopiaEventsPage } from "@/lib/pokemon/pokopia/events";
import type { PokopiaGuideDetail } from "@/lib/pokemon/pokopia/guideDetail";
import type { PokopiaGuidesPage } from "@/lib/pokemon/pokopia/guides";
import type { PokopiaInfoSection } from "./config";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { PokopiaEmptyState, PokopiaLoadingState } from "./PokopiaContentStates";

type Props = {
  selectedInfoSection: PokopiaInfoSection;
  onSelectInfoSection: (section: PokopiaInfoSection) => void;
  cloudIslandsPage: PokopiaCloudIslandsPage | null;
  cloudIslandsLoading: boolean;
  cloudIslandsError: string | null;
  dreamIslandsPage: PokopiaDreamIslandsPage | null;
  dreamIslandsLoading: boolean;
  dreamIslandsError: string | null;
  selectedDreamIslandSlug: string | null;
  selectedDreamIslandDetail: PokopiaDreamIslandDetail | null;
  selectedDreamIslandLoading: boolean;
  selectedDreamIslandError: string | null;
  onSelectDreamIsland: (slug: string) => void;
  onClearDreamIsland: () => void;
  eventsPage: PokopiaEventsPage | null;
  eventsLoading: boolean;
  eventsError: string | null;
  selectedEventSlug: string | null;
  selectedEventDetail: PokopiaEventDetail | null;
  selectedEventLoading: boolean;
  selectedEventError: string | null;
  onSelectEvent: (slug: string) => void;
  onClearEvent: () => void;
  guidesPage: PokopiaGuidesPage | null;
  guidesLoading: boolean;
  guidesError: string | null;
  selectedGuideSlug: string | null;
  selectedGuideDetail: PokopiaGuideDetail | null;
  selectedGuideLoading: boolean;
  selectedGuideError: string | null;
  onSelectGuide: (slug: string) => void;
  onClearGuide: () => void;
};

function SectionError({ title, message }: { title: string; message: string; }) {
  return (
    <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-3">
      <Text className="text-sm font-semibold text-rose-200">{title}</Text>
      <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{message}</Text>
    </View>
  );
}

function SectionHeader({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string;
  count?: number | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center justify-between px-1 mb-3"
    >
      <View className="flex-row items-baseline gap-2">
        <Text className="text-[16px] font-black text-white">{label}</Text>
        {count != null ? (
          <Text className="text-[12px] text-slate-400">
            {count} {count === 1 ? "entry" : "entries"}
          </Text>
        ) : null}
      </View>
      <Text className="text-slate-400 text-[13px] font-bold">
        {expanded ? "▲" : "▼"}
      </Text>
    </Pressable>
  );
}

function DetailBlockText({
  type,
  text,
}: {
  type: "heading" | "subheading" | "paragraph" | "list-item";
  text: string;
}) {
  return (
    <Text
      className={
        type === "heading"
          ? "text-[18px] font-semibold text-slate-50 mt-4 mb-2"
          : type === "subheading"
            ? "text-[15px] font-semibold text-slate-100 mt-3 mb-2"
            : type === "list-item"
              ? "text-[13px] leading-6 text-slate-300 mb-2"
              : "text-[13px] leading-6 text-slate-300 mb-3"
      }
    >
      {type === "list-item" ? `• ${text}` : text}
    </Text>
  );
}

export default function PokopiaInfoContent({
  cloudIslandsPage,
  cloudIslandsLoading,
  cloudIslandsError,
  dreamIslandsPage,
  dreamIslandsLoading,
  dreamIslandsError,
  selectedDreamIslandSlug,
  selectedDreamIslandDetail,
  selectedDreamIslandLoading,
  selectedDreamIslandError,
  onSelectDreamIsland,
  onClearDreamIsland,
  eventsPage,
  eventsLoading,
  eventsError,
  selectedEventSlug,
  selectedEventDetail,
  selectedEventLoading,
  selectedEventError,
  onSelectEvent,
  onClearEvent,
  guidesPage,
  guidesLoading,
  guidesError,
  selectedGuideSlug,
  selectedGuideDetail,
  selectedGuideLoading,
  selectedGuideError,
  onSelectGuide,
  onClearGuide,
}: Props) {
  const [islandsExpanded, setIslandsExpanded] = useState(true);
  const [eventsExpanded, setEventsExpanded] = useState(true);
  const [guidesExpanded, setGuidesExpanded] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetContentType, setSheetContentType] = useState<"dream" | "cloud" | "event" | "guide" | null>(null);
  const [selectedCloudIslandSlug, setSelectedCloudIslandSlug] = useState<string | null>(null);
  const [selectedCloudIslandPreview, setSelectedCloudIslandPreview] = useState<
    PokopiaCloudIslandsPage["islands"][number] | null
  >(null);
  const [selectedDreamIslandPreview, setSelectedDreamIslandPreview] = useState<
    PokopiaDreamIslandsPage["islands"][number] | null
  >(null);
  const [selectedEventPreview, setSelectedEventPreview] = useState<
    PokopiaEventsPage["entries"][number] | null
  >(null);
  const [selectedGuidePreview, setSelectedGuidePreview] = useState<
    PokopiaGuidesPage["entries"][number] | null
  >(null);
  const lastCloudIslandRef = useRef<PokopiaCloudIslandsPage["islands"][number] | null>(null);
  const lastDreamIslandRef = useRef<PokopiaDreamIslandsPage["islands"][number] | null>(null);
  const lastEventRef = useRef<PokopiaEventsPage["entries"][number] | null>(null);
  const lastGuideRef = useRef<PokopiaGuidesPage["entries"][number] | null>(null);

  const totalIslands =
    (dreamIslandsPage?.islands.length ?? 0) +
    (cloudIslandsPage?.islands.length ?? 0);

  const selectedCloudIsland =
    cloudIslandsPage?.islands.find((item) => item.slug === selectedCloudIslandSlug) ?? null;

  const displayCloudIsland =
    selectedCloudIsland ?? selectedCloudIslandPreview ?? lastCloudIslandRef.current;
  const displayDreamIsland =
    selectedDreamIslandPreview ?? lastDreamIslandRef.current;
  const displayEvent =
    selectedEventPreview ?? lastEventRef.current;
  const displayGuide =
    selectedGuidePreview ?? lastGuideRef.current;

  const openDreamIslandSheet = useCallback(
    (island: PokopiaDreamIslandsPage["islands"][number]) => {
      lastDreamIslandRef.current = island;
      setSelectedDreamIslandPreview(island);
      setSheetContentType("dream");
      setSheetVisible(true);
      onSelectDreamIsland(island.slug);
    },
    [onSelectDreamIsland]
  );

  const openCloudIslandSheet = useCallback(
    (island: PokopiaCloudIslandsPage["islands"][number]) => {
      lastCloudIslandRef.current = island;
      setSelectedCloudIslandPreview(island);
      setSelectedCloudIslandSlug(island.slug);
      setSheetContentType("cloud");
      setSheetVisible(true);
    },
    []
  );

  const openEventSheet = useCallback(
    (event: PokopiaEventsPage["entries"][number]) => {
      lastEventRef.current = event;
      setSelectedEventPreview(event);
      setSheetContentType("event");
      setSheetVisible(true);
      onSelectEvent(event.slug);
    },
    [onSelectEvent]
  );

  const openGuideSheet = useCallback(
    (guide: PokopiaGuidesPage["entries"][number]) => {
      lastGuideRef.current = guide;
      setSelectedGuidePreview(guide);
      setSheetContentType("guide");
      setSheetVisible(true);
      onSelectGuide(guide.slug);
    },
    [onSelectGuide]
  );

  const closeIslandSheet = useCallback(() => {
    setSheetVisible(false);
    setSheetContentType(null);
    setSelectedCloudIslandSlug(null);
    setSelectedCloudIslandPreview(null);
    setSelectedDreamIslandPreview(null);
    setSelectedEventPreview(null);
    setSelectedGuidePreview(null);
    onClearDreamIsland();
    onClearEvent();
    onClearGuide();
  }, [onClearDreamIsland, onClearEvent, onClearGuide]);



  // ─── All Sections ──────────────────────────────────────────────────────────
  return (
    <View className="flex-1 px-2 pt-4">

      {/* ── Islands ── */}
      <View className="mb-2">
        <SectionHeader
          label="Islands"
          count={totalIslands || null}
          expanded={islandsExpanded}
          onToggle={() => setIslandsExpanded((v) => !v)}
        />

        {islandsExpanded ? (
          dreamIslandsLoading || cloudIslandsLoading ? (
            <PokopiaLoadingState label="Loading islands…" />
          ) : dreamIslandsError || cloudIslandsError ? (
            <SectionError
              title="Islands unavailable"
              message={dreamIslandsError || cloudIslandsError || "Failed to load islands."}
            />
          ) : !totalIslands ? (
            <PokopiaEmptyState title="No islands" message="No Pokopia islands available right now." />
          ) : (
            <>
              {(dreamIslandsPage?.islands.length ?? 0) > 0 ? (
                <>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-1">
                    Dream Islands
                  </Text>
                  <View className="flex-row flex-wrap -mx-1">
                    {dreamIslandsPage!.islands.map((island) => (
                      <View key={island.slug} className="w-1/2 px-1 mb-2">
                        <Pressable
                          onPress={() => openDreamIslandSheet(island)}
                          className="overflow-hidden rounded-[26px] border border-white/10 bg-[#111827]"
                        >
                          <View style={{ aspectRatio: 16 / 11 }} className="relative bg-slate-900">
                            {island.imageUrl ? (
                              <ExpoImage
                                source={{ uri: island.imageUrl }}
                                style={{ width: "100%", height: "100%" }}
                                contentFit="cover"
                                transition={120}
                              />
                            ) : (
                              <View className="flex-1 items-center justify-center bg-slate-800">
                                <Text className="text-4xl text-slate-500">?</Text>
                              </View>
                            )}

                            <View className="absolute inset-0 bg-black/25" />

                            <View className="absolute left-3 right-3 top-3 flex-row items-start justify-between gap-2">
                              <View className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1">
                                <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                                  Dream
                                </Text>
                              </View>

                              <View className="rounded-full border border-sky-300/20 bg-sky-400/15 px-2.5 py-1">
                                <Text className="text-[10px] font-semibold text-sky-100">
                                  {island.materials.length + island.dolls.length}
                                </Text>
                              </View>
                            </View>

                            <View className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
                              <View className="rounded-[20px] border border-white/10 bg-black/40 px-3 py-2.5">
                                <Text className="text-[18px] font-black text-white" numberOfLines={2}>
                                  {island.name}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {(cloudIslandsPage?.islands.length ?? 0) > 0 ? (
                <>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-1 mt-1">
                    Cloud Islands
                  </Text>
                  <View className="flex-row flex-wrap -mx-1">
                    {cloudIslandsPage!.islands.map((island) => (
                      <View key={island.slug} className="w-1/2 px-1 mb-2">
                        <Pressable
                          onPress={() => openCloudIslandSheet(island)}
                          className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0f172a]"
                        >
                          <View style={{ aspectRatio: 16 / 11 }} className="relative bg-slate-900">
                            {island.imageUrl ? (
                              <ExpoImage
                                source={{ uri: island.imageUrl }}
                                style={{ width: "100%", height: "100%" }}
                                contentFit="cover"
                                transition={120}
                              />
                            ) : (
                              <View className="flex-1 items-center justify-center bg-slate-800">
                                <Text className="text-4xl text-slate-500">☁️</Text>
                              </View>
                            )}

                            <View className="absolute inset-0 bg-black/20" />

                            <View className="absolute left-3 right-3 top-3 flex-row items-start justify-between gap-2">
                              <View className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1">
                                <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                                  Cloud
                                </Text>
                              </View>

                              {island.likes ? (
                                <View className="rounded-full border border-sky-300/20 bg-sky-400/15 px-2.5 py-1">
                                  <Text className="text-[10px] font-semibold text-sky-100">
                                    ♡ {island.likes}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            <View className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
                              <View className="rounded-[20px] border border-white/10 bg-black/40 px-3 py-2.5">
                                <Text className="text-[18px] font-black text-white" numberOfLines={2}>
                                  {island.name}
                                </Text>
                                {island.code ? (
                                  <Text className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100" numberOfLines={1}>
                                    {island.code}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )
        ) : null}
      </View>

      {/* ── Events ── */}
      <View className="mb-2">
        <SectionHeader
          label="Events"
          count={eventsPage?.entries.length ?? null}
          expanded={eventsExpanded}
          onToggle={() => setEventsExpanded((v) => !v)}
        />

        {eventsExpanded ? (
          eventsLoading ? (
            <PokopiaLoadingState label="Loading events…" />
          ) : eventsError ? (
            <SectionError title="Events unavailable" message={eventsError} />
          ) : !eventsPage?.entries.length ? (
            <PokopiaEmptyState title="No events" message="No Pokopia events available right now." />
          ) : (
            <View className="flex-row flex-wrap -mx-1">
              {eventsPage.entries.map((entry) => (
                <View key={entry.slug} className="w-1/2 px-1 mb-2">
                  <Pressable
                    onPress={() => openEventSheet(entry)}
                    className="overflow-hidden rounded-[26px] border border-fuchsia-400/15 bg-[#140f1e]"
                  >
                    <View style={{ aspectRatio: 16 / 11 }} className="relative bg-slate-900">
                      {entry.imageUrl ? (
                        <ExpoImage
                          source={{ uri: entry.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={120}
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center bg-slate-800">
                          <Text className="text-4xl text-slate-500">★</Text>
                        </View>
                      )}

                      <View className="absolute inset-0 bg-black/30" />

                      <View className="absolute left-3 right-3 top-3 flex-row items-start justify-between gap-2">
                        <View className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1">
                          <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                            Event
                          </Text>
                        </View>

                        {entry.dateLabel ? (
                          <View className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/15 px-2.5 py-1">
                            <Text className="text-[10px] font-semibold text-fuchsia-100" numberOfLines={1}>
                              {entry.dateLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
                        <View className="rounded-[20px] border border-white/10 bg-black/40 px-3 py-2.5">
                          <Text className="text-[16px] font-extrabold leading-5 text-slate-100" numberOfLines={2}>
                            {entry.title}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="p-3">
                      <View className="min-h-[92px] rounded-[20px] border border-fuchsia-400/15 bg-fuchsia-400/8 p-2.5">
                        <Text className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                          Overview
                        </Text>
                        {entry.summary ? (
                          <Text className="text-[12px] leading-5 text-slate-200" numberOfLines={4}>
                            {entry.summary}
                          </Text>
                        ) : (
                          <Text className="text-[12px] leading-5 text-slate-400">
                            Tap to explore event details.
                          </Text>
                        )}
                      </View>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          )
        ) : null}
      </View>

      {/* ── Guides ── */}
      <View className="mb-4">
        <SectionHeader
          label="Guides"
          count={guidesPage?.entries.length ?? null}
          expanded={guidesExpanded}
          onToggle={() => setGuidesExpanded((v) => !v)}
        />

        {guidesExpanded ? (
          guidesLoading ? (
            <PokopiaLoadingState label="Loading guides…" />
          ) : guidesError ? (
            <SectionError title="Guides unavailable" message={guidesError} />
          ) : !guidesPage?.entries.length ? (
            <PokopiaEmptyState title="No guides" message="No Pokopia guides available right now." />
          ) : (
            <View className="flex-row flex-wrap -mx-1">
              {guidesPage.entries.map((entry) => (
                <View key={entry.slug} className="w-1/2 px-1 mb-2">
                  <Pressable
                    onPress={() => openGuideSheet(entry)}
                    className="overflow-hidden rounded-[26px] border border-cyan-400/15 bg-[#0d1720]"
                  >
                    <View style={{ aspectRatio: 16 / 11 }} className="relative overflow-hidden bg-[#10202b]">
                      <View className="absolute inset-0 bg-[#10202b]" />
                      <View className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-cyan-400/18" />
                      <View className="absolute top-10 -left-6 h-20 w-20 rounded-full bg-sky-400/14" />
                      <View className="absolute bottom-3 right-8 h-16 w-16 rounded-full bg-teal-300/10" />
                      <View className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-300/10 to-transparent" />
                      <View className="absolute inset-x-0 bottom-0 h-24 bg-black/20" />

                      <View className="absolute left-3 right-3 top-3 flex-row items-start justify-between gap-2">
                        <View className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1">
                          <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                            Guide
                          </Text>
                        </View>

                        {entry.dateLabel ? (
                          <View className="rounded-full border border-cyan-300/20 bg-cyan-400/15 px-2.5 py-1">
                            <Text className="text-[10px] font-semibold text-cyan-100" numberOfLines={1}>
                              {entry.dateLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
                        <View className="rounded-[20px] border border-white/10 bg-black/30 px-3 py-2.5">
                          <Text className="text-[16px] font-extrabold leading-5 text-slate-100" numberOfLines={2}>
                            {entry.title}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="p-3">
                      <View className="min-h-[92px] rounded-[20px] border border-cyan-400/15 bg-cyan-400/8 p-2.5">
                        <Text className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                          Summary
                        </Text>
                        {entry.summary ? (
                          <Text className="text-[12px] leading-5 text-slate-200" numberOfLines={4}>
                            {entry.summary}
                          </Text>
                        ) : (
                          <Text className="text-[12px] leading-5 text-slate-400">
                            Tap to read the guide.
                          </Text>
                        )}
                      </View>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          )
        ) : null}
      </View>

      <BottomSheetModal
        visible={sheetVisible}
        onRequestClose={closeIslandSheet}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                {sheetContentType === "dream"
                  ? displayDreamIsland?.name ?? selectedDreamIslandDetail?.name ?? "Dream Island"
                  : sheetContentType === "cloud"
                    ? displayCloudIsland?.name ?? "Cloud Island"
                    : sheetContentType === "event"
                      ? displayEvent?.title ?? selectedEventDetail?.title ?? "Event"
                      : displayGuide?.title ?? selectedGuideDetail?.title ?? "Guide"}
              </Text>
              <Text className="text-slate-400 text-[12px] mt-0.5" numberOfLines={2}>
                {sheetContentType === "dream"
                  ? "Dream Island details"
                  : sheetContentType === "cloud"
                    ? "Cloud Island details"
                    : sheetContentType === "event"
                      ? "Event details"
                      : "Guide details"}
              </Text>
            </View>

            <Pressable
              onPress={closeIslandSheet}
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
            >
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {sheetContentType === "dream" ? (
            selectedDreamIslandLoading ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-slate-300">Loading dream island…</Text>
              </View>
            ) : selectedDreamIslandError ? (
              <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
                <Text className="text-sm font-semibold text-rose-200">Dream island unavailable</Text>
                <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">
                  {selectedDreamIslandError}
                </Text>
              </View>
            ) : selectedDreamIslandDetail ? (
              <View className="overflow-hidden rounded-[30px] border border-white/10 bg-[#111827]">
                <View style={{ aspectRatio: 16 / 10 }} className="relative bg-slate-900">
                  {selectedDreamIslandDetail.imageUrl ? (
                    <ExpoImage
                      source={{ uri: selectedDreamIslandDetail.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-slate-800">
                      <Text className="text-5xl text-slate-500">?</Text>
                    </View>
                  )}

                  <View className="absolute inset-0 bg-black/25" />

                  <View className="absolute left-4 right-4 top-4 flex-row items-start justify-between gap-2">
                    <View className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5">
                      <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                        Dream Island
                      </Text>
                    </View>

                    <View className="rounded-full border border-sky-300/20 bg-sky-400/15 px-3 py-1.5">
                      <Text className="text-[11px] font-semibold text-sky-100">
                        {selectedDreamIslandDetail.materials.length + selectedDreamIslandDetail.dolls.length} collectibles
                      </Text>
                    </View>
                  </View>

                  <View className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10">
                    <View className="rounded-[24px] border border-white/10 bg-black/40 px-4 py-3">
                      <Text className="text-[24px] font-black text-white">
                        {selectedDreamIslandDetail.name}
                      </Text>
                      {selectedDreamIslandDetail.description ? (
                        <Text className="mt-1 text-[12px] leading-5 text-slate-200">
                          {selectedDreamIslandDetail.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="p-4">
                  <View className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/8 p-3 mb-3">
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
                        Materials
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        {selectedDreamIslandDetail.materials.length} total
                      </Text>
                    </View>

                    <View className="flex-row flex-wrap -mx-1">
                      {selectedDreamIslandDetail.materials.map((item) => (
                        <View key={`detail-material-${item.slug}`} className="w-1/3 px-1 mb-2">
                          <View className="min-h-[108px] items-center rounded-[20px] border border-white/10 bg-white/5 px-2 py-3">
                            <View className="mb-2 h-11 w-11 items-center justify-center rounded-2xl bg-black/20">
                              <ExpoImage
                                source={{ uri: item.imageUrl }}
                                style={{ width: 30, height: 30 }}
                                contentFit="contain"
                                transition={120}
                              />
                            </View>
                            <Text className="text-center text-[11px] font-semibold leading-4 text-slate-100">
                              {item.name}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View className="rounded-[24px] border border-amber-400/15 bg-amber-400/8 p-3">
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
                        Dolls
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        {selectedDreamIslandDetail.dolls.length} total
                      </Text>
                    </View>

                    <View className="flex-row flex-wrap -mx-1">
                      {selectedDreamIslandDetail.dolls.map((item) => (
                        <View key={`detail-doll-${item.slug}`} className="w-1/3 px-1 mb-2">
                          <View className="min-h-[126px] items-center rounded-[20px] border border-white/10 bg-white/5 px-2 py-3">
                            <View className="mb-2 h-11 w-11 items-center justify-center rounded-2xl bg-black/20">
                              <ExpoImage
                                source={{ uri: item.imageUrl }}
                                style={{ width: 30, height: 30 }}
                                contentFit="contain"
                                transition={120}
                              />
                            </View>
                            <Text className="text-center text-[11px] font-semibold leading-4 text-slate-100">
                              {item.name}
                            </Text>
                            {item.badge ? (
                              <View className="mt-2 rounded-full bg-amber-400/15 px-2.5 py-1 border border-amber-300/15">
                                <Text className="text-[9px] font-semibold text-amber-100" numberOfLines={1}>
                                  {item.badge}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ) : null
          ) : sheetContentType === "cloud" ? (
            displayCloudIsland ? (
              <View className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0f172a]">
                <View style={{ aspectRatio: 16 / 10 }} className="relative bg-slate-900">
                  {displayCloudIsland.imageUrl ? (
                    <ExpoImage
                      source={{ uri: displayCloudIsland.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-slate-800">
                      <Text className="text-5xl text-slate-500">☁️</Text>
                    </View>
                  )}

                  <View className="absolute inset-0 bg-black/20" />

                  <View className="absolute left-4 right-4 top-4 flex-row items-start justify-between gap-2">
                    <View className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5">
                      <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                        Cloud Island
                      </Text>
                    </View>

                    {displayCloudIsland.likes ? (
                      <View className="rounded-full border border-sky-300/20 bg-sky-400/15 px-3 py-1.5">
                        <Text className="text-[11px] font-semibold text-sky-100">
                          ♡ {displayCloudIsland.likes}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10">
                    <View className="rounded-[24px] border border-white/10 bg-black/40 px-4 py-3">
                      <Text className="text-[24px] font-black text-white">
                        {displayCloudIsland.name}
                      </Text>
                      {displayCloudIsland.code ? (
                        <Text className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                          {displayCloudIsland.code}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="p-4">
                  <View className="rounded-[24px] border border-sky-400/15 bg-sky-400/8 p-3">
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200">
                        Tags
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        {displayCloudIsland.tags?.length ?? 0} total
                      </Text>
                    </View>

                    {displayCloudIsland.tags?.length ? (
                      <View className="flex-row flex-wrap">
                        {displayCloudIsland.tags.map((tag) => (
                          <View
                            key={`detail-cloud-${displayCloudIsland.slug}-${tag}`}
                            className="mr-2 mb-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"
                          >
                            <Text className="text-[11px] font-semibold text-slate-100">
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-[12px] leading-5 text-slate-400">
                        No tags available for this island.
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <PokopiaEmptyState
                title="Cloud island unavailable"
                message="That cloud island could not be found right now."
              />
            )
          ) : sheetContentType === "event" ? (
            selectedEventLoading ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-slate-300">Loading event…</Text>
              </View>
            ) : selectedEventError ? (
              <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
                <Text className="text-sm font-semibold text-rose-200">Event unavailable</Text>
                <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">
                  {selectedEventError}
                </Text>
              </View>
            ) : selectedEventDetail ? (
              <View className="overflow-hidden rounded-[30px] border border-white/10 bg-[#140f1e]">
                <View style={{ aspectRatio: 16 / 10 }} className="relative bg-slate-900">
                  {selectedEventDetail.heroImageUrl ? (
                    <ExpoImage
                      source={{ uri: selectedEventDetail.heroImageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : displayEvent?.imageUrl ? (
                    <ExpoImage
                      source={{ uri: displayEvent.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center bg-slate-800">
                      <Text className="text-5xl text-slate-500">★</Text>
                    </View>
                  )}

                  <View className="absolute inset-0 bg-black/30" />

                  <View className="absolute left-4 right-4 top-4 flex-row items-start justify-between gap-2">
                    <View className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5">
                      <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                        Event
                      </Text>
                    </View>

                    {selectedEventDetail.dateLabel ? (
                      <View className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/15 px-3 py-1.5">
                        <Text className="text-[10px] font-semibold text-fuchsia-100">
                          {selectedEventDetail.dateLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10">
                    <View className="rounded-[24px] border border-white/10 bg-black/40 px-4 py-3">
                      <Text className="text-[24px] font-black text-white">
                        {selectedEventDetail.title}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="p-4">
                  {selectedEventDetail.blocks.map((block, index) =>
                    block.type === "image" ? (
                      <View
                        key={`event-image-${index}`}
                        className="w-full overflow-hidden rounded-[24px] border border-white/10 bg-slate-900 mb-3"
                        style={{ aspectRatio: 16 / 9 }}
                      >
                        <ExpoImage
                          source={{ uri: block.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={120}
                        />
                      </View>
                    ) : block.type === "heading" ? (
                      <View
                        key={`event-block-${index}`}
                        className="mb-3 rounded-[22px] border border-fuchsia-400/15 bg-fuchsia-400/8 px-4 py-3"
                      >
                        <Text className="text-[18px] font-black text-fuchsia-100">
                          {block.text}
                        </Text>
                      </View>
                    ) : block.type === "subheading" ? (
                      <Text
                        key={`event-block-${index}`}
                        className="text-[14px] font-bold uppercase tracking-[0.14em] text-fuchsia-200 mt-1 mb-2"
                      >
                        {block.text}
                      </Text>
                    ) : block.type === "list-item" ? (
                      <View
                        key={`event-block-${index}`}
                        className="mb-2 rounded-[18px] border border-white/8 bg-white/5 px-3 py-3"
                      >
                        <Text className="text-[13px] leading-6 text-slate-200">
                          • {block.text}
                        </Text>
                      </View>
                    ) : (
                      <View
                        key={`event-block-${index}`}
                        className="mb-3 rounded-[20px] border border-white/8 bg-white/5 px-4 py-3"
                      >
                        <Text className="text-[13px] leading-6 text-slate-200">
                          {block.text}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            ) : null
          ) : sheetContentType === "guide" ? (
            selectedGuideLoading ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-slate-300">Loading guide…</Text>
              </View>
            ) : selectedGuideError ? (
              <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4 mb-4">
                <Text className="text-sm font-semibold text-rose-200">Guide unavailable</Text>
                <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">
                  {selectedGuideError}
                </Text>
              </View>
            ) : selectedGuideDetail ? (
              <View className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0d1720]">
                <View className="relative min-h-[180px] overflow-hidden bg-[#10202b] px-4 pt-4 pb-5">
                  <View className="absolute inset-0 bg-[#10202b]" />
                  <View className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-cyan-400/18" />
                  <View className="absolute top-12 -left-8 h-24 w-24 rounded-full bg-sky-400/14" />
                  <View className="absolute bottom-4 right-10 h-20 w-20 rounded-full bg-teal-300/10" />
                  <View className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-300/10 to-transparent" />
                  <View className="absolute inset-x-0 bottom-0 h-24 bg-black/20" />

                  <View className="relative flex-row items-start justify-between gap-2">
                    <View className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5">
                      <Text className="text-[10px] font-black uppercase tracking-[0.22em] text-white">
                        Guide
                      </Text>
                    </View>

                    {selectedGuideDetail.dateLabel ? (
                      <View className="rounded-full border border-cyan-300/20 bg-cyan-400/15 px-3 py-1.5">
                        <Text className="text-[10px] font-semibold text-cyan-100">
                          {selectedGuideDetail.dateLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="relative mt-10 rounded-[24px] border border-white/10 bg-black/28 px-4 py-4">
                    <Text className="text-[20px] font-extrabold text-slate-100">
                      {selectedGuideDetail.title}
                    </Text>
                  </View>
                </View>

                <View className="p-4">
                  {selectedGuideDetail.blocks.map((block, index) =>
                    block.type === "image" ? (
                      <View
                        key={`guide-image-${index}`}
                        className="w-full overflow-hidden rounded-[24px] border border-white/10 bg-slate-900 mb-3"
                        style={{ aspectRatio: 16 / 9 }}
                      >
                        <ExpoImage
                          source={{ uri: block.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={120}
                        />
                      </View>
                    ) : block.type === "heading" ? (
                      <View
                        key={`guide-block-${index}`}
                        className="mb-3 rounded-[22px] border border-cyan-400/15 bg-cyan-400/8 px-4 py-3"
                      >
                        <Text className="text-[18px] font-black text-cyan-100">
                          {block.text}
                        </Text>
                      </View>
                    ) : block.type === "subheading" ? (
                      <Text
                        key={`guide-block-${index}`}
                        className="text-[14px] font-bold uppercase tracking-[0.14em] text-cyan-200 mt-1 mb-2"
                      >
                        {block.text}
                      </Text>
                    ) : block.type === "list-item" ? (
                      <View
                        key={`guide-block-${index}`}
                        className="mb-2 rounded-[18px] border border-white/8 bg-white/5 px-3 py-3"
                      >
                        <Text className="text-[13px] leading-6 text-slate-200">
                          • {block.text}
                        </Text>
                      </View>
                    ) : (
                      <View
                        key={`guide-block-${index}`}
                        className="mb-3 rounded-[20px] border border-white/8 bg-white/5 px-4 py-3"
                      >
                        <Text className="text-[13px] leading-6 text-slate-200">
                          {block.text}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            ) : null
          ) : null}
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}