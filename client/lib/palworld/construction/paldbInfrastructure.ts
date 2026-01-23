// lib/palworld/paldbInfrastructure.ts
//
// PalDB Infrastructure (Construction -> Infrastructure) list + lightweight detail
// Source page: https://paldb.cc/en/Infrastructure
//
// Mirrors your other PalDB scrapers:
// - fetchInfrastructureList(): returns the infrastructure build objects (slug/name/icon + tech/healing/san + desc + recipe)
// - fetchInfrastructureDetail(slug): returns single item + treant dependency tree
//
// Depends on your existing helpers in palworldDB.ts:
//   absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText
//
// And paldbDetailKit:
//   parseTreantTreeFromPage, normalizeDetailHref
//

import { absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { type TreantNode, parseTreantTreeFromPage, normalizeDetailHref } from "@/lib/palworld/paldbDetailKit";

export type InfrastructureRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type InfrastructureIndexItem = {
  slug: string; // e.g. "Straw_Pal_Bed"
  name: string; // "Straw Pal Bed"
  iconUrl: string | null; // size128 icon

  categoryText: string | null; // "Infrastructure"

  technologyLevel: number | null; // "Technology 3"
  healing: number | null; // "Healing 1.5" (beds/pods)
  san: number | null; // "SAN 0.05" or "SAN-0.15"

  workSuitability: { slug: string; name: string; iconUrl: string | null; level: number | null } | null;

  description: string | null;

  recipe: InfrastructureRecipeIngredient[];
};

export type InfrastructureDetail = InfrastructureIndexItem & {
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
      // expected: /en/Some_Slug
      const m = p.match(/\/en\/([^/?#]+)/i);
      return m?.[1] ? cleanKey(m[1]) : null;
    } catch {
      return null;
    }
  }

  // "/en/Some_Slug"
  if (raw.startsWith("/en/")) return cleanKey(raw.slice("/en/".length));
  // "Some_Slug"
  if (!raw.startsWith("/")) return raw;

  // "/Some_Slug" (rare)
  return cleanKey(raw.replace(/^\//, ""));
}

function infrastructureUrl() {
  return `${BASE_EN}/Infrastructure`;
}

function infrastructureDetailUrl(slug: string) {
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

/**
 * Extract all <div ...>...</div> blocks whose opening tag contains a class token substring.
 * Used to get full nested "card itemPopup" blocks.
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
 * Get the first nested <div ...>...</div> block where the opening tag contains a class token substring.
 * This works even when the div has style="display:none" (recipes).
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

      if (depth <= 0) {
        return s.slice(start, j);
      }
    }

    i = openEnd + 1;
  }

  return null;
}

function parseTechHealingSan(cardHtml: string) {
  const src = String(cardHtml ?? "");

  // Technology can appear as:
  // "Technology 3" OR "Technology 13 <span ...> ...</span>" etc.
  const techText =
    firstMatch(src, /\bTechnology\s*([0-9]+)\b/i) ??
    firstMatch(
      src,
      /\bTechnology[\s\S]{0,200}?<span\b[^>]*class=(?:"[^"]*\bborder p-1\b[^"]*"|'[^']*\bborder p-1\b[^']*')[^>]*>\s*([0-9]+)\s*<\/span>/i
    ) ??
    null;

  // Healing can appear as "Healing 1.5"
  const healText = firstMatch(src, /\bHealing\s*([0-9]+(?:\.[0-9]+)?)\b/i) ?? null;

  // SAN can appear as "SAN 0.05" or "SAN-0.15" (no space)
  const sanText = firstMatch(src, /\bSAN\s*([+-]?[0-9]+(?:\.[0-9]+)?)\b/i) ?? firstMatch(src, /\bSAN([+-][0-9]+(?:\.[0-9]+)?)\b/i) ?? null;

  return {
    technologyLevel: techText ? safeInt(techText) : null,
    healing: healText ? safeFloat(healText) : null,
    san: sanText ? safeFloat(sanText) : null,
  };
}

function parseCardListPage(html: string): InfrastructureIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const cards = extractDivBlocksByClass(src, "card itemPopup");
  const out: InfrastructureIndexItem[] = [];

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

    const { technologyLevel, healing, san } = parseTechHealingSan(card);

    const descHtml =
      firstMatch(card, /<div\b[^>]*class="card-body py-2"[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>/i) ?? null;

    const description = descHtml ? (cleanKey(htmlToText(descHtml)) || null) : null;

    // recipes: the div exists but is often style="display:none", so we must capture the full block.
    const recipesBlock = extractFirstDivBlockByClassToken(card, "recipes");

    const recipe: InfrastructureRecipeIngredient[] = [];
    if (recipesBlock) {
      // Matches rows like:
      // <div class="d-flex justify-content-between ...">
      //   <div><a ... href="Wood"><img ...>Wood</a></div>
      //   <div>15</div>
      // </div>
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
      healing,
      san,
      workSuitability: null,
      description,
      recipe,
    });
  }

  // dedupe by slug
  const map = new Map<string, InfrastructureIndexItem>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Public API
// -----------------------------

export async function fetchInfrastructureList(): Promise<InfrastructureIndexItem[]> {
  const res = await fetch(infrastructureUrl(), {
    method: "GET",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });

  if (!res.ok) throw new Error(`PalDB Infrastructure list failed: ${res.status}`);
  const html = await res.text();
  return parseCardListPage(html);
}

export async function fetchInfrastructureDetail(slug: string): Promise<InfrastructureDetail> {
  const s = cleanKey(slug);
  if (!s) throw new Error("fetchInfrastructureDetail: missing slug");

  // 1) list page
  const list = await fetchInfrastructureList();
  const fromList = list.find((x) => x.slug === s) ?? null;

  // 2) detail page for treant
  const url = normalizeDetailHref(s) ?? infrastructureDetailUrl(s);
  const res = await fetch(url, { method: "GET", headers: { "accept-language": "en-US,en;q=0.9" } });

  if (!res.ok) {
    if (fromList) return { ...fromList, treant: null };
    throw new Error(`PalDB Infrastructure detail failed: ${res.status}`);
  }

  const html = await res.text();
  const treant = parseTreantTreeFromPage(html);

  if (fromList) return { ...fromList, treant };

  return {
    slug: s,
    name: cleanKey(s.replace(/_/g, " ")),
    iconUrl: null,
    categoryText: "Infrastructure",
    technologyLevel: null,
    healing: null,
    san: null,
    workSuitability: null,
    description: null,
    recipe: [],
    treant,
  };
}
