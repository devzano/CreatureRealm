// lib/palworld/paldbFurniture.ts
//
// PalDB Furniture (Construction -> Furniture) list + lightweight detail
// Source page: https://paldb.cc/en/Furniture
//
// Mirrors your Storage scraper shape, but Furniture has:
// - technologyLevel
// - description
// - recipe (ingredients + qty)
//
// Detail adds:
// - treant dependency tree (from detail page)
//
// Depends on your existing helpers in palworldDB.ts:
//   absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText
//

import { absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { type TreantNode, parseTreantTreeFromPage, normalizeDetailHref } from "@/lib/palworld/paldbDetailKit";

export type FurnitureRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type FurnitureIndexItem = {
  slug: string; // e.g. "Square_Table"
  name: string; // "Square Table"
  iconUrl: string | null; // size128 icon

  categoryText: string | null; // "Furniture"
  technologyLevel: number | null; // "Technology 5"
  workSuitability: { slug: string; name: string; iconUrl: string | null; level: number | null } | null; // usually null for furniture

  description: string | null;
  recipe: FurnitureRecipeIngredient[];
};

export type FurnitureDetail = FurnitureIndexItem & {
  treant: TreantNode | null;
};

const BASE_EN = "https://paldb.cc/en";

function normalizeSlug(slugOrHref: string) {
  const raw = cleanKey(String(slugOrHref ?? ""));
  if (!raw) return null;

  // already absolute -> convert to path then slug
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const p = u.pathname || "";
      // expected: /en/Square_Table
      const m = p.match(/\/en\/([^/?#]+)/i);
      return m?.[1] ? cleanKey(m[1]) : null;
    } catch {
      return null;
    }
  }

  // "/en/Square_Table"
  if (raw.startsWith("/en/")) return cleanKey(raw.slice("/en/".length));

  // "Square_Table"
  if (!raw.startsWith("/")) return raw;

  // "/Square_Table" (rare)
  return cleanKey(raw.replace(/^\//, ""));
}

function furnitureUrl() {
  return `${BASE_EN}/Furniture`;
}

function furnitureDetailUrl(slug: string) {
  return `${BASE_EN}/${encodeURIComponent(slug)}`;
}

function captureAll(src: string, re: RegExp): string[][] {
  const s = String(src ?? "");
  if (!s) return [];
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const rgx = new RegExp(re.source, flags);
  return Array.from(s.matchAll(rgx)).map((m) => Array.from(m));
}

function safeInt(v: any): number | null {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseFirstImgSrc(html: string): string | null {
  const m = String(html ?? "").match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return m?.[1] ? absUrl(String(m[1]).trim()) : null;
}

/**
 * Balance nested <div> blocks, returning blocks where the opening tag contains `classNeedle`.
 * (This works well for most PalDB pages that use "card itemPopup" wrappers.)
 */
function extractDivBlocksByClass(src: string, classNeedle: string): string[] {
  const s = String(src ?? "");
  if (!s) return [];

  const out: string[] = [];
  const needle = classNeedle.toLowerCase();

  let i = 0;
  while (i < s.length) {
    const start = s.toLowerCase().indexOf("<div", i);
    if (start < 0) break;

    const openEnd = s.indexOf(">", start);
    if (openEnd < 0) break;

    const openTag = s.slice(start, openEnd + 1);
    const openTagLower = openTag.toLowerCase();

    const hasClass = openTagLower.includes('class="') || openTagLower.includes("class='");
    const hasNeedle = openTagLower.includes(needle);
    if (!hasClass || !hasNeedle) {
      i = openEnd + 1;
      continue;
    }

    let depth = 0;
    let j = start;

    while (j < s.length) {
      const nextOpen = s.toLowerCase().indexOf("<div", j);
      const nextClose = s.toLowerCase().indexOf("</div", j);

      if (nextClose < 0) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        const oe = s.indexOf(">", nextOpen);
        if (oe < 0) break;
        depth += 1;
        j = oe + 1;
        continue;
      }

      const ce = s.indexOf(">", nextClose);
      if (ce < 0) break;
      depth -= 1;
      j = ce + 1;

      if (depth <= 0) {
        out.push(s.slice(start, j));
        i = j;
        break;
      }
    }

    if (i === start) i = openEnd + 1;
  }

  return out;
}

/**
 * Fallback: some pages can change wrappers; we can still find the item blocks by grabbing
 * <div> blocks that contain a size128 icon + the word "Technology".
 */
function extractDivBlocksContaining(src: string, mustContainAll: string[]): string[] {
  const s = String(src ?? "");
  if (!s) return [];

  const out: string[] = [];
  const needles = mustContainAll.map((x) => String(x).toLowerCase()).filter(Boolean);
  if (!needles.length) return out;

  let i = 0;
  while (i < s.length) {
    const start = s.toLowerCase().indexOf("<div", i);
    if (start < 0) break;

    const openEnd = s.indexOf(">", start);
    if (openEnd < 0) break;

    // balance nested divs until matching close
    let depth = 0;
    let j = start;

    while (j < s.length) {
      const nextOpen = s.toLowerCase().indexOf("<div", j);
      const nextClose = s.toLowerCase().indexOf("</div", j);

      if (nextClose < 0) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        const oe = s.indexOf(">", nextOpen);
        if (oe < 0) break;
        depth += 1;
        j = oe + 1;
        continue;
      }

      const ce = s.indexOf(">", nextClose);
      if (ce < 0) break;
      depth -= 1;
      j = ce + 1;

      if (depth <= 0) {
        const block = s.slice(start, j);
        const low = block.toLowerCase();
        const ok = needles.every((n) => low.includes(n));
        if (ok) out.push(block);
        i = j;
        break;
      }
    }

    if (i === start) i = openEnd + 1;
  }

  return out;
}

function extractFirstDivBlockByClassToken(src: string, classToken: string): string | null {
  const s = String(src ?? "");
  if (!s) return null;

  const token = String(classToken ?? "").toLowerCase();
  if (!token) return null;

  let i = 0;
  while (i < s.length) {
    const start = s.toLowerCase().indexOf("<div", i);
    if (start < 0) return null;

    const openEnd = s.indexOf(">", start);
    if (openEnd < 0) return null;

    const openTag = s.slice(start, openEnd + 1);
    const openTagLower = openTag.toLowerCase();

    const hasClass = openTagLower.includes('class="') || openTagLower.includes("class='");
    const hasToken = openTagLower.includes(token);
    if (!hasClass || !hasToken) {
      i = openEnd + 1;
      continue;
    }

    let depth = 0;
    let j = start;

    while (j < s.length) {
      const nextOpen = s.toLowerCase().indexOf("<div", j);
      const nextClose = s.toLowerCase().indexOf("</div", j);

      if (nextClose < 0) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        const oe = s.indexOf(">", nextOpen);
        if (oe < 0) break;
        depth += 1;
        j = oe + 1;
        continue;
      }

      const ce = s.indexOf(">", nextClose);
      if (ce < 0) break;
      depth -= 1;
      j = ce + 1;

      if (depth <= 0) return s.slice(start, j);
    }

    i = openEnd + 1;
  }

  return null;
}

function parseCardListPage(html: string): FurnitureIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  // Preferred wrapper
  let blocks = extractDivBlocksByClass(src, "card itemPopup");

  // Fallback wrapper (still works as long as size128 + Technology exists inside the block)
  if (!blocks.length) {
    blocks = extractDivBlocksContaining(src, ["size128", "technology"]);
  }

  const out: FurnitureIndexItem[] = [];

  for (const block of blocks) {
    const href =
      firstMatch(block, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*\bhref="([^"]+)"/i) ??
      firstMatch(block, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*\bhref='([^']+)'/i) ??
      null;

    const slug = href ? normalizeSlug(href) : null;

    const name = cleanKey(
      htmlToText(
        firstMatch(block, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>[\s\S]*?<\/a>/i) ??
          firstMatch(block, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*>[\s\S]*?<\/a>/i) ??
          ""
      )
    );

    if (!slug || !name) continue;

    const iconUrl = extractSize128ImgUrl(block);

    const categoryTextRaw =
      firstMatch(block, /<span\b[^>]*class="[^"]*\bme-auto\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ??
      firstMatch(block, /<span\b[^>]*class='[^']*\bme-auto\b[^']*'[^>]*>([\s\S]*?)<\/span>/i) ??
      null;

    const categoryText = categoryTextRaw ? (cleanKey(htmlToText(categoryTextRaw)) || null) : "Furniture";

    const techN =
      firstMatch(
        block,
        /Technology[\s\S]{0,240}?<span\b[^>]*class=(?:"[^"]*\bborder p-1\b[^"]*"|'[^']*\bborder p-1\b[^']*')[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ??
      // fallback (some pages render tech as plain text)
      firstMatch(block, /Technology\s*([0-9]{1,3})/i) ??
      null;

    const technologyLevel = techN ? safeInt(techN) : null;

    const descHtml =
      firstMatch(block, /<div\b[^>]*class="card-body py-2"[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>/i) ??
      // fallback: sometimes description is the first <div> after "Technology"
      firstMatch(block, /Technology[\s\S]{0,300}?<\/div>\s*<div\b[^>]*>([\s\S]*?)<\/div>/i) ??
      null;

    const description = descHtml ? (cleanKey(htmlToText(descHtml)) || null) : null;

    // Recipes are often inside <div class="recipes" style="display:none">...</div>
    // but sometimes they render as visible rows; this grabs the recipes wrapper if present.
    const recipesBlock = extractFirstDivBlockByClassToken(block, "recipes");

    const recipe: FurnitureRecipeIngredient[] = [];

    if (recipesBlock) {
      const rows = captureAll(
        recipesBlock,
        /<div\b[^>]*class="d-flex justify-content-between[^"]*"[^>]*>[\s\S]*?<div\b[^>]*>([\s\S]*?)<\/div>\s*<div\b[^>]*>\s*([0-9][0-9,]*)\s*<\/div>\s*<\/div>/i
      );

      for (const r of rows) {
        const left = r[1] ?? "";
        const qtyText = r[2] ?? "";

        const ingHref = firstMatch(left, /\bhref="([^"]+)"/i) ?? firstMatch(left, /\bhref='([^']+)'/i) ?? null;
        const ingSlug = ingHref ? normalizeSlug(ingHref) : null;
        const ingIcon = parseFirstImgSrc(left);
        const ingName = cleanKey(htmlToText(left));
        const qty = safeInt(qtyText);

        if (!ingSlug || !ingName) continue;

        recipe.push({
          slug: ingSlug,
          name: ingName,
          iconUrl: ingIcon,
          qty,
        });
      }
    } else {
      // Fallback: if the recipes wrapper isn't present, try to read "ingredient rows" directly
      // from the block. This matches the same visual structure as the list page.
      const rows = captureAll(
        block,
        /<a\b[^>]*class=(?:"[^"]*\bitemname\b[^"]*"|'[^']*\bitemname\b[^']*')[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*>[\s\S]*?<\/a>[\s\S]*?<div\b[^>]*>\s*([0-9][0-9,]*)\s*<\/div>/i
      );

      // NOTE: this can over-match (because the main item also has itemname).
      // We only keep matches that clearly look like ingredients (size32 icon inside link).
      for (const r of rows) {
        const hrefA = r[1] ?? r[2] ?? "";
        const qtyText = r[3] ?? "";
        if (!hrefA) continue;

        // attempt to find the full <a ...>...</a> around this match window
        // simplest: skip if href equals the item itself
        const ingSlug = normalizeSlug(hrefA);
        if (!ingSlug || ingSlug === slug) continue;

        // try to ensure it is an ingredient link by requiring size32 nearby
        const window = r.join(" ");
        if (!/size32/i.test(window)) continue;

        const qty = safeInt(qtyText);
        recipe.push({
          slug: ingSlug,
          name: cleanKey(ingSlug.replace(/_/g, " ")),
          iconUrl: null,
          qty,
        });
      }
    }

    // dedupe recipe by slug
    if (recipe.length) {
      const seen = new Set<string>();
      const deduped = recipe.filter((x) => (seen.has(x.slug) ? false : (seen.add(x.slug), true)));
      recipe.length = 0;
      recipe.push(...deduped);
    }

    out.push({
      slug,
      name,
      iconUrl: iconUrl ? absUrl(iconUrl) : null,
      categoryText,
      technologyLevel,
      workSuitability: null,
      description,
      recipe,
    });
  }

  // dedupe by slug
  const map = new Map<string, FurnitureIndexItem>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Public API
// -----------------------------

export async function fetchFurnitureList(): Promise<FurnitureIndexItem[]> {
  const res = await fetch(furnitureUrl(), {
    method: "GET",
    headers: {
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`PalDB Furniture list failed: ${res.status}`);
  const html = await res.text();
  return parseCardListPage(html);
}

export async function fetchFurnitureDetail(slug: string): Promise<FurnitureDetail> {
  const s = cleanKey(slug);
  if (!s) throw new Error("fetchFurnitureDetail: missing slug");

  // 1) List page data (fast + consistent)
  const list = await fetchFurnitureList();
  const fromList = list.find((x) => x.slug === s) ?? null;

  // 2) Detail page (treant)
  const url = normalizeDetailHref(s) ?? furnitureDetailUrl(s);
  const res = await fetch(url, {
    method: "GET",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });

  if (!res.ok) {
    if (fromList) return { ...fromList, treant: null };
    throw new Error(`PalDB Furniture detail failed: ${res.status}`);
  }

  const html = await res.text();
  const treant = parseTreantTreeFromPage(html);

  if (fromList) return { ...fromList, treant };

  return {
    slug: s,
    name: cleanKey(s.replace(/_/g, " ")),
    iconUrl: null,
    categoryText: "Furniture",
    technologyLevel: null,
    workSuitability: null,
    description: null,
    recipe: [],
    treant,
  };
}
