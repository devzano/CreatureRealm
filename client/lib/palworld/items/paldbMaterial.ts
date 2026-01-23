// lib/palworld/paldbMaterial.ts
//
// PalDB Material scraping helpers (index + detail) for CreatureRealm.
//
// Index: https://paldb.cc/en/Material
// Detail: https://paldb.cc/en/<slug>
// Uses shared detail section parsing model via paldbDetailKit
//
// Output sections:
// - description (from index + best-effort from detail)
// - treant dependency tree
// - stats, others
// - producedAt
// - production, craftingMaterials
// - droppedBy, treasureBox, wanderingMerchant
// - soulUpgrade
//
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
  parseFirstItemLink,
  type DetailItemRef,
  type DetailRecipeRow,
  type TreantNode,
  type DroppedByRow,
  type TreasureBoxRow,
  type MerchantRow,
  type KeyValueRow,
} from "@/lib/palworld/paldbDetailKit";

// (Optional) re-export kit types for consumers that import from paldbMaterial.ts
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

export type MaterialRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number;
};

export type MaterialIndexItem = {
  slug: string; // e.g. "Pal_Oil" OR "/en/Pal_Oil" depending on PalDB
  name: string;
  iconUrl: string | null;

  rarity: string | null;
  technology: number | null;

  description: string | null;
  isAvailable: boolean;

  // list-page snippet recipes (kept for UI parity)
  recipes: MaterialRecipeIngredient[];
};

// -----------------------------
// Compat exports
// -----------------------------

export type MaterialListItem = MaterialIndexItem;

export async function fetchMaterialList(opts?: { force?: boolean }): Promise<MaterialIndexItem[]> {
  return fetchMaterialIndex(opts);
}

export async function warmMaterialList(): Promise<void> {
  return warmMaterialIndex();
}

// -----------------------------
// Eggs helpers
// -----------------------------

export function isEggMaterial(it: Pick<MaterialIndexItem, "name" | "slug">): boolean {
  const name = cleanKey(it.name).toLowerCase();
  const slug = cleanKey(it.slug).toLowerCase();

  // Covers most PalDB naming patterns without being too strict.
  // If PalDB ever changes labeling, you can extend this list safely.
  return name.includes("egg") || slug.includes("egg");
}

export async function fetchEggMaterialList(opts?: { force?: boolean }): Promise<MaterialIndexItem[]> {
  const all = await fetchMaterialIndex(opts);
  return all.filter(isEggMaterial);
}

// -----------------------------
// Types (Detail) - Sphere parity
// -----------------------------

export type SoulUpgradeRow = {
  material: DetailItemRef | null;
  qty: number | null;
  qtyText: string | null;
  rankText: string | null;
};

export type MaterialDetail = {
  // Index-ish fields (kept on detail for convenience)
  slug: string;
  name: string;
  iconUrl: string | null;
  rarity: string | null;
  technology: number | null;
  description: string | null;
  isAvailable: boolean;
  recipes: MaterialRecipeIngredient[];

  // Full detail sections (Sphere parity)
  stats: KeyValueRow[];
  others: KeyValueRow[];

  producedAt: DetailItemRef[];
  production: DetailRecipeRow[];
  craftingMaterials: DetailRecipeRow[];

  treant: TreantNode | null;
  droppedBy: DroppedByRow[];
  treasureBox: TreasureBoxRow[];
  wanderingMerchant: MerchantRow[];

  soulUpgrade: SoulUpgradeRow[];
};

// -----------------------------
// Cache
// -----------------------------

let _indexCache: MaterialIndexItem[] | null = null;
let _indexCacheAt = 0;
const _detailCache = new Map<string, { at: number; data: MaterialDetail }>();

const INDEX_TTL = 10 * 60 * 1000;
const DETAIL_TTL = 10 * 60 * 1000;

// -----------------------------
// Public API
// -----------------------------

export async function warmMaterialIndex(): Promise<void> {
  try {
    await fetchMaterialIndex({ force: false });
  } catch {
    // warm should never throw
  }
}

export async function fetchMaterialIndex(opts?: { force?: boolean }): Promise<MaterialIndexItem[]> {
  const force = !!opts?.force;
  const now = Date.now();

  if (!force && _indexCache && now - _indexCacheAt < INDEX_TTL) {
    return _indexCache;
  }

  const url = "https://paldb.cc/en/Material";
  const html = await fetchHtml(url);

  const items = parseMaterialIndexHtml(html);

  _indexCache = items;
  _indexCacheAt = now;

  return items;
}

