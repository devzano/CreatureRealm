import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import BottomSheetModal from "@/components/ui/BottomSheetModal";
import {
  fetchPokemonTCGDigitalProfile,
  getPokemonTCGDigitalDeviceId,
  openPokemonTCGDigitalPack,
  type PokemonTCGDigitalPack,
  type PokemonTCGDigitalProfile,
  type PokemonTCGDigitalRevealCard,
} from "@/lib/pokemon/tcgDigital";
import { usePokemonTCGCollectionStore } from "@/store/pokemonTCGCollectionStore";

type PokemonTCGDigitalContentProps = {
  onOpenPhysicalCard?: (cardId: string) => void;
};

type RevealPhase = "sealed" | "revealing" | "summary";

function formatResetLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Next reset soon";
  return `Resets ${date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getPackProgress(profile: PokemonTCGDigitalProfile | null) {
  if (!profile) return 0;
  const used = Math.max(0, profile.dailyLimit - profile.remainingToday);
  return profile.dailyLimit ? Math.round((used / profile.dailyLimit) * 100) : 0;
}

export default function PokemonTCGDigitalContent(props: PokemonTCGDigitalContentProps) {
  const { onOpenPhysicalCard } = props;

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PokemonTCGDigitalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [revealCards, setRevealCards] = useState<PokemonTCGDigitalRevealCard[] | null>(null);
  const [revealPack, setRevealPack] = useState<PokemonTCGDigitalPack | null>(null);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>("sealed");
  const [revealIndex, setRevealIndex] = useState(0);

  const syncDigitalInventory = usePokemonTCGCollectionStore((state) => state.syncDigitalInventory);
  const packScale = useRef(new Animated.Value(1)).current;
  const packOpacity = useRef(new Animated.Value(1)).current;
  const packTranslateX = useRef(new Animated.Value(0)).current;
  const packTranslateY = useRef(new Animated.Value(0)).current;
  const packTilt = useRef(new Animated.Value(0)).current;
  const packGlow = useRef(new Animated.Value(0.2)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const summaryOpacity = useRef(new Animated.Value(0)).current;

  const currentRevealCard = useMemo(
    () => (revealCards?.length ? revealCards[Math.min(revealIndex, revealCards.length - 1)] : null),
    [revealCards, revealIndex]
  );

  const animateCardIn = useCallback(() => {
    cardOpacity.setValue(0);
    cardTranslateY.setValue(18);
    cardScale.setValue(0.95);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardScale, cardTranslateY]);

  const resetRevealState = useCallback(() => {
    setRevealCards(null);
    setRevealPack(null);
    setRevealPhase("sealed");
    setRevealIndex(0);
    packScale.setValue(1);
    packOpacity.setValue(1);
    packTranslateX.setValue(0);
    packTranslateY.setValue(0);
    packTilt.setValue(0);
    packGlow.setValue(0.2);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(20);
    cardScale.setValue(0.95);
    summaryOpacity.setValue(0);
  }, [
    cardOpacity,
    cardScale,
    cardTranslateY,
    packGlow,
    packOpacity,
    packScale,
    packTilt,
    packTranslateX,
    packTranslateY,
    summaryOpacity,
  ]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resolvedDeviceId = deviceId ?? (await getPokemonTCGDigitalDeviceId());
      if (!deviceId) setDeviceId(resolvedDeviceId);

      const nextProfile = await fetchPokemonTCGDigitalProfile(resolvedDeviceId);
      setProfile(nextProfile);
      syncDigitalInventory(nextProfile.inventory);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load digital packs.");
    } finally {
      setLoading(false);
    }
  }, [deviceId, syncDigitalInventory]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const openPack = useCallback(
    async (pack: PokemonTCGDigitalPack) => {
      try {
        const resolvedDeviceId = deviceId ?? (await getPokemonTCGDigitalDeviceId());
        if (!deviceId) setDeviceId(resolvedDeviceId);

        setOpeningPackId(pack.id);
        setError(null);
        const result = await openPokemonTCGDigitalPack(resolvedDeviceId, pack.id);
        setProfile(result.profile);
        syncDigitalInventory(result.profile.inventory);
        setRevealPack(pack);
        setRevealCards(result.reveal);
        setRevealPhase("sealed");
        setRevealIndex(0);
        packScale.setValue(1);
        packOpacity.setValue(1);
        packTranslateX.setValue(0);
        packTranslateY.setValue(0);
        packTilt.setValue(0);
        packGlow.setValue(0.2);
        cardOpacity.setValue(0);
        cardTranslateY.setValue(20);
        cardScale.setValue(0.95);
        summaryOpacity.setValue(0);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to open digital pack.");
      } finally {
        setOpeningPackId(null);
      }
    },
    [
      cardOpacity,
      cardScale,
      cardTranslateY,
      deviceId,
      packGlow,
      packOpacity,
      packScale,
      packTilt,
      packTranslateX,
      packTranslateY,
      summaryOpacity,
      syncDigitalInventory,
    ]
  );

  const digitalSummary = useMemo(() => {
    const inventory = profile?.inventory ?? {};
    const uniqueCards = Object.keys(inventory).filter((key) => Number(inventory[key] ?? 0) > 0).length;
    const totalCards = Object.values(inventory).reduce((sum, count) => sum + Math.max(0, Number(count || 0)), 0);

    return { uniqueCards, totalCards };
  }, [profile]);

  const packProgress = useMemo(() => getPackProgress(profile), [profile]);

  const beginReveal = useCallback(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(packScale, {
          toValue: 1.14,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(packTranslateY, {
          toValue: -18,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(packTilt, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(packOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(packGlow, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(packScale, {
          toValue: 1.28,
          duration: 260,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(packTranslateY, {
          toValue: -240,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(packTranslateX, {
          toValue: 34,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(packTilt, {
          toValue: 2,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(packOpacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(packGlow, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setRevealPhase("revealing");
      animateCardIn();
    });
  }, [animateCardIn, packGlow, packOpacity, packScale, packTilt, packTranslateX, packTranslateY]);

  const advanceReveal = useCallback(() => {
    if (!revealCards?.length) return;

    if (revealIndex >= revealCards.length - 1) {
      setRevealPhase("summary");
      Animated.timing(summaryOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: -12,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRevealIndex((current) => current + 1);
      animateCardIn();
    });
  }, [animateCardIn, cardOpacity, cardTranslateY, revealCards, revealIndex, summaryOpacity]);

  const sealedPackPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          revealPhase === "sealed" && (Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8),
        onPanResponderMove: (_, gestureState) => {
          if (revealPhase !== "sealed") return;

          const clampedX = Math.max(-70, Math.min(70, gestureState.dx));
          const clampedY = Math.max(-120, Math.min(40, gestureState.dy));
          packTranslateX.setValue(clampedX);
          packTranslateY.setValue(clampedY);
          packTilt.setValue(clampedX / 50);

          const distance = Math.min(1, (Math.abs(clampedX) + Math.abs(Math.min(clampedY, 0))) / 140);
          packGlow.setValue(0.2 + distance * 0.8);
          packScale.setValue(1 + distance * 0.08);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (revealPhase !== "sealed") return;

          const shouldRip = Math.abs(gestureState.dx) > 72 || gestureState.dy < -72;
          if (shouldRip) {
            beginReveal();
            return;
          }

          Animated.parallel([
            Animated.spring(packTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              speed: 18,
              bounciness: 8,
            }),
            Animated.spring(packTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              speed: 18,
              bounciness: 8,
            }),
            Animated.spring(packTilt, {
              toValue: 0,
              useNativeDriver: true,
              speed: 18,
              bounciness: 8,
            }),
            Animated.spring(packScale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 18,
              bounciness: 8,
            }),
            Animated.timing(packGlow, {
              toValue: 0.2,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [beginReveal, packGlow, packScale, packTilt, packTranslateX, packTranslateY, revealPhase]
  );

  const packRotate = packTilt.interpolate({
    inputRange: [-2, 0, 2],
    outputRange: ["-18deg", "0deg", "18deg"],
  });

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 34 }}>
      <View className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[16px] font-semibold text-slate-50">Digital Pack Lab</Text>
            <Text className="mt-1 text-[12px] leading-5 text-slate-400">
              Open up to 4 packs per day. Each pack costs 1 daily key and adds cards to your digital binder inventory.
            </Text>
          </View>

          <View className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-3 py-1.5">
            <Text className="text-[10px] font-semibold text-fuchsia-100">Digital</Text>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap -mx-1">
          <View className="w-1/2 px-1 mb-2">
            <View className="rounded-2xl border border-fuchsia-400/30 bg-slate-900 px-3 py-3 items-center">
              <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Keys Left</Text>
              <Text className="mt-1 text-[18px] font-semibold text-slate-100">{profile?.remainingToday ?? "—"}</Text>
            </View>
          </View>
          <View className="w-1/2 px-1 mb-2">
            <View className="rounded-2xl border border-sky-400/30 bg-slate-900 px-3 py-3 items-center">
              <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Opened Today</Text>
              <Text className="mt-1 text-[18px] font-semibold text-slate-100">{profile?.openedToday ?? "—"}</Text>
            </View>
          </View>
          <View className="w-1/2 px-1 mb-2">
            <View className="rounded-2xl border border-amber-400/30 bg-slate-900 px-3 py-3 items-center">
              <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Unique Cards</Text>
              <Text className="mt-1 text-[18px] font-semibold text-slate-100">{digitalSummary.uniqueCards}</Text>
            </View>
          </View>
          <View className="w-1/2 px-1 mb-2">
            <View className="rounded-2xl border border-emerald-400/30 bg-slate-900 px-3 py-3 items-center">
              <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total Pulls</Text>
              <Text className="mt-1 text-[18px] font-semibold text-slate-100">{digitalSummary.totalCards}</Text>
            </View>
          </View>
        </View>

        <View className="mt-2">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Daily Pack Usage</Text>
            <Text className="text-[11px] font-semibold text-slate-200">{profile ? `${profile.openedToday}/${profile.dailyLimit}` : "—"}</Text>
          </View>
          <View className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <View style={{ width: `${packProgress}%`, height: "100%", backgroundColor: "#d946ef" }} />
          </View>
          <Text className="mt-2 text-[10px] text-slate-500">{profile ? formatResetLabel(profile.nextResetAt) : "Loading reset window…"}</Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between px-1">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Available Packs</Text>
        <Pressable onPress={() => void loadProfile()} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5">
          <Text className="text-[10px] font-semibold text-slate-200">Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="items-center justify-center py-10">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading digital pack profile…</Text>
        </View>
      ) : error ? (
        <View className="mt-3 rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-4">
          <Text className="text-sm font-semibold text-rose-200">Digital packs unavailable</Text>
          <Text className="mt-1 text-[12px] leading-5 text-rose-100/90">{error}</Text>
        </View>
      ) : !profile?.packs.length ? (
        <View className="mt-6 items-center">
          <Text className="text-sm text-slate-400 text-center px-4">No digital packs are configured yet.</Text>
        </View>
      ) : (
        profile.packs.map((pack) => {
          const disabled = !!openingPackId || (profile?.remainingToday ?? 0) < pack.unlockCost;
          const isOpening = openingPackId === pack.id;

          return (
            <View key={pack.id} className="mt-3 rounded-3xl border border-slate-800 bg-slate-950/80 overflow-hidden">
              <View className="px-4 pt-4 pb-3">
                <View className="flex-row items-center">
                  <View className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 items-center justify-center mr-3 overflow-hidden p-1">
                    <ExpoImage source={{ uri: pack.images.symbol }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                  </View>

                  <View className="flex-1 pr-3">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{pack.series}</Text>
                    <Text className="text-[15px] font-semibold text-slate-50 mt-0.5">{pack.name}</Text>
                    <Text className="text-[11px] text-slate-400 mt-0.5">{pack.releaseDate} • {pack.total} cards in pool</Text>
                  </View>

                  <View className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-2.5 py-1">
                    <Text className="text-[10px] font-semibold text-fuchsia-100">1 Key</Text>
                  </View>
                </View>

                <View className="mt-3 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden p-2">
                  <ExpoImage source={{ uri: pack.images.logo }} style={{ width: "100%", height: 42 }} contentFit="contain" transition={120} />
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Unlock Method</Text>
                    <Text className="mt-1 text-[12px] text-slate-200">Spend 1 daily pack key to crack this pack.</Text>
                  </View>

                  <Pressable
                    disabled={disabled}
                    onPress={() => void openPack(pack)}
                    className="rounded-2xl border px-3 py-2.5"
                    style={{
                      opacity: disabled ? 0.55 : 1,
                      backgroundColor: "rgba(217,70,239,0.14)",
                      borderColor: "rgba(217,70,239,0.4)",
                    }}
                  >
                    <Text className="text-[11px] font-semibold text-fuchsia-100">
                      {isOpening ? "Opening…" : disabled ? "No Keys" : "Unlock Pack"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })
      )}

      {profile?.history.length ? (
        <View className="mt-5">
          <View className="flex-row items-center justify-between px-1 mb-2">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recent Pulls</Text>
            <Text className="text-[10px] text-slate-500">{profile.totalOpened} total packs</Text>
          </View>

          {profile.history.slice(0, 6).map((entry) => (
            <View key={entry.id} className="mb-3 rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[13px] font-semibold text-slate-100">{entry.setName}</Text>
                  <Text className="mt-0.5 text-[11px] text-slate-500">
                    {new Date(entry.openedAt).toLocaleString()}
                  </Text>
                </View>
                <View className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1">
                  <Text className="text-[10px] text-slate-300">{entry.cards.length} cards</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                {entry.cards.map((card) => (
                  <Pressable
                    key={`${entry.id}-${card.id}`}
                    onPress={() => onOpenPhysicalCard?.(card.id)}
                    className="mr-3 rounded-2xl border border-slate-800 bg-slate-900 px-2.5 py-2"
                    style={{ width: 108 }}
                  >
                    <ExpoImage source={{ uri: card.images.small }} style={{ width: 84, height: 116, alignSelf: "center" }} contentFit="contain" transition={120} />
                    <Text numberOfLines={2} className="mt-2 text-[10px] font-semibold text-slate-100 text-center min-h-[26px]">
                      {card.name}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[9px] text-slate-500 text-center">
                      {card.rarity || card.supertype}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      ) : null}

      <BottomSheetModal
        visible={!!revealCards?.length}
        onRequestClose={resetRevealState}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        {revealCards?.length ? (
          <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 30 }}>
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={2}>
                  {revealPack?.name ?? "Pack Reveal"}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">
                  Swipe through your pull. Cards are already added to your digital binder.
                </Text>
              </View>

              <Pressable
                onPress={resetRevealState}
                className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>

            {revealPack ? (
              <View className="mb-3 rounded-3xl border border-slate-800 bg-slate-950/85 px-4 py-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pack Status</Text>
                    <Text className="mt-1 text-[13px] font-semibold text-slate-50">
                      {revealPhase === "sealed"
                        ? "Sealed pack ready"
                        : revealPhase === "revealing"
                        ? `Card ${Math.min(revealIndex + 1, revealCards.length)} of ${revealCards.length}`
                        : "Pack complete"}
                    </Text>
                  </View>

                  <View className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5">
                    <Text className="text-[10px] font-semibold text-slate-200">{revealCards.length} pulls</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {revealPhase === "sealed" && revealPack ? (
                <View className="rounded-3xl border border-fuchsia-400/20 bg-slate-950 px-4 py-5">
                  <Animated.View
                    {...sealedPackPanResponder.panHandlers}
                    style={{
                      transform: [{ scale: packScale }],
                      opacity: packOpacity,
                    }}
                  >
                    <Animated.View
                      style={{
                        transform: [{ translateX: packTranslateX }, { translateY: packTranslateY }, { rotate: packRotate }, { scale: packScale }],
                      }}
                    >
                      <Animated.View
                        className="rounded-[28px] border border-fuchsia-400/30 bg-slate-950 px-4 py-5"
                        style={{
                          shadowColor: "#d946ef",
                          shadowOpacity: 0.45,
                          shadowRadius: 22,
                          shadowOffset: { width: 0, height: 10 },
                          opacity: Animated.add(0.75, Animated.multiply(packGlow, 0.25)),
                        }}
                      >
                        <View className="items-center">
                          <ExpoImage source={{ uri: revealPack.images.logo }} style={{ width: 240, height: 56 }} contentFit="contain" transition={120} />
                          <View className="mt-4 w-44 h-44 rounded-[28px] border border-slate-700 bg-slate-900 items-center justify-center overflow-hidden p-4">
                            <ExpoImage source={{ uri: revealPack.images.symbol }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={120} />
                          </View>
                        </View>

                        <Text className="mt-5 text-center text-[14px] font-semibold text-slate-100">{revealPack.name}</Text>
                        <Text className="mt-1 text-center text-[12px] leading-5 text-slate-400">{revealPack.subtitle}</Text>

                        <View className="mt-4 flex-row flex-wrap justify-center">
                          {revealPack.slotOdds.map((slot, index) => (
                            <View key={`${revealPack.id}-${index}`} className="mr-2 mb-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1">
                              <Text className="text-[10px] font-semibold text-slate-200">
                                Slot {index + 1}: {slot.tier}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </Animated.View>
                    </Animated.View>
                  </Animated.View>

                <Text className="mt-4 text-center text-[11px] leading-5 text-slate-400">
                  Swipe up or sideways on the pack to rip it open, or use the button below.
                </Text>

                <Pressable
                  onPress={beginReveal}
                  className="mt-4 rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/12 px-4 py-3 items-center"
                >
                  <Text className="text-[12px] font-semibold text-fuchsia-100">Rip Pack</Text>
                </Pressable>
              </View>
            ) : null}

            {revealPhase === "revealing" && currentRevealCard ? (
              <Animated.View
                style={{
                  opacity: cardOpacity,
                  transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
                }}
                className="rounded-3xl border border-fuchsia-400/20 bg-slate-950 px-4 py-4"
              >
                <View className="items-center">
                  <ExpoImage source={{ uri: currentRevealCard.images.large }} style={{ width: 240, height: 336 }} contentFit="contain" transition={120} />
                </View>

                <Text className="mt-3 text-[14px] font-semibold text-slate-100 text-center">{currentRevealCard.name}</Text>
                <Text className="mt-1 text-[11px] text-slate-400 text-center">
                  {currentRevealCard.set.name} • #{currentRevealCard.number}
                </Text>
                <Text className="mt-1 text-[11px] text-fuchsia-200 text-center">{currentRevealCard.rarity || currentRevealCard.supertype}</Text>

                <View className="mt-4 flex-row items-center justify-center">
                  <View className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5">
                    <Text className="text-[10px] font-semibold text-emerald-100">Added to Digital Binder</Text>
                  </View>
                </View>

                <View className="mt-4 flex-row">
                  {onOpenPhysicalCard ? (
                    <Pressable
                      onPress={() => {
                        resetRevealState();
                        onOpenPhysicalCard(currentRevealCard.id);
                      }}
                      className="flex-1 mr-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 items-center"
                    >
                      <Text className="text-[11px] font-semibold text-slate-100">Open Detail</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={advanceReveal}
                    className={`${onOpenPhysicalCard ? "flex-1 ml-2" : "w-full"} rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/10 px-3 py-3 items-center`}
                  >
                    <Text className="text-[11px] font-semibold text-fuchsia-100">
                      {revealIndex >= revealCards.length - 1 ? "Finish Pack" : "Next Card"}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : null}

            {revealPhase === "summary" ? (
              <Animated.View style={{ opacity: summaryOpacity }}>
                <View className="rounded-3xl border border-fuchsia-400/20 bg-slate-950 px-4 py-4">
                  <Text className="text-[14px] font-semibold text-slate-50">Pack Complete</Text>
                  <Text className="mt-1 text-[12px] leading-5 text-slate-400">
                    Your pulls are in the digital binder. Open any card for its full shared detail sheet.
                  </Text>

                  <View className="mt-4 flex-row flex-wrap -mx-1">
                    {revealCards.map((card) => (
                      <View key={card.id} className="w-1/2 px-1 mb-2">
                        <Pressable
                          onPress={() => {
                            resetRevealState();
                            onOpenPhysicalCard?.(card.id);
                          }}
                          className="rounded-2xl border border-slate-800 bg-slate-900 px-2 py-2"
                        >
                          <ExpoImage source={{ uri: card.images.small }} style={{ width: 92, height: 128, alignSelf: "center" }} contentFit="contain" transition={120} />
                          <Text numberOfLines={2} className="mt-2 text-[10px] font-semibold text-slate-100 text-center min-h-[28px]">
                            {card.name}
                          </Text>
                          <Text numberOfLines={1} className="mt-0.5 text-[9px] text-slate-500 text-center">
                            {card.rarity || card.supertype}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={resetRevealState}
                    className="mt-3 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 items-center"
                  >
                    <Text className="text-[11px] font-semibold text-slate-100">Close Pack</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : null}
          </ScrollView>
        ) : null}
      </BottomSheetModal>
    </ScrollView>
  );
}
