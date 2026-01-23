// app/fossil-group/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

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
  return (
    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-3xl bg-slate-900/80 border border-slate-700 p-4">{children}</View>;
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

  const room =
    group?.room != null && Number.isFinite(Number(group.room)) ? String(group.room) : null;

  const desc = asNonEmptyString(group?.description);

  const fossils = Array.isArray((group as any)?.fossils) ? (group as any).fossils : [];

  const goPiece = useCallback(
    (name: string) => {
      router.push({
        pathname: "/fossil/[id]",
        params: { id: encodeURIComponent(name) },
      } as any);
    },
    [router]
  );

  return (
    <PageWrapper scroll={false} title={displayName} subtitle="Fossil Group" headerLayout="inline">
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
          {/* OVERVIEW */}
          <View className="mt-4 px-1">
            <SectionTitle>Overview</SectionTitle>
            <View className="mt-2">
              <Card>
                <StatRow label="Room" value={room} />
              </Card>
            </View>
          </View>

          {/* BLATHERS */}
          <View className="mt-3 px-1">
            <SectionTitle>Blathers</SectionTitle>
            <View className="mt-2">
              <Card>
                {desc ? (
                  <Text className="text-[12px] text-slate-200 leading-5">{desc}</Text>
                ) : (
                  <Text className="text-[11px] text-slate-600">No description found.</Text>
                )}
              </Card>
            </View>
          </View>

          {/* SET PIECES */}
          <View className="mt-3 px-1">
            <SectionTitle>Set Pieces</SectionTitle>
            <View className="mt-2">
              <Card>
                {fossils.length === 0 ? (
                  <Text className="text-[11px] text-slate-600">No fossils found for this group.</Text>
                ) : (
                  <View className="flex-row flex-wrap">
                    {fossils.map((p: any, idx: number) => {
                      const n = String(p?.name ?? "").trim();
                      if (!n) return null;

                      const img = asNonEmptyString(p?.image_url);

                      return (
                        <View key={`${n}::piece::${idx}`} className="w-1/3 p-1">
                          <Pressable
                            onPress={() => goPiece(n)}
                            className="rounded-3xl p-3 border items-center border-slate-700 bg-slate-900/70"
                          >
                            <View
                              style={{
                                width: 68,
                                height: 68,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 18,
                                backgroundColor: "rgba(2,6,23,0.35)",
                                borderWidth: 1,
                                borderColor: "rgba(51,65,85,0.7)",
                              }}
                            >
                              {img ? (
                                <Image source={{ uri: img }} style={{ width: 64, height: 64 }} resizeMode="contain" />
                              ) : (
                                <Feather name="image" size={18} color="#64748b" />
                              )}
                            </View>

                            <Text
                              className="text-[11px] font-semibold text-slate-100 text-center mt-2"
                              numberOfLines={2}
                            >
                              {n}
                            </Text>

                            <Text className="text-[10px] text-slate-500 mt-1" numberOfLines={1}>
                              {displayName}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            </View>
          </View>
        </ScrollView>
      )}
    </PageWrapper>
  );
}
