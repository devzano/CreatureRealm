// lib/palworld/paldbIngredient.ts
//
// PalDB Ingredient scraping helpers (index + detail) for CreatureRealm.
//
// Index: https://paldb.cc/en/Ingredient
// Detail: https://paldb.cc/en/<slug>
// Uses shared detail section parsing model via paldbDetailKit
//

import {
  absUrl,
  allMatches,
  cleanKey,
  firstMatch,
  htmlToText,
  extractSize128ImgUrl,
  extractAnyInventoryIconUrl,
} from "@/lib/palworld/palworldDB";

import {
  normalizeDetailHref,
  extractCardByTitle,
  extractFirstMb0TableHtml,
  parseKeyValueRows,
  parseItemLinks,
  parseRecipeTable,
  parseDroppedByTable,
  parseTreasureBoxTable,
  parseMerchantTable,
  parseTreantTreeFromPage,
  parseResearchTable,
  type DetailItemRef,
  type DetailRecipeRow,
  type TreantNode,
  type DroppedByRow,
  type TreasureBoxRow,
  type MerchantRow,
  type KeyValueRow,
  type ResearchRow,
} from "@/lib/palworld/paldbDetailKit";

export type {
  DetailItemRef,
  DetailRecipeRow,
  TreantNode,
  DroppedByRow,
  TreasureBoxRow,
  MerchantRow,
  KeyValueRow,
  ResearchRow,
} from "@/lib/palworld/paldbDetailKit";

export type IngredientRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number;
};

export type IngredientIndexItem = {
  slug: string;
  name: string;
  iconUrl: string | null;

  rarity: string | null;
  technology: number | null;

  nutrition: number | null;

  description: string | null;
  isAvailable: boolean;

  recipes: IngredientRecipeIngredient[];
};

export type IngredientListItem = IngredientIndexItem;

export async function fetchIngredientList(opts?: { force?: boolean }): Promise<IngredientIndexItem[]> {
  return fetchIngredientIndex(opts);
}

export async function warmIngredientList(): Promise<void> {
  return warmIngredientIndex();
}

export type IngredientDetail = {
  slug: string;
  name: string;
  iconUrl: string | null;
  rarity: string | null;
  technology: number | null;

  nutrition: number | null;

  description: string | null;
  isAvailable: boolean;
  recipes: IngredientRecipeIngredient[];

  stats: KeyValueRow[];
  foods: KeyValueRow[];
  others: KeyValueRow[];

  producedAt: DetailItemRef[];
  production: DetailRecipeRow[];
  craftingMaterials: DetailRecipeRow[];

  treant: TreantNode | null;
  droppedBy: DroppedByRow[];
  treasureBox: TreasureBoxRow[];
  wanderingMerchant: MerchantRow[];
  research: ResearchRow[];
};

let _indexCache: IngredientIndexItem[] | null = null;
let _indexCacheAt = 0;
const _detailCache = new Map<string, { at: number; data: IngredientDetail }>();

const INDEX_TTL = 10 * 60 * 1000;
const DETAIL_TTL = 10 * 60 * 1000;

export async function warmIngredientIndex(): Promise<void> {
  try {
    await fetchIngredientIndex({ force: false });
  } catch {}
}

export async function fetchIngredientIndex(opts?: { force?: boolean }): Promise<IngredientIndexItem[]> {
  const force = !!opts?.force;
  const now = Date.now();

  if (!force && _indexCache && now - _indexCacheAt < INDEX_TTL) {
    return _indexCache;
  }

  const url = "https://paldb.cc/en/Ingredient";
  const html = await fetchHtml(url);

  const items = parseIngredientIndexHtml(html);

  _indexCache = items;
  _indexCacheAt = now;

  return items;
}

