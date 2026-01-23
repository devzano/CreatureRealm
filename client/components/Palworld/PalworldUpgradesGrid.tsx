// components/Palworld/PalworldUpgradesGrid.tsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

import type { PassiveSkillRow } from "@/lib/palworld/paldbPassiveSkills";
import type { TechnologyItem } from "@/lib/palworld/paldbTechnologies";
import type { JournalIndexItem } from "@/lib/palworld/paldbJournal";
import type { MissionIndexItem } from "@/lib/palworld/paldbMissions";
import type { BaseIndex } from "@/lib/palworld/paldbBase";
import type { MerchantOfferRow } from "@/lib/palworld/paldbMerchants";

import PassiveSkillGrid from "@/components/Palworld/PalworldDetails/PalPassiveSkillGrid";
import TechnologyGrid from "@/components/Palworld/PalTechnologyGrid";
import PalJournalGrid from "@/components/Palworld/PalJournalGrid";
import PalMissionGrid from "@/components/Palworld/PalMissionGrid";
import PalBaseGrid from "@/components/Palworld/PalBaseGrid";
import PalMerchantsGrid from "@/components/Palworld/PalMerchantsGrid";

type PalworldUpgradesGridProps = {
  passiveSkills: PassiveSkillRow[];
  technologies: TechnologyItem[];
  journals: JournalIndexItem[];
  missionsMain: MissionIndexItem[];
  missionsSub: MissionIndexItem[];
  base: BaseIndex | null;
  merchantOffers: MerchantOfferRow[];

  search: string;
};

type CategoryKey = "all" | "passiveSkills" | "technologies" | "journals" | "missions" | "base" | "merchants";

