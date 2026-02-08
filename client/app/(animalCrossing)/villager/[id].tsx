// app/animalCrossing/villager/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import { fetchVillagerByName, type NookipediaVillager } from "@/lib/animalCrossing/nookipediaVillagers";
import { useAnimalCrossingCollectionStore } from "@/store/animalCrossingCollectionStore";

const THUMB_PRIMARY = 256;
const THUMB_FALLBACK = 128;

function asNonEmptyString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function uniqStrings(list: any[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function buildHeroCandidates(item?: NookipediaVillager | null): string[] {
  if (!item) return [];
  const nh = (item as any)?.nh_details ?? null;

  return uniqStrings([
    nh?.image_url,
    (item as any)?.image_url,
    nh?.photo_url,
    nh?.icon_url,
    nh?.house_exterior_url,
    nh?.house_interior_url,
  ]);
}

function Badge({ icon, text }: { icon?: React.ReactNode; text: string; }) {
  return (
    <View className="flex-row items-center mr-2 mb-2 px-3 py-2 rounded-full bg-emerald-900/20 border border-emerald-500/25">
      {icon ? <View className="mr-2">{icon}</View> : null}
      <Text className="text-[11px] font-semibold text-emerald-100">{text}</Text>
    </View>
  );
}

function LeafChip({ label, value }: { label: string; value?: any; }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-emerald-200">•</Text>
        </View>
        <Text className="text-[11px] text-emerald-100/90">{label}</Text>
      </View>
      <Text className="text-[11px] text-emerald-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode; }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-emerald-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-emerald-100/90">
        {children}
      </Text>
    </View>
  );
}

function PaperCard({ children }: { children: React.ReactNode; }) {
  return (
    <View className="rounded-[28px] bg-emerald-950/35 border border-emerald-500/20 p-4 overflow-hidden">
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-400/10" />
      <View className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full bg-lime-300/10" />
      {children}
    </View>
  );
}

function WoodTitle({ title, subtitle }: { title: string; subtitle?: string | null; }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-amber-900/35 border border-amber-200/20">
        <Text className="text-[16px] font-extrabold text-amber-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-emerald-100/80 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function SpeechBubble({ label, value }: { label: string; value?: string | null; }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-emerald-900/20 border border-emerald-500/20 px-4 py-3">
        <Text className="text-[10px] font-bold tracking-[0.14em] uppercase text-emerald-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-emerald-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-emerald-500/20" />
    </View>
  );
}

