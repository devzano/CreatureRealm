// lib/palworld/paldbArmor.ts
//
// PalDB Armor (index + detail)
// Index:  https://paldb.cc/en/Armor
// Detail: https://paldb.cc/en/<slug>
//
// Uses shared detail parsing kit: lib/palworld/paldbDetailKit.ts
//
// IMPORTANT UPDATE (variants):
// PalDB often lists multiple “varieties” of the same base item (same href/slug) with different rarity/tech/etc.
// This keeps ALL variants in the index by deduping with a VARIANT KEY (slug + rarity + technology + iconUrl)
// and keeps detail cache keyed by VARIANT KEY while still fetching detail by slug URL.
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

  // Mini-stats from list cards (if present)
  shield: number | null;
  defense: number | null;
  health: number | null;

  description: string | null;
  isAvailable: boolean;

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

  // Mini-stats from detail page (if present); merged from index fallback
  shield: number | null;
  defense: number | null;
  health: number | null;

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
// Mini stats parsing helpers
// -----------------------------

function extractMiniStatsBlock(html: string): string | null {
  return (
    firstMatch(html, /<div\b[^>]*class="d-flex flex-column small"[^>]*>\s*([\s\S]*?)\s*<\/div>/i) ??
    firstMatch(html, /<div\b[^>]*class='d-flex flex-column small'[^>]*>\s*([\s\S]*?)\s*<\/div>/i) ??
    null
  );
}

