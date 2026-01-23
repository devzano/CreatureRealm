// lib/palworld/paldbFood.ts
//
// PalDB Food (Construction -> Food) list + lightweight detail
// Source page: https://paldb.cc/en/Food
//
// Mirrors your Storage scraper style:
// - fetchFoodList(): list-page cards (slug/name/icon + tech + optional work suitability + optional SAN + desc + recipe)
// - fetchFoodDetail(slug): merges list data + treant dependency tree from detail page
//
// Depends on your existing helpers in palworldDB.ts:
//   absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText
//
// And paldbDetailKit:
//   parseTreantTreeFromPage, normalizeDetailHref, TreantNode
//

import { absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { type TreantNode, parseTreantTreeFromPage, normalizeDetailHref } from "@/lib/palworld/paldbDetailKit";

export type FoodRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type FoodIndexItem = {
  slug: string; // e.g. "Campfire"
  name: string; // "Campfire"
  iconUrl: string | null; // size128 icon

  categoryText: string | null; // "Food" on this page

  technologyLevel: number | null; // "Technology 2"

  // Some Food buildings show work suitability + level (e.g. Kindling Lv 1, Cooling Lv 1)
  workSuitability: { slug: string; name: string; iconUrl: string | null; level: number | null } | null;

  // Some Food buildings show SAN change (e.g. "SAN-0.11", "SAN-0.15")
  san: number | null;

  description: string | null;

  recipe: FoodRecipeIngredient[];
};

export type FoodDetail = FoodIndexItem & {
  treant: TreantNode | null;
};

const BASE_EN = "https://paldb.cc/en";

function normalizeSlug(slugOrHref: string) {
  const raw = cleanKey(String(slugOrHref ?? ""));
  if (!raw) return null;

  // absolute URL -> /en/<slug>
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

  // "/en/<slug>"
  if (raw.startsWith("/en/")) return cleanKey(raw.slice("/en/".length));

  // "<slug>"
  if (!raw.startsWith("/")) return raw;

  // "/<slug>"
  return cleanKey(raw.replace(/^\//, ""));
}

function foodUrl() {
  return `${BASE_EN}/Food`;
}

function foodDetailUrl(slug: string) {
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

function safeFloat(v: any): number | null {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseFirstImgSrc(html: string): string | null {
  const m = String(html ?? "").match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return m?.[1] ? absUrl(String(m[1]).trim()) : null;
}

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

function parseTech(card: string): number | null {
  const techN =
    firstMatch(
      card,
      /Technology[\s\S]{0,200}?<span\b[^>]*class=(?:"[^"]*\bborder p-1\b[^"]*"|'[^']*\bborder p-1\b[^']*')[^>]*>\s*([0-9]+)\s*<\/span>/i
    ) ??
    firstMatch(card, /\bTechnology\s+([0-9]{1,3})\b/i) ??
    null;

  return techN ? safeInt(techN) : null;
}

function parseSan(card: string): number | null {
  // Matches "SAN-0.11", "SAN-0.15", "SAN+0.1"
  const m = firstMatch(card, /\bSAN\s*([+-]\s*[0-9]+(?:\.[0-9]+)?)\b/i);
  if (!m) return null;

  const cleaned = String(m).replace(/\s+/g, "");
  return safeFloat(cleaned);
}

function parseWorkSuitabilityFromTechLine(card: string): FoodIndexItem["workSuitability"] {
  // We intentionally parse from the "Technology ..." line only to avoid picking up random recipe images.
  // We first isolate a small window after "Technology"
  const idx = card.toLowerCase().indexOf("technology");
  if (idx < 0) return null;

  const window = card.slice(idx, Math.min(card.length, idx + 450));

  // Common pattern: Technology 2 <a href="Kindling"><img ...></a>1 SAN-0.11
  // Or: Technology 51 <a href="Cooling"><img ...></a>1
  const anchorHtml =
    firstMatch(window, /(<a\b[^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>)/i) ??
    firstMatch(window, /(<img\b[^>]*>)/i) ??
    null;

  if (!anchorHtml) return null;

  const iconUrl = parseFirstImgSrc(anchorHtml);
  if (!iconUrl) return null;

  const href =
    firstMatch(anchorHtml, /\bhref="([^"]+)"/i) ??
    firstMatch(anchorHtml, /\bhref='([^']+)'/i) ??
    null;

  const wsSlug = href ? normalizeSlug(href) : null;

  // Name usually the anchor text around it (e.g. "Kindling") but if it's only an <img>, fall back to slug
  const wsName = cleanKey(htmlToText(anchorHtml)) || (wsSlug ? cleanKey(wsSlug.replace(/_/g, " ")) : "");

  // level: first number appearing after the anchor within the window (before "SAN" if present)
  // We'll slice from the end of the anchor and scan a little forward.
  const after = window.slice(window.toLowerCase().indexOf(anchorHtml.toLowerCase()) + anchorHtml.length);
  const lvlText = firstMatch(after, /^\s*([0-9]{1,2})\b/i) ?? firstMatch(after, /\s([0-9]{1,2})\b/i) ?? null;
  const level = lvlText ? safeInt(lvlText) : null;

  if (!wsSlug && !wsName) return null;

  return {
    slug: wsSlug ?? cleanKey(wsName.replace(/\s+/g, "_")),
    name: wsName || "—",
    iconUrl: iconUrl ? absUrl(iconUrl) : null,
    level,
  };
}

function parseCardListPage(html: string): FoodIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const cards = extractDivBlocksByClass(src, "card itemPopup");
  const out: FoodIndexItem[] = [];

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

    const technologyLevel = parseTech(card);
    const san = parseSan(card);
    const workSuitability = parseWorkSuitabilityFromTechLine(card);

    const descHtml =
      firstMatch(card, /<div\b[^>]*class="card-body py-2"[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>/i) ?? null;

    const description = descHtml ? (cleanKey(htmlToText(descHtml)) || null) : null;

    const recipesBlock = extractFirstDivBlockByClassToken(card, "recipes");

    const recipe: FoodRecipeIngredient[] = [];
    if (recipesBlock) {
      const rows = captureAll(
        recipesBlock,
        /<div\b[^>]*class="d-flex justify-content-between[^"]*"[^>]*>[\s\S]*?<div\b[^>]*>([\s\S]*?)<\/div>\s*<div\b[^>]*>\s*([0-9][0-9,]*)\s*<\/div>\s*<\/div>/i
      );

      for (const r of rows) {
        const left = r[1] ?? "";
        const qtyText = r[2] ?? "";

        const ingHref =
          firstMatch(left, /\bhref="([^"]+)"/i) ??
          firstMatch(left, /\bhref='([^']+)'/i) ??
          null;

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
      workSuitability,
      san,
      description,
      recipe,
    });
  }

  const map = new Map<string, FoodIndexItem>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Public API
// -----------------------------

export async function fetchFoodList(): Promise<FoodIndexItem[]> {
  const res = await fetch(foodUrl(), {
    method: "GET",
    headers: {
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`PalDB Food list failed: ${res.status}`);
  const html = await res.text();
  return parseCardListPage(html);
}

export async function fetchFoodDetail(slug: string): Promise<FoodDetail> {
  const s = cleanKey(slug);
  if (!s) throw new Error("fetchFoodDetail: missing slug");

  const list = await fetchFoodList();
  const fromList = list.find((x) => x.slug === s) ?? null;

  const url = normalizeDetailHref(s) ?? foodDetailUrl(s);

  const res = await fetch(url, {
    method: "GET",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });

  if (!res.ok) {
    if (fromList) {
      return { ...fromList, treant: null };
    }
    throw new Error(`PalDB Food detail failed: ${res.status}`);
  }

  const html = await res.text();
  const treant = parseTreantTreeFromPage(html);

  if (fromList) {
    return { ...fromList, treant };
  }

  return {
    slug: s,
    name: cleanKey(s.replace(/_/g, " ")),
    iconUrl: null,
    categoryText: "Food",
    technologyLevel: null,
    workSuitability: null,
    san: null,
    description: null,
    recipe: [],
    treant,
  };
}