function buildHaystack(parts: Array<any>) {
  return parts
    .map((x) => (x == null ? "" : String(x)))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function filterList<T>(items: T[] | undefined, search: string, build: (it: T) => string): T[] {
  const arr = Array.isArray(items) ? items : [];
  const s = (search ?? "").trim().toLowerCase();
  if (!s) return arr;
  return arr.filter((it) => build(it).includes(s));
}

function safeName(x: any): string {
  if (x == null) return "Unknown";

  // Base rows (common shape: { level, rawText, tasks, rewards })
  const level = x?.level;
  if (level != null && (x?.rawText || x?.tasks || x?.rewards)) {
    const lvl = String(level).trim();
    return `Base Level ${lvl || "—"}`;
  }

  // Missions / Journals / generic rows
  const name =
    String(x?.name ?? "").trim() ||
    String(x?.title ?? "").trim() ||
    String(x?.label ?? "").trim() ||
    String(x?.missionTitle ?? "").trim() ||
    String(x?.questTitle ?? "").trim();

  if (name) return name;

  // Merchant offer rows
  if (x?.shopId && (x?.itemName || x?.itemSlug)) {
    const item = String(x?.itemName ?? "").trim() || String(x?.itemSlug ?? "").trim() || "Item";
    return `${prettyShopId(x.shopId)} • ${item}`;
  }

  if (x?.shopId) return prettyShopId(x.shopId);

  // Fallback to id/key/slug
  const idLike = String(x?.id ?? "").trim() || String(x?.key ?? "").trim() || String(x?.slug ?? "").trim();
  if (idLike) return idLike.replace(/_/g, " ").trim();

  return "Unknown";
}

function titleizeShopId(id: string) {
  const raw = String(id ?? "").trim();
  if (!raw) return "Shop";

  const withSpaces = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  return withSpaces
    .split(" ")
    .map((part) => {
      if (!part) return "";
      if (/^\d+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
}

function prettyShopId(id: any): string {
  const s = String(id ?? "").trim();
  return s ? titleizeShopId(s) : "Shop";
}

function fmtNum(v: any): string | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString();
}

const PalworldUpgradesGrid: React.FC<PalworldUpgradesGridProps> = ({
  passiveSkills,
  technologies,
  journals,
  missionsMain,
  missionsSub,
  base,
  merchantOffers,
  search,
}) => {
  const normalizedSearch = (search ?? "").trim().toLowerCase();

  const filteredPassiveSkills = useMemo(
    () =>
      filterList(passiveSkills, normalizedSearch, (p) =>
        buildHaystack([p.name, p.rank, p.weight, (p.tags ?? []).join(" "), p.effectsText, p.tooltipText])
      ),
    [passiveSkills, normalizedSearch]
  );

  const filteredTechnologies = useMemo(
    () =>
      filterList(technologies, normalizedSearch, (t) =>
        buildHaystack([t.name, t.slug, t.category, t.level, t.isBoss ? "boss" : ""])
      ),
    [technologies, normalizedSearch]
  );

  const filteredJournals = useMemo(
    () => filterList(journals, normalizedSearch, (j) => buildHaystack([j.title, j.slug])),
    [journals, normalizedSearch]
  );

  const filteredMissionsMain = useMemo(
    () =>
      filterList(missionsMain, normalizedSearch, (m) =>
        buildHaystack([m.title, m.id, m.label, m.description, m.nextTitle, m.kind])
      ),
    [missionsMain, normalizedSearch]
  );

  const filteredMissionsSub = useMemo(
    () =>
      filterList(missionsSub, normalizedSearch, (m) =>
        buildHaystack([m.title, m.id, m.label, m.description, m.nextTitle, m.kind])
      ),
    [missionsSub, normalizedSearch]
  );

  const filteredBase = useMemo(() => {
    const items = Array.isArray(base?.items) ? base!.items : [];
    return filterList(items, normalizedSearch, (row: any) =>
      buildHaystack([
        row.level,
        row.rawText,
        (row.tasks ?? []).map((t: any) => t?.text ?? "").join(" "),
        (row.rewards ?? []).map((r: any) => `${r?.key ?? ""} ${r?.valueText ?? ""}`).join(" "),
      ])
    );
  }, [base, normalizedSearch]);

  const filteredMerchantOffers = useMemo(
    () =>
      filterList(merchantOffers, normalizedSearch, (o) =>
        buildHaystack([
          o.shopId,
          o.merchantName,
          o.merchantCount,
          o.itemName,
          o.itemSlug,
          o.price,
          o.stock,
          o.quantity,
        ])
      ),
    [merchantOffers, normalizedSearch]
  );

  const totalShown =
    filteredMerchantOffers.length +
    filteredPassiveSkills.length +
    filteredTechnologies.length +
    filteredJournals.length +
    filteredMissionsMain.length +
    filteredMissionsSub.length +
    filteredBase.length;

  const totalAll =
    (merchantOffers?.length ?? 0) +
    (passiveSkills?.length ?? 0) +
    (technologies?.length ?? 0) +
    (journals?.length ?? 0) +
    (missionsMain?.length ?? 0) +
    (missionsSub?.length ?? 0) +
    (base?.items?.length ?? 0);

  const [selected, setSelected] = useState<CategoryKey>("all");

  const categories = useMemo(() => {
    return [
      {
        key: "merchants" as const,
        title: "Merchants",
        subtitle: "Shop Inventories",
        shown: filteredMerchantOffers.length,
        total: merchantOffers?.length ?? 0,
        items: filteredMerchantOffers as any[],

        render: () => (
          <PalMerchantsGrid
            items={filteredMerchantOffers}
            numColumns={2}
            emptyText={normalizedSearch ? "No merchant offers match this search." : "No merchant items found."}
          />
        ),
      },
      {
        key: "base" as const,
        title: "Base",
        subtitle: "Base Leveling",
        shown: filteredBase.length,
        total: base?.items?.length ?? 0,
        items: filteredBase as any[],
        previewItems: filteredBase.slice(0, 6).map((x: any) => ({
          name: `Base Level ${String(x?.level ?? "").trim() || "—"}`,
        })),
        render: () => <PalBaseGrid index={base} numColumns={2} emptyText="No base levels found. Try a different search." />,
      },
      {
        key: "missions" as const,
        title: "Missions",
        subtitle: "Main • Sub",
        shown: filteredMissionsMain.length + filteredMissionsSub.length,
        total: (missionsMain?.length ?? 0) + (missionsSub?.length ?? 0),
        items: [] as any[],
        previewItems: [...filteredMissionsMain.slice(0, 3), ...filteredMissionsSub.slice(0, 3)],
        render: () => (
          <PalMissionGrid
            main={filteredMissionsMain}
            sub={filteredMissionsSub}
            numColumns={2}
            emptyText="No missions found. Try a different search."
            defaultTab="main"
          />
        ),
      },
      {
        key: "journals" as const,
        title: "Journals",
        subtitle: "Memo Entries",
        shown: filteredJournals.length,
        total: journals?.length ?? 0,
        items: filteredJournals as any[],
        render: (items: JournalIndexItem[]) => (
          <PalJournalGrid items={items} numColumns={3} emptyText="No journals found. Try a different search." />
        ),
      },
      {
        key: "technologies" as const,
        title: "Technologies",
        subtitle: "Tech Tree",
        shown: filteredTechnologies.length,
        total: technologies?.length ?? 0,
        items: filteredTechnologies as any[],
        render: (items: TechnologyItem[]) => (
          <TechnologyGrid items={items} numColumns={3} emptyText="No technologies found. Try a different search." />
        ),
      },
      {
        key: "passiveSkills" as const,
        title: "Passive Skills",
        subtitle: "Traits + Ranks",
        shown: filteredPassiveSkills.length,
        total: passiveSkills?.length ?? 0,
        items: filteredPassiveSkills as any[],
        render: (items: PassiveSkillRow[]) => (
          <PassiveSkillGrid items={items} numColumns={3} emptyText="No passive skills found. Try a different search." />
        ),
      },
    ] as const;
  }, [
    filteredMerchantOffers,
    merchantOffers,
    normalizedSearch,
    filteredPassiveSkills,
    filteredTechnologies,
    filteredJournals,
    filteredMissionsMain,
    filteredMissionsSub,
    filteredBase,
    passiveSkills,
    technologies,
    journals,
    missionsMain,
    missionsSub,
    base,
  ]);

  const visibleCards = useMemo(() => {
    if (!normalizedSearch) return categories;
    return categories.filter((c) => c.shown > 0);
  }, [categories, normalizedSearch]);

  const renderCategoryHeader = useCallback(
    (title: string, subtitle: string, shown: number, total: number) => (
      <View className="px-4 mt-4 mb-2">
        <View className="flex-row items-center">
          <View className="w-1.5 h-5 rounded-full mr-2 bg-white/10" />
          <View className="flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{title}</Text>
            <Text className="text-[11px] text-white/45 mt-0.5">
              {subtitle} • {shown} / {total}
            </Text>
          </View>

          <Pressable
            onPress={() => setSelected("all")}
            className="ml-2 px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] active:opacity-90"
          >
            <Text className="text-[10px] text-white/60">Back</Text>
          </Pressable>
        </View>
      </View>
    ),
    []
  );

  const renderSingleCategory = useCallback(() => {
    const cat = categories.find((c) => c.key === selected);
    if (!cat) return null;

    const isEmpty = cat.shown === 0;

    return (
      <View>
        {renderCategoryHeader(cat.title, cat.subtitle, cat.shown, cat.total)}

        {isEmpty ? (
          <View className="px-4">
            <EmptyState
              title={`No ${cat.title.toLowerCase()} found`}
              subtitle={normalizedSearch ? "Try a different search." : "Nothing in this category yet."}
            />
          </View>
        ) : (
          (cat.render as any)(cat.items as any)
        )}

        <View className="h-10" />
      </View>
    );
  }, [categories, selected, normalizedSearch, renderCategoryHeader]);

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 44 }}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        <View className="px-4 pt-2 pb-3 bg-black/60 border-b border-white/10">
          <View className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <Text className="text-[11px] text-white/60">
              Showing <Text className="text-white/85 font-semibold">{totalShown}</Text> /{" "}
              <Text className="text-white/75">{totalAll}</Text> items
            </Text>

            {!!normalizedSearch && (
              <Text className="text-[11px] text-white/40 mt-0.5" numberOfLines={1}>
                Search: “{(search ?? "").trim()}”
              </Text>
            )}

            <View className="mt-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Pill label="Dashboard" count={totalShown} active={selected === "all"} onPress={() => setSelected("all")} />

                {categories.map((c) => (
                  <Pill
                    key={c.key}
                    label={c.title}
                    count={c.shown}
                    active={selected === (c.key as any)}
                    onPress={() => setSelected(c.key as any)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {selected !== "all" ? (
          <View>{renderSingleCategory()}</View>
        ) : (
          <View className="px-4 pt-4">
            {visibleCards.length === 0 ? (
              <EmptyState
                title="No results"
                subtitle={normalizedSearch ? "Try a different search." : "No upgrades available."}
              />
            ) : (
              <>
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {visibleCards.map((c) => {
                    const source = (c as any).previewItems ?? (c as any).items ?? [];
                    const topNames = source.slice(0, 3).map(safeName);
                    const hasMore = c.shown > 3;

                    return (
                      <Pressable
                        key={c.key}
                        onPress={() => setSelected(c.key as any)}
                        className="rounded-3xl border border-white/10 bg-white/[0.03] active:opacity-90"
                        style={{ width: "48%" }}
                      >
                        <View className="p-3">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-[12px] text-white/85 font-semibold">{c.title}</Text>
                            <View className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.04]">
                              <Text className="text-[10px] text-white/60">{c.shown}</Text>
                            </View>
                          </View>

                          <Text className="text-[11px] text-white/45 mt-0.5" numberOfLines={1}>
                            {c.subtitle}
                          </Text>

                          <View className="mt-3">
                            {topNames.length === 0 ? (
                              <Text className="text-[11px] text-white/35">Nothing here yet</Text>
                            ) : (
                              <View style={{ gap: 4 }}>
                                {topNames.map((n: string, idx: number) => (
                                  <Text key={`${c.key}-n-${idx}`} className="text-[11px] text-white/60" numberOfLines={1}>
                                    • {n}
                                  </Text>
                                ))}
                                {hasMore && (
                                  <Text className="text-[11px] text-white/35" numberOfLines={1}>
                                    + {c.shown - 3} more
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>

                          <View className="mt-3">
                            <View className="rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
                              <Text className="text-[11px] text-white/70">Open {c.title}</Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="h-10" />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default PalworldUpgradesGrid;

function Pill(props: { label: string; count: number; active: boolean; onPress: () => void; }) {
  const { label, count, active, onPress } = props;

  return (
    <Pressable
      onPress={onPress}
      className={[
        "px-3 py-1.5 rounded-full border",
        active ? "border-white/25 bg-white/[0.08]" : "border-white/10 bg-white/[0.04]",
      ].join(" ")}
    >
      <Text className={["text-[11px]", active ? "text-white/85 font-semibold" : "text-white/60"].join(" ")}>
        {label} <Text className="text-white/35">({count})</Text>
      </Text>
    </Pressable>
  );
}

function EmptyState(props: { title: string; subtitle?: string; }) {
  const { title, subtitle } = props;
  return (
    <View className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <Text className="text-[12px] text-white/80 font-semibold">{title}</Text>
      {!!subtitle && <Text className="text-[11px] text-white/45 mt-1">{subtitle}</Text>}
    </View>
  );
}
