// lib/palworld/paldbArmor.ts
//
// PalDB Armor (index + detail)
// Index:  https://paldb.cc/en/Armor
// Detail: https://paldb.cc/en/<slug>
//
// Uses shared detail parsing kit: lib/palworld/paldbDetailKit.ts
// (same contract style as your Material/Sphere/Ammo detail screens)
//
// IMPORTANT UPDATE (variants):
// PalDB often lists multiple “varieties” of the same base item (same href/slug) with different rarity/tech/etc.
// Your previous code deduped by slug, collapsing variants into a single entry.
// This update:
//  - Keeps ALL variants in the index by deduping with a VARIANT KEY (slug + rarity + technology + iconUrl)
//  - Keeps detail cache keyed by VARIANT KEY while still fetching detail by slug URL
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

// re-export kit types for consumers
export type {
  DetailItemRef,
  DetailRecipeRow,
  TreantNode,
  DroppedByRow,
  TreasureBoxRow,
  MerchantRow,
  KeyValueRow,
} from "@/lib/palworld/paldbDetailKit";

export type ArmorRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number;
};

export type ArmorIndexItem = {
  slug: string; // cleanKey
  name: string;
  iconUrl: string | null;

  rarity: string | null;
  technology: number | null;

  description: string | null;
  isAvailable: boolean;

  // list-page snippet recipes
  recipes: ArmorRecipeIngredient[];
};

// Optional helper for UI/caches to keep variants distinct
export type ArmorVariantKey = string;

