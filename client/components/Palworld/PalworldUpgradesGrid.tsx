// components/Palworld/PalworldUpgradesGrid.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";

import PalworldDashboardGrid, { type DashboardCategory } from "@/components/Palworld/PalworldDashboardGrid";
import { usePalworldDashboardOrderStore } from "@/store/palworldDashboardOrderStore";

import type { PassiveSkillRow } from "@/lib/palworld/upgrades/paldbPassiveSkills";
import PassiveSkillGrid from "@/components/Palworld/Upgrades/PassiveSkillGrid";
import type { TechnologyItem } from "@/lib/palworld/upgrades/paldbTechnologies";
import TechnologyGrid from "@/components/Palworld/Upgrades/TechnologyGrid";
import type { JournalIndexItem } from "@/lib/palworld/upgrades/paldbJournal";
import PalJournalGrid from "@/components/Palworld/Upgrades/JournalGrid";
import type { MissionIndexItem } from "@/lib/palworld/upgrades/paldbMissions";
import PalMissionGrid from "@/components/Palworld/Upgrades/MissionGrid";
import type { BaseIndex } from "@/lib/palworld/upgrades/paldbBase";
import PalBaseGrid from "@/components/Palworld/Upgrades/BaseGrid";
import type { MerchantOfferRow } from "@/lib/palworld/upgrades/paldbMerchants";
import PalMerchantsGrid from "@/components/Palworld/Upgrades/MerchantsGrid";
import type { TowerBossRow } from "@/lib/palworld/upgrades/paldbTowerBosses";
import TowerBossGrid from "@/components/Palworld/Upgrades/TowerBossGrid";
import type { SummoningAltarBoss, RaidEvent } from "@/lib/palworld/upgrades/paldbSummonsRaid";
import SummonsGrid from "@/components/Palworld/Upgrades/SummonsGrid";
import RaidsGrid from "@/components/Palworld/Upgrades/RaidsGrid";
import type { DungeonWithPals } from "@/lib/palworld/upgrades/paldbDungeonsPals";
import PalDungeonsGrid from "@/components/Palworld/Upgrades/PalDungeonsGrid";
import type { EggRow } from "@/lib/palworld/upgrades/paldbEggPals";
import PalEggsGrid from "@/components/Palworld/Upgrades/EggsGrid";
import type { WorkSuitabilityItem } from "@/lib/palworld/upgrades/paldbWorkSuitability";
import WorkSuitabilityGrid from "@/components/Palworld/Upgrades/WorkSuitabilityGrid";
import type { SkillFruitOrchardRow } from "@/lib/palworld/upgrades/paldbSkillFruits";
import SkillfruitOrchardGrid from "@/components/Palworld/Upgrades/SkillfruitOrchardGrid";

type PalworldUpgradesGridProps = {
  passiveSkills: PassiveSkillRow[];
  technologies: TechnologyItem[];
  journals: JournalIndexItem[];
  missionsMain: MissionIndexItem[];
  missionsSub: MissionIndexItem[];
  base: BaseIndex | null;
  merchantOffers: MerchantOfferRow[];
  towerBosses: TowerBossRow[];
  summons: SummoningAltarBoss[];
  raids: RaidEvent[];
  dungeonPals: DungeonWithPals[];
  eggs: EggRow[];
  workSuitability: WorkSuitabilityItem[];
  skillfruits: SkillFruitOrchardRow[];
  search: string;
};

type PreviewItem = { name: string; };

type CategoryKey =
  | "towers"
  | "raids"
  | "dungeons"
  | "merchants"
  | "base"
  | "missions"
  | "journals"
  | "technologies"
  | "passiveSkills"
  | "workSuitability"
  | "eggs"
  | "skillfruits";

const DEFAULT_CATEGORY_ORDER: CategoryKey[] = [
  "towers",
  "raids",
  "dungeons",
  "merchants",
  "base",
  "missions",
  "journals",
  "technologies",
  "passiveSkills",
  "eggs",
  "workSuitability",
  "skillfruits",
];

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

