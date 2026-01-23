// lib/palworld/paldbDefenses.ts
//
// PalDB Defenses (Construction -> Defenses) list + lightweight detail
// Source page: https://paldb.cc/en/Defenses
//
// Mirrors your Storage/Furniture scrapers:
// - fetchDefensesList(): returns all defense build objects (slug/name/icon + tech + desc + recipe)
// - fetchDefensesDetail(slug): list merge + treant dependency tree from detail page
//
// Depends on your existing helpers in palworldDB.ts:
//   absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText
//

import { absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { type TreantNode, parseTreantTreeFromPage, normalizeDetailHref } from "@/lib/palworld/paldbDetailKit";

export type DefensesRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type DefensesIndexItem = {
  slug: string; // e.g. "Wood_Wall"
  name: string; // "Wood Wall"
  iconUrl: string | null; // size128 icon

  categoryText: string | null; // usually "Defenses"
  technologyLevel: number | null; // "Technology 7"
  workSuitability: { slug: string; name: string; iconUrl: string | null; level: number | null } | null; // keep optional

  description: string | null;
  recipe: DefensesRecipeIngredient[];
};

export type DefensesDetail = DefensesIndexItem & {
  treant: TreantNode | null;
};

const BASE_EN = "https://paldb.cc/en";

function normalizeSlug(slugOrHref: string) {
  const raw = cleanKey(String(slugOrHref ?? ""));
  if (!raw) return null;

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

  if (raw.startsWith("/en/")) return cleanKey(raw.slice("/en/".length));
  if (!raw.startsWith("/")) return raw;
  return cleanKey(raw.replace(/^\//, ""));
}

function defensesUrl() {
  return `${BASE_EN}/Defenses`;
}

function defensesDetailUrl(slug: string) {
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

function parseCardListPage(html: string): DefensesIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  let blocks = extractDivBlocksByClass(src, "card itemPopup");
  if (!blocks.length) blocks = extractDivBlocksContaining(src, ["size128", "technology"]);

  const out: DefensesIndexItem[] = [];

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

    const categoryText = categoryTextRaw ? (cleanKey(htmlToText(categoryTextRaw)) || null) : "Defenses";

    const techN =
      firstMatch(
        block,
        /Technology[\s\S]{0,240}?<span\b[^>]*class=(?:"[^"]*\bborder p-1\b[^"]*"|'[^']*\bborder p-1\b[^']*')[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ??
      firstMatch(block, /Technology\s*([0-9]{1,3})/i) ??
      null;

    const technologyLevel = techN ? safeInt(techN) : null;

    const descHtml =
      firstMatch(block, /<div\b[^>]*class="card-body py-2"[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>/i) ?? null;

    const description = descHtml ? (cleanKey(htmlToText(descHtml)) || null) : null;

    const recipesBlock = extractFirstDivBlockByClassToken(block, "recipes");

    const recipe: DefensesRecipeIngredient[] = [];
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

        recipe.push({ slug: ingSlug, name: ingName, iconUrl: ingIcon, qty });
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
      workSuitability: null,
      description,
      recipe,
    });
  }

  const map = new Map<string, DefensesIndexItem>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Public API
// -----------------------------

export async function fetchDefensesList(): Promise<DefensesIndexItem[]> {
  const res = await fetch(defensesUrl(), {
    method: "GET",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });

  if (!res.ok) throw new Error(`PalDB Defenses list failed: ${res.status}`);
  const html = await res.text();
  return parseCardListPage(html);
}

export async function fetchDefensesDetail(slug: string): Promise<DefensesDetail> {
  const s = cleanKey(slug);
  if (!s) throw new Error("fetchDefensesDetail: missing slug");

  const list = await fetchDefensesList();
  const fromList = list.find((x) => x.slug === s) ?? null;

  const url = normalizeDetailHref(s) ?? defensesDetailUrl(s);
  const res = await fetch(url, {
    method: "GET",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });

  if (!res.ok) {
    if (fromList) return { ...fromList, treant: null };
    throw new Error(`PalDB Defenses detail failed: ${res.status}`);
  }

  const html = await res.text();
  const treant = parseTreantTreeFromPage(html);

  if (fromList) return { ...fromList, treant };

  return {
    slug: s,
    name: cleanKey(s.replace(/_/g, " ")),
    iconUrl: null,
    categoryText: "Defenses",
    technologyLevel: null,
    workSuitability: null,
    description: null,
    recipe: [],
    treant,
  };
}