export type ArmorDetail = {
  slug: string;
  name: string;
  iconUrl: string | null;
  rarity: string | null;
  technology: number | null;
  description: string | null;
  effects: string[];
  isAvailable: boolean;
  recipes: ArmorRecipeIngredient[];
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

let _indexCache: ArmorIndexItem[] | null = null;
let _indexCacheAt = 0;

// Cache by VARIANT key (not just slug) to avoid “variety collapsing” in UI flows that reuse cache.
const _detailCache = new Map<string, { at: number; data: ArmorDetail }>();

const INDEX_TTL = 10 * 60 * 1000;
const DETAIL_TTL = 10 * 60 * 1000;

export async function warmArmorIndex(): Promise<void> {
  try {
    await fetchArmorIndex({ force: false });
  } catch {}
}

export async function fetchArmorIndex(opts?: { force?: boolean }): Promise<ArmorIndexItem[]> {
  const force = !!opts?.force;
  const now = Date.now();

  if (!force && _indexCache && now - _indexCacheAt < INDEX_TTL) return _indexCache;

  const html = await fetchHtml("https://paldb.cc/en/Armor");
  const items = parseArmorIndexHtml(html);

  _indexCache = items;
  _indexCacheAt = now;

  return items;
}

// If you pass a plain slug/href, it will still work.
// If you pass a variantKey (slug::rarity::tech::icon), we’ll still fetch by slug but cache per-variant.
export async function fetchArmorDetail(slugOrHref: string, opts?: { force?: boolean }): Promise<ArmorDetail> {
  const idRaw = String(slugOrHref ?? "").trim();
  if (!idRaw) throw new Error("fetchArmorDetail: missing slug/href");

  // If caller passes a variantKey, normalize url from the slug portion.
  const { slugPart, variantKey } = splitVariantKey(idRaw);

  const url = normalizeDetailHref(slugPart);
  if (!url) throw new Error("fetchArmorDetail: unable to normalize href");

  const force = !!opts?.force;
  const now = Date.now();

  const cached = _detailCache.get(variantKey);
  if (!force && cached && now - cached.at < DETAIL_TTL) return cached.data;

  const html = await fetchHtml(url);
  const detail = parseArmorDetailHtml(html, cleanKey(slugPart));
  const merged = mergeWithIndexFallback(detail, variantKey);

  _detailCache.set(variantKey, { at: now, data: merged });
  return merged;
}

export type ArmorListItem = ArmorIndexItem;
export async function fetchArmorList(opts?: { force?: boolean }) {
  return fetchArmorIndex(opts);
}
export async function warmArmorList() {
  return warmArmorIndex();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
  });

  if (!res.ok) throw new Error(`PalDB request failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

// -----------------------------
// Variants helpers
// -----------------------------

function safePart(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

// Variant key for dedupe + caching.
// Keep it stable and “specific enough” to separate varieties.
export function armorVariantKeyFromIndex(it: Pick<ArmorIndexItem, "slug" | "rarity" | "technology" | "iconUrl">): ArmorVariantKey {
  const slug = cleanKey(it.slug);
  const rarity = cleanKey(it.rarity ?? "");
  const tech = it.technology != null && Number.isFinite(it.technology as any) ? String(it.technology) : "";
  const icon = cleanKey(it.iconUrl ?? "");
  return `${slug}::${rarity}::${tech}::${icon}`;
}

// Allow callers to pass either:
//  - "/en/Armor_ColdResistant" (slug)
//  - "/en/Armor_ColdResistant::Rare::12::https://..." (variantKey)
function splitVariantKey(input: string): { slugPart: string; variantKey: string } {
  const s = String(input ?? "").trim();
  if (!s) return { slugPart: "", variantKey: "" };

  // If it looks like our variantKey, use left side as slug.
  if (s.includes("::")) {
    const slugPart = s.split("::")[0] ?? s;
    return { slugPart, variantKey: cleanKey(s) };
  }

  // Otherwise cache under a minimal variantKey (slug only)
  const slugPart = s;
  const variantKey = armorVariantKeyFromIndex({
    slug: slugPart,
    rarity: "",
    technology: null,
    iconUrl: null,
  });
  return { slugPart, variantKey };
}

export function parseArmorIndexHtml(html: string): ArmorIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const chunks = src.split(/<div class="col">\s*<div class="card itemPopup">/i).slice(1);
  const items: ArmorIndexItem[] = [];

  for (const rawChunk of chunks) {
    const chunk = `<div class="card itemPopup">${rawChunk}`;

    const href =
      firstMatch(chunk, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*\bhref="([^"]+)"/i) ??
      firstMatch(chunk, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*\bhref='([^']+)'/i);

    if (!href) continue;

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
      firstMatch(chunk, /<div\b[^>]*class="recipes"[^>]*>([\s\S]*?)<\/div>/i) ??
      firstMatch(chunk, /<div\b[^>]*class='recipes'[^>]*>([\s\S]*?)<\/div>/i);

    const recipes = recipesHtml ? parseRecipes(recipesHtml) : [];

    items.push({
      slug: cleanKey(href),
      name: cleanKey(name ?? href),
      iconUrl: iconUrl ? absUrl(iconUrl) : null,
      rarity: rarity ? cleanKey(rarity) : null,
      technology: Number.isFinite(technology as any) ? technology : null,
      description: description || null,
      isAvailable,
      recipes,
    });
  }

  // IMPORTANT: do NOT dedupe by slug; keep variants.
  // Dedup by a stronger key so exact duplicates collapse, but varieties remain.
  const byVariant = new Map<string, ArmorIndexItem>();
  for (const it of items) {
    const k = armorVariantKeyFromIndex(it);
    if (!byVariant.has(k)) byVariant.set(k, it);
  }
  return Array.from(byVariant.values());
}

function parseRecipes(recipesHtml: string): ArmorRecipeIngredient[] {
  const html = String(recipesHtml ?? "");
  if (!html) return [];

  // Capture each "border-top" row in a tolerant way (class order can vary)
  const rowRe =
    /<div\b[^>]*class=(?:"[^"]*\bborder-top\b[^"]*"|'[^']*\bborder-top\b[^']*')[^>]*>[\s\S]*?(?=<div\b[^>]*class=(?:"[^"]*\bborder-top\b[^"]*"|'[^']*\bborder-top\b[^']*')[^>]*>|$)/gi;

  const rows = Array.from(html.matchAll(rowRe)).map((m) => m[0] ?? "");
  const out: ArmorRecipeIngredient[] = [];

  const lastNumberInRow = (row: string): string | null => {
    const nums = Array.from(row.matchAll(/>\s*([0-9][0-9,]*)\s*</g)).map((m) => m[1]);
    return nums.length ? nums[nums.length - 1] : null;
  };

  for (const row of rows.length ? rows : [html]) {
    // Ingredient link
    const slug =
      firstMatch(row, /\bhref="([^"]+)"/i) ??
      firstMatch(row, /\bhref='([^']+)'/i) ??
      null;

    if (!slug) continue;

    // Icon
    const icon =
      firstMatch(row, /<img\b[^>]*\bsrc="([^"]+)"/i) ??
      firstMatch(row, /<img\b[^>]*\bsrc='([^']+)'/i) ??
      null;

    // Name (prefer anchor text without the img)
    const anchorInner =
      firstMatch(row, /<a\b[^>]*>\s*([\s\S]*?)\s*<\/a>/i) ??
      firstMatch(row, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>/i) ??
      firstMatch(row, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*>\s*([\s\S]*?)\s*<\/a>/i) ??
      "";

    const name = cleanKey(htmlToText(String(anchorInner).replace(/<img[\s\S]*?>/gi, " ").trim()));

    // Qty (prefer itemQuantity; fall back to last numeric cell)
    const qtyText =
      firstMatch(row, /<small\b[^>]*class="itemQuantity"[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
      firstMatch(row, /<small\b[^>]*class='itemQuantity'[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
      null;

    const qtyStr = qtyText ? cleanKey(qtyText) : (lastNumberInRow(row) ? String(lastNumberInRow(row)) : null);

    const qtyNum = qtyStr ? Number(String(qtyStr).replace(/,/g, "").match(/[0-9]+/)?.[0] ?? "") : NaN;
    const qty = Number.isFinite(qtyNum) ? qtyNum : 0;

    out.push({
      slug: cleanKey(slug),
      name: cleanKey(name || slug),
      iconUrl: icon ? absUrl(icon) : null,
      qty,
    });
  }

  // dedupe by slug but KEEP the highest qty (some rows may repeat)
  const map = new Map<string, ArmorRecipeIngredient>();
  for (const r of out) {
    const prev = map.get(r.slug);
    if (!prev) {
      map.set(r.slug, r);
      continue;
    }
    if ((r.qty ?? 0) > (prev.qty ?? 0)) map.set(r.slug, r);
  }

  return Array.from(map.values());
}

function extractCardBodyInnerForDescription(src: string): string | null {
  return (
    firstMatch(src, /<div\b[^>]*class="card-body[^"]*"[^>]*>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/i) ??
    firstMatch(src, /<div\b[^>]*class='card-body[^']*'[^>]*>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/i) ??
    null
  );
}

function stripItemSkillBarsFromDescHtml(descHtml: string): string {
  const s = String(descHtml ?? "");
  if (!s) return s;

  // Remove the entire item_skill_bar blocks from the “about” HTML
  return s.replace(
    /<div\b[^>]*class=(?:"[^"]*\bitem_skill_bar\b[^"]*"|'[^']*\bitem_skill_bar\b[^']*')[^>]*>[\s\S]*?<\/div>/gi,
    " "
  );
}

function extractItemSkillBarsTextFromSrc(src: string): string[] {
  const s = String(src ?? "");
  if (!s) return [];

  const matches = allMatches(
    s,
    /<div\b[^>]*class=(?:"[^"]*\bitem_skill_bar\b[^"]*"|'[^']*\bitem_skill_bar\b[^']*')[^>]*>([\s\S]*?)<\/div>/gi
  );

  const out: string[] = [];
  for (const inner of matches) {
    const txt = cleanKey(htmlToText(inner));
    if (txt) out.push(txt);
  }

  // dedup while preserving order
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

export function parseArmorDetailHtml(html: string, slugKey: string): ArmorDetail {
  const src = String(html ?? "");

  const base: ArmorDetail = {
    slug: cleanKey(slugKey),
    name: cleanKey(firstMatch(src, /<h2\b[^>]*>\s*([^<]+?)\s*<\/h2>/i) ?? slugKey),
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
        ) ??
        null;
      const n = techStr != null ? Number(techStr) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),

    description: (() => {
      const noBars = stripItemSkillBarsFromDescHtml(src);
      const descHtml = extractCardBodyInnerForDescription(noBars) ?? null;
      if (!descHtml) return null;

      const txt = cleanKey(htmlToText(descHtml));
      return txt || null;
    })(),

    effects: (() => {
      return extractItemSkillBarsTextFromSrc(src);
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

function mergeWithIndexFallback(detail: ArmorDetail, variantKey: string): ArmorDetail {
  // Prefer matching by exact variantKey when possible.
  const indexExact =
    _indexCache?.find((x) => armorVariantKeyFromIndex(x) === variantKey) ??
    null;

  // Fallback: match by slug only
  const indexBySlug = _indexCache?.find((x) => cleanKey(x.slug) === cleanKey(detail.slug)) ?? null;

  const index = indexExact ?? indexBySlug;
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
    effects: Array.isArray(detail.effects) ? detail.effects : [],
  };
}