function countDungeonPals(list: DungeonWithPals[] | undefined | null): number {
  const arr = Array.isArray(list) ? list : [];
  let n = 0;
  for (const d of arr) n += Array.isArray(d?.pals) ? d.pals.length : 0;
  return n;
}

function previewDungeonPals(list: DungeonWithPals[] | undefined | null, max = 6): PreviewItem[] {
  const arr = Array.isArray(list) ? list : [];
  const out: PreviewItem[] = [];

  for (const d of arr) {
    const dn = String(d?.name ?? "").trim() || String(d?.slug ?? "").trim() || "Dungeon";
    const pals = Array.isArray(d?.pals) ? d.pals : [];
    for (const p of pals) {
      const pn = String(p?.palName ?? "").trim() || String(p?.palSlug ?? "").trim() || "Pal";
      out.push({ name: `${dn} • ${pn}` });
      if (out.length >= max) return out;
    }
  }

  return out;
}

function safeName(x: any): string {
  if (x == null) return "Unknown";

  const level = x?.level;
  if (level != null && (x?.rawText || x?.tasks || x?.rewards)) {
    const lvl = String(level).trim();
    return `Base Level ${lvl || "—"}`;
  }

  if (x?.boss?.name || x?.slab?.name) {
    const bossName = String(x?.boss?.name ?? "").trim() || "Boss";
    const slabName = String(x?.slab?.name ?? "").trim() || "Slab";
    return `${bossName} • ${slabName}`;
  }

  if (x?.title && Array.isArray(x?.members)) {
    const t = String(x?.title ?? "").trim();
    const g = String(x?.gradeText ?? "").trim();
    return g ? `${t} • Grade ${g}` : t || "Raid";
  }

  if (x?.slug && x?.name && Array.isArray(x?.pals)) {
    const dn = String(x?.name ?? "").trim() || String(x?.slug ?? "").trim() || "Dungeon";
    const count = Array.isArray(x?.pals) ? x.pals.length : 0;
    return `${dn} • ${count} pal${count === 1 ? "" : "s"}`;
  }

  const name =
    String(x?.name ?? "").trim() ||
    String(x?.title ?? "").trim() ||
    String(x?.label ?? "").trim() ||
    String(x?.missionTitle ?? "").trim() ||
    String(x?.questTitle ?? "").trim();

  if (name) return name;

  if (x?.shopId && (x?.itemName || x?.itemSlug)) {
    const item = String(x?.itemName ?? "").trim() || String(x?.itemSlug ?? "").trim() || "Item";
    return `${prettyShopId(x.shopId)} • ${item}`;
  }

  if (x?.shopId) return prettyShopId(x.shopId);

  const idLike = String(x?.id ?? "").trim() || String(x?.key ?? "").trim() || String(x?.slug ?? "").trim();
  if (idLike) return idLike.replace(/_/g, " ").trim();

  return "Unknown";
}

function toPreviewItems(list: any[], max = 6): PreviewItem[] {
  const arr = Array.isArray(list) ? list : [];
  const out: PreviewItem[] = [];
  for (const it of arr) {
    const n = safeName(it);
    if (!n) continue;
    out.push({ name: n });
    if (out.length >= max) break;
  }
  return out;
}

