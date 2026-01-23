// lib/palworld/paldbGliders.ts
//
// Glider page parser (special list/calc page; not a normal item detail page).
//
// Parses BOTH tabs on /en/Glider:
//  - #Glider: DataTable rows (includes Pal partner-skill gliders with Lv.1..Lv.5 rows)
//  - #Glider_cache: card grid (includes recipes + rarity + description)
//
// Depends on your existing primitives + parseFirstItemLink.
//

import { absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { parseFirstItemLink } from "@/lib/palworld/paldbDetailKit";
export type GliderIndexItem = GliderIndex["merged"][number];

export type GliderTableRow = {
  slug: string; // href value like "Galeclaw" or "Normal_Parachute"
  name: string; // link text (without Lv.)
  iconUrl: string | null;

  // Only present for Pal glider entries in the table
  level: number | null;

  maxSpeed: number | null;
  gravityScale: number | null;
  staminaDrain: number | null;
};

export type GliderRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type GliderCacheCard = {
  slug: string;
  name: string;
  iconUrl: string | null;

  rarity: number | null; // 0..3 based on banner_rarityX
  rarityText: string | null; // Common/Uncommon/Rare/Epic (if present)

  technologyLevel: number | null; // sometimes absent
  speed: number | null; // from card stats ("Speed")
  staminaDrain: number | null; // from card stats ("Stamina Drain")

  description: string | null;
  recipes: GliderRecipeIngredient[];
  notAvailable: boolean;
};

export type GliderIndex = {
  tableRows: GliderTableRow[];
  cacheCards: GliderCacheCard[];

  // Convenience: merged items keyed by slug (best-effort)
  merged: Array<{
    slug: string;
    name: string;
    iconUrl: string | null;

    // From table (if present)
    levels?: GliderTableRow[]; // for Galeclaw/Killamari/etc, multiple level rows

    // From cache (if present)
    rarity?: number | null;
    rarityText?: string | null;
    technologyLevel?: number | null;
    speed?: number | null;
    staminaDrain?: number | null;
    description?: string | null;
    recipes?: GliderRecipeIngredient[];
    notAvailable?: boolean;
  }>;
};

function toNumberOrNull(v: string | null | undefined): number | null {
  const s = cleanKey(String(v ?? ""));
  if (!s) return null;
  // accept 0.03, 1150, etc
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(v: string | null | undefined): number | null {
  const n = toNumberOrNull(v);
  return n == null ? null : Math.trunc(n);
}

function sliceBetween(src: string, startNeedle: string, endNeedle: string): string | null {
  const s = String(src ?? "");
  const a = s.indexOf(startNeedle);
  if (a < 0) return null;
  const b = s.indexOf(endNeedle, a + startNeedle.length);
  if (b < 0) return s.slice(a);
  return s.slice(a, b);
}

function extractTabPaneHtml(src: string, paneId: string): string | null {
  // We don’t try to perfectly “match nested divs”. Instead, we slice between known ids.
  // Works well for PalDB pages where tabs are siblings.
  const start = `<div id="${paneId}"`;
  // end at next tab-pane if possible
  const s = String(src ?? "");
  const startIdx = s.indexOf(start);
  if (startIdx < 0) return null;

  // find the next '<div id="' that looks like another tab-pane after this one
  const after = s.slice(startIdx + start.length);
  const nextIdxRel = after.search(/<div\s+id="[^"]+"\s+class="tab-pane\b/i);
  if (nextIdxRel < 0) {
    // fallback: end at closing tab-content (often)
    const endIdx = s.indexOf(`</div class="tab-content">`, startIdx);
    return endIdx >= 0 ? s.slice(startIdx, endIdx) : s.slice(startIdx);
  }

  const endIdx = startIdx + start.length + nextIdxRel;
  return s.slice(startIdx, endIdx);
}

function extractFirstTableHtml(block: string): string | null {
  return firstMatch(block, /(<table\b[\s\S]*?<\/table>)/i);
}

function splitTrs(tableHtml: string): string[] {
  const s = String(tableHtml ?? "");
  if (!s) return [];
  const tbody =
    firstMatch(s, /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i) ??
    // fallback: sometimes no tbody
    firstMatch(s, /<thead\b[\s\S]*?<\/thead\b[^>]*>([\s\S]*?)<\/table>/i) ??
    "";
  if (!tbody) return [];
  return Array.from(tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).map((m) => m[1] ?? "");
}

function splitTds(trInner: string): string[] {
  return Array.from(String(trInner ?? "").matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((m) => m[1] ?? "");
}

function parseLevelFromText(text: string): number | null {
  const m = String(text ?? "").match(/\bLv\.?\s*([0-9]+)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseGliderTableRows(pageHtml: string): GliderTableRow[] {
  const pane = extractTabPaneHtml(pageHtml, "Glider");
  if (!pane) return [];

  const table = extractFirstTableHtml(pane);
  if (!table) return [];

  const rows = splitTrs(table);
  const out: GliderTableRow[] = [];

  for (const trInner of rows) {
    const tds = splitTds(trInner);
    if (tds.length < 1) continue;

    const td0 = tds[0] ?? "";
    const link = parseFirstItemLink(td0);
    if (!link?.slug) continue;

    const td0Text = cleanKey(htmlToText(td0));
    const level = parseLevelFromText(td0Text);

    // Name = link.name (clean), NOT the "Lv." suffix
    const name = cleanKey(link.name);

    const maxSpeed = toNumberOrNull(cleanKey(htmlToText(tds[1] ?? "")) || null);
    const gravityScale = toNumberOrNull(cleanKey(htmlToText(tds[2] ?? "")) || null);
    const staminaDrain = toNumberOrNull(cleanKey(htmlToText(tds[3] ?? "")) || null);

    out.push({
      slug: cleanKey(link.slug),
      name,
      iconUrl: link.iconUrl ? absUrl(link.iconUrl) : null,
      level,
      maxSpeed,
      gravityScale,
      staminaDrain,
    });
  }

  // keep stable order but dedupe exact duplicates
  const key = (r: GliderTableRow) =>
    `${r.slug}__${r.level ?? 0}__${r.maxSpeed ?? ""}__${r.gravityScale ?? ""}__${r.staminaDrain ?? ""}`;

  const seen = new Set<string>();
  return out.filter((r) => {
    const k = key(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseRarityFromCard(cardHtml: string): { rarity: number | null; rarityText: string | null } {
  const r1 = firstMatch(cardHtml, /\bbanner_rarity([0-9]+)/i);
  const rarity = r1 ? toIntOrNull(r1) : null;

  // Common/Uncommon/Rare/Epic is shown in the right badge span
  // e.g. <span ...>Common</span>
  const rarityText =
    cleanKey(
      htmlToText(
        firstMatch(cardHtml, /<span\b[^>]*class="[^"]*\bhover_text_rarity[0-9]+\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ??
          ""
      )
    ) || null;

  return { rarity, rarityText };
}

function parseCardStatNumber(cardHtml: string, label: string): number | null {
  // Looks like:
  // <span class="bg-dark ... p-1">Speed</span><span class="border p-1">50</span>
  const re = new RegExp(
    `<span\\b[^>]*>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<\\/span>\\s*<span\\b[^>]*class="[^"]*\\bborder\\b[^"]*"[^>]*>\\s*([^<]+?)\\s*<\\/span>`,
    "i"
  );
  const raw = firstMatch(cardHtml, re);
  return toNumberOrNull(raw);
}

function parseCardTechLevel(cardHtml: string): number | null {
  // Technology badge has a slightly different nesting, but ends in:
  // ... Technology ... </span><span class="border p-1">5</span>
  const raw =
    firstMatch(cardHtml, /\bTechnology\b[\s\S]*?<span\b[^>]*class="[^"]*\bborder\b[^"]*"[^>]*>\s*([0-9]+)\s*<\/span>/i) ??
    null;
  return toIntOrNull(raw);
}

function parseCardDescription(cardHtml: string): string | null {
  const inner =
    firstMatch(cardHtml, /<div\b[^>]*class="card-body[^"]*"[^>]*>[\s\S]*?<div>([\s\S]*?)<\/div>[\s\S]*?<\/div>/i) ??
    null;

  const text = inner ? cleanKey(htmlToText(inner)) : "";
  return text ? text : null;
}

function parseCardIconUrl(cardHtml: string): string | null {
  const src =
    firstMatch(cardHtml, /<img\b[^>]*class="[^"]*\bsize128\b[^"]*"[^>]*\bsrc="([^"]+)"/i) ??
    firstMatch(cardHtml, /<img\b[^>]*class='[^']*\bsize128\b[^']*'[^>]*\bsrc='([^']+)'/i) ??
    null;

  return src ? absUrl(src) : null;
}

function parseCardNameAndSlug(cardHtml: string): { slug: string | null; name: string | null; notAvailable: boolean } {
  const href =
    firstMatch(cardHtml, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*\bhref="([^"]+)"/i) ??
    firstMatch(cardHtml, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*\bhref='([^']+)'/i) ??
    null;

  const inner =
    firstMatch(cardHtml, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>[\s\S]*?<\/a>/i) ??
    firstMatch(cardHtml, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*>[\s\S]*?<\/a>/i) ??
    null;

  const name = inner ? cleanKey(htmlToText(inner)) : null;

  const notAvailable = /\bfa-sack-xmark\b/i.test(cardHtml);

  return { slug: href ? cleanKey(href) : null, name: name || null, notAvailable };
}

function parseCardRecipes(cardHtml: string): GliderRecipeIngredient[] {
  const src = String(cardHtml ?? "");
  if (!src) return [];

  // 1) Extract the FULL <div class="recipes">...</div> block using div-depth scanning
  const recipesInner = extractDivInnerByClass(src, "recipes");
  if (!recipesInner) return [];

  // 2) Inside recipes, each ingredient is typically a row:
  // <div class="d-flex ... justify-content-between ..."> ... </div>
  // Extract each row as a full div block (also via depth scanning)
  const rows = extractDivBlocksByClassNeedles(recipesInner, ["d-flex", "justify-content-between"]);
  if (!rows.length) return [];

  const out: GliderRecipeIngredient[] = [];

  for (const rowHtml of rows) {
    // First item link in the row is the ingredient
    const link = parseFirstItemLink(rowHtml);
    if (!link?.slug) continue;

    // Qty: prefer the last "pure number" <div> on the row; otherwise last number in row text
    const qtyRaw =
      lastNumberInRightDiv(rowHtml) ??
      lastNumberInText(cleanKey(htmlToText(rowHtml))) ??
      null;

    out.push({
      slug: cleanKey(link.slug),
      name: cleanKey(link.name),
      iconUrl: link.iconUrl ? absUrl(link.iconUrl) : null,
      qty: qtyRaw ? toIntOrNull(qtyRaw) : null,
    });
  }

  // dedupe by slug (keep first)
  const map = new Map<string, GliderRecipeIngredient>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

/**
 * Extract the inner HTML of the FIRST <div> whose class contains `classNeedle`.
 * Uses depth scanning so nested divs don't break.
 */
function extractDivInnerByClass(html: string, classNeedle: string): string | null {
  const s = String(html ?? "");
  if (!s) return null;

  const needle = String(classNeedle ?? "").trim().toLowerCase();
  if (!needle) return null;

  // Find an opening div that has class=... containing needle
  const openRe = new RegExp(
    `<div\\b[^>]*class=(?:"[^"]*\\b${escapeRegExp(needle)}\\b[^"]*"|'[^']*\\b${escapeRegExp(
      needle
    )}\\b[^']*')[^>]*>`,
    "i"
  );

  const m = s.match(openRe);
  if (!m || m.index == null) return null;

  const openStart = m.index;
  const openTag = m[0] ?? "";
  const openEnd = openStart + openTag.length;

  const closeEnd = findMatchingDivCloseIndex(s, openEnd);
  if (closeEnd == null) return null;

  const closeStart = closeEnd - "</div>".length;
  if (closeStart < openEnd) return null;

  return s.slice(openEnd, closeStart);
}

/**
 * Extract ALL <div> blocks within `html` whose opening tag class contains *all* needles.
 * Each returned string is the FULL div block (<div ...> ... </div>)
 */
function extractDivBlocksByClassNeedles(html: string, classNeedles: string[]): string[] {
  const s = String(html ?? "");
  if (!s) return [];

  const needles = (classNeedles ?? []).map((x) => String(x ?? "").trim().toLowerCase()).filter(Boolean);
  if (!needles.length) return [];

  const out: string[] = [];
  let i = 0;

  while (i < s.length) {
    const nextOpen = s.slice(i).search(/<div\b/i);
    if (nextOpen < 0) break;

    const openStart = i + nextOpen;
    const tagEndRel = s.slice(openStart).search(/>/);
    if (tagEndRel < 0) break;

    const openEnd = openStart + tagEndRel + 1;
    const openTag = s.slice(openStart, openEnd);

    // check class contains all needles
    const classAttr =
      firstMatch(openTag, /\bclass\s*=\s*"([^"]+)"/i) ??
      firstMatch(openTag, /\bclass\s*=\s*'([^']+)'/i) ??
      "";

    const cls = String(classAttr ?? "").toLowerCase();
    const ok = needles.every((n) => cls.includes(n));
    if (!ok) {
      i = openEnd;
      continue;
    }

    const closeEnd = findMatchingDivCloseIndex(s, openEnd);
    if (closeEnd == null) break;

    out.push(s.slice(openStart, closeEnd));
    i = closeEnd;
  }

  return out;
}

/**
 * Given a string and an index right AFTER an opening <div ...>,
 * find the index right AFTER its matching </div>.
 */
function findMatchingDivCloseIndex(html: string, startAfterOpenTag: number): number | null {
  const s = String(html ?? "");
  if (!s) return null;

  let depth = 1;
  let i = startAfterOpenTag;

  // Scan for next <div ...> or </div>
  const tagRe = /<\/div\b[^>]*>|<div\b[^>]*>/gi;
  tagRe.lastIndex = i;

  while (true) {
    const m = tagRe.exec(s);
    if (!m) return null;

    const tag = m[0] ?? "";
    if (/^<div\b/i.test(tag)) depth += 1;
    else depth -= 1;

    if (depth === 0) {
      return tagRe.lastIndex; // index right AFTER </div>
    }
  }
}

function escapeRegExp(s: string) {
  return String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Try to grab the "right side qty div" number at end of row.
 * Works for the common: ... </div><div> 12 </div></div>
 */
function lastNumberInRightDiv(rowHtml: string): string | null {
  const s = String(rowHtml ?? "");
  if (!s) return null;

  // Find a trailing "<div>NUMBER</div>" near the end
  const m =
    s.match(/<div\b[^>]*>\s*([0-9][0-9,]*)\s*<\/div>\s*<\/div>\s*$/i) ??
    s.match(/<div\b[^>]*>\s*([0-9][0-9,]*)\s*<\/div>\s*$/i);

  return m?.[1] ? String(m[1]).trim() : null;
}

function lastNumberInText(text: string): string | null {
  const s = String(text ?? "");
  if (!s) return null;

  const matches = Array.from(s.matchAll(/([0-9][0-9,]*)/g)).map((m) => m[1]).filter(Boolean);
  if (!matches.length) return null;
  return String(matches[matches.length - 1]).trim();
}

function parseGliderCacheCards(pageHtml: string): GliderCacheCard[] {
  const pane = extractTabPaneHtml(pageHtml, "Glider_cache");
  if (!pane) return [];

  const chunks = String(pane).split(/<div class="card itemPopup">/i).slice(1);
  const out: GliderCacheCard[] = [];

  for (const raw of chunks) {
    const cardHtml = `<div class="card itemPopup">${raw}`;

    const { slug, name, notAvailable } = parseCardNameAndSlug(cardHtml);
    if (!slug || !name) continue;

    const iconUrl = parseCardIconUrl(cardHtml);
    const { rarity, rarityText } = parseRarityFromCard(cardHtml);

    const technologyLevel = parseCardTechLevel(cardHtml);
    const speed = parseCardStatNumber(cardHtml, "Speed");
    const staminaDrain = parseCardStatNumber(cardHtml, "Stamina Drain");

    const description = parseCardDescription(cardHtml);
    const recipes = parseCardRecipes(cardHtml);

    out.push({
      slug,
      name,
      iconUrl,
      rarity,
      rarityText,
      technologyLevel,
      speed,
      staminaDrain,
      description,
      recipes,
      notAvailable,
    });
  }

  // dedupe by slug (keep first)
  const map = new Map<string, GliderCacheCard>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Public fetch + parse
// -----------------------------

export async function fetchGliderIndex(): Promise<GliderIndex> {
  const url = absUrl("/en/Glider");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchGliderIndex failed: ${res.status} ${res.statusText}`);
  const html = await res.text();

  const tableRows = parseGliderTableRows(html);
  const cacheCards = parseGliderCacheCards(html);

  // Merge
  const bySlug = new Map<string, GliderIndex["merged"][number]>();

  // First, seed from cache cards (usually more “item-like”)
  for (const c of cacheCards) {
    bySlug.set(c.slug, {
      slug: c.slug,
      name: c.name,
      iconUrl: c.iconUrl,
      rarity: c.rarity,
      rarityText: c.rarityText,
      technologyLevel: c.technologyLevel,
      speed: c.speed,
      staminaDrain: c.staminaDrain,
      description: c.description,
      recipes: c.recipes,
      notAvailable: c.notAvailable,
    });
  }

  // Then attach table rows (Pal glider Lv variations)
  for (const r of tableRows) {
    const existing = bySlug.get(r.slug);
    if (existing) {
      // If the table row has a level, treat this as a multi-level list
      if (r.level != null) {
        const levels = existing.levels ? [...existing.levels] : [];
        levels.push(r);
        // sort by level if present
        levels.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
        existing.levels = levels;
      } else {
        // If it's an item, and cache didn’t include some numeric fields, keep them accessible
        // (Optional: you can store these somewhere else; for now, leave levels undefined)
      }
      // Keep best icon/name already present, otherwise fill
      if (!existing.iconUrl && r.iconUrl) existing.iconUrl = r.iconUrl;
      if (!existing.name && r.name) existing.name = r.name;
      continue;
    }

    // Not in cache, add from table
    bySlug.set(r.slug, {
      slug: r.slug,
      name: r.name,
      iconUrl: r.iconUrl,
      levels: r.level != null ? [r] : undefined,
    });
  }

  const merged = Array.from(bySlug.values());

  return { tableRows, cacheCards, merged };
}
