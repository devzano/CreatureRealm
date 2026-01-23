// lib/palworld/paldbLighting.ts
//
// PalDB Lighting (Construction -> Lighting) list + lightweight detail
// Source page: https://paldb.cc/en/Lighting
//
// Mirrors your other PalDB scrapers:
// - fetchLightingList(): returns lighting build objects (slug/name/icon + tech/consumption/desc + recipe)
// - fetchLightingDetail(slug): returns single item + treant dependency tree
//
// Depends on palworldDB.ts helpers:
//   absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText
//
// And paldbDetailKit:
//   parseTreantTreeFromPage, normalizeDetailHref
//

import { absUrl, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { type TreantNode, parseTreantTreeFromPage, normalizeDetailHref } from "@/lib/palworld/paldbDetailKit";

export type LightingRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type LightingIndexItem = {
  slug: string; // e.g. "Torch"
  name: string; // "Torch"
  iconUrl: string | null; // size128 icon

  categoryText: string | null; // "Lighting"

  technologyLevel: number | null; // "Technology 3"
  consumption: number | null; // "Consumption 0.5" (some pages)
  workSuitability: { slug: string; name: string; iconUrl: string | null; level: number | null } | null;

  description: string | null;

  recipe: LightingRecipeIngredient[];
};

export type LightingDetail = LightingIndexItem & {
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

function lightingUrl() {
  return `${BASE_EN}/Lighting`;
}

function lightingDetailUrl(slug: string) {
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

function parseTechAndConsumption(cardHtml: string) {
  const src = String(cardHtml ?? "");

  const techText =
    firstMatch(src, /\bTechnology\s*([0-9]+)\b/i) ??
    firstMatch(
      src,
      /\bTechnology[\s\S]{0,200}?<span\b[^>]*class=(?:"[^"]*\bborder p-1\b[^"]*"|'[^']*\bborder p-1\b[^']*')[^>]*>\s*([0-9]+)\s*<\/span>/i
    ) ??
    null;

  // "Consumption 0.5" sometimes appears
  const consText = firstMatch(src, /\bConsumption\s*([0-9]+(?:\.[0-9]+)?)\b/i) ?? null;

  return {
    technologyLevel: techText ? safeInt(techText) : null,
    consumption: consText ? safeFloat(consText) : null,
  };
}

function parseCardListPage(html: string): LightingIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const cards = extractDivBlocksByClass(src, "card itemPopup");
  const out: LightingIndexItem[] = [];

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

    const { technologyLevel, consumption } = parseTechAndConsumption(card);

    const descHtml =
      firstMatch(card, /<div\b[^>]*class="card-body py-2"[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>/i) ?? null;

    const description = descHtml ? (cleanKey(htmlToText(descHtml)) || null) : null;

    const recipesBlock = extractFirstDivBlockByClassToken(card, "recipes");

    const recipe: LightingRecipeIngredient[] = [];
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
      consumption,
      workSuitability: null,
      description,
      recipe,
    });
  }

  const map = new Map<string, LightingIndexItem>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Public API
// -----------------------------

export async function fetchLightingList(): Promise<LightingIndexItem[]> {
  const res = await fetch(lightingUrl(), {
    method: "GET",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });

  if (!res.ok) throw new Error(`PalDB Lighting list failed: ${res.status}`);
  const html = await res.text();
  return parseCardListPage(html);
}

export async function fetchLightingDetail(slug: string): Promise<LightingDetail> {
  const s = cleanKey(slug);
  if (!s) throw new Error("fetchLightingDetail: missing slug");

  const list = await fetchLightingList();
  const fromList = list.find((x) => x.slug === s) ?? null;

  const url = normalizeDetailHref(s) ?? lightingDetailUrl(s);
  const res = await fetch(url, { method: "GET", headers: { "accept-language": "en-US,en;q=0.9" } });

  if (!res.ok) {
    if (fromList) return { ...fromList, treant: null };
    throw new Error(`PalDB Lighting detail failed: ${res.status}`);
  }

  const html = await res.text();
  const treant = parseTreantTreeFromPage(html);

  if (fromList) return { ...fromList, treant };

  return {
    slug: s,
    name: cleanKey(s.replace(/_/g, " ")),
    iconUrl: null,
    categoryText: "Lighting",
    technologyLevel: null,
    consumption: null,
    workSuitability: null,
    description: null,
    recipe: [],
    treant,
  };
}
