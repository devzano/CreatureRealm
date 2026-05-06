import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

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
import AppImages from "@/constants/images";

type PokemonTCGDigitalContentProps = {
  onOpenPhysicalCard?: (cardId: string) => void;
};

type RevealPhase = "sealed" | "ripping" | "revealing" | "summary";
const AUTO_NEXT_KEY = "creaturerealm-pokemon-tcg-digital-auto-next";

const PACK_FRAME_SOURCES = [
  require("../../assets/images/tcgDigitalPack/frame-00.png"),
  require("../../assets/images/tcgDigitalPack/frame-01.png"),
  require("../../assets/images/tcgDigitalPack/frame-02.png"),
  require("../../assets/images/tcgDigitalPack/frame-03.png"),
  require("../../assets/images/tcgDigitalPack/frame-04.png"),
  require("../../assets/images/tcgDigitalPack/frame-05.png"),
  require("../../assets/images/tcgDigitalPack/frame-06.png"),
  require("../../assets/images/tcgDigitalPack/frame-07.png"),
  require("../../assets/images/tcgDigitalPack/frame-08.png"),
  require("../../assets/images/tcgDigitalPack/frame-09.png"),
  require("../../assets/images/tcgDigitalPack/frame-10.png"),
  require("../../assets/images/tcgDigitalPack/frame-11.png"),
  require("../../assets/images/tcgDigitalPack/frame-12.png"),
  require("../../assets/images/tcgDigitalPack/frame-13.png"),
  require("../../assets/images/tcgDigitalPack/frame-14.png"),
] as const;

const FRAGMENTS_SOURCE = require("../../assets/images/tcgDigitalPack/fragments.png");
const TEAR_STRIP_SOURCE = require("../../assets/images/tcgDigitalPack/tear-strip.png");
const CARD_BACK_STANDARD_SOURCE = require("../../assets/images/tcgDigitalCardBacks/common.png");
const CARD_BACK_DARK_SOURCE = require("../../assets/images/tcgDigitalCardBacks/dark.png");
const CARD_BACK_RARE_SOURCE = require("../../assets/images/tcgDigitalCardBacks/rare.png");
const CARD_BACK_RARE_GLOW_SOURCE = require("../../assets/images/tcgDigitalCardBacks/rare-glow.png");
const CARD_BACK_HOLO_SOURCE = require("../../assets/images/tcgDigitalCardBacks/holo.png");
const CARD_BACK_GLOW_BG_SOURCE = require("../../assets/images/tcgDigitalCardBacks/glowbg.png");
const CARD_GLOW_ENERGY_SOURCE = require("../../assets/images/tcgDigitalCardBacks/glow-energy.png");
const CARD_GLOW_RAYS_SOURCE = require("../../assets/images/tcgDigitalCardBacks/glow-rays.png");
const CARD_GLOW_SWIRL_SOURCE = require("../../assets/images/tcgDigitalCardBacks/glow-swirl.png");
const CARD_GLOW_PULSE_SOURCE = require("../../assets/images/tcgDigitalCardBacks/glow-pulse.png");
const CARD_GLOW_SPARK_SOURCE = require("../../assets/images/tcgDigitalCardBacks/glow-spark.png");

