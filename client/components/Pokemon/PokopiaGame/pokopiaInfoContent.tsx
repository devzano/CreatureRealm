import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

import type { PokopiaCloudIslandsPage } from "@/lib/pokemon/pokopia/cloudIslands";
import type { PokopiaDreamIslandDetail } from "@/lib/pokemon/pokopia/dreamIslandDetail";
import type { PokopiaDreamIslandsPage } from "@/lib/pokemon/pokopia/dreamIslands";
import type { PokopiaEventDetail } from "@/lib/pokemon/pokopia/eventDetail";
import type { PokopiaEventsPage } from "@/lib/pokemon/pokopia/events";
import type { PokopiaGuideDetail } from "@/lib/pokemon/pokopia/guideDetail";
import type { PokopiaGuidesPage } from "@/lib/pokemon/pokopia/guides";

import { POKOPIA_INFO_CARDS, type PokopiaInfoSection } from "./config";

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

function SectionError({ title, message }: { title: string; message: string }) {
  return (
    <View className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
      <Text className="text-sm font-semibold text-rose-200">{title}</Text>
      <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{message}</Text>
    </View>
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
  selectedInfoSection,
  onSelectInfoSection,
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
  const renderIslandsSection = () => (
    <>
      {selectedDreamIslandSlug ? (
        <View className="mb-4">
          <Pressable
            onPress={onClearDreamIsland}
            className="self-start mb-3 px-3 py-2 rounded-2xl border border-slate-700 bg-slate-900/80"
          >
            <Text className="text-[12px] font-semibold text-slate-100">Back to Islands</Text>
          </Pressable>

          {selectedDreamIslandLoading ? (
            <View className="items-center justify-center mt-6">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading dream island detail…</Text>
            </View>
          ) : selectedDreamIslandError ? (
            <SectionError title="Dream island unavailable" message={selectedDreamIslandError} />
          ) : selectedDreamIslandDetail ? (
            <View className="rounded-3xl bg-slate-950 p-4 border border-slate-800">
              <View className="w-full rounded-2xl overflow-hidden bg-[#3b2a1d] border border-[#6f4a24] mb-4" style={{ aspectRatio: 16 / 9 }}>
                {selectedDreamIslandDetail.imageUrl ? (
                  <ExpoImage source={{ uri: selectedDreamIslandDetail.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-5xl text-[#d9b8a2]">?</Text>
                  </View>
                )}
              </View>

              <Text className="text-[24px] font-semibold text-slate-50">{selectedDreamIslandDetail.name}</Text>
              {selectedDreamIslandDetail.description ? (
                <Text className="text-[13px] leading-6 text-slate-300 mt-3 mb-5">{selectedDreamIslandDetail.description}</Text>
              ) : null}

              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d49361] mb-3">Primary Materials</Text>
              <View className="flex-row flex-wrap mb-5">
                {selectedDreamIslandDetail.materials.map((item) => (
                  <View key={`detail-material-${item.slug}`} className="w-1/3 pr-2 mb-2">
                    <View className="rounded-2xl bg-[#4d2d14] border border-[#8f5a2b] px-2 py-3 items-center min-h-[112px]">
                      <View className="w-12 h-12 mb-2">
                        <ExpoImage source={{ uri: item.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                      </View>
                      <Text className="text-[11px] text-[#f4e5d7] text-center font-medium">{item.name}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d49361] mb-3">Dolls</Text>
              <View className="flex-row flex-wrap">
                {selectedDreamIslandDetail.dolls.map((item) => (
                  <View key={`detail-doll-${item.slug}`} className="w-1/3 pr-2 mb-2">
                    <View className="rounded-2xl bg-[#4d2d14] border border-[#8f5a2b] px-2 py-3 items-center min-h-[128px]">
                      <View className="w-12 h-12 mb-2">
                        <ExpoImage source={{ uri: item.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                      </View>
                      <Text className="text-[11px] text-[#f4e5d7] text-center font-medium">{item.name}</Text>
                      {item.badge ? (
                        <View className="mt-2 rounded-full px-2 py-1" style={{ backgroundColor: item.badge === "Guaranteed" ? "#c8741f" : "#7b6c66" }}>
                          <Text className="text-[10px] font-semibold text-white">{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {!selectedDreamIslandSlug ? (
        <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Islands</Text>
          <Text className="text-lg font-bold text-slate-50 mt-1">Dream & Cloud Islands</Text>
          <Text className="text-sm text-slate-300 mt-1">
            Explore both Dream Islands and Cloud Islands in the same in-app Pokopia flow.
          </Text>
          {[dreamIslandsPage?.countLabel, cloudIslandsPage?.countLabel].filter(Boolean).length ? (
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mt-3">
              {[dreamIslandsPage?.countLabel, cloudIslandsPage?.countLabel].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!selectedDreamIslandSlug && (dreamIslandsLoading || cloudIslandsLoading) ? (
        <View className="items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading islands…</Text>
        </View>
      ) : !selectedDreamIslandSlug && (dreamIslandsError || cloudIslandsError) ? (
        <SectionError title="Islands unavailable" message={dreamIslandsError || cloudIslandsError || "Failed to load islands."} />
      ) : !selectedDreamIslandSlug ? (
        <>
          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-1">
            Dream Islands
          </Text>
          {dreamIslandsPage?.islands.map((island) => (
            <Pressable key={island.slug} onPress={() => onSelectDreamIsland(island.slug)} className="rounded-3xl bg-slate-950 p-4 border mb-4 border-slate-800">
            <View className="w-full rounded-2xl overflow-hidden bg-[#3b2a1d] border border-[#6f4a24] mb-4" style={{ aspectRatio: 16 / 9 }}>
              {island.imageUrl ? (
                <ExpoImage source={{ uri: island.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-5xl text-[#d9b8a2]">?</Text>
                </View>
              )}
            </View>

            <Text className="text-[22px] font-semibold text-slate-50 mb-4">{island.name}</Text>

            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d49361] mb-3">Primary Materials</Text>
            <View className="flex-row flex-wrap mb-5">
              {island.materials.map((item) => (
                <View key={`${island.slug}-material-${item.slug}`} className="w-1/3 pr-2 mb-2">
                  <View className="rounded-2xl bg-[#4d2d14] border border-[#8f5a2b] px-2 py-3 items-center min-h-[112px]">
                    <View className="w-12 h-12 mb-2">
                      <ExpoImage source={{ uri: item.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                    </View>
                    <Text className="text-[11px] text-[#f4e5d7] text-center font-medium">{item.name}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d49361] mb-3">Dolls</Text>
            <View className="flex-row flex-wrap">
              {island.dolls.map((item) => (
                <View key={`${island.slug}-doll-${item.slug}`} className="w-1/3 pr-2 mb-2">
                  <View className="rounded-2xl bg-[#4d2d14] border border-[#8f5a2b] px-2 py-3 items-center min-h-[128px]">
                    <View className="w-12 h-12 mb-2">
                      <ExpoImage source={{ uri: item.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                    </View>
                    <Text className="text-[11px] text-[#f4e5d7] text-center font-medium">{item.name}</Text>
                    {item.badge ? (
                      <View className="mt-2 rounded-full px-2 py-1" style={{ backgroundColor: item.badge === "Guaranteed" ? "#c8741f" : "#7b6c66" }}>
                        <Text className="text-[10px] font-semibold text-white">{item.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                ))}
              </View>
            </Pressable>
          ))}

          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-1 mt-1">
            Cloud Islands
          </Text>
          {cloudIslandsPage?.islands.map((island) => (
            <View key={island.slug} className="rounded-3xl bg-slate-950 p-4 border mb-4 border-slate-800">
              <View className="w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 mb-4" style={{ aspectRatio: 16 / 9 }}>
                {island.imageUrl ? (
                  <ExpoImage source={{ uri: island.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
                ) : null}
              </View>

              <Text className="text-[22px] font-semibold text-slate-50">{island.name}</Text>
              {island.code ? (
                <Text className="text-[13px] font-semibold tracking-[0.18em] text-amber-300 mt-2">
                  {island.code}
                </Text>
              ) : null}

              {island.tags.length ? (
                <View className="flex-row flex-wrap mt-3">
                  {island.tags.map((tag) => (
                    <View
                      key={`${island.slug}-${tag}`}
                      className="px-2.5 py-1 rounded-full mr-2 mb-2 bg-slate-900 border border-slate-700"
                    >
                      <Text className="text-[11px] text-slate-200">{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {island.likes ? (
                <Text className="text-[11px] text-slate-400 mt-1">♡ {island.likes}</Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </>
  );

  const renderEventsSection = () => (
    <>
      {selectedEventSlug ? (
        <View className="mb-4">
          <Pressable
            onPress={onClearEvent}
            className="self-start mb-3 px-3 py-2 rounded-2xl border border-slate-700 bg-slate-900/80"
          >
            <Text className="text-[12px] font-semibold text-slate-100">Back to Events</Text>
          </Pressable>

          {selectedEventLoading ? (
            <View className="items-center justify-center mt-6">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading event detail…</Text>
            </View>
          ) : selectedEventError ? (
            <SectionError title="Event unavailable" message={selectedEventError} />
          ) : selectedEventDetail ? (
            <View className="rounded-3xl bg-slate-950 p-4 border border-slate-800">
              <Text className="text-[24px] font-semibold text-slate-50">{selectedEventDetail.title}</Text>
              {selectedEventDetail.dateLabel ? (
                <Text className="text-[12px] text-slate-400 mt-2">{selectedEventDetail.dateLabel}</Text>
              ) : null}
              {selectedEventDetail.heroImageUrl ? (
                <View className="w-full rounded-2xl overflow-hidden bg-slate-900 mt-4" style={{ aspectRatio: 16 / 9 }}>
                  <ExpoImage source={{ uri: selectedEventDetail.heroImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
                </View>
              ) : null}
              <View className="mt-4">
                {selectedEventDetail.blocks.map((block, index) =>
                  block.type === "image" ? (
                    <View key={`event-image-${index}`} className="w-full rounded-2xl overflow-hidden bg-slate-900 mb-4" style={{ aspectRatio: 16 / 9 }}>
                      <ExpoImage source={{ uri: block.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
                    </View>
                  ) : (
                    <DetailBlockText key={`event-block-${index}`} type={block.type} text={block.text} />
                  )
                )}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {!selectedEventSlug ? (
        <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Events</Text>
          <Text className="text-lg font-bold text-slate-50 mt-1">{eventsPage?.title || "Events"}</Text>
          <Text className="text-sm text-slate-300 mt-1">
            {eventsPage?.description || "Guides and database information for limited-time events in Pokemon Pokopia."}
          </Text>
        </View>
      ) : null}

      {!selectedEventSlug && eventsLoading ? (
        <View className="items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading events…</Text>
        </View>
      ) : !selectedEventSlug && eventsError ? (
        <SectionError title="Events unavailable" message={eventsError} />
      ) : !selectedEventSlug ? (
        eventsPage?.entries.map((entry) => (
          <Pressable key={entry.slug} onPress={() => onSelectEvent(entry.slug)} className="rounded-3xl bg-slate-950 p-0 border mb-4 border-slate-800 overflow-hidden">
            {entry.imageUrl ? (
              <View className="w-full bg-slate-900" style={{ aspectRatio: 16 / 9 }}>
                <ExpoImage source={{ uri: entry.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
              </View>
            ) : null}
            <View className="p-4">
              {entry.dateLabel ? (
                <Text className="text-[12px] text-slate-400 mb-2">{entry.dateLabel}</Text>
              ) : null}
              <Text className="text-[22px] font-semibold text-slate-50 leading-7">{entry.title}</Text>
              {entry.summary ? (
                <Text className="text-[13px] leading-6 text-slate-300 mt-3">{entry.summary}</Text>
              ) : null}
              <Text className="text-[12px] font-semibold text-sky-300 mt-4">View event →</Text>
            </View>
          </Pressable>
        ))
      ) : null}
    </>
  );

  const renderGuidesSection = () => (
    <>
      {selectedGuideSlug ? (
        <View className="mb-4">
          <Pressable
            onPress={onClearGuide}
            className="self-start mb-3 px-3 py-2 rounded-2xl border border-slate-700 bg-slate-900/80"
          >
            <Text className="text-[12px] font-semibold text-slate-100">Back to Guides</Text>
          </Pressable>

          {selectedGuideLoading ? (
            <View className="items-center justify-center mt-6">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-slate-300">Loading guide detail…</Text>
            </View>
          ) : selectedGuideError ? (
            <SectionError title="Guide unavailable" message={selectedGuideError} />
          ) : selectedGuideDetail ? (
            <View className="rounded-3xl bg-slate-950 p-4 border border-slate-800">
              <Text className="text-[24px] font-semibold text-slate-50">{selectedGuideDetail.title}</Text>
              {selectedGuideDetail.dateLabel ? (
                <Text className="text-[12px] text-slate-400 mt-2">{selectedGuideDetail.dateLabel}</Text>
              ) : null}
              <View className="mt-4">
                {selectedGuideDetail.blocks.map((block, index) =>
                  block.type === "image" ? (
                    <View key={`guide-image-${index}`} className="w-full rounded-2xl overflow-hidden bg-slate-900 mb-4" style={{ aspectRatio: 16 / 9 }}>
                      <ExpoImage source={{ uri: block.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} />
                    </View>
                  ) : (
                    <DetailBlockText key={`guide-block-${index}`} type={block.type} text={block.text} />
                  )
                )}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {!selectedGuideSlug ? (
        <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Guides</Text>
          <Text className="text-lg font-bold text-slate-50 mt-1">{guidesPage?.title || "Guides"}</Text>
          <Text className="text-sm text-slate-300 mt-1">
            {guidesPage?.description || "Tips, strategies, and walkthroughs for Pokemon Pokopia."}
          </Text>
        </View>
      ) : null}

      {!selectedGuideSlug && guidesLoading ? (
        <View className="items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading guides…</Text>
        </View>
      ) : !selectedGuideSlug && guidesError ? (
        <SectionError title="Guides unavailable" message={guidesError} />
      ) : !selectedGuideSlug ? (
        guidesPage?.entries.map((entry) => (
          <Pressable key={entry.slug} onPress={() => onSelectGuide(entry.slug)} className="rounded-3xl bg-slate-950 p-4 border mb-4 border-slate-800 min-h-[200px]">
            {entry.dateLabel ? (
              <Text className="text-[12px] text-slate-400 mb-3">{entry.dateLabel}</Text>
            ) : null}
            <Text className="text-[22px] font-semibold text-slate-50 leading-7">{entry.title}</Text>
            {entry.summary ? (
              <Text className="text-[13px] leading-6 text-slate-300 mt-3">{entry.summary}</Text>
            ) : null}
            <Text className="text-[12px] font-semibold text-sky-300 mt-auto pt-4">Read guide →</Text>
          </Pressable>
        ))
      ) : null}
    </>
  );

  return (
    <View className="flex-1 px-2 pt-4">
      {selectedInfoSection !== "overview" ? (
        <Pressable
          onPress={() => onSelectInfoSection("overview")}
          className="self-start mb-3 px-3 py-2 rounded-2xl border border-slate-700 bg-slate-900/80"
        >
          <Text className="text-[12px] font-semibold text-slate-100">Back to Info</Text>
        </Pressable>
      ) : null}

      {selectedInfoSection === "overview" ? (
        <>
          <View className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 mb-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pokopia Info</Text>
            <Text className="text-lg font-bold text-slate-50 mt-1">Explore Pokopia Info</Text>
            <Text className="text-sm text-slate-300 mt-1">
              Browse dream islands, cloud islands, limited-time events, and written guides in the same in-app Pokopia flow.
            </Text>
          </View>

          {POKOPIA_INFO_CARDS.map((card) => {
            const count =
              card.id === "islands"
                ? (dreamIslandsPage?.islands.length ?? 0) + (cloudIslandsPage?.islands.length ?? 0) || card.count
                : card.id === "events"
                  ? eventsPage?.entries.length ?? card.count
                  : guidesPage?.entries.length ?? card.count;

            return (
              <Pressable
                key={card.id}
                onPress={() => onSelectInfoSection(card.id)}
                className="rounded-3xl bg-slate-950 p-4 border mb-3 border-slate-800"
              >
                <Text className="text-[15px] font-semibold text-slate-50">{card.title}</Text>
                <Text className="text-[12px] leading-5 text-slate-300 mt-2">{card.subtitle}</Text>
                <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mt-3">
                  {count} entries
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : selectedInfoSection === "islands" ? (
        renderIslandsSection()
      ) : selectedInfoSection === "events" ? (
        renderEventsSection()
      ) : (
        renderGuidesSection()
      )}
    </View>
  );
}
