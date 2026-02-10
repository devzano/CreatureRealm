// client/app/(tabs)/index.tsx
import React, { useState } from "react";
import { View, Text, Pressable, TouchableOpacity, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PageWrapper from "@/components/PageWrapper";
import PokemonHomeContent from "@/components/Pokemon/PokemonHomeContent";
import PalworldHomeContent from "@/components/Palworld/PalworldHomeContent";
import AnimalCrossingHomeContent from "@/components/AnimalCrossing/AnimalCrossingHomeContent";
import LiquidGlass from "@/components/ui/LiquidGlass";
import RequestUniverseModal, { type UniverseRequestPayload } from "@/components/RequestUniverseModal";
import GlassBadge from "@/components/ui/helpers/GlassBadge";

type SeriesId = "pokemon" | "palworld" | "animal_crossing";
type RequestStatus = "idle" | "success" | "error";

const API_BASE = (process.env.EXPO_PUBLIC_RENDER_BASE_URL ?? "").replace(/\/+$/, "");

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function GlassIconTile({
  icon,
  iconColor,
  tintColor,
}: {
  icon: any;
  iconColor: string;
  tintColor: string;
}) {
  return (
    <LiquidGlass
      glassEffectStyle="clear"
      interactive={false}
      tinted
      tintColor={tintColor}
      showFallbackBackground
      style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.16)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
    </LiquidGlass>
  );
}

function GlassCardShell({ children, tintColor }: { children: React.ReactNode; tintColor: string }) {
  return (
    <LiquidGlass
      glassEffectStyle="clear"
      interactive={false}
      tinted
      tintColor={tintColor}
      showFallbackBackground
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.16)",
        overflow: "hidden",
      }}
    >
      {children}
    </LiquidGlass>
  );
}

