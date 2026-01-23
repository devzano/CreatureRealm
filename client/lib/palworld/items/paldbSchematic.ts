// lib/palworld/paldbSchematic.ts
//
// PalDB Schematics (index + detail)
//
// Index: https://paldb.cc/en/Schematic
// Detail: https://paldb.cc/en/<slug>
// Uses shared detail parsing kit: lib/palworld/paldbDetailKit.ts
//
// Sections (parity with Material/Sphere):
// - description
// - treant dependency tree
// - stats, others
// - producedAt
// - production, craftingMaterials
// - droppedBy, treasureBox, wanderingMerchant
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
  type DetailItemRef,
  type DetailRecipeRow,
  type TreantNode,
  type DroppedByRow,
  type TreasureBoxRow,
  type MerchantRow,
  type KeyValueRow,
} from "@/lib/palworld/paldbDetailKit";

// (Optional) re-export kit types for consumers that import from paldbSchematic.ts
export type {
  DetailItemRef,
  DetailRecipeRow,
  TreantNode,
  DroppedByRow,
  TreasureBoxRow,
  MerchantRow,
  KeyValueRow,
} from "@/lib/palworld/paldbDetailKit";

// -----------------------------
// Types (Index)
// -----------------------------

export type SchematicRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number;
};

export type SchematicIndexItem = {
  slug: string; // "Some_Schematic" (cleanKey)
  name: string;
  iconUrl: string | null;

  rarity: string | null;
  technology: number | null;

  description: string | null;
  isAvailable: boolean;

  // list-page snippet recipes
  recipes: SchematicRecipeIngredient[];
};

// -----------------------------
// Types (Detail)
// -----------------------------

export type SchematicDetail = {
  // index-ish
  slug: string;
  name: string;
  iconUrl: string | null;
  rarity: string | null;
  technology: number | null;
  description: string | null;
  isAvailable: boolean;
  recipes: SchematicRecipeIngredient[];

  // full detail sections
  stats: KeyValueRow[];
  others: KeyValueRow[];

  producedAt: DetailItemRef[];
  production: DetailRecipeRow[];
  craftingMaterials: DetailRecipeRow[];

  treant: TreantNode | null;
  droppedBy: DroppedByRow[];
  treasureBox: TreasureBoxRow[];
  wanderingMerchant: MerchantRow[];
};

// -----------------------------
// Cache
// -----------------------------

let _indexCache: SchematicIndexItem[] | null = null;
let _indexCacheAt = 0;
const _detailCache = new Map<string, { at: number; data: SchematicDetail }>();

const INDEX_TTL = 10 * 60 * 1000;
const DETAIL_TTL = 10 * 60 * 1000;

// -----------------------------
// Public API
// -----------------------------

export async function warmSchematicIndex(): Promise<void> {
  try {
    await fetchSchematicIndex({ force: false });
  } catch {
    // warm should never throw
  }
}

export async function fetchSchematicIndex(opts?: { force?: boolean }): Promise<SchematicIndexItem[]> {
  const force = !!opts?.force;
  const now = Date.now();

  if (!force && _indexCache && now - _indexCacheAt < INDEX_TTL) return _indexCache;

  const url = "https://paldb.cc/en/Schematic";
  const html = await fetchHtml(url);

  const items = parseSchematicIndexHtml(html);

  _indexCache = items;
  _indexCacheAt = now;

  return items;
}

export async function fetchSchematicDetail(slugOrHref: string, opts?: { force?: boolean }): Promise<SchematicDetail> {
  const idRaw = String(slugOrHref ?? "").trim();
  if (!idRaw) throw new Error("fetchSchematicDetail: missing slug/href");

  const url = normalizeDetailHref(idRaw);
  if (!url) throw new Error("fetchSchematicDetail: unable to normalize href");

  const cacheKey = cleanKey(idRaw);

  const force = !!opts?.force;
  const now = Date.now();

  const cached = _detailCache.get(cacheKey);
  if (!force && cached && now - cached.at < DETAIL_TTL) return cached.data;

  const html = await fetchHtml(url);

  const detail = parseSchematicDetailHtml(html, cacheKey);

  // merge index fallback (icon/name/rarity/tech/desc/recipes) when missing
  const merged = mergeWithIndexFallback(detail);

  _detailCache.set(cacheKey, { at: now, data: merged });
  return merged;
}