const PalworldUpgradesGrid: React.FC<PalworldUpgradesGridProps> = ({
  passiveSkills,
  technologies,
  journals,
  missionsMain,
  missionsSub,
  base,
  merchantOffers,
  towerBosses,
  summons,
  raids,
  dungeonPals,
  eggs,
  workSuitability,
  skillfruits,
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
        buildHaystack([o.shopId, o.merchantName, o.merchantCount, o.itemName, o.itemSlug, o.price, o.stock, o.quantity])
      ),
    [merchantOffers, normalizedSearch]
  );

  const filteredTowerBosses = useMemo(
    () =>
      filterList(towerBosses, normalizedSearch, (b) =>
        buildHaystack([b.name, b.slug, b.towerText, b.difficultyText, b.level, b.hp, (b.elements ?? []).join(" ")])
      ),
    [towerBosses, normalizedSearch]
  );

  const filteredSummons = useMemo(
    () =>
      filterList(summons, normalizedSearch, (s) =>
        buildHaystack([
          s?.boss?.name,
          s?.boss?.slug,
          s?.slab?.name,
          s?.slab?.slug,
          s?.level,
          s?.hp,
          s?.damageReductionPct,
          s?.attackDamagePct,
          (s?.elements ?? []).join(" "),
        ])
      ),
    [summons, normalizedSearch]
  );

  const filteredRaids = useMemo(
    () =>
      filterList(raids, normalizedSearch, (r) =>
        buildHaystack([
          r?.title,
          r?.gradeText,
          r?.weight,
          (r?.members ?? [])
            .map(
              (m: any) =>
                `${m?.unit?.name ?? ""} ${m?.unit?.slug ?? ""} ${m?.levelMin ?? ""}-${m?.levelMax ?? ""} x${m?.count ?? ""}`
            )
            .join(" "),
        ])
      ),
    [raids, normalizedSearch]
  );

  const filteredDungeonPals = useMemo(() => {
    const arr = Array.isArray(dungeonPals) ? dungeonPals : [];
    if (!normalizedSearch) return arr;

    return arr.filter((d) => {
      const dHay = buildHaystack([d.slug, d.name, d.level, d.levelText]);
      if (dHay.includes(normalizedSearch)) return true;

      for (const p of d.pals ?? []) {
        const pHay = buildHaystack([p.palName, p.palSlug, p.levelText]);
        if (pHay.includes(normalizedSearch)) return true;
      }
      return false;
    });
  }, [dungeonPals, normalizedSearch]);

  const filteredEggs = useMemo(
    () =>
      filterList(eggs, normalizedSearch, (e) =>
        buildHaystack([
          e?.egg?.name,
          e?.egg?.slug,
          e?.egg?.tier,
          (e?.pals ?? []).map((p: any) => `${p?.name ?? ""} ${p?.slug ?? ""}`).join(" "),
        ])
      ),
    [eggs, normalizedSearch]
  );

  const filteredWorkSuitability = useMemo(
    () =>
      filterList(workSuitability, normalizedSearch, (w) =>
        buildHaystack([w.name, w.slug, w.code, w.iconId])
      ),
    [workSuitability, normalizedSearch]
  );

  const filteredSkillfruits = useMemo(
    () =>
      filterList(skillfruits, normalizedSearch, (s) =>
        buildHaystack([s.name, s.slug, s.sameElementPct, s.sameElementText])
      ),
    [skillfruits, normalizedSearch]
  );

  const totalShown =
    filteredTowerBosses.length +
    filteredSummons.length +
    filteredRaids.length +
    countDungeonPals(filteredDungeonPals) +
    filteredMerchantOffers.length +
    filteredPassiveSkills.length +
    filteredTechnologies.length +
    filteredJournals.length +
    filteredMissionsMain.length +
    filteredMissionsSub.length +
    filteredBase.length +
    filteredEggs.length +
    filteredWorkSuitability.length +
    filteredSkillfruits.length;

  const totalAll =
    (towerBosses?.length ?? 0) +
    (summons?.length ?? 0) +
    (raids?.length ?? 0) +
    countDungeonPals(dungeonPals) +
    (merchantOffers?.length ?? 0) +
    (passiveSkills?.length ?? 0) +
    (technologies?.length ?? 0) +
    (journals?.length ?? 0) +
    (missionsMain?.length ?? 0) +
    (missionsSub?.length ?? 0) +
    (base?.items?.length ?? 0) +
    (eggs?.length ?? 0) +
    (workSuitability?.length ?? 0) +
    (skillfruits?.length ?? 0);

  const categories: DashboardCategory<CategoryKey>[] = useMemo(() => {
    const missionPreview = [...filteredMissionsMain.slice(0, 3), ...filteredMissionsSub.slice(0, 3)];

    return [
      {
        key: "towers",
        title: "Towers",
        subtitle: "Tower Bosses",
        shown: filteredTowerBosses.length,
        total: towerBosses?.length ?? 0,
        items: filteredTowerBosses as any[],
        previewItems: toPreviewItems(filteredTowerBosses, 6),
        render: () => (
          <TowerBossGrid
            items={filteredTowerBosses}
            numColumns={2}
            emptyText={normalizedSearch ? "No tower bosses match this search." : "No tower bosses found."}
          />
        ),
      },

      {
        key: "raids",
        title: "Raids",
        subtitle: "Summons + Raids",
        shown: filteredSummons.length + filteredRaids.length,
        total: (summons?.length ?? 0) + (raids?.length ?? 0),
        items: [] as any[],
        previewItems: [
          ...toPreviewItems(filteredSummons, 3).map((x) => ({ name: `Summon • ${x.name}` })),
          ...toPreviewItems(filteredRaids, 3).map((x) => ({ name: `Raid • ${x.name}` })),
        ],
        render: () => (
          <View>
            <View className="px-4 mt-2 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Summons</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredSummons.length} / {summons?.length ?? 0}
              </Text>
            </View>

            <SummonsGrid
              items={filteredSummons}
              numColumns={2}
              emptyText={normalizedSearch ? "No summons match this search." : "No summons found."}
            />

            <View className="px-4 mt-6 mb-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Raids</Text>
              <Text className="text-[11px] text-white/35 mt-0.5">
                {filteredRaids.length} / {raids?.length ?? 0}
              </Text>
            </View>

            <RaidsGrid
              items={filteredRaids}
              numColumns={2}
              emptyText={normalizedSearch ? "No raids match this search." : "No raids found."}
            />
          </View>
        ),
      },

      {
        key: "dungeons",
        title: "Dungeons",
        subtitle: "Dungeon Pals",
        shown: countDungeonPals(filteredDungeonPals),
        total: countDungeonPals(dungeonPals),
        items: filteredDungeonPals as any[],
        previewItems: previewDungeonPals(filteredDungeonPals, 6),
        render: (items, ctx) => (
          <PalDungeonsGrid
            items={items as any}
            numColumns={2}
            emptyText={normalizedSearch ? "No dungeon pals match this search." : "No dungeon pals found."}
            query={ctx.getLocalSearch("dungeons")}
            onQueryChange={(q) => ctx.setLocalSearch("dungeons", q)}
            hideSearchBar
          />
        ),
      },

      {
        key: "merchants",
        title: "Merchants",
        subtitle: "Shop Inventories",
        shown: filteredMerchantOffers.length,
        total: merchantOffers?.length ?? 0,
        items: filteredMerchantOffers as any[],
        previewItems: toPreviewItems(filteredMerchantOffers, 6),
        render: (items, ctx) => (
          <PalMerchantsGrid
            items={items as any}
            numColumns={2}
            emptyText={normalizedSearch ? "No merchant offers match this search." : "No merchant items found."}
            query={ctx.getLocalSearch("merchants")}
            onQueryChange={(q) => ctx.setLocalSearch("merchants", q)}
            hideSearchBar
          />
        ),
      },

      {
        key: "base",
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
        key: "missions",
        title: "Missions",
        subtitle: "Main • Sub",
        shown: filteredMissionsMain.length + filteredMissionsSub.length,
        total: (missionsMain?.length ?? 0) + (missionsSub?.length ?? 0),
        items: [] as any[],
        previewItems: missionPreview.map((x: any) => ({ name: safeName(x) })),
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
        key: "journals",
        title: "Journals",
        subtitle: "Memo Entries",
        shown: filteredJournals.length,
        total: journals?.length ?? 0,
        items: filteredJournals as any[],
        previewItems: toPreviewItems(filteredJournals, 6),
        render: (items) => (
          <PalJournalGrid items={items as any} numColumns={2} emptyText="No journals found. Try a different search." />
        ),
      },

      {
        key: "technologies",
        title: "Technologies",
        subtitle: "Tech Tree",
        shown: filteredTechnologies.length,
        total: technologies?.length ?? 0,
        items: filteredTechnologies as any[],
        previewItems: toPreviewItems(filteredTechnologies, 6),
        render: (items) => <TechnologyGrid items={items as any} numColumns={3} emptyText="No technologies found. Try a different search." />,
      },

      {
        key: "passiveSkills",
        title: "Passive Skills",
        subtitle: "Traits + Ranks",
        shown: filteredPassiveSkills.length,
        total: passiveSkills?.length ?? 0,
        items: filteredPassiveSkills as any[],
        previewItems: toPreviewItems(filteredPassiveSkills, 6),
        render: (items) => <PassiveSkillGrid items={items as any} numColumns={3} emptyText="No passive skills found. Try a different search." />,
      },

      {
        key: "eggs",
        title: "Eggs",
        subtitle: "Hatch Pals",
        shown: filteredEggs.length,
        total: eggs?.length ?? 0,
        items: filteredEggs as any[],
        previewItems: toPreviewItems(
          filteredEggs.map((e: any) => ({
            name: `${String(e?.egg?.name ?? "").trim() || String(e?.egg?.slug ?? "").trim() || "Egg"} • ${Array.isArray(e?.pals) ? e.pals.length : 0
              } pal${(Array.isArray(e?.pals) ? e.pals.length : 0) === 1 ? "" : "s"}`,
          })),
          6
        ),
        render: (items) => (
          <PalEggsGrid
            items={items as any}
            numColumns={2}
            emptyText={normalizedSearch ? "No eggs match this search." : "No eggs found."}
          />
        ),
      },

      {
        key: "workSuitability",
        title: "Work Suitability",
        subtitle: "Pal Work Roles",
        shown: filteredWorkSuitability.length,
        total: (workSuitability?.length ?? 0),
        items: filteredWorkSuitability as any[],
        previewItems: toPreviewItems(filteredWorkSuitability, 6),
        render: (items) => (
          <WorkSuitabilityGrid
            items={items as any}
            numColumns={3}
            emptyText={
              normalizedSearch
                ? "No work suitability entries match this search."
                : "No work suitability entries found."
            }
          />
        ),
      },

      {
        key: "skillfruits",
        title: "Skillfruits",
        subtitle: "Skillfruit Orchard",
        shown: filteredSkillfruits.length,
        total: skillfruits?.length ?? 0,
        items: filteredSkillfruits as any[],
        previewItems: toPreviewItems(filteredSkillfruits, 6),
        render: (items) => (
          <SkillfruitOrchardGrid
            items={items as any}
            numColumns={3}
            emptyText={normalizedSearch ? "No skillfruits match this search." : "No skillfruits found."}
          />
        ),
      },
    ];
  }, [
    normalizedSearch,
    filteredTowerBosses,
    towerBosses,
    filteredSummons,
    summons,
    filteredRaids,
    raids,
    filteredDungeonPals,
    dungeonPals,
    filteredMerchantOffers,
    merchantOffers,
    filteredBase,
    base,
    filteredMissionsMain,
    missionsMain,
    filteredMissionsSub,
    missionsSub,
    filteredJournals,
    journals,
    filteredTechnologies,
    technologies,
    filteredPassiveSkills,
    passiveSkills,
    filteredEggs,
    eggs,
    filteredWorkSuitability,
    workSuitability,
    filteredSkillfruits,
    skillfruits,
  ]);

  const orderKey = "palworld.upgrades" as const;
  const storedOrder = usePalworldDashboardOrderStore((s) => s.orders[orderKey]) as CategoryKey[] | undefined;
  const saveOrder = usePalworldDashboardOrderStore((s) => s.setOrder);
  const reorderEnabled = !normalizedSearch;
  const effectiveOrder = (storedOrder?.length ? storedOrder : DEFAULT_CATEGORY_ORDER) as CategoryKey[];

  return (
    <PalworldDashboardGrid<CategoryKey>
      search={search}
      totalShown={totalShown}
      totalAll={totalAll}
      categories={categories}
      reorderEnabled={reorderEnabled}
      defaultOrder={DEFAULT_CATEGORY_ORDER}
      order={effectiveOrder}
      onOrderChange={(next) => saveOrder(orderKey, next as string[])}
      previewMax={3}
    />
  );
};

export default PalworldUpgradesGrid;
