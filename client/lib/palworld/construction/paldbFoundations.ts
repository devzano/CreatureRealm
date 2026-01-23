// lib/palworld/paldbFoundations.ts
//
// PalDB Foundations (Construction -> Foundations) list + lightweight detail
// Source page: https://paldb.cc/en/Foundations
//
// Mirrors your Storage scraper shape:
// - fetchFoundationsList(): list-page parsing (name/slug/icon/category/tech/desc/quick recipe)
// - fetchFoundationsDetail(slug): merges list data + treant dependency tree from detail page
//
// Depends on your existing helpers in palworldDB.ts:
//   absUrl, cleanKey, firstMatch, htmlToText, extractSize128ImgUrl
//
// And paldbDetailKit for treant + href normalization:
//   parseTreantTreeFromPage, normalizeDetailHref
//

import { absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { type TreantNode, parseTreantTreeFromPage, normalizeDetailHref } from "@/lib/palworld/paldbDetailKit";

export type FoundationRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type FoundationsIndexItem = {
  slug: string; // e.g. "Wooden_Foundation"
  name: string; // e.g. "Wooden Foundation"
  iconUrl: string | null; // size128 icon

  categoryText: string | null; // usually "Foundations"
  technologyLevel: number | null; // "Technology 2"
  description: string | null;

  // list-page snippet recipe
  recipe: FoundationRecipeIngredient[];
};

export type FoundationsDetail = FoundationsIndexItem & {
  treant: TreantNode | null;
};

const BASE_EN = "https://paldb.cc/en";

function normalizeSlug(slugOrHref: string) {
  const raw = cleanKey(String(slugOrHref ?? ""));
  if (!raw) return null;

  // absolute -> extract /en/<slug>
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const p = u.pathname || "";
      const m = p.match(/\/en\/([^/?#]+)/i);
      return m?.[1] ? cleanKey(m[1]) : null;
    } catch {
      return null;
    }
  }

  // "/en/Wooden_Chest"
  if (raw.startsWith("/en/")) return cleanKey(raw.slice("/en/".length));

  // "Wooden_Chest"
  if (!raw.startsWith("/")) return raw;

  // "/Wooden_Chest"
  return cleanKey(raw.replace(/^\//, ""));
}

function foundationsUrl() {
  return `${BASE_EN}/Foundations`;
}

function foundationsDetailUrl(slug: string) {
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
 * Extract full nested <div ...> ... </div> blocks whose opening tag includes classNeedle.
 * This is the “real extraction” (balanced divs) so we don’t get truncated blocks.
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

    if (!(openTagLower.includes('class="') || openTagLower.includes("class='")) || !openTagLower.includes(needle)) {
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
 * IMPORTANT:
 * The recipes div contains nested <div> rows; regex like <div class="recipes">([\s\S]*?)</div>
 * will stop at the FIRST inner </div> and you’ll parse nothing.
 *
 * So we grab the FIRST balanced div block whose class attr contains "recipes".
 */
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

// -----------------------------
// Index parsing (/en/Foundations)
// -----------------------------

function parseCardListPage(html: string): FoundationsIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const cards = extractDivBlocksByClass(src, "card itemPopup");
  const out: FoundationsIndexItem[] = [];

  for (const card of cards) {
    const href =
      firstMatch(card, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*\bhref="([^"]+)"/i) ??
      firstMatch(card, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*\bhref='([^']+)'/i) ??
      null;

    const slug = href ? normalizeSlug(href) : null;

    const name = cleanKey(
      htmlToText(
        firstMatch(card, /<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>[\s\S]*?<\/a>/i) ??
          firstMatch(card, /<a\b[^>]*class='[^']*\bitemname\b[^']*'[^>]*>[\s\S]*?<\/a>/i) ??
          ""
      )
    );

    if (!slug || !name) continue;

    const iconUrl = extractSize128ImgUrl(card);

    const categoryTextRaw =
      firstMatch(card, /<span\b[^>]*class="[^"]*\bme-auto\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ??
      firstMatch(card, /<span\b[^>]*class='[^']*\bme-auto\b[^']*'[^>]*>([\s\S]*?)<\/span>/i) ??
      null;

    const categoryText = categoryTextRaw ? (cleanKey(htmlToText(categoryTextRaw)) || null) : null;

    const techN =
      firstMatch(
        card,
        /Technology[\s\S]{0,200}?<span\b[^>]*class=(?:"[^"]*\bborder\b[^"]*"|'[^']*\bborder\b[^']*')[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ?? null;

    const technologyLevel = techN ? safeInt(techN) : null;

    const descHtml =
      firstMatch(card, /<div\b[^>]*class="card-body py-2"[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>/i) ?? null;

    const description = descHtml ? (cleanKey(htmlToText(descHtml)) || null) : null;

    const recipesBlock = extractFirstDivBlockByClassToken(card, "recipes");

    const recipe: FoundationRecipeIngredient[] = [];
    if (recipesBlock) {
      const rows = captureAll(
        recipesBlock,
        /<div\b[^>]*class="d-flex justify-content-between[^"]*"[^>]*>[\s\S]*?<div\b[^>]*>([\s\S]*?)<\/div>\s*<div\b[^>]*>\s*([0-9][0-9,]*)\s*<\/div>\s*<\/div>/i
      );

      for (const r of rows) {
        const left = r[1] ?? "";
        const qtyText = r[2] ?? "";

        const ingHref =
          firstMatch(left, /\bhref="([^"]+)"/i) ?? firstMatch(left, /\bhref='([^']+)'/i) ?? null;

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

      // dedupe by slug
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
      description,
      recipe,
    });
  }

  // dedupe by slug
  const map = new Map<string, FoundationsIndexItem>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Public API
// -----------------------------

export async function fetchFoundationsList(): Promise<FoundationsIndexItem[]> {
  const res = await fetch(foundationsUrl(), {
    method: "GET",
    headers: {
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`PalDB Foundations list failed: ${res.status}`);
  const html = await res.text();
  return parseCardListPage(html);
}

export async function fetchFoundationsDetail(slug: string): Promise<FoundationsDetail> {
  const s = cleanKey(slug);
  if (!s) throw new Error("fetchFoundationsDetail: missing slug");

  // 1) List page (quick recipe + tech + desc + icon)
  const list = await fetchFoundationsList();
  const fromList = list.find((x) => x.slug === s) ?? null;

  // 2) Detail page (treant dependency tree)
  const url = normalizeDetailHref(s) ?? foundationsDetailUrl(s);

  const res = await fetch(url, {
    method: "GET",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });

  if (!res.ok) {
    if (fromList) return { ...fromList, treant: null };
    throw new Error(`PalDB Foundations detail failed: ${res.status}`);
  }

  const html = await res.text();
  const treant = parseTreantTreeFromPage(html);

  if (fromList) {
    return {
      ...fromList,
      treant,
    };
  }

  // minimal fallback if it wasn’t found in list for some reason
  return {
    slug: s,
    name: cleanKey(s.replace(/_/g, " ")),
    iconUrl: null,
    categoryText: "Foundations",
    technologyLevel: null,
    description: null,
    recipe: [],
    treant,
  };
}