export async function fetchMaterialDetail(slugOrHref: string, opts?: { force?: boolean }): Promise<MaterialDetail> {
  const idRaw = String(slugOrHref ?? "").trim();
  if (!idRaw) throw new Error("fetchMaterialDetail: missing slug/href");

  const url = normalizeDetailHref(idRaw);
  if (!url) throw new Error("fetchMaterialDetail: unable to normalize href");

  const cacheKey = cleanKey(idRaw);

  const force = !!opts?.force;
  const now = Date.now();

  const cached = _detailCache.get(cacheKey);
  if (!force && cached && now - cached.at < DETAIL_TTL) return cached.data;

  const html = await fetchHtml(url);

  const detail = parseMaterialDetailHtml(html, cacheKey);

  // merge index fallback (for icon/name/recipes/rarity/tech/desc) when missing
  const merged = mergeWithIndexFallback(detail);

  _detailCache.set(cacheKey, { at: now, data: merged });
  return merged;
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

  if (!res.ok) {
    throw new Error(`PalDB request failed: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

// -----------------------------
// Index parsing (/en/Material) - same “itemPopup card” model
// -----------------------------

export function parseMaterialIndexHtml(html: string): MaterialIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const chunks = src.split(/<div class="col">\s*<div class="card itemPopup">/i).slice(1);
  const items: MaterialIndexItem[] = [];

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

  const byKey = new Map<string, MaterialIndexItem>();
  for (const it of items) {
    const k = `${cleanKey(it.slug)}::${cleanKey(it.rarity ?? "")}`;
    if (!byKey.has(k)) byKey.set(k, it);
  }
  return Array.from(byKey.values());
}

function parseRecipes(recipesHtml: string): MaterialRecipeIngredient[] {
  const html = String(recipesHtml ?? "");
  if (!html) return [];

  const parts = html
    .split(/<div class="d-flex justify-content-between p-2 align-items-center border-top">/i)
    .slice(1);

  const out: MaterialRecipeIngredient[] = [];

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

  const map = new Map<string, MaterialRecipeIngredient>();
  for (const r of out) {
    if (!map.has(r.slug)) map.set(r.slug, r);
  }
  return Array.from(map.values());
}

function parseQtyFromText(txt: string | null): number | null {
  const s = cleanKey(txt ?? "");
  if (!s) return null;
  const m = s.match(/([0-9][0-9,]*)/);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseSoulUpgradeCardRowsFromPage(srcHtml: string): SoulUpgradeRow[] {
  const src = String(srcHtml ?? "");
  if (!src) return [];

  const card = extractCardByTitle(src, "soul upgrade");
  if (!card) return [];

  const tableHtml = extractFirstMb0TableHtml(card);
  if (!tableHtml) return [];

  // Split rows in a tolerant way (similar style to kit)
  const tbody =
    firstMatch(tableHtml, /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i) ??
    (() => {
      // fallback: no </tbody>
      const idx = tableHtml.search(/<tbody\b/i);
      if (idx < 0) return "";
      const after = tableHtml.slice(idx);
      const endOpen = after.indexOf(">");
      if (endOpen < 0) return "";
      const rest = tableHtml.slice(idx + endOpen + 1);
      const stop = rest.search(/<\/table\b/i);
      return stop >= 0 ? rest.slice(0, stop) : rest;
    })();

  if (!tbody) return [];

  const trs = Array.from(tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/tbody\b|$)/gi)).map((m) => m[1] ?? "");

  const out: SoulUpgradeRow[] = [];

  for (const trInner of trs) {
    const tds = Array.from(trInner.matchAll(/<td\b[^>]*>([\s\S]*?)(?=<td\b|<\/tr\b|$)/gi)).map((m) => m[1] ?? "");
    if (tds.length < 2) continue;

    const matTd = tds[0] ?? "";
    const rankTd = tds[1] ?? "";

    const material = parseFirstItemLink(matTd);
    const matText = cleanKey(htmlToText(matTd));

    // Examples: "... Giant Pal Soul ... x3"
    const qty = parseQtyFromText(matText);
    const qtyText = (() => {
      const m = matText.match(/\bx\s*([0-9][0-9,]*)\b/i);
      return m?.[1] ? `x${m[1].replace(/,/g, "")}` : qty != null ? `x${qty}` : null;
    })();

    const rankText = cleanKey(htmlToText(rankTd)) || null;

    // Skip totally empty junk rows
    if (!material && !rankText) continue;

    out.push({
      material: material ?? null,
      qty,
      qtyText,
      rankText,
    });
  }

  return out;
}

// -----------------------------
// Detail parsing (/en/<slug>) - Sphere parity using kit
// -----------------------------

function parseMaterialDetailHtml(html: string, slugKey: string): MaterialDetail {
  const src = String(html ?? "");

  const base: MaterialDetail = {
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
    soulUpgrade: [],
  };

  base.soulUpgrade = parseSoulUpgradeCardRowsFromPage(src);

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

function mergeWithIndexFallback(detail: MaterialDetail): MaterialDetail {
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
