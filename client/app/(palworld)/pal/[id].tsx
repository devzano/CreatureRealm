// client/app/(palworld)/pal/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppImages from "@/constants/images";

import PageWrapper from "@/components/PageWrapper";
import { fetchPalDetail, type PalDetail } from "@/lib/palworld/pal/paldbDetails";
import { usePalworldCollectionStore } from "@/store/palworldCollectionStore";

import PalHeroGallery from "@/components/Palworld/PalworldDetails/ImageDropHero";
import PaldeckEntryStrip from "@/components/Palworld/PalworldDetails/EntryStrip";
import PalworldTypeMatchups from "@/components/Palworld/PalworldDetails/TypeMatchups";
import PalOverviewSection from "@/components/Palworld/PalworldDetails/OverviewSection";
import PalActiveSkillsSection from "@/components/Palworld/PalworldDetails/ActiveSkillsSection";
import { elementHex, normalizeElementKey } from "@/lib/palworld/palworldDB";
import PalOthersSection from "@/components/Palworld/PalworldDetails/OthersSection";
import PalTribesSection from "@/components/Palworld/PalworldDetails/TribesSection";
import PalSpawnerSection from "@/components/Palworld/PalworldDetails/SpawnerSection";
import PalUniqueComboSection from "@/components/Palworld/PalworldDetails/UniqueComboSection";
import PalMapSheet from "@/components/Palworld/PalworldDetails/PalMapSheet";

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
  const raw = String((d as any)?.numberRaw ?? "").trim();
  if (raw) return raw;

  const n = (d as any)?.number;
  if (n != null && String(n).trim()) return String(n).trim();

  const id = String((d as any)?.id ?? "").trim();
  return id || "";
}

function resolvePalCodeFromDetail(d: PalDetail | null, fallbackId: string) {
  if (!d) return fallbackId;

  const direct = String((d as any)?.code ?? "").trim();
  if (direct) return direct;

  const stats = (d as any)?.stats ?? {};
  const statsCode = String(stats?.Code ?? stats?.code ?? "").trim();
  if (statsCode) return statsCode;

  const breedingUrl = String((d as any)?.breedingParentCalcUrl ?? (d as any)?.breedingUrl ?? "").trim();
  if (breedingUrl) {
    try {
      const u = new URL(breedingUrl);
      const child = String(u.searchParams.get("child") ?? "").trim();
      if (child) return child;
    } catch {
      // ignore
    }
  }

  return fallbackId;
}

type VariantRow = {
  slug: string;
  name: string;
  iconUrl: string | null;
  tribeRole: string | null;
};

