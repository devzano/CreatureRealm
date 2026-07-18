import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function isRareCard(rarity: string | null) {
  const r = String(rarity ?? "").toLowerCase();
  return /secret|hyper|illustration|special illustration|ultra|rainbow|ace spec|double rare|rare|holo|amazing|radiant|promo/.test(r);
}

// Frame durations (ms) — 14 frames, total 550ms
// Accelerates through the rip, slight ease at the end
const RIP_FRAMES = [36, 35, 34, 34, 34, 34, 34, 34, 36, 38, 40, 46, 54, 61] as const;
const RIP_CUMULATIVE = RIP_FRAMES.reduce<number[]>((acc, d) => {
  acc.push((acc[acc.length - 1] ?? 0) + d);
  return acc;
}, []);
const RIP_TOTAL = RIP_CUMULATIVE[RIP_CUMULATIVE.length - 1]!; // 550ms

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PokemonTCGDigitalContent(props: PokemonTCGDigitalContentProps) {
  const { onOpenPhysicalCard } = props;

  // ── App state ──────────────────────────────────────────────────────
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PokemonTCGDigitalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [refreshingPool, setRefreshingPool] = useState(false);
  const [autoNextEnabled, setAutoNextEnabled] = useState(false);
  const [showAllPullsModal, setShowAllPullsModal] = useState(false);
  const [uniqueCardsMode, setUniqueCardsMode] = useState<null | "menu" | "dupes" | "rarest">(null);

  // ── Reveal state ───────────────────────────────────────────────────
  const [revealCards, setRevealCards] = useState<PokemonTCGDigitalRevealCard[] | null>(null);
  const [revealPack, setRevealPack] = useState<PokemonTCGDigitalPack | null>(null);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>("sealed");
  const [revealIndex, setRevealIndex] = useState(0);
  const [packFrameIndex, setPackFrameIndex] = useState(0);
  const [isCurrentCardFlipped, setIsCurrentCardFlipped] = useState(false);

  const syncDigitalInventory = usePokemonTCGCollectionStore((state) => state.syncDigitalInventory);

  // ── Animation values ───────────────────────────────────────────────
  // Group A: pack drag (sealed phase)
  const packX     = useRef(new Animated.Value(0)).current;
  const packY     = useRef(new Animated.Value(0)).current;
  const packTilt  = useRef(new Animated.Value(0)).current; // raw tilt, -1 → 0 → 1
  const packScale = useRef(new Animated.Value(1)).current;
  const packGlow  = useRef(new Animated.Value(0)).current; // 0–1

  // Group B: rip overlay (ripping phase)
  const tearOpacity = useRef(new Animated.Value(0)).current;
  const tearX       = useRef(new Animated.Value(0)).current;
  const tearY       = useRef(new Animated.Value(0)).current;
  const fragOpacity = useRef(new Animated.Value(0)).current;
  const fragY       = useRef(new Animated.Value(0)).current;

  // Group C: card back rising (starts during rip, becomes the card back in reveal)
  const riseOpacity = useRef(new Animated.Value(0)).current;
  const riseY       = useRef(new Animated.Value(64)).current;
  const riseScale   = useRef(new Animated.Value(0.86)).current;

  // Group D: card reveal
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(56)).current;
  const cardScale   = useRef(new Animated.Value(0.9)).current;
  const flipProg    = useRef(new Animated.Value(0)).current; // 0 = back, 1 = front
  const cardGlow    = useRef(new Animated.Value(0)).current; // glow after flip for rares

  // Group E: summary
  const summaryOpacity = useRef(new Animated.Value(0)).current;

  // ── Timer buckets ──────────────────────────────────────────────────
  const ripTimers  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearRipTimers = useCallback(() => {
    for (const t of ripTimers.current) clearTimeout(t);
    ripTimers.current = [];
  }, []);

  const clearAutoTimers = useCallback(() => {
    for (const t of autoTimers.current) clearTimeout(t);
    autoTimers.current = [];
  }, []);

  // ── Phase ref (avoids stale closure in PanResponder) ───────────────
  const revealPhaseRef = useRef<RevealPhase>("sealed");
  useEffect(() => { revealPhaseRef.current = revealPhase; }, [revealPhase]);

  // ── Derived ────────────────────────────────────────────────────────
  const currentRevealCard = useMemo(
    () => (revealCards?.length ? revealCards[Math.min(revealIndex, revealCards.length - 1)] : null),
    [revealCards, revealIndex]
  );
  const currentRevealTheme = useMemo(() => getDigitalRevealTheme(currentRevealCard), [currentRevealCard]);
  const hasNextRevealCard = useMemo(
    () => Boolean(revealCards?.length && revealIndex < revealCards.length - 1),
    [revealCards, revealIndex]
  );

  // ── Interpolations ─────────────────────────────────────────────────
  const packRotate = packTilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-18deg", "0deg", "18deg"],
  });

  // Android-safe flip: opacity crossfade at the midpoint + rotateY on each face
  const backFaceOpacity  = flipProg.interpolate({ inputRange: [0, 0.45, 0.5], outputRange: [1, 1, 0] });
  const frontFaceOpacity = flipProg.interpolate({ inputRange: [0.5, 0.55, 1], outputRange: [0, 1, 1] });
  const backRotateY      = flipProg.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const frontRotateY     = flipProg.interpolate({ inputRange: [0, 1], outputRange: ["-180deg", "0deg"] });
  const flipMidScale     = flipProg.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.88, 1] });

  // ── Reset ──────────────────────────────────────────────────────────
  const resetRevealState = useCallback(() => {
    clearRipTimers();
    clearAutoTimers();

    // Stop any in-flight animations
    [packX, packY, packTilt, packScale, packGlow].forEach((v) => v.stopAnimation());
    [tearOpacity, tearX, tearY, fragOpacity, fragY].forEach((v) => v.stopAnimation());
    [riseOpacity, riseY, riseScale].forEach((v) => v.stopAnimation());
    [cardOpacity, cardY, cardScale, flipProg, cardGlow, summaryOpacity].forEach((v) => v.stopAnimation());

    // Restore defaults
    packX.setValue(0);       packY.setValue(0);
    packTilt.setValue(0);    packScale.setValue(1);   packGlow.setValue(0);
    tearOpacity.setValue(0); tearX.setValue(0);       tearY.setValue(0);
    fragOpacity.setValue(0); fragY.setValue(0);
    riseOpacity.setValue(0); riseY.setValue(64);      riseScale.setValue(0.86);
    cardOpacity.setValue(0); cardY.setValue(56);      cardScale.setValue(0.9);
    flipProg.setValue(0);    cardGlow.setValue(0);    summaryOpacity.setValue(0);

    setRevealCards(null);
    setRevealPack(null);
    setRevealPhase("sealed");
    setRevealIndex(0);
    setPackFrameIndex(0);
    setIsCurrentCardFlipped(false);
  }, [
    clearRipTimers, clearAutoTimers,
    packX, packY, packTilt, packScale, packGlow,
    tearOpacity, tearX, tearY, fragOpacity, fragY,
    riseOpacity, riseY, riseScale,
    cardOpacity, cardY, cardScale, flipProg, cardGlow, summaryOpacity,
  ]);

  // ── animateCardIn ──────────────────────────────────────────────────
  const animateCardIn = useCallback(() => {
    setIsCurrentCardFlipped(false);
    flipProg.setValue(0);
    cardGlow.setValue(0);
    cardOpacity.setValue(0);
    cardY.setValue(56);
    cardScale.setValue(0.88);

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardY, {
        toValue: 0,
        speed: 22,
        bounciness: 5,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        speed: 22,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardY, cardScale, flipProg, cardGlow]);

  // ── beginReveal ────────────────────────────────────────────────────
  // Ref so PanResponder can call the latest version without recreating itself
  const beginRevealRef = useRef<() => void>(() => {});

  const beginReveal = useCallback(() => {
    if (revealPhaseRef.current !== "sealed") return;
    clearRipTimers();

    setRevealPhase("ripping");
    setPackFrameIndex(0);

    // Reset rip values to start positions
    tearOpacity.setValue(0);   tearX.setValue(0);    tearY.setValue(0);
    fragOpacity.setValue(0);   fragY.setValue(0);
    riseOpacity.setValue(0);   riseY.setValue(64);   riseScale.setValue(0.86);

    // ── Squeeze + shake (run alongside frame animation) ──────────────
    Animated.parallel([
      // Squeeze: scale up → compress → spring back
      Animated.sequence([
        Animated.timing(packScale, {
          toValue: 1.09,
          duration: 50,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(packScale, {
          toValue: 0.93,
          duration: 70,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(packScale, {
          toValue: 1,
          speed: 22,
          bounciness: 10,
          useNativeDriver: true,
        }),
      ]),
      // 5-hit shake
      Animated.sequence([
        Animated.timing(packX, { toValue: -15, duration: 35, useNativeDriver: true }),
        Animated.timing(packX, { toValue: 15,  duration: 35, useNativeDriver: true }),
        Animated.timing(packX, { toValue: -11, duration: 30, useNativeDriver: true }),
        Animated.timing(packX, { toValue: 11,  duration: 30, useNativeDriver: true }),
        Animated.timing(packX, { toValue: -6,  duration: 24, useNativeDriver: true }),
        Animated.timing(packX, { toValue: 0,   duration: 20, useNativeDriver: true }),
      ]),
    ]).start();

    // ── Frame updates ────────────────────────────────────────────────
    RIP_FRAMES.forEach((_, i) => {
      ripTimers.current.push(
        setTimeout(() => setPackFrameIndex(i + 1), RIP_CUMULATIVE[i]!)
      );
    });

    // ── Tear strip at frame 3 (~105ms) ───────────────────────────────
    ripTimers.current.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(tearOpacity, { toValue: 1, duration: 30, useNativeDriver: true }),
          Animated.timing(tearX, {
            toValue: 64,
            duration: 210,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(tearY, {
            toValue: -46,
            duration: 210,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, RIP_CUMULATIVE[2]!)
    );
    // Fade tear strip out
    ripTimers.current.push(
      setTimeout(
        () => Animated.timing(tearOpacity, { toValue: 0, duration: 130, useNativeDriver: true }).start(),
        RIP_CUMULATIVE[2]! + 200
      )
    );

    // ── Fragments burst at frame 7 (~241ms) ──────────────────────────
    ripTimers.current.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fragOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(fragY, {
            toValue: -22,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          Animated.timing(fragOpacity, { toValue: 0, duration: 160, useNativeDriver: true }).start();
        });
      }, RIP_CUMULATIVE[6]!)
    );

    // ── Card back rises at frame 8 (~275ms) ──────────────────────────
    ripTimers.current.push(
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(riseOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.spring(riseY, { toValue: 0, speed: 18, bounciness: 3, useNativeDriver: true }),
          Animated.spring(riseScale, { toValue: 1, speed: 18, bounciness: 3, useNativeDriver: true }),
        ]).start();
      }, RIP_CUMULATIVE[7]!)
    );

    // ── Transition to revealing at total + 80ms ───────────────────────
    ripTimers.current.push(
      setTimeout(() => {
        setRevealPhase("revealing");
        animateCardIn();
      }, RIP_TOTAL + 80)
    );
  }, [
    clearRipTimers,
    animateCardIn,
    packScale, packX,
    tearOpacity, tearX, tearY,
    fragOpacity, fragY,
    riseOpacity, riseY, riseScale,
  ]);

  // Keep the ref current
  useEffect(() => { beginRevealRef.current = beginReveal; }, [beginReveal]);

  // ── flipCurrentCard ────────────────────────────────────────────────
  const flipCurrentCard = useCallback(() => {
    if (!currentRevealCard || isCurrentCardFlipped) return;
    setIsCurrentCardFlipped(true);

    Animated.timing(flipProg, {
      toValue: 1,
      duration: 310,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // Glow pulse for rare+ pulls
      if (isRareCard(currentRevealCard.rarity)) {
        Animated.sequence([
          Animated.timing(cardGlow, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(cardGlow, {
            toValue: 0.55,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [currentRevealCard, isCurrentCardFlipped, flipProg, cardGlow]);

  // ── advanceReveal ──────────────────────────────────────────────────
  const advanceReveal = useCallback(() => {
    if (!revealCards?.length || !isCurrentCardFlipped) return;

    if (revealIndex >= revealCards.length - 1) {
      // Last card — go to summary
      setRevealPhase("summary");
      cardOpacity.setValue(0);
      Animated.timing(summaryOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    // Exit current card upward
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardY, {
        toValue: -28,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.93,
        duration: 100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRevealIndex((c) => c + 1);
      animateCardIn();
    });
  }, [animateCardIn, cardOpacity, cardY, cardScale, isCurrentCardFlipped, revealCards, revealIndex, summaryOpacity]);

  // ── Auto-next ──────────────────────────────────────────────────────
  const toggleAutoNext = useCallback(async () => {
    const next = !autoNextEnabled;
    setAutoNextEnabled(next);
    await SecureStore.setItemAsync(AUTO_NEXT_KEY, next ? "1" : "0");
  }, [autoNextEnabled]);

  // Refs so the effect always has the latest callbacks without re-running
  const flipRef    = useRef(flipCurrentCard);
  const advanceRef = useRef(advanceReveal);
  useEffect(() => { flipRef.current    = flipCurrentCard; }, [flipCurrentCard]);
  useEffect(() => { advanceRef.current = advanceReveal;   }, [advanceReveal]);

  useEffect(() => {
    clearAutoTimers();
    if (!autoNextEnabled || revealPhase !== "revealing" || !currentRevealCard) return;

    if (!isCurrentCardFlipped) {
      autoTimers.current.push(setTimeout(() => flipRef.current(), 750));
    } else {
      autoTimers.current.push(
        setTimeout(() => advanceRef.current(), hasNextRevealCard ? 1300 : 1600)
      );
    }
  }, [autoNextEnabled, clearAutoTimers, currentRevealCard, hasNextRevealCard, isCurrentCardFlipped, revealPhase]);

  // ── PanResponder (sealed phase drag) ──────────────────────────────
  const sealedPackPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          revealPhaseRef.current === "sealed" &&
          (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6),

        onPanResponderMove: (_, g) => {
          if (revealPhaseRef.current !== "sealed") return;
          const cx = Math.max(-72, Math.min(72, g.dx));
          const cy = Math.max(-130, Math.min(36, g.dy));
          packX.setValue(cx);
          packY.setValue(cy);
          packTilt.setValue(cx / 72);
          const dist = Math.min(1, (Math.abs(cx) + Math.abs(Math.min(cy, 0))) / 140);
          packGlow.setValue(0.12 + dist * 0.48);
          packScale.setValue(1 + dist * 0.07);
        },

        onPanResponderRelease: (_, g) => {
          if (revealPhaseRef.current !== "sealed") return;

          // Trigger rip on a strong swipe
          if (Math.abs(g.dx) > 68 || g.dy < -68 || Math.abs(g.vx) > 1.2 || g.vy < -1.2) {
            beginRevealRef.current();
            return;
          }

          // Spring back
          Animated.parallel([
            Animated.spring(packX,     { toValue: 0, speed: 20, bounciness: 8, useNativeDriver: true }),
            Animated.spring(packY,     { toValue: 0, speed: 20, bounciness: 8, useNativeDriver: true }),
            Animated.spring(packTilt,  { toValue: 0, speed: 20, bounciness: 8, useNativeDriver: true }),
            Animated.spring(packScale, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: true }),
            Animated.timing(packGlow,  { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]).start();
        },
      }),
    // Intentionally empty — we use refs for everything inside
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Profile / pack loading ─────────────────────────────────────────
  const loadProfile = useCallback(async (options?: { refreshPool?: boolean }) => {
    try {
      if (options?.refreshPool) {
        setRefreshingPool(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const resolved = deviceId ?? (await getPokemonTCGDigitalDeviceId());
      if (!deviceId) setDeviceId(resolved);
      const next = await fetchPokemonTCGDigitalProfile(resolved, options);
      setProfile(next);
      syncDigitalInventory(next.inventory);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load digital packs.");
    } finally {
      setLoading(false);
      setRefreshingPool(false);
    }
  }, [deviceId, syncDigitalInventory]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  const openPack = useCallback(async (pack: PokemonTCGDigitalPack) => {
    try {
      const resolved = deviceId ?? (await getPokemonTCGDigitalDeviceId());
      if (!deviceId) setDeviceId(resolved);

      setOpeningPackId(pack.id);
      setError(null);

      const result = await openPokemonTCGDigitalPack(resolved, pack.id);
      setProfile(result.profile);
      syncDigitalInventory(result.profile.inventory);

      // Reset all animation values then open reveal
      clearRipTimers();
      clearAutoTimers();
      packX.setValue(0);       packY.setValue(0);       packTilt.setValue(0);
      packScale.setValue(1);   packGlow.setValue(0);
      tearOpacity.setValue(0); tearX.setValue(0);       tearY.setValue(0);
      fragOpacity.setValue(0); fragY.setValue(0);
      riseOpacity.setValue(0); riseY.setValue(64);      riseScale.setValue(0.86);
      cardOpacity.setValue(0); cardY.setValue(56);      cardScale.setValue(0.9);
      flipProg.setValue(0);    cardGlow.setValue(0);    summaryOpacity.setValue(0);

      setRevealPack(pack);
      setRevealCards(result.reveal);
      setRevealPhase("sealed");
      setRevealIndex(0);
      setPackFrameIndex(0);
      setIsCurrentCardFlipped(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open digital pack.");
    } finally {
      setOpeningPackId(null);
    }
  }, [
    deviceId, syncDigitalInventory, clearRipTimers, clearAutoTimers,
    packX, packY, packTilt, packScale, packGlow,
    tearOpacity, tearX, tearY, fragOpacity, fragY,
    riseOpacity, riseY, riseScale,
    cardOpacity, cardY, cardScale, flipProg, cardGlow, summaryOpacity,
  ]);

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => () => { clearRipTimers(); clearAutoTimers(); }, [clearRipTimers, clearAutoTimers]);

  // ── Load auto-next preference ──────────────────────────────────────
  useEffect(() => {
    let alive = true;
    void SecureStore.getItemAsync(AUTO_NEXT_KEY).then((v) => {
      if (alive) setAutoNextEnabled(v === "1");
    });
    return () => { alive = false; };
  }, []);

  // ── Collection stats ───────────────────────────────────────────────
  const digitalSummary = useMemo(() => {
    const inv = profile?.inventory ?? {};
    const uniqueCards = Object.keys(inv).filter((k) => Number(inv[k] ?? 0) > 0).length;
    const totalCards = Object.values(inv).reduce((s, c) => s + Math.max(0, Number(c || 0)), 0);
    return { uniqueCards, totalCards };
  }, [profile]);

  const packProgress = useMemo(() => getPackProgress(profile), [profile]);

  const allHistoryCards = useMemo(() => {
    const seen = new Set<string>();
    const cards: (PokemonTCGDigitalRevealCard & { count: number })[] = [];
    for (const entry of profile?.history ?? []) {
      for (const card of entry.cards) {
        if (!seen.has(card.id)) {
          seen.add(card.id);
          cards.push({ ...card, count: Number(profile?.inventory?.[card.id.toLowerCase()] ?? 0) });
        }
      }
    }
    return cards;
  }, [profile]);

  const dupeCards = useMemo(
    () => allHistoryCards.filter((c) => c.count > 1).sort((a, b) => b.count - a.count),
    [allHistoryCards]
  );

  const rarestCards = useMemo(() => {
    const rank = (r: string | null) => {
      const s = String(r ?? "").toLowerCase();
      if (/secret|hyper|illustration|special illustration|ultra|rainbow|ace spec|double rare/.test(s)) return 4;
      if (/rare|holo|amazing|radiant|promo/.test(s)) return 3;
      if (/uncommon/.test(s)) return 2;
      return 1;
    };
    return [...allHistoryCards].sort((a, b) => rank(b.rarity) - rank(a.rarity));
  }, [allHistoryCards]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 34 }}
    >
      {/* ── Stats card ─────────────────────────────────────────────── */}
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
          <Pressable className="w-1/2 px-1 mb-2" onPress={() => setUniqueCardsMode("menu")}>
            <View className="rounded-2xl border border-amber-400/30 bg-slate-900 px-3 py-3 items-center">
              <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Unique Cards</Text>
              <Text className="mt-1 text-[18px] font-semibold text-slate-100">{digitalSummary.uniqueCards}</Text>
            </View>
          </Pressable>
          <Pressable className="w-1/2 px-1 mb-2" onPress={() => setShowAllPullsModal(true)}>
            <View className="rounded-2xl border border-emerald-400/30 bg-slate-900 px-3 py-3 items-center">
              <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total Pulls</Text>
              <Text className="mt-1 text-[18px] font-semibold text-slate-100">{digitalSummary.totalCards}</Text>
            </View>
          </Pressable>
        </View>

        <View className="mt-2">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Daily Pack Usage</Text>
            <Text className="text-[11px] font-semibold text-slate-200">
              {profile ? `${profile.openedToday}/${profile.dailyLimit}` : "—"}
            </Text>
          </View>
          <View className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <View style={{ width: `${packProgress}%`, height: "100%", backgroundColor: "#d946ef" }} />
          </View>
          <Text className="mt-2 text-[10px] text-slate-500">
            {profile ? formatResetLabel(profile.nextResetAt) : "Loading reset window…"}
          </Text>
        </View>
      </View>

      {/* ── Pack list header ────────────────────────────────────────── */}
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
            <Text className="text-[10px] font-semibold text-slate-200">
              {refreshingPool ? "Refreshing…" : "Refresh"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Pack list ───────────────────────────────────────────────── */}
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

                <View className="mt-3 rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden px-3 py-4">
                  <View className="flex-row items-center justify-center">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <ExpoImage
                        key={index}
                        source={AppImages.cardBack}
                        contentFit="cover"
                        transition={120}
                        style={{
                          width: 54, height: 76, borderRadius: 10,
                          marginLeft: index === 0 ? 0 : -18,
                          transform: [{ rotate: `${(index - 2) * 5}deg` }, { translateY: Math.abs(index - 2) * 4 }],
                          borderWidth: 1,
                          borderColor: "rgba(148,163,184,0.35)",
                          backgroundColor: "rgba(15,23,42,0.9)",
                        }}
                      />
                    ))}
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

      {/* ── Recent pulls ────────────────────────────────────────────── */}
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
                  <Text className="mt-0.5 text-[11px] text-slate-500">{new Date(entry.openedAt).toLocaleString()}</Text>
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
                    <Text numberOfLines={2} className="mt-2 text-[10px] font-semibold text-slate-100 text-center min-h-[26px]">{card.name}</Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[9px] text-slate-500 text-center">{card.rarity || card.supertype}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Total Pulls modal ────────────────────────────────────────── */}
      <BottomSheetModal
        visible={showAllPullsModal}
        onRequestClose={() => setShowAllPullsModal(false)}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 pr-3">
            <Text className="text-slate-50 text-[16px] font-semibold">All Pulls</Text>
            <Text className="text-slate-400 text-[12px] mt-0.5">{digitalSummary.totalCards} cards pulled from your recent opens</Text>
          </View>
          <Pressable onPress={() => setShowAllPullsModal(false)} className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
            <Ionicons name="close" size={20} color="white" />
          </Pressable>
        </View>
        {allHistoryCards.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-slate-400 text-sm">No pulls yet. Open some packs!</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="flex-row flex-wrap -mx-1">
              {allHistoryCards.map((card) => (
                <View key={card.id} className="w-1/3 px-1 mb-2">
                  <Pressable
                    onPress={() => { setShowAllPullsModal(false); onOpenPhysicalCard?.(card.id); }}
                    className="rounded-2xl border border-slate-800 bg-slate-900 px-2 py-2 items-center"
                  >
                    <ExpoImage source={{ uri: card.images.small }} style={{ width: 72, height: 100 }} contentFit="contain" transition={120} />
                    <Text numberOfLines={2} className="mt-1.5 text-[9px] font-semibold text-slate-100 text-center min-h-[22px]">{card.name}</Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[9px] text-slate-500 text-center">{card.rarity || card.supertype}</Text>
                    {card.count > 1 ? (
                      <View className="mt-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 px-2 py-0.5">
                        <Text className="text-[9px] font-semibold text-fuchsia-200">×{card.count}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </BottomSheetModal>

      {/* ── Unique Cards modal ───────────────────────────────────────── */}
      <BottomSheetModal
        visible={uniqueCardsMode !== null}
        onRequestClose={() => setUniqueCardsMode(null)}
        sheetStyle={{ maxHeight: "92%", minHeight: 420, paddingBottom: 10 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 pr-3">
            <Text className="text-slate-50 text-[16px] font-semibold">
              {uniqueCardsMode === "menu" ? "Unique Cards" : uniqueCardsMode === "dupes" ? "Duplicates" : "Rarest Cards"}
            </Text>
            <Text className="text-slate-400 text-[12px] mt-0.5">
              {uniqueCardsMode === "menu"
                ? "What would you like to see?"
                : uniqueCardsMode === "dupes"
                  ? `${dupeCards.length} cards with more than one copy`
                  : `${rarestCards.length} unique cards sorted by rarity`}
            </Text>
          </View>
          <Pressable onPress={() => setUniqueCardsMode(null)} className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
            <Ionicons name="close" size={20} color="white" />
          </Pressable>
        </View>
        {uniqueCardsMode === "menu" ? (
          <View className="gap-3">
            <Pressable onPress={() => setUniqueCardsMode("dupes")} className="flex-row items-center rounded-3xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-4">
              <View className="w-10 h-10 rounded-full bg-fuchsia-500/20 items-center justify-center mr-3">
                <Ionicons name="copy-outline" size={18} color="#e879f9" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-slate-50">Duplicates</Text>
                <Text className="mt-0.5 text-[12px] text-slate-400">Cards you have more than one copy of</Text>
              </View>
              <View className="rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 px-2.5 py-1">
                <Text className="text-[11px] font-semibold text-fuchsia-200">{dupeCards.length}</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => setUniqueCardsMode("rarest")} className="flex-row items-center rounded-3xl border border-amber-400/25 bg-amber-500/10 px-4 py-4">
              <View className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center mr-3">
                <Ionicons name="star-outline" size={18} color="#fbbf24" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-slate-50">Rarest Cards</Text>
                <Text className="mt-0.5 text-[12px] text-slate-400">Your collection sorted by rarity tier</Text>
              </View>
              <View className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2.5 py-1">
                <Text className="text-[11px] font-semibold text-amber-200">{rarestCards.length}</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {uniqueCardsMode === "dupes" && dupeCards.length === 0 ? (
              <View className="items-center py-10">
                <Text className="text-slate-400 text-sm text-center">No duplicates yet.</Text>
              </View>
            ) : null}
            <View className="flex-row flex-wrap -mx-1">
              {(uniqueCardsMode === "dupes" ? dupeCards : rarestCards).map((card) => (
                <View key={card.id} className="w-1/3 px-1 mb-2">
                  <Pressable
                    onPress={() => { setUniqueCardsMode(null); onOpenPhysicalCard?.(card.id); }}
                    className="rounded-2xl border border-slate-800 bg-slate-900 px-2 py-2 items-center"
                  >
                    <ExpoImage source={{ uri: card.images.small }} style={{ width: 72, height: 100 }} contentFit="contain" transition={120} />
                    <Text numberOfLines={2} className="mt-1.5 text-[9px] font-semibold text-slate-100 text-center min-h-[22px]">{card.name}</Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[9px] text-slate-500 text-center">{card.rarity || card.supertype}</Text>
                    {card.count > 1 ? (
                      <View className="mt-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30 px-2 py-0.5">
                        <Text className="text-[9px] font-semibold text-fuchsia-200">×{card.count}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </BottomSheetModal>

      {/* ── Pack reveal modal ────────────────────────────────────────── */}
      <BottomSheetModal
        visible={!!revealCards?.length}
        onRequestClose={resetRevealState}
        sheetStyle={{ maxHeight: "96%", minHeight: 520, paddingBottom: 0 }}
      >
        {revealCards?.length ? (
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
              <View className="flex-1 pr-3">
                <Text className="text-slate-50 text-[16px] font-semibold" numberOfLines={1}>
                  {revealPack?.name ?? "Pack Opening"}
                </Text>
                <Text className="text-slate-400 text-[11px] mt-0.5">
                  {revealPhase === "sealed"   ? "Swipe or tap to crack the pack open" :
                   revealPhase === "ripping"  ? "Opening…" :
                   revealPhase === "revealing" ? `Card ${Math.min(revealIndex + 1, revealCards.length)} of ${revealCards.length}` :
                                                "Pack complete — all cards added to binder"}
                </Text>
              </View>
              <Pressable
                onPress={resetRevealState}
                className="h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>

            {/* ── SEALED ──────────────────────────────────────────────── */}
            {revealPhase === "sealed" && revealPack ? (
              <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {/* Pack logo */}
                <View className="items-center mt-1 mb-2">
                  <ExpoImage
                    source={{ uri: revealPack.images.logo }}
                    style={{ width: 220, height: 52 }}
                    contentFit="contain"
                    transition={120}
                  />
                </View>

                {/* Draggable pack */}
                <View className="items-center" style={{ height: 340 }}>
                  {/* Ambient glow behind pack */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      top: 40,
                      width: 240,
                      height: 240,
                      borderRadius: 120,
                      backgroundColor: "#a855f7",
                      opacity: packGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
                      transform: [{ scale: packGlow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }],
                    }}
                  />

                  {/* The pack itself */}
                  <Animated.View
                    {...sealedPackPanResponder.panHandlers}
                    style={{
                      alignItems: "center",
                      transform: [
                        { translateX: packX },
                        { translateY: packY },
                        { rotate: packRotate },
                        { scale: packScale },
                      ],
                    }}
                  >
                    <ExpoImage
                      source={PACK_FRAME_SOURCES[0]}
                      style={{ width: 180, height: 316 }}
                      contentFit="contain"
                      transition={0}
                    />
                  </Animated.View>
                </View>

                {/* Slot odds */}
                <View className="flex-row flex-wrap justify-center mt-2">
                  {revealPack.slotOdds.map((slot, i) => (
                    <View key={`${revealPack.id}-${i}`} className="mr-2 mb-2 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1">
                      <Text className="text-[10px] font-semibold text-slate-200">
                        Slot {i + 1}: {slot.tier}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Open button */}
                <Pressable
                  onPress={beginReveal}
                  className="mt-4 mx-2 rounded-2xl border border-fuchsia-400/40 py-4 items-center"
                  style={{ backgroundColor: "rgba(217,70,239,0.14)" }}
                >
                  <Text className="text-[14px] font-bold text-fuchsia-100 tracking-wide">Open Pack</Text>
                </Pressable>
              </ScrollView>
            ) : null}

            {/* ── RIPPING ─────────────────────────────────────────────── */}
            {revealPhase === "ripping" ? (
              <View className="flex-1 items-center justify-center" style={{ minHeight: 400 }}>
                {/* Rip glow */}
                <Animated.View
                  style={{
                    position: "absolute",
                    width: 300,
                    height: 300,
                    borderRadius: 150,
                    backgroundColor: currentRevealTheme.glowTint,
                    opacity: riseOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
                    transform: [{ scale: riseOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }],
                  }}
                />

                {/* Fragments burst */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 80,
                    opacity: fragOpacity,
                    transform: [{ translateY: fragY }],
                  }}
                >
                  <ExpoImage
                    source={FRAGMENTS_SOURCE}
                    style={{ width: 190, height: 100 }}
                    contentFit="contain"
                    transition={0}
                  />
                </Animated.View>

                {/* Tear strip */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 60,
                    opacity: tearOpacity,
                    transform: [
                      { translateX: tearX },
                      { translateY: tearY },
                      { rotate: "14deg" },
                    ],
                  }}
                >
                  <ExpoImage
                    source={TEAR_STRIP_SOURCE}
                    style={{ width: 182, height: 54 }}
                    contentFit="contain"
                    transition={0}
                  />
                </Animated.View>

                {/* Card back rising */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 110,
                    opacity: riseOpacity,
                    transform: [{ translateY: riseY }, { scale: riseScale }],
                  }}
                >
                  <ExpoImage
                    source={currentRevealTheme.backSource}
                    style={{ width: 152, height: 212 }}
                    contentFit="contain"
                    transition={0}
                  />
                </Animated.View>

                {/* Animated pack frame */}
                <ExpoImage
                  source={PACK_FRAME_SOURCES[Math.min(packFrameIndex, PACK_FRAME_SOURCES.length - 1)]}
                  style={{ width: 198, height: 330 }}
                  contentFit="contain"
                  transition={0}
                />
              </View>
            ) : null}

            {/* ── REVEALING ───────────────────────────────────────────── */}
            {revealPhase === "revealing" && currentRevealCard ? (
              <Animated.View
                style={{ flex: 1, opacity: cardOpacity, transform: [{ translateY: cardY }, { scale: cardScale }] }}
              >
                <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                  {/* Glow behind card (rare only, fades in after flip) */}
                  <View className="items-center" style={{ marginTop: 8 }}>
                    <Animated.View
                      style={{
                        position: "absolute",
                        top: 20,
                        width: 280,
                        height: 280,
                        borderRadius: 140,
                        backgroundColor: currentRevealTheme.glowTint,
                        opacity: cardGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
                        transform: [{ scale: cardGlow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.1] }) }],
                      }}
                    />

                    {/* Remaining-cards stack hint */}
                    {hasNextRevealCard ? (
                      <View
                        style={{
                          position: "absolute",
                          top: 10,
                          opacity: 0.5,
                          transform: [{ scale: 0.9 }, { translateY: 12 }],
                        }}
                      >
                        <ExpoImage
                          source={currentRevealTheme.backSource}
                          style={{ width: 240, height: 336 }}
                          contentFit="contain"
                          transition={0}
                        />
                      </View>
                    ) : null}

                    {/* Flip card */}
                    <Pressable
                      onPress={flipCurrentCard}
                      disabled={isCurrentCardFlipped}
                      style={{ width: 240, height: 336 }}
                    >
                      {/* Back face */}
                      <Animated.View
                        style={{
                          position: "absolute",
                          width: 240,
                          height: 336,
                          opacity: backFaceOpacity,
                          transform: [
                            { perspective: 1000 },
                            { rotateY: backRotateY },
                            { scale: flipMidScale },
                          ],
                        }}
                      >
                        <ExpoImage
                          source={currentRevealTheme.backSource}
                          style={{ width: 240, height: 336 }}
                          contentFit="contain"
                          transition={0}
                        />
                      </Animated.View>

                      {/* Front face */}
                      <Animated.View
                        style={{
                          position: "absolute",
                          width: 240,
                          height: 336,
                          borderRadius: 12,
                          overflow: "hidden",
                          opacity: frontFaceOpacity,
                          transform: [
                            { perspective: 1000 },
                            { rotateY: frontRotateY },
                            { scale: flipMidScale },
                          ],
                        }}
                      >
                        <ExpoImage
                          source={{ uri: currentRevealCard.images.large }}
                          style={{ width: 240, height: 336 }}
                          contentFit="contain"
                          transition={80}
                        />
                      </Animated.View>
                    </Pressable>
                  </View>

                  {/* Card info */}
                  {isCurrentCardFlipped ? (
                    <>
                      <Text className="mt-4 text-[15px] font-bold text-slate-100 text-center">
                        {currentRevealCard.name}
                      </Text>
                      <Text className="mt-1 text-[11px] text-slate-400 text-center">
                        {currentRevealCard.set.name} • #{currentRevealCard.number}
                      </Text>
                      <Text className="mt-0.5 text-[11px] font-semibold text-center" style={{ color: currentRevealTheme.glowTint }}>
                        {currentRevealCard.rarity || currentRevealCard.supertype}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="mt-4 text-[14px] font-semibold text-slate-100 text-center">
                        {currentRevealTheme.label}
                      </Text>
                      <Text className="mt-1 text-[11px] text-slate-400 text-center">
                        {autoNextEnabled
                          ? "Auto Next is on — this card will flip and advance automatically."
                          : "Tap the card to reveal your pull."}
                      </Text>
                    </>
                  )}

                  <View className="mt-3 flex-row items-center justify-center">
                    <View className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5">
                      <Text className="text-[10px] font-semibold text-emerald-100">Added to Digital Binder</Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View className="mt-4 flex-row">
                    {onOpenPhysicalCard ? (
                      <Pressable
                        onPress={() => { resetRevealState(); onOpenPhysicalCard(currentRevealCard.id); }}
                        className="flex-1 mr-2 rounded-2xl border border-slate-700 bg-slate-900 py-3.5 items-center"
                      >
                        <Text className="text-[11px] font-semibold text-slate-100">View Card</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={advanceReveal}
                      disabled={!isCurrentCardFlipped}
                      className={`${onOpenPhysicalCard ? "flex-1 ml-2" : "w-full"} rounded-2xl border border-fuchsia-400/35 py-3.5 items-center`}
                      style={{
                        opacity: isCurrentCardFlipped ? 1 : 0.38,
                        backgroundColor: "rgba(217,70,239,0.14)",
                      }}
                    >
                      <Text className="text-[12px] font-bold text-fuchsia-100">
                        {revealIndex >= revealCards.length - 1 ? "Finish Pack" : "Next Card →"}
                      </Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </Animated.View>
            ) : null}

            {/* ── SUMMARY ──────────────────────────────────────────────── */}
            {revealPhase === "summary" ? (
              <Animated.View style={{ flex: 1, opacity: summaryOpacity }}>
                <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
                  <Text className="text-[15px] font-bold text-slate-50 mt-1 mb-1">Pack Complete 🎉</Text>
                  <Text className="text-[12px] leading-5 text-slate-400 mb-4">
                    Your pulls are saved to the digital binder. Tap any card to open its detail sheet.
                  </Text>

                  <View className="flex-row flex-wrap -mx-1">
                    {revealCards.map((card) => (
                      <View key={card.id} className="w-1/2 px-1 mb-2">
                        <Pressable
                          onPress={() => { resetRevealState(); onOpenPhysicalCard?.(card.id); }}
                          className="rounded-2xl border border-slate-800 bg-slate-900 px-2 py-2"
                        >
                          <ExpoImage
                            source={{ uri: card.images.small }}
                            style={{ width: 92, height: 128, alignSelf: "center" }}
                            contentFit="contain"
                            transition={120}
                          />
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
                    className="mt-3 rounded-2xl border border-slate-700 bg-slate-900 py-3.5 items-center"
                  >
                    <Text className="text-[12px] font-semibold text-slate-100">Close Pack</Text>
                  </Pressable>
                </ScrollView>
              </Animated.View>
            ) : null}
          </View>
        ) : null}
      </BottomSheetModal>
    </ScrollView>
  );
}
