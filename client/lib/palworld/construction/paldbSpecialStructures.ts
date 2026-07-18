import { absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { parseTreantTreeFromPage, type TreantNode } from "@/lib/palworld/paldbDetailKit";
import { yieldToUI } from "@/lib/palworld/construction/shared";

export type SpecialConstructionIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type SpecialConstructionWorkSuitability = {
  slug: string;
  name: string;
  iconUrl: string | null;
  level: number | null;
} | null;

export type SpecialConstructionStatRow = {
  label: string;
  value: string;
};

export type SpecialConstructionIndexItem = {
  slug: string;
  name: string;
  iconUrl: string | null;
  categoryText: string | null;
  technologyLevel: number | null;
  workSuitability: SpecialConstructionWorkSuitability;
  description: string | null;
  recipe: SpecialConstructionIngredient[];
  detailRows: SpecialConstructionStatRow[];
  treant: TreantNode | null;
};

export type SpecialConstructionDetail = SpecialConstructionIndexItem;

export type PalExpeditionRewardRow = {
  id: string;
  slug: string | null;
  name: string;
  iconUrl: string | null;
  quantityText: string | null;
  chanceText: string | null;
  chanceValue: number | null;
};

export type PalExpeditionEntry = {
  id: string;
  slug: string;
  name: string;
  objective: string | null;
  risk: string | null;
  duration: string | null;
  recommendedFirepower: number | null;
  requiredType: string | null;
  rewards: PalExpeditionRewardRow[];
};

export type FishingShadowKind = "pal" | "item";
export type FishingShadowSize = "Small Shadow" | "Medium Shadow" | "Big Shadow";

export type FishingShadowEntry = {
  id: string;
  shadowSize: FishingShadowSize;
  kind: FishingShadowKind;
  slug: string | null;
  name: string;
  iconUrl: string | null;
  levelText: string | null;
  quantityText: string | null;
  chanceText: string | null;
  chanceValue: number | null;
  isAlpha: boolean;
};

const BASE_EN = "https://paldb.cc/en";
const TTL_MS = 1000 * 60 * 10;

type SpecialStructureBundle = {
  construction: SpecialConstructionIndexItem;
  expeditions: PalExpeditionEntry[];
};

type FishingPondBundle = {
  construction: SpecialConstructionIndexItem;
  shadows: FishingShadowEntry[];
};

export type ExpeditionStationBundle = SpecialStructureBundle;
export type FishingPondDetailBundle = FishingPondBundle;

let expeditionBundleCache: SpecialStructureBundle | null = null;
let expeditionBundleCacheAt = 0;
let expeditionBundlePending: Promise<SpecialStructureBundle> | null = null;

let fishingBundleCache: FishingPondBundle | null = null;
let fishingBundleCacheAt = 0;
let fishingBundlePending: Promise<FishingPondBundle> | null = null;

function now() {
  return Date.now();
}

function isFresh(at: number) {
  return now() - at < TTL_MS;
}

function safeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeInlineEntities(value: unknown): string {
  return String(value ?? "")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function safeInt(value: unknown): number | null {
  const raw = safeText(value).replace(/,/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function safePercent(value: unknown): number | null {
  const raw = safeText(value).replace(/%/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSlug(value: string | null | undefined): string | null {
  const raw = cleanKey(String(value ?? ""));
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const match = url.pathname.match(/\/en\/([^/?#]+)/i);
      return match?.[1] ? cleanKey(decodeURIComponent(match[1])) : null;
    } catch {
      return null;
    }
  }

  if (raw.startsWith("/en/")) return cleanKey(raw.slice("/en/".length));
  if (raw.startsWith("/")) return cleanKey(raw.slice(1));
  return raw;
}

function stripTags(html: string) {
  const sanitized = String(html ?? "")
    .replace(/\sdata-[\w-]+=(?:"[^"]*"|'[^']*')/g, "")
    .replace(/\stitle=(?:"[^"]*"|'[^']*')/g, "");
  return decodeInlineEntities(htmlToText(sanitized)).replace(/\s+/g, " ").trim();
}

function captureAll(src: string, re: RegExp): string[][] {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return Array.from(String(src ?? "").matchAll(new RegExp(re.source, flags))).map((m) => Array.from(m));
}

function extractDivBlocksByClassToken(src: string, classToken: string): string[] {
  const html = String(src ?? "");
  if (!html) return [];

  const expectedTokens = classToken
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const results: string[] = [];
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.toLowerCase().indexOf("<div", cursor);
    if (start < 0) break;

    const openEnd = html.indexOf(">", start);
    if (openEnd < 0) break;

    const openTag = html.slice(start, openEnd + 1).toLowerCase();
    const classMatch =
      openTag.match(/\bclass="([^"]+)"/i) ??
      openTag.match(/\bclass='([^']+)'/i);
    const classTokens = new Set(
      String(classMatch?.[1] ?? "")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
    );

    const matchesAll = expectedTokens.every((token) => classTokens.has(token));
    if (!matchesAll) {
      cursor = openEnd + 1;
      continue;
    }

    let depth = 0;
    let innerCursor = start;

    while (innerCursor < html.length) {
      const nextOpen = html.toLowerCase().indexOf("<div", innerCursor);
      const nextClose = html.toLowerCase().indexOf("</div", innerCursor);
      if (nextClose < 0) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        const nextOpenEnd = html.indexOf(">", nextOpen);
        if (nextOpenEnd < 0) break;
        depth += 1;
        innerCursor = nextOpenEnd + 1;
        continue;
      }

      const nextCloseEnd = html.indexOf(">", nextClose);
      if (nextCloseEnd < 0) break;
      depth -= 1;
      innerCursor = nextCloseEnd + 1;

      if (depth <= 0) {
        results.push(html.slice(start, innerCursor));
        cursor = innerCursor;
        break;
      }
    }

    if (cursor === start) cursor = openEnd + 1;
  }

  return results;
}

function extractFirstDivBlockById(src: string, id: string): string {
  const html = String(src ?? "");
  if (!html) return "";

  const match =
    html.match(new RegExp(`<div\\b[^>]*\\bid="${id}"[^>]*>`, "i")) ??
    html.match(new RegExp(`<div\\b[^>]*\\bid='${id}'[^>]*>`, "i"));
  if (!match || typeof match.index !== "number") return "";

  const start = match.index;
  const openEnd = html.indexOf(">", start);
  if (openEnd < 0) return "";

  let depth = 0;
  let cursor = start;

  while (cursor < html.length) {
    const nextOpen = html.toLowerCase().indexOf("<div", cursor);
    const nextClose = html.toLowerCase().indexOf("</div", cursor);
    if (nextClose < 0) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      const nextOpenEnd = html.indexOf(">", nextOpen);
      if (nextOpenEnd < 0) break;
      depth += 1;
      cursor = nextOpenEnd + 1;
      continue;
    }

    const nextCloseEnd = html.indexOf(">", nextClose);
    if (nextCloseEnd < 0) break;
    depth -= 1;
    cursor = nextCloseEnd + 1;

    if (depth <= 0) {
      return html.slice(start, cursor);
    }
  }

  return "";
}

function extractFirstClassBlock(src: string, classToken: string): string {
  return extractDivBlocksByClassToken(src, classToken)[0] ?? "";
}

function extractCardBlockByTitle(src: string, title: string): string {
  const cards = extractDivBlocksByClassToken(src, "card mt-3");
  const normalizedTitle = title.trim().toLowerCase();
  return (
    cards.find((card) => {
      const cardTitle = stripTags(firstMatch(card, /<h5 class="card-title text-info">\s*([\s\S]*?)\s*<\/h5>/i) ?? "");
      return cardTitle.trim().toLowerCase() === normalizedTitle;
    }) ?? ""
  );
}

function parseAnchor(block: string) {
  const href =
    firstMatch(block, /<a\b[^>]*\bhref="([^"]+)"/i) ??
    firstMatch(block, /<a\b[^>]*\bhref='([^']+)'/i) ??
    null;

  const name = stripTags(
    firstMatch(block, /<a\b[^>]*>([\s\S]*?)<\/a>/i) ??
      ""
  );

  const iconSrc =
    firstMatch(block, /<img\b[^>]*\bsrc="([^"]+)"/i) ??
    firstMatch(block, /<img\b[^>]*\bsrc='([^']+)'/i) ??
    null;

  return {
    slug: normalizeSlug(href),
    name: name || null,
    iconUrl: iconSrc ? absUrl(iconSrc) : null,
  };
}