function VariantPickerModal({
  visible,
  onClose,
  variants,
  currentSlug,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  variants: VariantRow[];
  currentSlug: string;
  onSelect: (slug: string) => void;
}) {
  const cur = String(currentSlug ?? "").trim().toLowerCase();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          padding: 18,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: "rgba(2,6,23,0.98)", // slate-950-ish
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.25)",
            borderRadius: 22,
            overflow: "hidden",
          }}
        >
          <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>
            <Text style={{ color: "#e5e7eb", fontSize: 14, fontWeight: "700" }}>Variants</Text>
            <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              Choose which variant page to open.
            </Text>
          </View>

          <View style={{ maxHeight: 360 }}>
            <ScrollView>
              {variants.map((v) => {
                const isCurrent = String(v.slug ?? "").trim().toLowerCase() === cur;
                return (
                  <TouchableOpacity
                    key={v.slug}
                    onPress={() => onSelect(v.slug)}
                    disabled={isCurrent}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      opacity: isCurrent ? 0.6 : 1,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(148,163,184,0.12)",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 }}>
                      {v.iconUrl ? (
                        <Image
                          source={{ uri: v.iconUrl }}
                          style={{ width: 26, height: 26, marginRight: 10, borderRadius: 6 }}
                          resizeMode="contain"
                        />
                      ) : null}

                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={{ color: "#e5e7eb", fontSize: 13, fontWeight: "600" }}
                        >
                          {v.name}
                        </Text>
                        {v.tribeRole ? (
                          <Text numberOfLines={1} style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                            {v.tribeRole}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {isCurrent ? (
                      <MaterialCommunityIcons name="check" size={18} color="#0cd3f1" />
                    ) : (
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.12)" }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: "rgba(30,41,59,0.55)",
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.22)",
                borderRadius: 16,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#e5e7eb", fontSize: 13, fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function PalworldPalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PalDetail | null>(null);

  const [partnerLv, setPartnerLv] = useState<number>(0);
  const [isMapSheetOpen, setIsMapSheetOpen] = useState(false);

  // Variants dropdown modal
  const [isVariantsOpen, setIsVariantsOpen] = useState(false);

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
  const element = useMemo(() => (data?.elements?.[0] ?? null) as string | null, [data?.elements]);
  const elements = data?.elements ?? [];

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

  const title = useMemo(() => (data ? capitalize(data.name) : "Pal Detail"), [data]);

  const subtitle = useMemo(() => {
    if (!data) return "Palworld";
    const suffix = data.numberRaw && /[A-Za-z]$/.test(data.numberRaw) ? data.numberRaw.replace(/[0-9]/g, "") : "";
    const dexLine = `#${String(data.number || 0).padStart(3, "0")}${suffix}`;
    return `${dexLine} • Palworld`;
  }, [data]);

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

  const palCode = useMemo(() => resolvePalCodeFromDetail(data, String(id ?? "").trim()), [data, id]);

  // -----------------------------
  // Variant button
  // - ONE icon: alpha symbol
  // - 2 variants: tap toggles directly
  // - 3+ variants: tap opens modal
  // -----------------------------
  const currentSlug = useMemo(() => String(id ?? "").trim(), [id]);

  const variants = useMemo<VariantRow[]>(() => {
    const rows = data?.tribes ?? [];
    if (!rows || rows.length === 0) return [];

    const out: VariantRow[] = [];
    const seen = new Set<string>();

    for (const r of rows) {
      const slug = String((r as any)?.palSlug ?? "").trim();
      if (!slug) continue;

      const key = slug.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        slug,
        name: String((r as any)?.palName ?? slug).trim() || slug,
        iconUrl: (r as any)?.iconUrl ?? null,
        tribeRole: String((r as any)?.tribeRole ?? "").trim() || null,
      });
    }

    return out;
  }, [data?.tribes]);

  const hasVariants = variants.length > 1;

  const onSelectVariant = useCallback(
    (slug: string) => {
      const s = String(slug ?? "").trim();
      if (!s) return;

      setIsVariantsOpen(false);

      router.push(
        {
          pathname: "/(palworld)/pal/[id]",
          params: { id: s },
        } as any
      );
    },
    [router]
  );

  const onPressVariantButton = useCallback(() => {
    if (!hasVariants) return;

    if (variants.length === 2) {
      const cur = currentSlug.toLowerCase();
      const other = variants.find((v) => v.slug.toLowerCase() !== cur) ?? variants[0] ?? null;

      const nextSlug = String(other?.slug ?? "").trim();
      if (!nextSlug) return;
      if (nextSlug.toLowerCase() === cur) return;

      onSelectVariant(nextSlug);
      return;
    }

    // 3+ variants
    setIsVariantsOpen(true);
  }, [hasVariants, variants, currentSlug, onSelectVariant]);

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
        <View className="flex-row items-center">
          {hasVariants ? (
            <TouchableOpacity
              onPress={onPressVariantButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: 10, opacity: 1 }}
            >
              <Image source={AppImages.alphaPalworldIcon} style={{ width: 22, height: 22 }} resizeMode="contain" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => setIsMapSheetOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginRight: 12 }}
          >
            <MaterialCommunityIcons name="map-outline" size={22} color="#e5e7eb" />
          </TouchableOpacity>

          <TouchableOpacity onPress={onToggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? "#0cd3f1" : "#e5e7eb"}
            />
          </TouchableOpacity>
        </View>
      }
    >
      <VariantPickerModal
        visible={isVariantsOpen}
        onClose={() => setIsVariantsOpen(false)}
        variants={variants}
        currentSlug={currentSlug}
        onSelect={onSelectVariant}
      />

      <PalMapSheet visible={isMapSheetOpen} onRequestClose={() => setIsMapSheetOpen(false)} palCode={palCode} />

      <View className="mb-1">
        <PalHeroGallery data={data} subtitle={subtitle} accent={accent} />
        {String(dexId ?? "").trim() ? <PaldeckEntryStrip dexId={String(dexId ?? "").trim()} element={element} /> : null}
      </View>

      <PalworldTypeMatchups weakTo={matchups.weakTo} superEffectiveVs={matchups.superEffectiveVs} />
      <PalUniqueComboSection
        uniqueCombo={data.uniqueCombo ?? null}
        breedingUrl={data?.breedingParentCalcUrl ?? null}
        accent={accent}
      />
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