export async function fetchIngredientDetail(slugOrHref: string, opts?: { force?: boolean }): Promise<IngredientDetail> {
  const idRaw = String(slugOrHref ?? "").trim();
  if (!idRaw) throw new Error("fetchIngredientDetail: missing slug/href");

  const url = normalizeDetailHref(idRaw);
  if (!url) throw new Error("fetchIngredientDetail: unable to normalize href");

  const cacheKey = cleanKey(idRaw);

  const force = !!opts?.force;
  const now = Date.now();

  const cached = _detailCache.get(cacheKey);
  if (!force && cached && now - cached.at < DETAIL_TTL) return cached.data;

  const html = await fetchHtml(url);

  const detail = parseIngredientDetailHtml(html, cacheKey);
  const merged = mergeWithIndexFallback(detail);

  _detailCache.set(cacheKey, { at: now, data: merged });
  return merged;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
  });

  if (!res.ok) throw new Error(`PalDB request failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

export function parseIngredientIndexHtml(html: string): IngredientIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const chunks = src.split(/<div class="col">\s*<div class="card itemPopup">/i).slice(1);
  const items: IngredientIndexItem[] = [];

  for (const rawChunk of chunks) {
    const chunk = `<div class="card itemPopup">${rawChunk}`;

    const slug =
      firstMatch(chunk, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*\bhref="([^"]+)"/i) ??
      firstMatch(chunk, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*\bhref='([^']+)'/i);

    if (!slug) continue;

    const name =
      firstMatch(chunk, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>\s*([^<]+?)\s*<\/a>/i) ??
      firstMatch(chunk, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*>\s*([^<]+?)\s*<\/a>/i);

    const rarity =
      firstMatch(chunk, /<span\b[^>]*class="[^"]*\bhover_text_rarity\d+\b[^"]*"[^>]*>\s*([^<]+?)\s*<\/span>/i) ??
      firstMatch(chunk, /<span\b[^>]*class='[^']*\bhover_text_rarity\d+\b[^']*'[^>]*>\s*([^<]+?)\s*<\/span>/i);

    const iconUrl = extractSize128ImgUrl(chunk) ?? extractAnyInventoryIconUrl(chunk) ?? null;

    const techStr =
      firstMatch(
        chunk,
        /Technology<\/span>\s*<\/span>\s*<span\b[^>]*class="[^"]*\bborder\b[^"]*"[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ??
      firstMatch(
        chunk,
        /Technology<\/span>\s*<\/span>\s*<span\b[^>]*class='[^']*\bborder\b[^']*'[^>]*>\s*([0-9]+)\s*<\/span>/i
      );

    const technology = techStr ? Number(techStr) : null;

    // Nutrition varies a bit in markup. Use a looser match (like other construction scrapers).
    const nutritionStr =
      firstMatch(
        chunk,
        /Nutrition[\s\S]{0,240}?<span\b[^>]*class="[^"]*\bborder\b[^"]*"[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ??
      firstMatch(
        chunk,
        /Nutrition[\s\S]{0,240}?<span\b[^>]*class='[^']*\bborder\b[^']*'[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ??
      firstMatch(
        chunk,
        /Nutrition[\s\S]{0,240}?<span\b[^>]*class="[^"]*\bborder p-1\b[^"]*"[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ??
      firstMatch(
        chunk,
        /Nutrition[\s\S]{0,240}?<span\b[^>]*class='[^']*\bborder p-1\b[^']*'[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ??
      null;

    const nutrition = nutritionStr ? Number(nutritionStr) : null;

    const descHtml =
      firstMatch(chunk, /<div\b[^>]*class="card-body[^"]*"[^>]*>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/i) ??
      firstMatch(chunk, /<div\b[^>]*class='card-body[^']*'[^>]*>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/i);

    const description = descHtml ? cleanKey(htmlToText(descHtml)) : null;

    const isAvailable = !/fa-sack-xmark|Not available/i.test(chunk);

    const recipesHtml =
      firstMatch(chunk, /<div\b[^>]*class="recipes"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*$/i) ??
      firstMatch(chunk, /<div\b[^>]*class='recipes'[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*$/i) ??
      firstMatch(chunk, /<div\b[^>]*class="recipes"[^>]*>([\s\S]*?)<\/div>/i) ??
      firstMatch(chunk, /<div\b[^>]*class='recipes'[^>]*>([\s\S]*?)<\/div>/i);

    const recipes = recipesHtml ? parseRecipes(recipesHtml) : [];

    items.push({
      slug: cleanKey(slug),
      name: cleanKey(name ?? slug),
      iconUrl: iconUrl ? absUrl(iconUrl) : null,
      rarity: rarity ? cleanKey(rarity) : null,
      technology: Number.isFinite(technology as any) ? technology : null,
      nutrition: Number.isFinite(nutrition as any) ? nutrition : null,
      description: description || null,
      isAvailable,
      recipes,
    });
  }

  const bySlug = new Map<string, IngredientIndexItem>();
  for (const it of items) if (!bySlug.has(it.slug)) bySlug.set(it.slug, it);
  return Array.from(bySlug.values());
}

function parseRecipes(recipesHtml: string): IngredientRecipeIngredient[] {
  const html = String(recipesHtml ?? "");
  if (!html) return [];

  const parts = html.split(/<div class="d-flex justify-content-between p-2 align-items-center border-top">/i).slice(1);

  const out: IngredientRecipeIngredient[] = [];

  for (const part of parts) {
    const row = part;

    const slug = firstMatch(row, /\bhref="([^"]+)"/i) ?? firstMatch(row, /\bhref='([^']+)'/i) ?? null;

    const name =
      firstMatch(row, /<\/img>\s*([^<]+?)\s*<\/a>/i) ??
      firstMatch(row, /\/>\s*([^<]+?)\s*<\/a>/i) ??
      firstMatch(row, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>[\s\S]*?([^<]+?)\s*<\/a>/i) ??
      firstMatch(row, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*>[\s\S]*?([^<]+?)\s*<\/a>/i);

    const icon = firstMatch(row, /<img\b[^>]*\bsrc="([^"]+)"/i) ?? firstMatch(row, /<img\b[^>]*\bsrc='([^']+)'/i);

    const qtyStr =
      firstMatch(row, /<\/a>\s*<\/div>\s*<div>\s*([0-9]+)\s*<\/div>/i) ??
      (allMatches(row, /<div>\s*([0-9]+)\s*<\/div>/gi).slice(-1)[0] ?? null);

    const qty = qtyStr ? Number(qtyStr) : 0;

    if (!slug) continue;

    out.push({
      slug: cleanKey(slug),
      name: cleanKey(name ?? slug),
      iconUrl: icon ? absUrl(icon) : null,
      qty: Number.isFinite(qty) ? qty : 0,
    });
  }

  const map = new Map<string, IngredientRecipeIngredient>();
  for (const r of out) if (!map.has(r.slug)) map.set(r.slug, r);
  return Array.from(map.values());
}

function parseIngredientDetailHtml(html: string, slugKey: string): IngredientDetail {
  const src = String(html ?? "");

  const base: IngredientDetail = {
    slug: cleanKey(slugKey),
    name: cleanKey(
      firstMatch(src, /<h2\b[^>]*>\s*([^<]+?)\s*<\/h2>/i) ??
        (firstMatch(src, /<title>\s*([^<]+?)\s*<\/title>/i) ?? slugKey)
    ),
    iconUrl: (() => {
      const icon =
        extractSize128ImgUrl(src) ??
        extractAnyInventoryIconUrl(src) ??
        firstMatch(src, /<img\b[^>]*\bsrc="([^"]+InventoryItemIcon[^"]+)"/i) ??
        firstMatch(src, /<img\b[^>]*\bsrc='([^']+InventoryItemIcon[^']+)'/i) ??
        null;
      return icon ? absUrl(String(icon)) : null;
    })(),
    rarity:
      cleanKey(
        firstMatch(src, /<span\b[^>]*class="[^"]*\bhover_text_rarity\d+\b[^"]*"[^>]*>\s*([^<]+?)\s*<\/span>/i) ??
          firstMatch(src, /<span\b[^>]*class='[^']*\bhover_text_rarity\d+\b[^']*'[^>]*>\s*([^<]+?)\s*<\/span>/i) ??
          ""
      ) || null,
    technology: (() => {
      const techStr =
        firstMatch(
          src,
          /Technology<\/span>\s*<\/span>\s*<span\b[^>]*class="[^"]*\bborder\b[^"]*"[^>]*>\s*([0-9]+)\s*<\/span>/i
        ) ??
        firstMatch(
          src,
          /Technology<\/span>\s*<\/span>\s*<span\b[^>]*class='[^']*\bborder\b[^']*'[^>]*>\s*([0-9]+)\s*<\/span>/i
        );
      const n = techStr != null ? Number(techStr) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),
    description: (() => {
      const descHtml =
        firstMatch(src, /<div\b[^>]*class="card-body[^"]*"[^>]*>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/i) ??
        firstMatch(src, /<div\b[^>]*class='card-body[^']*'[^>]*>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/i) ??
        null;
      const txt = descHtml ? cleanKey(htmlToText(descHtml)) : "";
      return txt || null;
    })(),
    isAvailable: !/fa-sack-xmark|Not available/i.test(src),
    recipes: [],

    nutrition: null,

    stats: [],
    others: [],
    foods: [],

    producedAt: [],
    production: [],
    craftingMaterials: [],
    treant: parseTreantTreeFromPage(src),
    droppedBy: [],
    treasureBox: [],
    wanderingMerchant: [],
    research: [],
  };

  {
    const card = extractCardByTitle(src, "stats");
    if (card) base.stats = parseKeyValueRows(card);
  }

  {
    const card = extractCardByTitle(src, "others");
    if (card) base.others = parseKeyValueRows(card);
  }

  {
    const card = extractCardByTitle(src, "foods") ?? extractCardByTitle(src, "food");
    if (card) base.foods = parseKeyValueRows(card);

    const n = extractNutritionFromKeyValues(base.foods);
    if (n != null) base.nutrition = n;
  }

  {
    const card = extractCardByTitle(src, "production");
    if (card) {
      const producedAtHtml =
        firstMatch(card, /<div class="row row-cols-1 row-cols-lg-2 g-2">\s*([\s\S]*?)<\/div>/i) ??
        firstMatch(card, /<div class='row row-cols-1 row-cols-lg-2 g-2'>\s*([\s\S]*?)<\/div>/i) ??
        null;

      if (producedAtHtml) base.producedAt = parseItemLinks(producedAtHtml);

      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.production = parseRecipeTable(tableHtml);
    }
  }

  {
    const card = extractCardByTitle(src, "crafting materials");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.craftingMaterials = parseRecipeTable(tableHtml);
    }
  }

  {
    const card = extractCardByTitle(src, "dropped by");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.droppedBy = parseDroppedByTable(tableHtml);
    }
  }

  {
    const card = extractCardByTitle(src, "treasure box");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.treasureBox = parseTreasureBoxTable(tableHtml);
    }
  }

  {
    const card = extractCardByTitle(src, "wandering merchant");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.wanderingMerchant = parseMerchantTable(tableHtml);
    }
  }

  {
    const card = extractCardByTitle(src, "research");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.research = parseResearchTable(tableHtml);
    }
  }

  return base;
}

function mergeWithIndexFallback(detail: IngredientDetail): IngredientDetail {
  const index = _indexCache?.find((x) => cleanKey(x.slug) === cleanKey(detail.slug));
  if (!index) return detail;

  return {
    ...detail,
    name: detail.name?.trim() ? detail.name : index.name,
    iconUrl: detail.iconUrl || index.iconUrl,
    rarity: detail.rarity || index.rarity,
    technology: detail.technology ?? index.technology ?? null,
    nutrition: detail.nutrition ?? index.nutrition ?? null,
    description: detail.description || index.description,
    isAvailable: detail.isAvailable ?? index.isAvailable,
    recipes: detail.recipes?.length ? detail.recipes : index.recipes,
  };
}

function extractNutritionFromKeyValues(rows: KeyValueRow[]): number | null {
  const arr = Array.isArray(rows) ? rows : [];
  for (const r of arr) {
    const k = String((r as any)?.key ?? "").trim().toLowerCase();
    if (!k) continue;

    if (k === "nutrition" || k.includes("nutrition")) {
      const v = String((r as any)?.valueText ?? "").trim();
      const n = Number(v.replace(/[^0-9.]+/g, ""));
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}
