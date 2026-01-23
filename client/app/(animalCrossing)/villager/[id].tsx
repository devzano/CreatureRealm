// app/animalCrossing/villager/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

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

function StatRow({ label, value }: { label: string; value?: any }) {
  const v = value == null ? null : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-1">
      <Text className="text-[11px] text-slate-400">{label}</Text>
      <Text className="text-[11px] text-slate-200 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{children}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-3xl bg-slate-900/80 border border-slate-700 p-4">{children}</View>;
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

  const [heroFailedOnce, setHeroFailedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        setItem(null);
        setHeroFailedOnce(false);

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
  const heroUri = !heroFailedOnce ? (heroCandidates[0] ?? null) : (heroCandidates[1] ?? heroCandidates[0] ?? null);

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

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Villager" headerLayout="inline">
      {loading ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <Text className="text-sm text-rose-300 text-center">{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
          {/* HERO */}
          <View className="mt-4">
            <Card>
              <View className="items-center">
                <View style={{ width: 180, height: 180, alignItems: "center", justifyContent: "center" }}>
                  {heroUri ? (
                    <Image
                      source={{ uri: heroUri }}
                      style={{ width: 180, height: 180 }}
                      resizeMode="contain"
                      onError={() => {
                        if (!heroFailedOnce) setHeroFailedOnce(true);
                      }}
                    />
                  ) : (
                    <View className="w-[180px] h-[180px] rounded-3xl bg-slate-950/60 border border-slate-700 items-center justify-center">
                      <Feather name="image" size={20} color="#64748b" />
                      <Text className="text-slate-500 text-[11px] mt-2">No image</Text>
                    </View>
                  )}
                </View>

                {/* Collected toggle only */}
                <View className="flex-row items-center mt-3">
                  <Pressable onPress={() => toggleCollected("villager", villagerName)}>
                    <Text
                      className={`px-3 py-2 rounded-2xl border text-[12px] font-semibold ${
                        isCollected
                          ? "text-emerald-200 bg-emerald-500/15 border-emerald-500/40"
                          : "text-slate-200 bg-slate-950/40 border-slate-700"
                      }`}
                    >
                      {isCollected ? "Collected" : "Collect"}
                    </Text>
                  </Pressable>
                </View>

                <Text className="mt-3 text-base font-semibold text-slate-50 text-center">{displayName}</Text>

                <Text className="mt-1 text-[11px] text-slate-500 text-center">
                  {species ?? "Villager"}
                  {personality ? ` • ${personality}` : ""}
                  {gender ? ` • ${gender}` : ""}
                </Text>
              </View>
            </Card>
          </View>

          {/* BASICS */}
          <View className="mt-3 px-1">
            <SectionTitle>Basics</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Species" value={species} />
                <StatRow label="Personality" value={personality} />
                <StatRow label="Gender" value={gender} />
                <StatRow label="Birthday" value={birthday} />
                <StatRow label="Sign" value={sign} />
                <StatRow label="Hobby" value={hobby} />
                <StatRow label="Appearances" value={appearances} />
              </Card>
            </View>
          </View>

          {/* QUOTE */}
          {quote || catchphrase ? (
            <View className="mt-3 px-1">
              <SectionTitle>Quote</SectionTitle>
              <View className="mt-2">
                <Card>
                  <StatRow label="Quote" value={quote} />
                  <StatRow label="Catchphrase" value={catchphrase} />
                </Card>
              </View>
            </View>
          ) : null}

          {/* FAVORITES */}
          {favStyles || favColors ? (
            <View className="mt-3 px-1">
              <SectionTitle>Favorites</SectionTitle>
              <View className="mt-2">
                <Card>
                  <StatRow label="Styles" value={favStyles} />
                  <StatRow label="Colors" value={favColors} />
                </Card>
              </View>
            </View>
          ) : null}

          {/* HOUSE */}
          {houseInterior || houseExterior || wallpaper || flooring || music || umbrella ? (
            <View className="mt-3 px-1">
              <SectionTitle>House</SectionTitle>
              <View className="mt-2">
                <Card>
                  <StatRow label="Wallpaper" value={wallpaper} />
                  <StatRow label="Flooring" value={flooring} />
                  <StatRow label="Music" value={music} />
                  <StatRow label="Umbrella" value={umbrella} />

                  {houseExterior || houseInterior ? (
                    <View className="mt-3">
                      <Text className="text-[11px] text-slate-400 mb-2">Images</Text>

                      <View className="flex-row">
                        <View className="w-1/2 pr-1">
                          <View className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 items-center">
                            <Text className="text-[11px] text-slate-400 mb-2">Exterior</Text>
                            {houseExterior ? (
                              <Image source={{ uri: houseExterior }} style={{ width: 120, height: 120 }} resizeMode="contain" />
                            ) : (
                              <Feather name="image" size={18} color="#64748b" />
                            )}
                          </View>
                        </View>

                        <View className="w-1/2 pl-1">
                          <View className="rounded-3xl border border-slate-700 bg-slate-900/70 p-3 items-center">
                            <Text className="text-[11px] text-slate-400 mb-2">Interior</Text>
                            {houseInterior ? (
                              <Image source={{ uri: houseInterior }} style={{ width: 120, height: 120 }} resizeMode="contain" />
                            ) : (
                              <Feather name="image" size={18} color="#64748b" />
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </Card>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </PageWrapper>
  );
}