function extractLabeledNumber(miniStatsHtml: string, label: string): string | null {
  const safe = String(miniStatsHtml ?? "");
  const lbl = String(label ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Works for both:
  // <span ...>Defense</span><span class="border ...">250</span>
  // and nested label variants (Technology)
  return (
    firstMatch(
      safe,
      new RegExp(
        `${lbl}\\s*<\\/span>[\\s\\S]*?<span\\b[^>]*class="[^"]*\\bborder\\b[^"]*"[^>]*>\\s*([0-9]+)\\s*<\\/span>`,
        "i"
      )
    ) ??
    firstMatch(
      safe,
      new RegExp(
        `${lbl}\\s*<\\/span>[\\s\\S]*?<span\\b[^>]*class='[^']*\\bborder\\b[^']*'[^>]*>\\s*([0-9]+)\\s*<\\/span>`,
        "i"
      )
    ) ??
    null
  );
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
export function armorVariantKeyFromIndex(
  it: Pick<ArmorIndexItem, "slug" | "rarity" | "technology" | "iconUrl">
): ArmorVariantKey {
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

  if (s.includes("::")) {
    const slugPart = s.split("::")[0] ?? s;
    return { slugPart, variantKey: cleanKey(s) };
  }

  const slugPart = s;
  const variantKey = armorVariantKeyFromIndex({
    slug: slugPart,
    rarity: "",
    technology: null,
    iconUrl: null,
  });
  return { slugPart, variantKey };
}

// -----------------------------
// Index parsing (/en/Armor)
// -----------------------------

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

    // Mini stats (Shield/Defense/Health/Technology)
    const mini = extractMiniStatsBlock(chunk);
    const techStr = mini ? extractLabeledNumber(mini, "Technology") : null;
    const shieldStr = mini ? extractLabeledNumber(mini, "Shield") : null;
    const defStr = mini ? extractLabeledNumber(mini, "Defense") : null;
    const hpStr = mini ? extractLabeledNumber(mini, "Health") : null;

    const technology = techStr != null ? Number(techStr) : NaN;
    const shield = shieldStr != null ? Number(shieldStr) : NaN;
    const defense = defStr != null ? Number(defStr) : NaN;
    const health = hpStr != null ? Number(hpStr) : NaN;

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
      technology: Number.isFinite(technology) ? technology : null,
      shield: Number.isFinite(shield) ? shield : null,
      defense: Number.isFinite(defense) ? defense : null,
      health: Number.isFinite(health) ? health : null,
      description: description || null,
      isAvailable,
      recipes,
    });
  }

  // Keep variants; only collapse exact duplicates (same variant key).
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

  const rowRe =
    /<div\b[^>]*class=(?:"[^"]*\bborder-top\b[^"]*"|'[^']*\bborder-top\b[^']*')[^>]*>[\s\S]*?(?=<div\b[^>]*class=(?:"[^"]*\bborder-top\b[^"]*"|'[^']*\bborder-top\b[^']*')[^>]*>|$)/gi;

  const rows = Array.from(html.matchAll(rowRe)).map((m) => m[0] ?? "");
  const out: ArmorRecipeIngredient[] = [];

  const lastNumberInRow = (row: string): string | null => {
    const nums = Array.from(row.matchAll(/>\s*([0-9][0-9,]*)\s*</g)).map((m) => m[1]);
    return nums.length ? nums[nums.length - 1] : null;
  };

  for (const row of rows.length ? rows : [html]) {
    const slug = firstMatch(row, /\bhref="([^"]+)"/i) ?? firstMatch(row, /\bhref='([^']+)'/i) ?? null;
    if (!slug) continue;

    const icon =
      firstMatch(row, /<img\b[^>]*\bsrc="([^"]+)"/i) ?? firstMatch(row, /<img\b[^>]*\bsrc='([^']+)'/i) ?? null;

    const anchorInner =
      firstMatch(row, /<a\b[^>]*>\s*([\s\S]*?)\s*<\/a>/i) ??
      firstMatch(row, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>/i) ??
      firstMatch(row, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*>\s*([\s\S]*?)\s*<\/a>/i) ??
      "";

    const name = cleanKey(htmlToText(String(anchorInner).replace(/<img[\s\S]*?>/gi, " ").trim()));

    const qtyText =
      firstMatch(row, /<small\b[^>]*class="itemQuantity"[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
      firstMatch(row, /<small\b[^>]*class='itemQuantity'[^>]*>\s*([^<]+?)\s*<\/small>/i) ??
      null;

    const qtyStr = qtyText ? cleanKey(qtyText) : lastNumberInRow(row);
    const qtyNum = qtyStr ? Number(String(qtyStr).replace(/,/g, "").match(/[0-9]+/)?.[0] ?? "") : NaN;
    const qty = Number.isFinite(qtyNum) ? qtyNum : 0;

    out.push({
      slug: cleanKey(slug),
      name: cleanKey(name || slug),
      iconUrl: icon ? absUrl(icon) : null,
      qty,
    });
  }

  const map = new Map<string, ArmorRecipeIngredient>();
  for (const r of out) {
    const prev = map.get(r.slug);
    if (!prev) map.set(r.slug, r);
    else if ((r.qty ?? 0) > (prev.qty ?? 0)) map.set(r.slug, r);
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

  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

export function parseArmorDetailHtml(html: string, slugKey: string): ArmorDetail {
  const src = String(html ?? "");

  const mini = extractMiniStatsBlock(src);
  const techStr = mini ? extractLabeledNumber(mini, "Technology") : null;
  const shieldStr = mini ? extractLabeledNumber(mini, "Shield") : null;
  const defStr = mini ? extractLabeledNumber(mini, "Defense") : null;
  const hpStr = mini ? extractLabeledNumber(mini, "Health") : null;

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
      const n = techStr != null ? Number(techStr) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),
    shield: (() => {
      const n = shieldStr != null ? Number(shieldStr) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),
    defense: (() => {
      const n = defStr != null ? Number(defStr) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),
    health: (() => {
      const n = hpStr != null ? Number(hpStr) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),

    description: (() => {
      const noBars = stripItemSkillBarsFromDescHtml(src);
      const descHtml = extractCardBodyInnerForDescription(noBars) ?? null;
      if (!descHtml) return null;

      const txt = cleanKey(htmlToText(descHtml));
      return txt || null;
    })(),

    effects: (() => extractItemSkillBarsTextFromSrc(src))(),

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
  const indexExact = _indexCache?.find((x) => armorVariantKeyFromIndex(x) === variantKey) ?? null;
  const indexBySlug = _indexCache?.find((x) => cleanKey(x.slug) === cleanKey(detail.slug)) ?? null;

  const index = indexExact ?? indexBySlug;
  if (!index) return detail;

  return {
    ...detail,
    name: detail.name?.trim() ? detail.name : index.name,
    iconUrl: detail.iconUrl || index.iconUrl,
    rarity: detail.rarity || index.rarity,
    technology: detail.technology ?? index.technology ?? null,
    shield: detail.shield ?? index.shield ?? null,
    defense: detail.defense ?? index.defense ?? null,
    health: detail.health ?? index.health ?? null,
    description: detail.description || index.description,
    isAvailable: detail.isAvailable ?? index.isAvailable,
    recipes: detail.recipes?.length ? detail.recipes : index.recipes,
    effects: Array.isArray(detail.effects) ? detail.effects : [],
  };
}
