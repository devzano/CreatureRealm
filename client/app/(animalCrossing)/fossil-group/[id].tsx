//client/app/(animalCrossing)/fossil-group/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import PageWrapper from "@/components/PageWrapper";
import {
  fetchFossilGroupByName,
  warmFossilGroupsIndex,
  type NookipediaFossilGroupDetailItem,
} from "@/lib/animalCrossing/nookipediaFossils";

function asNonEmptyString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function MuseumSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center mt-4 mb-2 px-1">
      <View className="w-2 h-2 rounded-full bg-amber-300/80 mr-2" />
      <Text className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-slate-200/90">{children}</Text>
    </View>
  );
}

function MuseumCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] bg-slate-950/40 border border-slate-700/60 p-4 overflow-hidden">
      <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-slate-200/5" />
      <View className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-amber-200/5" />
      <View className="absolute top-10 left-8 w-3 h-3 rounded-full bg-slate-100/5" />
      <View className="absolute top-16 left-14 w-2 h-2 rounded-full bg-slate-100/5" />
      <View className="absolute bottom-14 right-12 w-3 h-3 rounded-full bg-slate-100/5" />
      {children}
    </View>
  );
}

function ExhibitTitle({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <View className="items-center">
      <View className="px-4 py-2 rounded-2xl bg-amber-900/25 border border-amber-200/20">
        <Text className="text-[16px] font-extrabold text-amber-50 text-center">{title}</Text>
      </View>
      {subtitle ? <Text className="mt-2 text-[11px] text-slate-200/80 text-center">{subtitle}</Text> : null}
    </View>
  );
}

function MuseumChip({ label, value }: { label: string; value?: any }) {
  const v = value == null ? "" : String(value).trim();
  if (!v) return null;

  return (
    <View className="flex-row items-start justify-between py-2">
      <View className="flex-row items-center">
        <View className="w-5 items-center">
          <Text className="text-[12px] text-amber-200">•</Text>
        </View>
        <Text className="text-[11px] text-slate-200/90">{label}</Text>
      </View>
      <Text className="text-[11px] text-slate-50 text-right ml-3 flex-1">{v}</Text>
    </View>
  );
}

function CuratorNote({ label, value }: { label: string; value?: string | null }) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  return (
    <View className="mt-3">
      <View className="rounded-[22px] bg-amber-900/18 border border-amber-200/18 px-4 py-3">
        <Text className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-100/70">{label}</Text>
        <Text className="mt-1 text-[12px] text-amber-50 leading-5">{v}</Text>
      </View>
      <View className="ml-6 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-amber-200/18" />
    </View>
  );
}

export default function FossilGroupPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = String(params.id ?? "");
  const groupName = useMemo(() => decodeURIComponent(rawId), [rawId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<NookipediaFossilGroupDetailItem | null>(null);

  useEffect(() => {
    void warmFossilGroupsIndex();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);
        setGroup(null);

        const gd = await fetchFossilGroupByName(groupName);
        if (cancelled) return;

        setGroup(gd);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load fossil group.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupName]);

  const displayName = group?.name ? String(group.name) : groupName;

  const room = group?.room != null && Number.isFinite(Number(group.room)) ? String(group.room) : null;
  const desc = asNonEmptyString(group?.description);
  const fossils = Array.isArray((group as any)?.fossils) ? (group as any).fossils : [];

  const goPiece = useCallback(
    (name: string) => {
      router.push({ pathname: "/fossil/[id]", params: { id: encodeURIComponent(name) } } as any);
    },
    [router]
  );

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Fossil Group" headerLayout="inline">
      {loading ? (
        <View className="flex-1 items-center justify-center mt-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-200/80">Loading…</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center mt-6 px-5">
          <View className="rounded-[26px] bg-rose-950/30 border border-rose-500/25 px-4 py-3">
            <Text className="text-sm text-rose-200 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} className="px-3">
          {/* HERO */}
          <View className="mt-4">
            <MuseumCard>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-2xl bg-amber-500/10 border border-amber-200/20 items-center justify-center">
                    <Feather name="layers" size={16} color="#fde68a" />
                  </View>
                  <Text className="ml-2 text-[11px] font-bold tracking-[0.14em] text-slate-200/75 uppercase">
                    Exhibit Set
                  </Text>
                </View>

                {room ? (
                  <View className="px-3 py-2 rounded-full bg-slate-900/40 border border-slate-700">
                    <Text className="text-[11px] font-extrabold text-slate-50">Room {room}</Text>
                  </View>
                ) : null}
              </View>

              <ExhibitTitle title={displayName} subtitle={room ? `Museum Room ${room}` : null} />
              <CuratorNote label="Blathers" value={desc || "No description found."} />
            </MuseumCard>
          </View>

          <MuseumSectionLabel>Overview</MuseumSectionLabel>
          <MuseumCard>
            <MuseumChip label="Room" value={room} />
            <MuseumChip label="Pieces" value={fossils.length ? String(fossils.length) : null} />
          </MuseumCard>

          <MuseumSectionLabel>Set Pieces</MuseumSectionLabel>
          <MuseumCard>
            {fossils.length === 0 ? (
              <Text className="text-[11px] text-slate-300/40">No fossils found for this group.</Text>
            ) : (
              <View className="flex-row flex-wrap">
                {fossils.map((p: any, idx: number) => {
                  const n = String(p?.name ?? "").trim();
                  if (!n) return null;

                  const img = asNonEmptyString(p?.image_url);
                  if (img) ExpoImage.prefetch(img).catch(() => {});

                  return (
                    <View key={`${n}::piece::${idx}`} className="w-1/3 p-1">
                      <Pressable
                        onPress={() => goPiece(n)}
                        className="rounded-[26px] p-3 border items-center border-slate-700 bg-slate-900/35"
                      >
                        <View
                          style={{
                            width: 68,
                            height: 68,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 18,
                            backgroundColor: "rgba(15, 23, 42, 0.35)",
                            borderWidth: 1,
                            borderColor: "rgba(51, 65, 85, 0.7)",
                          }}
                        >
                          {img ? (
                            <ExpoImage
                              source={{ uri: img }}
                              style={{ width: 64, height: 64 }}
                              contentFit="contain"
                              transition={120}
                              cachePolicy="disk"
                            />
                          ) : (
                            <Feather name="image" size={18} color="#94a3b8" />
                          )}
                        </View>

                        <Text className="text-[11px] font-semibold text-slate-50 text-center mt-2" numberOfLines={2}>
                          {n}
                        </Text>

                        <Text className="text-[10px] text-slate-300/50 mt-1" numberOfLines={1}>
                          {displayName}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </MuseumCard>

          <View className="h-6" />
        </ScrollView>
      )}
    </PageWrapper>
  );
}