export default function VillagerDetailPage() {
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const villagerName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const { getEntry, toggleCollected } = useAnimalCrossingCollectionStore();
  const entry = getEntry("villager", villagerName);
  const isCollected = !!entry?.collected;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<NookipediaVillager | null>(null);
  const [thumbUsed, setThumbUsed] = useState<number>(THUMB_PRIMARY);

  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [heroLoading, setHeroLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setItem(null);
        setHeroCandidateIndex(0);

        try {
          const x = await fetchVillagerByName(villagerName, { thumbsize: THUMB_PRIMARY });
          if (cancelled) return;
          setItem(x);
          setThumbUsed(THUMB_PRIMARY);
        } catch {
          const x2 = await fetchVillagerByName(villagerName, { thumbsize: THUMB_FALLBACK });
          if (cancelled) return;
          setItem(x2);
          setThumbUsed(THUMB_FALLBACK);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load villager.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [villagerName]);

  const displayName = item?.name ? String(item.name) : villagerName;
  const nh = (item as any)?.nh_details ?? null;

  const heroCandidates = useMemo(() => buildHeroCandidates(item), [item]);
  const heroUri = heroCandidates[heroCandidateIndex] ?? null;

  useEffect(() => {
    setHeroCandidateIndex(0);
  }, [heroCandidates.length]);

  useEffect(() => {
    if (heroUri) ExpoImage.prefetch(heroUri).catch(() => { });
  }, [heroUri]);

  const onHeroError = useCallback(() => {
    setHeroLoading(false);
    if (heroCandidateIndex + 1 < heroCandidates.length) {
      setHeroCandidateIndex((i) => i + 1);
    }
  }, [heroCandidateIndex, heroCandidates.length]);

  const species = asNonEmptyString((item as any)?.species);
  const personality = asNonEmptyString((item as any)?.personality);
  const gender = asNonEmptyString((item as any)?.gender);

  const bMonth = asNonEmptyString((item as any)?.birthday_month);
  const bDay = asNonEmptyString((item as any)?.birthday_day);
  const birthday = bMonth && bDay ? `${bMonth} ${bDay}` : bMonth ?? bDay;

  const sign = asNonEmptyString((item as any)?.sign);

  const quote = asNonEmptyString(nh?.quote ?? (item as any)?.quote);
  const catchphrase = asNonEmptyString(nh?.catchphrase ?? (item as any)?.phrase);

  const hobby = asNonEmptyString(nh?.hobby);
  const favStyles = Array.isArray(nh?.fav_styles) ? nh.fav_styles.join(", ") : null;
  const favColors = Array.isArray(nh?.fav_colors) ? nh.fav_colors.join(", ") : null;

  const houseInterior = asNonEmptyString(nh?.house_interior_url);
  const houseExterior = asNonEmptyString(nh?.house_exterior_url);
  const wallpaper = asNonEmptyString(nh?.house_wallpaper);
  const flooring = asNonEmptyString(nh?.house_flooring);
  const music = asNonEmptyString(nh?.house_music);
  const umbrella = asNonEmptyString(nh?.umbrella);

  const appearances = Array.isArray((item as any)?.appearances) ? (item as any).appearances.join(", ") : null;

  useEffect(() => {
    const urls = uniqStrings([houseExterior, houseInterior].filter(Boolean));
    if (!urls.length) return;
    ExpoImage.prefetch(urls).catch(() => { });
  }, [houseExterior, houseInterior]);

  const subtitleLine = useMemo(() => {
    const parts: string[] = [];
    if (species) parts.push(species);
    if (personality) parts.push(personality);
    if (gender) parts.push(gender);
    return parts.join(" • ");
  }, [species, personality, gender]);

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Villager" headerLayout="inline">
      {loading ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-emerald-100/80">Loading…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          <View className="mt-4">
            <PaperCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 items-center justify-center">
                    <Feather name="feather" size={16} color="#a7f3d0" />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-emerald-100/75 uppercase">
                    Nook Passport
                  </Text>
                </View>

                <Pressable onPress={() => toggleCollected("villager", villagerName)}>
                  <View
                    className={`px-3 py-2 rounded-full border ${isCollected
                        ? "bg-emerald-500/15 border-emerald-500/35"
                        : "bg-amber-500/10 border-amber-300/25"
                      }`}
                  >
                    <Text className={`text-[12px] font-extrabold ${isCollected ? "text-emerald-100" : "text-amber-100"}`}>
                      {isCollected ? "Island Resident" : "Moved Out"}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View className="flex-row">
                <View className="w-[132px]">
                  <View className="rounded-[26px] bg-emerald-900/20 border border-emerald-500/20 p-3 items-center justify-center">
                    <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                      {heroUri ? (
                        <>
                          <ExpoImage
                            source={{ uri: heroUri }}
                            style={{ width: 96, height: 96 }}
                            contentFit="contain"
                            transition={120}
                            cachePolicy="disk"
                            onLoadStart={() => setHeroLoading(true)}
                            onLoad={() => setHeroLoading(false)}
                            onError={onHeroError}
                          />
                          {heroLoading ? (
                            <View
                              style={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                right: 0,
                                bottom: 0,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(6, 78, 59, 0.25)",
                                borderRadius: 18,
                              }}
                            >
                              <ActivityIndicator />
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <View className="w-[96px] h-[96px] rounded-[22px] bg-emerald-950/50 border border-emerald-500/20 items-center justify-center">
                          <Feather name="image" size={18} color="#a7f3d0" />
                          <Text className="text-emerald-100/60 text-[10px] mt-2">No image</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View className="flex-1 pl-3">
                  <WoodTitle title={displayName} subtitle={subtitleLine || null} />

                  <View className="mt-3 flex-row flex-wrap">
                    {birthday ? <Badge icon={<Feather name="calendar" size={14} color="#a7f3d0" />} text={birthday} /> : null}
                    {sign ? <Badge icon={<Feather name="star" size={14} color="#a7f3d0" />} text={sign} /> : null}
                    {hobby ? <Badge icon={<Feather name="heart" size={14} color="#a7f3d0" />} text={hobby} /> : null}
                  </View>
                </View>
              </View>

              {/* QUOTE + CATCHPHRASE SIDE-BY-SIDE UNDER TOP DATA */}
              {(quote || catchphrase) ? (
                <View className="mt-3 flex-row">
                  <View className="w-1/2 pr-1">
                    <SpeechBubble label="Quote" value={quote} />
                  </View>
                  <View className="w-1/2 pl-1">
                    <SpeechBubble label="Catchphrase" value={catchphrase} />
                  </View>
                </View>
              ) : null}
            </PaperCard>
          </View>

          <SectionLabel>Basics</SectionLabel>
          <PaperCard>
            <LeafChip label="Species" value={species} />
            <LeafChip label="Personality" value={personality} />
            <LeafChip label="Gender" value={gender} />
            <LeafChip label="Birthday" value={birthday} />
            <LeafChip label="Sign" value={sign} />
            <LeafChip label="Hobby" value={hobby} />
            <LeafChip label="Appearances" value={appearances} />
          </PaperCard>

          {favStyles || favColors ? (
            <>
              <SectionLabel>Favorites</SectionLabel>
              <PaperCard>
                <LeafChip label="Styles" value={favStyles} />
                <LeafChip label="Colors" value={favColors} />
              </PaperCard>
            </>
          ) : null}

          {houseInterior || houseExterior || wallpaper || flooring || music || umbrella ? (
            <>
              <SectionLabel>House</SectionLabel>
              <PaperCard>
                <LeafChip label="Wallpaper" value={wallpaper} />
                <LeafChip label="Flooring" value={flooring} />
                <LeafChip label="Music" value={music} />
                <LeafChip label="Umbrella" value={umbrella} />

                {houseExterior || houseInterior ? (
                  <View className="mt-4">
                    <View className="flex-row items-center mb-2">
                      <Feather name="home" size={14} color="#a7f3d0" />
                      <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] uppercase text-emerald-100/75">
                        House Images
                      </Text>
                    </View>

                    <View className="flex-row">
                      <View className="w-1/2 pr-1">
                        <View className="rounded-[26px] border border-emerald-500/20 bg-emerald-900/15 p-3 items-center">
                          <Text className="text-[11px] text-emerald-100/70 mb-2">Exterior</Text>
                          {houseExterior ? (
                            <ExpoImage
                              source={{ uri: houseExterior }}
                              style={{ width: 120, height: 120 }}
                              contentFit="contain"
                              transition={120}
                              cachePolicy="disk"
                            />
                          ) : (
                            <Feather name="image" size={18} color="#a7f3d0" />
                          )}
                        </View>
                      </View>

                      <View className="w-1/2 pl-1">
                        <View className="rounded-[26px] border border-emerald-500/20 bg-emerald-900/15 p-3 items-center">
                          <Text className="text-[11px] text-emerald-100/70 mb-2">Interior</Text>
                          {houseInterior ? (
                            <ExpoImage
                              source={{ uri: houseInterior }}
                              style={{ width: 120, height: 120 }}
                              contentFit="contain"
                              transition={120}
                              cachePolicy="disk"
                            />
                          ) : (
                            <Feather name="image" size={18} color="#a7f3d0" />
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}
              </PaperCard>
            </>
          ) : null}

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
