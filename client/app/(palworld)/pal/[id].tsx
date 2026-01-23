import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PageWrapper from "@/components/PageWrapper";
import { fetchPalDetail, type PalDetail } from "@/lib/palworld/pal/paldbDetails";
import { usePalworldCollectionStore } from "@/store/palworldCollectionStore";
import PalDetailHeaderSection from "@/components/Palworld/PalDetailHeaderSection";
import PalworldTypeMatchups from "@/components/Palworld/PalworldDetails/PalTypeMatchups";
import PalOverviewSection from "@/components/Palworld/PalworldDetails/PalOverviewSection";
import PalActiveSkillsSection from "@/components/Palworld/PalworldDetails/PalActiveSkillsSection";
import { elementHex, normalizeElementKey } from "@/lib/palworld/palworldDB";
import PalOthersSection from "@/components/Palworld/PalworldDetails/PalOthersSection";
import PalTribesSection from "@/components/Palworld/PalworldDetails/PalTribesSection";
import PalSpawnerSection from "@/components/Palworld/PalworldDetails/PalSpawnerSection";
import PalUniqueComboSection from "@/components/Palworld/PalworldDetails/PalUniqueComboSection";

function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function elementAccentColor(el?: string | null) {
  return elementHex(el);
}

const PALWORLD_MATCHUPS: Record<string, { weakTo: string[]; strongVs: string[] }> = {
  fire: { strongVs: ["grass", "ice"], weakTo: ["water"] },
  grass: { strongVs: ["ground"], weakTo: ["fire"] },
  ground: { strongVs: ["electric"], weakTo: ["grass"] },
  electric: { strongVs: ["water"], weakTo: ["ground"] },
  water: { strongVs: ["fire"], weakTo: ["electric"] },
  ice: { strongVs: ["dragon"], weakTo: ["fire"] },
  dragon: { strongVs: ["dark"], weakTo: ["ice"] },
  dark: { strongVs: ["neutral"], weakTo: ["dragon"] },
  neutral: { strongVs: [], weakTo: ["dark"] },
};

function dedupStrings(arr: string[]) {
  return Array.from(new Set(arr));
}

function computePalworldMatchups(elements: string[]) {
  const keys = dedupStrings((elements ?? []).map(normalizeElementKey).filter((k) => !!k));

  const weakTo: string[] = [];
  const strongVs: string[] = [];

  for (const k of keys) {
    const row = PALWORLD_MATCHUPS[k];
    if (!row) continue;
    weakTo.push(...row.weakTo);
    strongVs.push(...row.strongVs);
  }

  return {
    weakTo: dedupStrings(weakTo),
    superEffectiveVs: dedupStrings(strongVs),
  };
}

const KEY_STATS_WANTED = new Set(["Health", "Food", "Attack", "Defense", "Work Speed", "Size", "Rarity"]);
const KEY_STATS_ORDER = ["Size", "Rarity", "Health", "Food", "Attack", "Defense", "Work Speed"];

function buildImportantStats(statsRows: NonNullable<PalDetail["statsRows"]>) {
  const filtered = statsRows.filter((r) => KEY_STATS_WANTED.has(r.key));

  const orderIndex = (k: string) => {
    const i = KEY_STATS_ORDER.indexOf(k);
    return i >= 0 ? i : 999;
  };

  return filtered
    .slice()
    .sort((a, b) => orderIndex(a.key) - orderIndex(b.key))
    .map((r) => ({
      key: r.key,
      value: r.value,
      iconUrl: r.iconUrl ?? null,
    }));
}

function resolveDexIdFromPalDetail(d: PalDetail | null): string {
  if (!d) return "";
  // numberRaw is where variants like "5B" live (based on how you're already using it in subtitle)
  const raw = String((d as any)?.numberRaw ?? "").trim();
  if (raw) return raw;

  const n = (d as any)?.number;
  if (n != null && String(n).trim()) return String(n).trim();

  // last resort (stable-ish)
  const id = String((d as any)?.id ?? "").trim();
  return id || "";
}