function getDigitalRevealTheme(card: PokemonTCGDigitalRevealCard | null) {
  if (!card) {
    return {
      backSource: CARD_BACK_STANDARD_SOURCE,
      glowSource: CARD_BACK_GLOW_BG_SOURCE,
      ripGlowSource: CARD_GLOW_PULSE_SOURCE,
      glowTint: "#22D3EE",
      label: "Standard Pull",
    };
  }

  const rarity = String(card.rarity ?? "").toLowerCase();
  const supertype = String(card.supertype ?? "").toLowerCase();

  if (/secret|hyper|illustration|special illustration|ultra|rainbow|ace spec|double rare/.test(rarity)) {
    return {
      backSource: CARD_BACK_HOLO_SOURCE,
      glowSource: CARD_BACK_GLOW_BG_SOURCE,
      ripGlowSource: CARD_GLOW_SPARK_SOURCE,
      glowTint: "#C084FC",
      label: "Holo Pull",
    };
  }

  if (/rare|holo|radiant|amazing|promo/.test(rarity)) {
    return {
      backSource: CARD_BACK_RARE_SOURCE,
      glowSource: CARD_BACK_GLOW_BG_SOURCE,
      ripGlowSource: CARD_GLOW_RAYS_SOURCE,
      glowTint: "#93C5FD",
      label: "Rare Pull",
    };
  }

  if (supertype === "energy") {
    return {
      backSource: CARD_BACK_RARE_GLOW_SOURCE,
      glowSource: CARD_BACK_GLOW_BG_SOURCE,
      ripGlowSource: CARD_GLOW_ENERGY_SOURCE,
      glowTint: "#22D3EE",
      label: "Energy Pull",
    };
  }

  if (supertype === "trainer") {
    return {
      backSource: CARD_BACK_DARK_SOURCE,
      glowSource: CARD_BACK_GLOW_BG_SOURCE,
      ripGlowSource: CARD_GLOW_SWIRL_SOURCE,
      glowTint: "#64748B",
      label: "Trainer Pull",
    };
  }

  return {
    backSource: CARD_BACK_STANDARD_SOURCE,
    glowSource: CARD_BACK_GLOW_BG_SOURCE,
    ripGlowSource: CARD_GLOW_PULSE_SOURCE,
    glowTint: "#22D3EE",
    label: "Standard Pull",
  };
}

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
  const [packFrameIndex, setPackFrameIndex] = useState(0);
  const [isCurrentCardFlipped, setIsCurrentCardFlipped] = useState(false);
  const [autoNextEnabled, setAutoNextEnabled] = useState(false);
  const [refreshingPool, setRefreshingPool] = useState(false);

  const syncDigitalInventory = usePokemonTCGCollectionStore((state) => state.syncDigitalInventory);
  const packTranslateX = useRef(new Animated.Value(0)).current;
  const packTranslateY = useRef(new Animated.Value(0)).current;
  const packTilt = useRef(new Animated.Value(0)).current;
  const sealedPackScale = useRef(new Animated.Value(1)).current;
  const sealedPackOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const fragmentsOpacity = useRef(new Animated.Value(0)).current;
  const fragmentsTranslateY = useRef(new Animated.Value(0)).current;
  const tearStripOpacity = useRef(new Animated.Value(0)).current;
  const tearStripTranslateX = useRef(new Animated.Value(0)).current;
  const tearStripTranslateY = useRef(new Animated.Value(0)).current;
  const cardBackOpacity = useRef(new Animated.Value(0)).current;
  const cardBackTranslateY = useRef(new Animated.Value(0)).current;
  const cardBackScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const flipProgress = useRef(new Animated.Value(0)).current;
  const summaryOpacity = useRef(new Animated.Value(0)).current;
  const ripTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoAdvanceTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const currentRevealCard = useMemo(
    () => (revealCards?.length ? revealCards[Math.min(revealIndex, revealCards.length - 1)] : null),
    [revealCards, revealIndex]
  );
  const currentRevealTheme = useMemo(() => getDigitalRevealTheme(currentRevealCard), [currentRevealCard]);
  const hasNextRevealCard = useMemo(
    () => Boolean(revealCards?.length && revealIndex < revealCards.length - 1),
    [revealCards, revealIndex]
  );

  const clearAutoAdvanceTimeouts = useCallback(() => {
    for (const timeoutId of autoAdvanceTimeoutsRef.current) clearTimeout(timeoutId);
    autoAdvanceTimeoutsRef.current = [];
  }, []);

  const animateCardIn = useCallback(() => {
    setIsCurrentCardFlipped(false);
    flipProgress.setValue(0);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(132);
    cardScale.setValue(0.82);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardScale, cardTranslateY, flipProgress]);

  const resetRevealState = useCallback(() => {
    for (const timeoutId of ripTimeoutsRef.current) clearTimeout(timeoutId);
    ripTimeoutsRef.current = [];
    clearAutoAdvanceTimeouts();
    setRevealCards(null);
    setRevealPack(null);
    setRevealPhase("sealed");
    setRevealIndex(0);
    setPackFrameIndex(0);
    setIsCurrentCardFlipped(false);
    packTranslateX.setValue(0);
    packTranslateY.setValue(0);
    packTilt.setValue(0);
    sealedPackScale.setValue(1);
    sealedPackOpacity.setValue(1);
    glowOpacity.setValue(0);
    fragmentsOpacity.setValue(0);
    fragmentsTranslateY.setValue(0);
    tearStripOpacity.setValue(0);
    tearStripTranslateX.setValue(0);
    tearStripTranslateY.setValue(0);
    cardBackOpacity.setValue(0);
    cardBackTranslateY.setValue(0);
    cardBackScale.setValue(0.9);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(20);
    cardScale.setValue(0.95);
    flipProgress.setValue(0);
    summaryOpacity.setValue(0);
  }, [
    cardOpacity,
    cardScale,
    cardTranslateY,
    flipProgress,
    sealedPackOpacity,
    sealedPackScale,
    glowOpacity,
    fragmentsOpacity,
    fragmentsTranslateY,
    tearStripOpacity,
    tearStripTranslateX,
    tearStripTranslateY,
    cardBackOpacity,
    cardBackTranslateY,
    cardBackScale,
    packTilt,
    packTranslateX,
    packTranslateY,
    summaryOpacity,
    clearAutoAdvanceTimeouts,
  ]);

  const loadProfile = useCallback(async (options?: { refreshPool?: boolean }) => {
    try {
      if (options?.refreshPool) {
        setRefreshingPool(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const resolvedDeviceId = deviceId ?? (await getPokemonTCGDigitalDeviceId());
      if (!deviceId) setDeviceId(resolvedDeviceId);

      const nextProfile = await fetchPokemonTCGDigitalProfile(resolvedDeviceId, options);
      setProfile(nextProfile);
      syncDigitalInventory(nextProfile.inventory);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load digital packs.");
    } finally {
      setLoading(false);
      setRefreshingPool(false);
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
        setPackFrameIndex(0);
        setIsCurrentCardFlipped(false);
        packTranslateX.setValue(0);
        packTranslateY.setValue(0);
        packTilt.setValue(0);
        sealedPackScale.setValue(1);
        sealedPackOpacity.setValue(1);
        glowOpacity.setValue(0);
        fragmentsOpacity.setValue(0);
        fragmentsTranslateY.setValue(0);
        tearStripOpacity.setValue(0);
        tearStripTranslateX.setValue(0);
        tearStripTranslateY.setValue(0);
        cardBackOpacity.setValue(0);
        cardBackTranslateY.setValue(0);
        cardBackScale.setValue(0.9);
        cardOpacity.setValue(0);
        cardTranslateY.setValue(20);
        cardScale.setValue(0.95);
        flipProgress.setValue(0);
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
      flipProgress,
      deviceId,
      sealedPackOpacity,
      sealedPackScale,
      glowOpacity,
      fragmentsOpacity,
      fragmentsTranslateY,
      tearStripOpacity,
      tearStripTranslateX,
      tearStripTranslateY,
      cardBackOpacity,
      cardBackTranslateY,
      cardBackScale,
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

  useEffect(() => {
    return () => {
      for (const timeoutId of ripTimeoutsRef.current) clearTimeout(timeoutId);
      ripTimeoutsRef.current = [];
      clearAutoAdvanceTimeouts();
    };
  }, [clearAutoAdvanceTimeouts]);

  useEffect(() => {
    let cancelled = false;

    void SecureStore.getItemAsync(AUTO_NEXT_KEY).then((value) => {
      if (cancelled) return;
      setAutoNextEnabled(value === "1");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const beginReveal = useCallback(() => {
    if (revealPhase !== "sealed") return;

    for (const timeoutId of ripTimeoutsRef.current) clearTimeout(timeoutId);
    ripTimeoutsRef.current = [];

    setRevealPhase("ripping");
    setPackFrameIndex(0);
    glowOpacity.setValue(0);
    fragmentsOpacity.setValue(0);
    fragmentsTranslateY.setValue(0);
    tearStripOpacity.setValue(0);
    tearStripTranslateX.setValue(0);
    tearStripTranslateY.setValue(0);
    cardBackOpacity.setValue(0);
    cardBackTranslateY.setValue(18);
    cardBackScale.setValue(0.94);

    Animated.sequence([
      Animated.timing(sealedPackScale, {
        toValue: 1.03,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(packTranslateX, { toValue: -12, duration: 70, useNativeDriver: true }),
        Animated.timing(packTranslateX, { toValue: 12, duration: 70, useNativeDriver: true }),
        Animated.timing(packTranslateX, { toValue: -10, duration: 65, useNativeDriver: true }),
        Animated.timing(packTranslateX, { toValue: 10, duration: 65, useNativeDriver: true }),
        Animated.timing(packTranslateX, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]),
    ]).start();

    const frameDurations = [90, 90, 84, 84, 84, 80, 80, 80, 96, 104, 112, 124, 140, 156];
    let elapsed = 0;

    frameDurations.forEach((duration, index) => {
      elapsed += duration;
      ripTimeoutsRef.current.push(
        setTimeout(() => {
          setPackFrameIndex(index + 1);

          if (index >= 4) {
            Animated.parallel([
              Animated.timing(tearStripOpacity, {
                toValue: 1,
                duration: 70,
                useNativeDriver: true,
              }),
              Animated.timing(tearStripTranslateX, {
                toValue: 48,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(tearStripTranslateY, {
                toValue: -34,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]).start();
          }

          if (index >= 9) {
            Animated.parallel([
              Animated.timing(glowOpacity, {
                toValue: 0.9,
                duration: 110,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(fragmentsOpacity, {
                toValue: 1,
                duration: 130,
                useNativeDriver: true,
              }),
              Animated.timing(fragmentsTranslateY, {
                toValue: -22,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]).start();
          }

          if (index >= 11) {
            Animated.parallel([
              Animated.timing(cardBackOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
              }),
              Animated.timing(cardBackTranslateY, {
                toValue: -18,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(cardBackScale, {
                toValue: 1,
                duration: 240,
                easing: Easing.out(Easing.back(1.05)),
                useNativeDriver: true,
              }),
            ]).start();
          }
        }, elapsed)
      );
    });

    ripTimeoutsRef.current.push(
      setTimeout(() => {
        setRevealPhase("revealing");
        animateCardIn();
      }, elapsed + 240)
    );
  }, [
    animateCardIn,
    cardBackOpacity,
    cardBackScale,
    cardBackTranslateY,
    fragmentsOpacity,
    fragmentsTranslateY,
    glowOpacity,
    tearStripOpacity,
    tearStripTranslateX,
    tearStripTranslateY,
    packTranslateX,
    revealPhase,
    sealedPackScale,
  ]);

  const advanceReveal = useCallback(() => {
    if (!revealCards?.length) return;
    if (!isCurrentCardFlipped) return;

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
  }, [animateCardIn, cardOpacity, cardTranslateY, isCurrentCardFlipped, revealCards, revealIndex, summaryOpacity]);

  const flipCurrentCard = useCallback(() => {
    if (!currentRevealCard || isCurrentCardFlipped) return;

    setIsCurrentCardFlipped(true);
    Animated.timing(flipProgress, {
      toValue: 1,
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentRevealCard, flipProgress, isCurrentCardFlipped]);

  const toggleAutoNext = useCallback(async () => {
    const nextValue = !autoNextEnabled;
    setAutoNextEnabled(nextValue);
    await SecureStore.setItemAsync(AUTO_NEXT_KEY, nextValue ? "1" : "0");
  }, [autoNextEnabled]);

  useEffect(() => {
    clearAutoAdvanceTimeouts();
    if (!autoNextEnabled || revealPhase !== "revealing" || !currentRevealCard) return;

    if (!isCurrentCardFlipped) {
      autoAdvanceTimeoutsRef.current.push(
        setTimeout(() => {
          flipCurrentCard();
        }, 800)
      );
      return;
    }

    autoAdvanceTimeoutsRef.current.push(
      setTimeout(() => {
        advanceReveal();
      }, hasNextRevealCard ? 1400 : 1700)
    );
  }, [
    advanceReveal,
    autoNextEnabled,
    clearAutoAdvanceTimeouts,
    currentRevealCard,
    flipCurrentCard,
    hasNextRevealCard,
    isCurrentCardFlipped,
    revealPhase,
  ]);

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
          glowOpacity.setValue(0.18 + distance * 0.42);
          sealedPackScale.setValue(1 + distance * 0.08);
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
            Animated.spring(sealedPackScale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 18,
              bounciness: 8,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [
      beginReveal,
      glowOpacity,
      sealedPackScale,
      packTilt,
      packTranslateX,
      packTranslateY,
      revealPhase,
    ]
  );

  const packRotate = packTilt.interpolate({
    inputRange: [-2, 0, 2],
    outputRange: ["-18deg", "0deg", "18deg"],
  });
  const backRotateY = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const frontRotateY = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const backScale = flipProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.92, 1],
  });
  const frontScale = flipProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.92, 0.98, 1],
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
        <View className="flex-row items-center">
          <Pressable
            onPress={toggleAutoNext}
            className="mr-2 rounded-full border px-3 py-1.5"
            style={{
              borderColor: autoNextEnabled ? "rgba(34,197,94,0.45)" : "rgba(51,65,85,1)",
              backgroundColor: autoNextEnabled ? "rgba(34,197,94,0.12)" : "rgba(15,23,42,1)",
            }}
          >
            <Text className="text-[10px] font-semibold" style={{ color: autoNextEnabled ? "#dcfce7" : "#e2e8f0" }}>
              Auto Next {autoNextEnabled ? "On" : "Off"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void loadProfile({ refreshPool: true })}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5"
            style={{ opacity: refreshingPool ? 0.65 : 1 }}
          >
            <Text className="text-[10px] font-semibold text-slate-200">{refreshingPool ? "Refreshing…" : "Refresh"}</Text>
          </Pressable>
        </View>
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
                    <ExpoImage source={{ uri: pack.images.logo }} style={{ width: "100%", height: 42 }} contentFit="contain" transition={120} />
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
                  <View className="mt-3 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden px-3 py-4">
                    <View className="flex-row items-center justify-center">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <ExpoImage
                          key={index}
                          source={AppImages.cardBack}
                          contentFit="cover"
                          transition={120}
                          style={{
                            width: 54,
                            height: 76,
                            borderRadius: 10,
                            marginLeft: index === 0 ? 0 : -18,
                            transform: [
                              { rotate: `${(index - 2) * 5}deg` },
                              { translateY: Math.abs(index - 2) * 4 },
                            ],
                            borderWidth: 1,
                            borderColor: "rgba(148,163,184,0.35)",
                            backgroundColor: "rgba(15,23,42,0.9)",
                          }}
                        />
                      ))}
                    </View>
                  </View>
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
                      {isOpening ? "Preparing…" : disabled ? "No Keys" : "Get Pack"}
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
                  {revealPack?.name ?? "Pack Opening"}
                </Text>
                <Text className="text-slate-400 text-[12px] mt-0.5">
                  Open the pack and reveal each card one by one. Cards are added to your digital binder immediately.
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
                        : revealPhase === "ripping"
                          ? "Ripping pack"
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
                <View className="items-center">
                  <ExpoImage source={{ uri: revealPack.images.logo }} style={{ width: 240, height: 56 }} contentFit="contain" transition={120} />
                </View>

                <Animated.View
                  {...sealedPackPanResponder.panHandlers}
                  style={{
                    marginTop: 14,
                    alignItems: "center",
                    opacity: sealedPackOpacity,
                    transform: [{ translateX: packTranslateX }, { translateY: packTranslateY }, { rotate: packRotate }, { scale: sealedPackScale }],
                  }}
                >
                  <Animated.View
                    style={{
                      position: "absolute",
                      top: 28,
                      width: 220,
                      height: 220,
                      borderRadius: 999,
                      backgroundColor: "#22D3EE",
                      opacity: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
                      transform: [{ scale: sealedPackScale }],
                    }}
                  />
                  <ExpoImage source={PACK_FRAME_SOURCES[0]} style={{ width: 170, height: 300 }} contentFit="contain" transition={0} />
                </Animated.View>

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

                <Text className="mt-3 text-center text-[11px] leading-5 text-slate-400">
                  Swipe the pack sideways or upward, or tap the button to open it.
                </Text>

                <Pressable
                  onPress={beginReveal}
                  className="mt-4 rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/12 px-4 py-3 items-center"
                >
                  <Text className="text-[12px] font-semibold text-fuchsia-100">Open Pack</Text>
                </Pressable>
              </View>
            ) : null}

            {revealPhase === "ripping" ? (
              <View className="rounded-3xl border border-fuchsia-400/20 bg-slate-950 px-4 py-5">
                <View className="items-center justify-center" style={{ minHeight: 360 }}>
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 14,
                      opacity: glowOpacity,
                      transform: [{ scale: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.08] }) }],
                    }}
                  >
                    <ExpoImage
                      source={currentRevealTheme.ripGlowSource}
                      style={{ width: 284, height: 284, tintColor: currentRevealTheme.glowTint }}
                      contentFit="contain"
                      transition={0}
                    />
                  </Animated.View>

                  <Animated.View
                    style={{
                      position: "absolute",
                      top: 92,
                      opacity: fragmentsOpacity,
                      transform: [{ translateY: fragmentsTranslateY }],
                    }}
                  >
                    <ExpoImage source={FRAGMENTS_SOURCE} style={{ width: 180, height: 96 }} contentFit="contain" transition={0} />
                  </Animated.View>

                  <Animated.View
                    style={{
                      position: "absolute",
                      top: 56,
                      opacity: tearStripOpacity,
                      transform: [{ translateX: tearStripTranslateX }, { translateY: tearStripTranslateY }, { rotate: "12deg" }],
                    }}
                  >
                    <ExpoImage source={TEAR_STRIP_SOURCE} style={{ width: 176, height: 52 }} contentFit="contain" transition={0} />
                  </Animated.View>

                  <Animated.View
                    style={{
                      position: "absolute",
                      top: 98,
                      opacity: cardBackOpacity,
                      transform: [{ translateY: cardBackTranslateY }, { scale: cardBackScale }],
                    }}
                  >
                    <ExpoImage source={currentRevealTheme.backSource} style={{ width: 148, height: 178 }} contentFit="contain" transition={0} />
                  </Animated.View>

                  <ExpoImage
                    source={PACK_FRAME_SOURCES[Math.min(packFrameIndex, PACK_FRAME_SOURCES.length - 1)]}
                    style={{ width: 190, height: 320 }}
                    contentFit="contain"
                    transition={0}
                  />
                </View>
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
                <View className="items-center mb-2" style={{ minHeight: 180 }}>
                  <View style={{ position: "absolute", top: 4, alignItems: "center" }}>
                    <Animated.View
                      style={{
                        position: "absolute",
                        top: 88,
                        opacity: glowOpacity,
                        transform: [{ scale: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.1] }) }],
                      }}
                    >
                      <ExpoImage
                        source={currentRevealTheme.glowSource}
                        style={{ width: 276, height: 276, tintColor: currentRevealTheme.glowTint }}
                        contentFit="contain"
                        transition={0}
                      />
                    </Animated.View>
                    {hasNextRevealCard ? (
                      <Animated.View
                        style={{
                          position: "absolute",
                          top: 86,
                          opacity: 0.55,
                          transform: [{ translateY: cardBackTranslateY.interpolate({ inputRange: [-18, 0], outputRange: [0, 8] }) }],
                        }}
                      >
                        <ExpoImage source={PACK_FRAME_SOURCES[14]} style={{ width: 180, height: 292 }} contentFit="contain" transition={0} />
                      </Animated.View>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={flipCurrentCard}
                    disabled={isCurrentCardFlipped}
                    className="items-center justify-center"
                    style={{ width: 240, height: 336 }}
                  >
                    <Animated.View
                      pointerEvents={isCurrentCardFlipped ? "none" : "auto"}
                      style={{
                        position: "absolute",
                        width: 240,
                        height: 336,
                        backfaceVisibility: "hidden",
                        transform: [{ perspective: 1200 }, { rotateY: backRotateY }, { scale: backScale }],
                      }}
                    >
                      <ExpoImage source={currentRevealTheme.backSource} style={{ width: 240, height: 336 }} contentFit="contain" transition={0} />
                    </Animated.View>

                    <Animated.View
                      pointerEvents={isCurrentCardFlipped ? "auto" : "none"}
                      style={{
                        position: "absolute",
                        width: 240,
                        height: 336,
                        backfaceVisibility: "hidden",
                        transform: [{ perspective: 1200 }, { rotateY: frontRotateY }, { scale: frontScale }],
                      }}
                    >
                      <ExpoImage source={{ uri: currentRevealCard.images.large }} style={{ width: 240, height: 336 }} contentFit="contain" transition={120} />
                    </Animated.View>
                  </Pressable>
                </View>

                {isCurrentCardFlipped ? (
                  <>
                    <Text className="mt-3 text-[14px] font-semibold text-slate-100 text-center">{currentRevealCard.name}</Text>
                    <Text className="mt-1 text-[11px] text-slate-400 text-center">
                      {currentRevealCard.set.name} • #{currentRevealCard.number}
                    </Text>
                    <Text className="mt-1 text-[11px] text-fuchsia-200 text-center">{currentRevealCard.rarity || currentRevealCard.supertype}</Text>
                  </>
                ) : (
                  <>
                    <Text className="mt-3 text-[14px] font-semibold text-slate-100 text-center">{currentRevealTheme.label}</Text>
                    <Text className="mt-1 text-[11px] text-slate-400 text-center">
                      {autoNextEnabled ? "Auto Next is on. This card will flip and advance automatically." : "Tap the card back to flip and reveal your pull."}
                    </Text>
                  </>
                )}

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
                    disabled={!isCurrentCardFlipped}
                    className={`${onOpenPhysicalCard ? "flex-1 ml-2" : "w-full"} rounded-2xl border border-fuchsia-400/35 bg-fuchsia-500/10 px-3 py-3 items-center`}
                    style={{ opacity: isCurrentCardFlipped ? 1 : 0.45 }}
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