function parseFirstImgSrc(block: string): string | null {
  const src =
    firstMatch(block, /<img\b[^>]*\bsrc="([^"]+)"/i) ??
    firstMatch(block, /<img\b[^>]*\bsrc='([^']+)'/i) ??
    null;
  return src ? absUrl(src) : null;
}

function parseRecipeSection(mainBlock: string): SpecialConstructionIngredient[] {
  const recipesBlock = firstMatch(mainBlock, /<div class="recipes">([\s\S]*?)<\/div>\s*<\/div>/i) ?? "";
  const rows = captureAll(
    recipesBlock,
    /<div class="d-flex justify-content-between p-2 align-items-center border-top">([\s\S]*?)<\/div>\s*<div>([^<]*)<\/div>\s*<\/div>/g
  );

  return rows
    .map((match) => {
      const left = match[1] ?? "";
      const qty = safeInt(match[2]);
      const anchor = parseAnchor(left);
      if (!anchor.name) return null;

      return {
        slug: anchor.slug ?? cleanKey(anchor.name.replace(/\s+/g, "_")) ?? "unknown",
        name: anchor.name,
        iconUrl: anchor.iconUrl,
        qty,
      } satisfies SpecialConstructionIngredient;
    })
    .filter((row): row is SpecialConstructionIngredient => row != null);
}