export default function PalworldPalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  void router;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PalDetail | null>(null);

  const [partnerLv, setPartnerLv] = useState<number>(0);

  const partnerLevels = useMemo(() => {
    const set = new Set<number>();

    for (const e of data?.partnerSkillEffects ?? []) set.add(e.level);
    for (const d of data?.ranchDrops ?? []) set.add(d.level);

    for (const r of (data as any)?.partnerSkillActiveStats ?? []) {
      const lv = Number((r as any)?.level ?? 0);
      if (lv) set.add(lv);
    }

    if (set.size === 0) {
      const n = Number((data?.partnerSkillLevel ?? "").match(/[0-9]+/)?.[0] ?? "");
      if (n) set.add(n);
    }

    return Array.from(set).sort((a, b) => a - b);
  }, [data?.partnerSkillEffects, data?.ranchDrops, (data as any)?.partnerSkillActiveStats, data?.partnerSkillLevel]);

  const defaultPartnerLv = useMemo(() => {
    return partnerLevels.length > 0 ? partnerLevels[0] : 0;
  }, [partnerLevels]);

  useEffect(() => {
    setPartnerLv(defaultPartnerLv);
  }, [data?.id, defaultPartnerLv]);

  const dexId = useMemo(() => resolveDexIdFromPalDetail(data), [data]);

  // Favorites now use dexId string keys too
  const isFavorite = usePalworldCollectionStore((s) => {
    const key = String(dexId ?? "").trim();
    if (!key) return false;
    return !!s.favorites[key];
  });

  const toggleFavorite = usePalworldCollectionStore((s) => s.toggleFavorite);

  const onToggleFavorite = useCallback(() => {
    const key = String(dexId ?? "").trim();
    if (!key) return;
    toggleFavorite(key);
  }, [dexId, toggleFavorite]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const d = await fetchPalDetail(id);

        if (!mounted) return;
        setData(d);
      } catch (e) {
        console.warn("Failed to fetch Pal detail:", e);
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const title = useMemo(() => (data ? capitalize(data.name) : "Pal Detail"), [data]);

  const subtitle = useMemo(() => {
    if (!data) return "Palworld";
    const suffix = data.numberRaw && /[A-Za-z]$/.test(data.numberRaw) ? data.numberRaw.replace(/[0-9]/g, "") : "";
    const dexLine = `#${String(data.number || 0).padStart(3, "0")}${suffix}`;
    return `${dexLine} • Palworld`;
  }, [data]);

  const elements = data?.elements ?? [];
  const accent = elementAccentColor(elements[0] ?? null);

  const work = data?.workSuitability ?? [];
  const activeSkills = data?.activeSkills ?? [];

  const importantStats = useMemo(() => {
    const rows = data?.statsRows ?? [];
    if (rows.length === 0) return [];
    return buildImportantStats(rows);
  }, [data?.statsRows]);

  const matchups = useMemo(() => computePalworldMatchups(elements), [elements]);

  const others = useMemo(() => {
    const statsMap = data?.stats ?? {};
    const othersMap = data?.others ?? {};

    const norm = (s: string) => String(s ?? "").toLowerCase().replace(/[\s_]/g, "");

    const desiredTop = [
      { label: "MeleeAttack", match: "meleeattack" },
      { label: "Support", match: "support" },
      { label: "CaptureRateCorrect", match: "captureratecorrect" },
      { label: "MaleProbability", match: "maleprobability" },
      { label: "CombiRank", match: "combirank" },
      { label: "Gold Coin", match: "goldcoin" },
      { label: "Egg", match: "egg" },
      { label: "Code", match: "code" },
    ];

    const statsByNorm: Record<string, { key: string; value: string }> = {};
    for (const [k, v] of Object.entries(statsMap)) {
      const nk = norm(k);
      if (!nk) continue;
      if (!statsByNorm[nk]) statsByNorm[nk] = { key: k, value: String(v) };
    }

    const top: Record<string, string> = {};
    for (const d of desiredTop) {
      const hit = statsByNorm[d.match];
      if (!hit) continue;
      top[d.label] = hit.value;
    }

    return { ...top, ...othersMap };
  }, [data?.stats, data?.others]);

  if (loading) {
    return (
      <PageWrapper title="Pal Detail" scroll={false} headerLayout="inline">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-slate-300">Loading Pal…</Text>
        </View>
      </PageWrapper>
    );
  }

  if (!data) {
    return (
      <PageWrapper title="Pal Detail" scroll={false} headerLayout="inline">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-slate-300 text-center">Couldn’t load this Pal from paldb.cc.</Text>
          <Text className="text-[12px] text-slate-500 text-center mt-2">Try again in a moment.</Text>
        </View>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      scroll
      title={title}
      subtitle={subtitle}
      headerLayout="inline"
      rightActions={
        <TouchableOpacity onPress={onToggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons
            name={isFavorite ? "heart" : "heart-outline"}
            size={22}
            color={isFavorite ? "#f97316" : "#e5e7eb"}
          />
        </TouchableOpacity>
      }
    >
      <PalDetailHeaderSection data={data} dexId={dexId} subtitle={subtitle} accent={accent} />

      <PalworldTypeMatchups weakTo={matchups.weakTo} superEffectiveVs={matchups.superEffectiveVs} />

      <PalUniqueComboSection uniqueCombo={data.uniqueCombo ?? null} />

      <PalOverviewSection
        data={data}
        accent={accent}
        partnerLv={partnerLv}
        setPartnerLv={setPartnerLv}
        partnerLevels={partnerLevels}
        work={work}
        importantStats={importantStats}
      />

      <PalActiveSkillsSection activeSkills={activeSkills} />
      <PalTribesSection tribes={data.tribes ?? []} />
      <PalSpawnerSection spawner={data.spawner ?? []} />
      <PalOthersSection others={others} />
    </PageWrapper>
  );
}