// Compat helpers (optional parity naming)
export type SchematicListItem = SchematicIndexItem;
export async function fetchSchematicList(opts?: { force?: boolean }) {
  return fetchSchematicIndex(opts);
}
export async function warmSchematicList() {
  return warmSchematicIndex();
}

// -----------------------------
// Fetch helper
// -----------------------------

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`PalDB request failed: ${res.status} ${res.statusText}`);

  return await res.text();
}

// -----------------------------
// Index parsing (/en/Schematic)
// -----------------------------

export function parseSchematicIndexHtml(html: string): SchematicIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const chunks = src.split(/<div class="col">\s*<div class="card itemPopup">/i).slice(1);
  const items: SchematicIndexItem[] = [];

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
      description: description || null,
      isAvailable,
      recipes,
    });
  }

  const bySlug = new Map<string, SchematicIndexItem>();
  for (const it of items) {
    if (!bySlug.has(it.slug)) bySlug.set(it.slug, it);
  }
  return Array.from(bySlug.values());
}

function parseRecipes(recipesHtml: string): SchematicRecipeIngredient[] {
  const html = String(recipesHtml ?? "");
  if (!html) return [];

  const parts = html
    .split(/<div class="d-flex justify-content-between p-2 align-items-center border-top">/i)
    .slice(1);

  const out: SchematicRecipeIngredient[] = [];

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

  const map = new Map<string, SchematicRecipeIngredient>();
  for (const r of out) {
    if (!map.has(r.slug)) map.set(r.slug, r);
  }
  return Array.from(map.values());
}

// -----------------------------
// Detail parsing (/en/<slug>) - via kit
// -----------------------------

function parseSchematicDetailHtml(html: string, slugKey: string): SchematicDetail {
  const src = String(html ?? "");

  const base: SchematicDetail = {
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

    stats: [],
    others: [],
    producedAt: [],
    production: [],
    craftingMaterials: [],
    treant: parseTreantTreeFromPage(src),
    droppedBy: [],
    treasureBox: [],
    wanderingMerchant: [],
  };

  // Stats
  {
    const card = extractCardByTitle(src, "stats");
    if (card) base.stats = parseKeyValueRows(card);
  }

  // Others
  {
    const card = extractCardByTitle(src, "others");
    if (card) base.others = parseKeyValueRows(card);
  }

  // Production + Produced At
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

  // Crafting Materials
  {
    const card = extractCardByTitle(src, "crafting materials");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.craftingMaterials = parseRecipeTable(tableHtml);
    }
  }

  // Dropped By
  {
    const card = extractCardByTitle(src, "dropped by");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.droppedBy = parseDroppedByTable(tableHtml);
    }
  }

  // Treasure Box
  {
    const card = extractCardByTitle(src, "treasure box");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.treasureBox = parseTreasureBoxTable(tableHtml);
    }
  }

  // Wandering Merchant
  {
    const card = extractCardByTitle(src, "wandering merchant");
    if (card) {
      const tableHtml = extractFirstMb0TableHtml(card);
      if (tableHtml) base.wanderingMerchant = parseMerchantTable(tableHtml);
    }
  }

  return base;
}

function mergeWithIndexFallback(detail: SchematicDetail): SchematicDetail {
  const index = _indexCache?.find((x) => cleanKey(x.slug) === cleanKey(detail.slug));
  if (!index) return detail;

  return {
    ...detail,
    name: detail.name?.trim() ? detail.name : index.name,
    iconUrl: detail.iconUrl || index.iconUrl,
    rarity: detail.rarity || index.rarity,
    technology: detail.technology ?? index.technology ?? null,
    description: detail.description || index.description,
    isAvailable: detail.isAvailable ?? index.isAvailable,
    recipes: detail.recipes?.length ? detail.recipes : index.recipes,
  };
}