function parseStatRows(sectionHtml: string): SpecialConstructionStatRow[] {
  return captureAll(
    sectionHtml,
    /<div class="d-flex justify-content-between p-2 align-items-center border-bottom">\s*<div>([\s\S]*?)<\/div>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/g
  )
    .map((match) => ({
      label: stripTags(match[1] ?? ""),
      value: stripTags(match[2] ?? ""),
    }))
    .filter((row) => !!row.label);
}

function parseWorkSuitabilityFromHeader(mainBlock: string): SpecialConstructionWorkSuitability {
  const metaBlock = firstMatch(
    mainBlock,
    /<div class="d-flex flex-column small">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="card-body py-2">/i
  );
  if (!metaBlock) return null;

  const spanMatches = captureAll(metaBlock, /<span class="d-inline-block me-2 my-1">([\s\S]*?)<\/span>/g);
  for (const match of spanMatches) {
    const anchor = parseAnchor(match[1] ?? "");
    if (!anchor.slug || !anchor.name) continue;
    const level = safeInt(firstMatch(match[1] ?? "", /<span class="border p-1">([^<]+)<\/span>/i));
    return {
      slug: anchor.slug,
      name: anchor.name,
      iconUrl: anchor.iconUrl,
      level,
    };
  }

  return null;
}

function buildConstructionDetailRows(statsRows: SpecialConstructionStatRow[], otherRows: SpecialConstructionStatRow[]) {
  const keepStatLabels = new Set(["Type", "Workload", "Code", "Defense", "Worker Max", "Handiwork"]);
  const keepOtherLabels = new Set([
    "Hp",
    "Hp_PVP",
    "Defense_PVP",
    "bBelongToBaseCamp",
    "DeteriorationDamage",
    "ExtinguishBurnWorkAmount",
    "bShowHPGauge",
    "InstallMaxNumInBaseCamp",
    "BuildExpRate",
    "TypeUIDisplay",
    "TypeA",
    "TypeB",
    "Rank",
    "AssetValue",
    "bIsInstallOnlyHubAround",
  ]);

  return [
    ...statsRows.filter((row) => keepStatLabels.has(row.label)),
    ...otherRows.filter((row) => keepOtherLabels.has(row.label)),
  ];
}