export default function GamesScreen() {
  const [activeSeries, setActiveSeries] = useState<SeriesId | null>(null);

  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);

  const handleOpenRequest = () => {
    setRequestStatus("idle");
    setIsRequestOpen(true);
  };

  const handleCloseRequest = () => {
    if (isRequestSubmitting) return;
    setIsRequestOpen(false);
    setRequestStatus("idle");
  };

  const handleSubmitRequest = async (data: UniverseRequestPayload) => {
    if (isRequestSubmitting) return;

    try {
      setIsRequestSubmitting(true);
      setRequestStatus("idle");

      if (!API_BASE) {
        setRequestStatus("error");
        return;
      }

      const url = `${API_BASE}/feedback/universe-request`;

      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        12000
      );

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error("[UniverseRequest] Server error:", res.status, json ?? "(no json)");
        setRequestStatus("error");
        return;
      }

      console.log("[UniverseRequest] Sent ✅", json);

      setRequestStatus("success");
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[UniverseRequest] Failed ❌", e?.message || e);
      setRequestStatus("error");
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  if (!activeSeries) {
    return (
      <PageWrapper
        hideBackButton
        title="Your Universes"
        subtitle="Select a collection to manage your progress, squads & discoveries."
        leftActions={
          <LiquidGlass
            glassEffectStyle="clear"
            interactive={false}
            tinted
            tintColor="rgba(148,163,184,0.08)"
            showFallbackBackground
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.14)",
            }}
          >
            <View style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">CreatureRealm</Text>
            </View>
          </LiquidGlass>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}>
          {/* Pokémon Card */}
          <Pressable onPress={() => setActiveSeries("pokemon")} className="mb-3">
            <GlassCardShell tintColor="rgba(239,68,68,0.07)">
              <View className="px-4 py-4">
                <View className="flex-row items-center mb-3">
                  <GlassIconTile icon="pokeball" iconColor="#ef4444" tintColor="rgba(239,68,68,0.12)" />

                  <View className="flex-1 ml-3">
                    <Text className="text-[15px] font-semibold text-slate-50">Pokémon</Text>
                    <Text className="text-[12px] text-slate-400 mt-0.5">
                      Track your progress across every mainline generation.
                    </Text>
                  </View>

                  <View className="items-end">
                    <GlassBadge label="COLLECTION" tintColor="rgba(239,68,68,0.10)" />
                    <View className="mt-1">
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
                    </View>
                  </View>
                </View>

                <LiquidGlass
                  glassEffectStyle="clear"
                  interactive={false}
                  tinted
                  tintColor="rgba(239,68,68,0.10)"
                  showFallbackBackground
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.14)",
                  }}
                >
                  <View className="px-3 py-3">
                    <View className="flex-row justify-between mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="text-[11px] text-slate-400">Games & Regions</Text>
                        <Text className="text-[11px] font-semibold text-slate-100 mt-0.5">
                          Generations 1–9 • Kanto → Paldea
                        </Text>
                      </View>
                      <View className="flex-1 ml-2">
                        <Text className="text-[11px] text-slate-400">What You Can Track</Text>
                        <Text className="text-[11px] font-semibold text-slate-100 mt-0.5">
                         Games • Caught • Shiny • Alpha
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-1">
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons name="map" size={14} color="#e5e7eb" />
                        <Text className="ml-1.5 text-[11px] text-slate-300">Interactive Map</Text>
                      </View>
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons name="sword-cross" size={14} color="#e5e7eb" />
                        <Text className="ml-1.5 text-[11px] text-slate-300">Full Move & Ability</Text>
                      </View>
                    </View>
                  </View>
                </LiquidGlass>
              </View>
            </GlassCardShell>
          </Pressable>

          {/* Palworld Card */}
          <Pressable onPress={() => setActiveSeries("palworld")} className="mb-3">
            <GlassCardShell tintColor="rgba(56,189,248,0.07)">
              <View className="px-4 py-4">
                <View className="flex-row items-center mb-3">
                  <GlassIconTile icon="sword-cross" iconColor="#38bdf8" tintColor="rgba(56,189,248,0.12)" />

                  <View className="flex-1 ml-3">
                    <Text className="text-[15px] font-semibold text-slate-50">Palworld</Text>
                    <Text className="text-[12px] text-slate-400 mt-0.5">
                      Complete your Paldeck, progression & prepare squads.
                    </Text>
                  </View>

                  <View className="items-end">
                    <GlassBadge label="COLLECTION" tintColor="rgba(56,189,248,0.10)" />
                    <View className="mt-1">
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
                    </View>
                  </View>
                </View>

                <LiquidGlass
                  glassEffectStyle="clear"
                  interactive={false}
                  tinted
                  tintColor="rgba(56,189,248,0.10)"
                  showFallbackBackground
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.14)",
                  }}
                >
                  <View className="px-3 py-3">
                    <View className="flex-row justify-between mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="text-[11px] text-slate-400">World</Text>
                        <Text className="text-[11px] font-semibold text-slate-100 mt-0.5">
                          Palpagos
                        </Text>
                      </View>
                      <View className="flex-1 ml-2">
                        <Text className="text-[11px] text-slate-400">What You Can Track</Text>
                        <Text className="text-[11px] font-semibold text-slate-100 mt-0.5">
                          Paldeck • Squads • Journals
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-1">
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons name="map" size={14} color="#e5e7eb" />
                        <Text className="ml-1.5 text-[11px] text-slate-300">Interactive Map</Text>
                      </View>
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons name="home-group" size={14} color="#e5e7eb" />
                        <Text className="ml-1.5 text-[11px] text-slate-300">Base & Character Upgrades</Text>
                      </View>
                    </View>
                  </View>
                </LiquidGlass>
              </View>
            </GlassCardShell>
          </Pressable>

          {/* Animal Crossing Card */}
          <Pressable onPress={() => setActiveSeries("animal_crossing")} className="mb-3">
            <GlassCardShell tintColor="rgba(52,211,100,0.07)">
              <View className="px-4 py-4">
                <View className="flex-row items-center mb-3">
                  <GlassIconTile icon="leaf" iconColor="#34d399" tintColor="rgba(52,211,100,0.07)" />

                  <View className="flex-1 ml-3">
                    <Text className="text-[15px] font-semibold text-slate-50">Animal Crossing</Text>
                    <Text className="text-[12px] text-slate-400 mt-0.5">
                      Track your island life — villagers & critters.
                    </Text>
                  </View>

                  <View className="items-end">
                    <GlassBadge label="COLLECTION" tintColor="rgba(52,211,100,0.07)" />
                    <View className="mt-1">
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
                    </View>
                  </View>
                </View>

                <LiquidGlass
                  glassEffectStyle="clear"
                  interactive={false}
                  tinted
                  tintColor="rgba(52,211,100,0.07)"
                  showFallbackBackground
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.14)",
                  }}
                >
                  <View className="px-3 py-3">
                    <View className="flex-row justify-between mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="text-[11px] text-slate-400">Islands</Text>
                        <Text className="text-[11px] font-semibold text-slate-100 mt-0.5">
                          New Horizons
                        </Text>
                      </View>
                      <View className="flex-1 ml-2">
                        <Text className="text-[11px] text-slate-400">What You Can Track</Text>
                        <Text className="text-[11px] font-semibold text-slate-100 mt-0.5">
                          Villagers • Critters • Museum
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-1">
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons name="account-group" size={14} color="#e5e7eb" />
                        <Text className="ml-1.5 text-[11px] text-slate-300">Villager Tracking</Text>
                      </View>
                      <View className="flex-row items-center">
                        <MaterialCommunityIcons name="bug-outline" size={14} color="#e5e7eb" />
                        <Text className="ml-1.5 text-[11px] text-slate-300">Critterpedia Checklists</Text>
                      </View>
                    </View>
                  </View>
                </LiquidGlass>
              </View>
            </GlassCardShell>
          </Pressable>

          {/* More Soon */}
          <LiquidGlass
            glassEffectStyle="clear"
            interactive={false}
            tinted
            tintColor="rgba(148,163,184,0.08)"
            showFallbackBackground
            style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(148,163,184,0.16)",
              overflow: "hidden",
            }}
          >
            <View className="px-4 py-4">
              <View className="flex-row items-center mb-2">
                <LiquidGlass
                  glassEffectStyle="clear"
                  interactive={false}
                  tinted
                  tintColor="rgba(148,163,184,0.08)"
                  showFallbackBackground
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.16)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <MaterialCommunityIcons name="controller-classic-outline" size={20} color="#64748b" />
                </LiquidGlass>

                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-slate-200">More CreatureRealm universes coming soon</Text>
                  <Text className="text-[12px] text-slate-500 mt-0.5">
                    Separate collections for other creature games will live here with their own tracking & layouts.
                  </Text>
                </View>
              </View>

              <View className="mt-2 flex-row flex-wrap items-center justify-center">
                <LiquidGlass
                  glassEffectStyle="clear"
                  interactive={false}
                  tinted
                  tintColor="rgba(148,163,184,0.08)"
                  showFallbackBackground
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(148,163,184,0.16)",
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ paddingHorizontal: 12, paddingVertical: 7 }}>
                    <Text className="text-[11px] text-slate-300">More Soon</Text>
                  </View>
                </LiquidGlass>

                <LiquidGlass
                  glassEffectStyle="clear"
                  interactive={false}
                  tinted
                  tintColor="rgba(10,212,242,0.10)"
                  showFallbackBackground
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(10,212,242,0.22)",
                    marginBottom: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleOpenRequest}
                    activeOpacity={0.85}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialCommunityIcons name="message-plus-outline" size={14} color="#67e8f9" />
                    <Text className="ml-2 text-[11px] font-semibold text-cyan-100">Request a Universe</Text>
                  </TouchableOpacity>
                </LiquidGlass>
              </View>
            </View>
          </LiquidGlass>
        </ScrollView>

        <RequestUniverseModal
          visible={isRequestOpen}
          onClose={handleCloseRequest}
          onSubmit={handleSubmitRequest}
          isSubmitting={isRequestSubmitting}
          status={requestStatus}
        />
      </PageWrapper>
    );
  }

  if (activeSeries === "pokemon") {
    return <PokemonHomeContent onBackToCollections={() => setActiveSeries(null)} />;
  }

  if (activeSeries === "palworld") {
    return <PalworldHomeContent onBackToCollections={() => setActiveSeries(null)} />;
  }

  if (activeSeries === "animal_crossing") {
    return <AnimalCrossingHomeContent onBackToCollections={() => setActiveSeries(null)} />;
  }

  return null;
}