function parseConstructionItem(mainBlock: string, slug: string): SpecialConstructionIndexItem {
  const name =
    stripTags(firstMatch(mainBlock, /<div class="align-self-center"[^>]*>\s*(<a[\s\S]*?<\/a>)/i) ?? "") ||
    slug.replace(/_/g, " ");

  const iconUrlRaw =
    extractSize128ImgUrl(mainBlock) ??
    null;

  const technologyLevel = safeInt(
    firstMatch(mainBlock, /Technology<\/span><\/span><span class="border p-1">([^<]+)<\/span>/i)
  );

  const description = stripTags(firstMatch(mainBlock, /<div class="card-body py-2">\s*<div>([\s\S]*?)<\/div>/i) ?? "");
  const recipe = parseRecipeSection(mainBlock);

  const statsSection = extractCardBlockByTitle(mainBlock, "Stats");
  const othersSection = extractCardBlockByTitle(mainBlock, "Others");

  const statsRows = parseStatRows(statsSection);
  const otherRows = parseStatRows(othersSection);

  let workSuitability = parseWorkSuitabilityFromHeader(mainBlock);
  const typeRow = statsRows.find((row) => row.label === "Type");
  const handiworkRow = statsRows.find((row) => /Handiwork/i.test(row.label));
  const workloadRow = statsRows.find((row) => row.label === "Workload");

  if (!workSuitability && handiworkRow) {
    workSuitability = {
      slug: "Handiwork",
      name: "Handiwork",
      iconUrl: null,
      level: safeInt(handiworkRow.value),
    };
  } else if (workSuitability && workSuitability.level == null && handiworkRow) {
    workSuitability = { ...workSuitability, level: safeInt(handiworkRow.value) };
  } else if (!workSuitability && workloadRow?.value.includes("Handiwork")) {
    workSuitability = {
      slug: "Handiwork",
      name: "Handiwork",
      iconUrl: null,
      level: null,
    };
  }

  return {
    slug,
    name,
    iconUrl: iconUrlRaw ? absUrl(iconUrlRaw) : null,
    categoryText: typeRow?.value ?? null,
    technologyLevel,
    workSuitability,
    description: description || null,
    recipe,
    detailRows: buildConstructionDetailRows(statsRows, otherRows),
    treant: parseTreantTreeFromPage(mainBlock),
  };
}

function parseExpeditionRewards(tableBlock: string, expeditionSlug: string): PalExpeditionRewardRow[] {
  const entries = captureAll(
    tableBlock,
    /<a\b[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>\s*<img\b[^>]*src=(?:"([^"]+)"|'([^']+)')[^>]*>\s*<\/a>\s*<a\b[^>]*class=(?:"[^"]*\bitemname\b[^"]*"|'[^']*\bitemname\b[^']*')[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>\s*<small class="itemQuantity">([\s\S]*?)<\/small>\s*<span class="float-end">([^<%]*[0-9.]+%)/g
  );

  return entries
    .map((match, index) => {
      const iconHref = match[1] ?? match[2] ?? "";
      const iconSrc = match[3] ?? match[4] ?? "";
      const itemHref = match[5] ?? match[6] ?? iconHref;
      const rawName = match[7] ?? "";
      const rawQuantity = match[8] ?? "";
      const rawChance = match[9] ?? "";

      const slug = normalizeSlug(itemHref);
      const name = stripTags(rawName);
      const quantityText = stripTags(rawQuantity).replace(/&ndash;/g, "–");
      const chanceText = safeText(rawChance);
      if (!name) return null;

      return {
        id: `${expeditionSlug}:${slug ?? cleanKey(name.replace(/\s+/g, "_")) ?? "reward"}:${index}`,
        slug,
        name,
        iconUrl: iconSrc ? absUrl(iconSrc) : null,
        quantityText: quantityText || null,
        chanceText: chanceText || null,
        chanceValue: safePercent(chanceText),
      } satisfies PalExpeditionRewardRow;
    })
    .filter((row): row is PalExpeditionRewardRow => row != null);
}

function parsePalExpeditions(expeditionBlock: string): PalExpeditionEntry[] {
  const items: PalExpeditionEntry[] = [];
  const rowBlocks = extractDivBlocksByClassToken(expeditionBlock, "row g-2");

  for (let index = 0; index < rowBlocks.length; index += 1) {
    const rowBlock = rowBlocks[index] ?? "";
    const left = extractFirstClassBlock(rowBlock, "col-lg-4");
    const right = extractFirstClassBlock(rowBlock, "col-lg-8");
    if (!left || !right) continue;

    const name =
      stripTags(firstMatch(left, /<h4\b[^>]*class="[^"]*\bcard-title\b[^"]*"[^>]*>([\s\S]*?)<\/h4>/i) ?? "") ||
      `Expedition ${index + 1}`;
    const objective =
      stripTags(firstMatch(left, /<div class="text-center">([\s\S]*?)<\/div>/i) ?? "") || "";
    const statRows = parseStatRows(left);

    const risk = statRows.find((row) => row.label === "Risk:")?.value ?? null;
    const duration = statRows.find((row) => row.label === "Duration")?.value ?? null;
    const requiredType = statRows.find((row) => row.label === "Required Type")?.value ?? null;
    const recommendedFirepower = safeInt(
      statRows.find((row) => row.label === "Recommended Firepower")?.value ?? null
    );

    const slug =
      cleanKey(name.replace(/[^\w]+/g, "_")) ??
      `expedition_${index + 1}`;

    items.push({
      id: `${slug}:${index}`,
      slug,
      name,
      objective: objective || null,
      risk: risk || null,
      duration: duration || null,
      recommendedFirepower,
      requiredType: requiredType || null,
      rewards: parseExpeditionRewards(right, slug),
    });
  }

  return items;
}

function parseFishingShadowEntries(tabBlock: string, shadowSize: FishingShadowSize): FishingShadowEntry[] {
  const rows = extractDivBlocksByClassToken(tabBlock, "col");
  const items: FishingShadowEntry[] = [];

  for (const row of rows) {
    if (!/float-end/i.test(row)) continue;

    const anchor = parseAnchor(
      firstMatch(
        row,
        /<a\b[^>]*class=(?:"[^"]*\bitemname\b[^"]*"|'[^']*\bitemname\b[^']*')[\s\S]*?<\/a>/i
      ) ??
        firstMatch(row, /<a\b[^>]*>([\s\S]*?)<\/a>/i) ??
        row
    );

    const name = anchor.name ?? stripTags(row);
    if (!name) continue;

    const levelText = decodeInlineEntities(safeText(firstMatch(row, /\bLv\.\s*([^<]+?)\s*<span class="float-end">/i)));
    const quantityText = decodeInlineEntities(safeText(firstMatch(row, /<small class="itemQuantity">([^<]+)<\/small>/i)));
    const chanceText = safeText(firstMatch(row, /class="float-end">([^<]+)</i));
    const isAlpha = /palAlpha/i.test(row);

    items.push({
      id: `${shadowSize}:${anchor.slug ?? cleanKey(name.replace(/[^\w]+/g, "_")) ?? "entry"}:${items.length}`,
      shadowSize,
      kind: quantityText ? "item" : "pal",
      slug: anchor.slug,
      name,
      iconUrl: anchor.iconUrl ?? parseFirstImgSrc(row),
      levelText: levelText || null,
      quantityText: quantityText || null,
      chanceText: chanceText || null,
      chanceValue: safePercent(chanceText),
      isAlpha,
    });
  }

  return items;
}

async function fetchStructurePage(url: string) {
  const response = await fetch(url, { method: "GET", headers: { accept: "text/html" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

async function getExpeditionBundle(): Promise<SpecialStructureBundle> {
  if (expeditionBundleCache && isFresh(expeditionBundleCacheAt)) return expeditionBundleCache;
  if (expeditionBundlePending) return expeditionBundlePending;

  expeditionBundlePending = (async () => {
    const html = await fetchStructurePage(`${BASE_EN}/Pal_Expedition_Station`);
    await yieldToUI();

    const mainBlock = extractFirstDivBlockById(html, "PalExpeditionStation");
    const expeditionBlock = extractFirstDivBlockById(html, "PalExpeditions");

    const bundle: SpecialStructureBundle = {
      construction: parseConstructionItem(mainBlock, "Pal_Expedition_Station"),
      expeditions: parsePalExpeditions(expeditionBlock),
    };

    expeditionBundleCache = bundle;
    expeditionBundleCacheAt = now();
    expeditionBundlePending = null;
    return bundle;
  })().catch((error) => {
    expeditionBundlePending = null;
    throw error;
  });

  return expeditionBundlePending;
}

async function getFishingBundle(): Promise<FishingPondBundle> {
  if (fishingBundleCache && isFresh(fishingBundleCacheAt)) return fishingBundleCache;
  if (fishingBundlePending) return fishingBundlePending;

  fishingBundlePending = (async () => {
    const html = await fetchStructurePage(`${BASE_EN}/Fishing_Pond`);
    await yieldToUI();

    const mainBlock = extractFirstDivBlockById(html, "FishingPond");
    const smallBlock = extractFirstDivBlockById(html, "SmallShadow");
    const mediumBlock = extractFirstDivBlockById(html, "MediumShadow");
    const bigBlock = extractFirstDivBlockById(html, "BigShadow");

    const bundle: FishingPondBundle = {
      construction: parseConstructionItem(mainBlock, "Fishing_Pond"),
      shadows: [
        ...parseFishingShadowEntries(smallBlock, "Small Shadow"),
        ...parseFishingShadowEntries(mediumBlock, "Medium Shadow"),
        ...parseFishingShadowEntries(bigBlock, "Big Shadow"),
      ],
    };

    fishingBundleCache = bundle;
    fishingBundleCacheAt = now();
    fishingBundlePending = null;
    return bundle;
  })().catch((error) => {
    fishingBundlePending = null;
    throw error;
  });

  return fishingBundlePending;
}

export async function fetchExpeditionStationList(): Promise<SpecialConstructionIndexItem[]> {
  const bundle = await getExpeditionBundle();
  return [bundle.construction];
}

export async function fetchExpeditionStationBundle(): Promise<ExpeditionStationBundle> {
  return getExpeditionBundle();
}

export async function fetchExpeditionStationDetail(slug: string): Promise<SpecialConstructionDetail> {
  const bundle = await getExpeditionBundle();
  const normalized = normalizeSlug(slug);
  if (!normalized || normalized !== bundle.construction.slug) {
    throw new Error(`Unknown expedition station slug: ${slug}`);
  }
  return bundle.construction;
}

export async function fetchPalExpeditions(): Promise<PalExpeditionEntry[]> {
  const bundle = await getExpeditionBundle();
  return bundle.expeditions;
}

export async function fetchFishingPondList(): Promise<SpecialConstructionIndexItem[]> {
  const bundle = await getFishingBundle();
  return [bundle.construction];
}

export async function fetchFishingPondBundle(): Promise<FishingPondDetailBundle> {
  return getFishingBundle();
}

export async function fetchFishingPondDetail(slug: string): Promise<SpecialConstructionDetail> {
  const bundle = await getFishingBundle();
  const normalized = normalizeSlug(slug);
  if (!normalized || normalized !== bundle.construction.slug) {
    throw new Error(`Unknown fishing pond slug: ${slug}`);
  }
  return bundle.construction;
}

export async function fetchFishingShadows(): Promise<FishingShadowEntry[]> {
  const bundle = await getFishingBundle();
  return bundle.shadows;
}
