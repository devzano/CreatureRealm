// lib/palworld/paldbStorage.ts
//
// PalDB Storage (Construction -> Storage) list + lightweight detail
// Source page: https://paldb.cc/en/Storage
//
// This module mirrors your other PalDB scrapers:
// - fetchStorageList(): returns the 30 storage build objects (slug/name/icon + tech/slots + desc + recipe)
// - fetchStorageDetail(slug): currently reuses list-page parsing but returns a single item (handy for lazy detail)
//
// Depends on your existing helpers in palworldDB.ts:
//   absUrl, cleanKey, firstMatch, htmlToText
//

import { absUrl, BASE, cleanKey, extractSize128ImgUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import {
  type TreantNode,
  parseTreantTreeFromPage,
  normalizeDetailHref,
} from "@/lib/palworld/paldbDetailKit";

export type StorageRecipeIngredient = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qty: number | null;
};

export type StorageIndexItem = {
  slug: string; // e.g. "Wooden_Chest"
  name: string; // "Wooden Chest"
  iconUrl: string | null; // size128 icon

  categoryText: string | null; // usually "Storage" on this page

  technologyLevel: number | null; // "Technology 2"
  slots: number | null; // "Slots 10"
  workSuitability: { slug: string; name: string; iconUrl: string | null; level: number | null } | null; // e.g. Cooling Lv 1

  description: string | null;

  recipe: StorageRecipeIngredient[]; // list of ingredients (qty from right column)
};

export type StorageDetail = StorageIndexItem & {
  treant: TreantNode | null;
};

function normalizeSlug(slugOrHref: string) {
  const raw = cleanKey(String(slugOrHref ?? ""));
  if (!raw) return null;

  // already absolute -> convert to path then slug
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const p = u.pathname || "";
      // expected: /en/Wooden_Chest
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

  // "/Wooden_Chest" (rare)
  return cleanKey(raw.replace(/^\//, ""));
}

function storageUrl() {
  return `${BASE}/en/Storage`;
}

function storageDetailUrl(slug: string) {
  return `${BASE}/en/${encodeURIComponent(slug)}`;
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

    // ensure this div has the class token
    const openEnd = s.indexOf(">", start);
    if (openEnd < 0) break;

    const openTag = s.slice(start, openEnd + 1);
    const openTagLower = openTag.toLowerCase();

    // must contain class="...card itemPopup..." (order can vary)
    if (!(openTagLower.includes('class="') || openTagLower.includes("class='")) || !openTagLower.includes(needle)) {
      i = openEnd + 1;
      continue;
    }

    // balance nested <div> ... </div>
    let depth = 0;
    let j = start;

    while (j < s.length) {
      const nextOpen = s.toLowerCase().indexOf("<div", j);
      const nextClose = s.toLowerCase().indexOf("</div", j);

      if (nextClose < 0) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        // count only real <div ...> tags
        const oe = s.indexOf(">", nextOpen);
        if (oe < 0) break;
        depth += 1;
        j = oe + 1;
        continue;
      }

      // found a close
      const ce = s.indexOf(">", nextClose);
      if (ce < 0) break;
      depth -= 1;
      j = ce + 1;

      if (depth <= 0) {
        // include up through this </div>
        out.push(s.slice(start, j));
        i = j;
        break;
      }
    }

    // if we failed to close, bail forward to avoid infinite loop
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

    // must have class attribute and include the token somewhere in it
    const hasClass = openTagLower.includes('class="') || openTagLower.includes("class='");
    const hasToken = openTagLower.includes(token);
    if (!hasClass || !hasToken) {
      i = openEnd + 1;
      continue;
    }

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
        return s.slice(start, j);
      }
    }

    // failed to close: move forward
    i = openEnd + 1;
  }

  return null;
}

function parseCardListPage(html: string): StorageIndexItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const cards = extractDivBlocksByClass(src, "card itemPopup");

  const out: StorageIndexItem[] = [];

  for (const card of cards) {
    // slug + name
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

    const categoryText = categoryTextRaw ? cleanKey(htmlToText(categoryTextRaw)) || null : null;

    const techN =
      firstMatch(
        card,
        /Technology[\s\S]{0,200}?<span\b[^>]*class=(?:"[^"]*\bborder p-1\b[^"]*"|'[^']*\bborder p-1\b[^']*')[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ?? null;

    const technologyLevel = techN ? safeInt(techN) : null;

    const slotsN =
      firstMatch(
        card,
        /Slots[\s\S]{0,200}?<span\b[^>]*class=(?:"[^"]*\bborder p-1\b[^"]*"|'[^']*\bborder p-1\b[^']*')[^>]*>\s*([0-9]+)\s*<\/span>/i
      ) ?? null;

    let slots = slotsN ? safeInt(slotsN) : null;

    if (slots == null) {
      const slugLc = String(slug).toLowerCase();
      const nameLc = String(name).toLowerCase();

      // cover both possible slug shapes we might see
      const isJapaneseStyleChest =
        slugLc === "japanese-style_chest" ||
        slugLc === "japanese-style-chest" ||
        slugLc === "japanese_style_chest" ||
        nameLc === "japanese-style chest" ||
        nameLc === "japanese style chest";

      if (isJapaneseStyleChest) {
        slots = 10;
      }
    }

    const descHtml =
      firstMatch(card, /<div\b[^>]*class="card-body py-2"[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>/i) ?? null;

    const description = descHtml ? cleanKey(htmlToText(descHtml)) || null : null;

    const recipesBlock = extractFirstDivBlockByClassToken(card, "recipes");

    const recipe: StorageRecipeIngredient[] = [];
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
      slots,
      workSuitability: null, // keep optional for now
      description,
      recipe,
    });
  }

  // dedupe by slug
  const map = new Map<string, StorageIndexItem>();
  for (const it of out) if (!map.has(it.slug)) map.set(it.slug, it);
  return Array.from(map.values());
}

// -----------------------------
// Public API
// -----------------------------

export async function fetchStorageList(): Promise<StorageIndexItem[]> {
  const res = await fetch(storageUrl(), {
    method: "GET",
    headers: {
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) throw new Error(`PalDB Storage list failed: ${res.status}`);
  const html = await res.text();
  return parseCardListPage(html);
}

export async function fetchStorageDetail(slug: string): Promise<StorageDetail> {
  const s = cleanKey(slug);
  if (!s) throw new Error("fetchStorageDetail: missing slug");

  const list = await fetchStorageList();
  const fromList = list.find((x) => x.slug === s) ?? null;

  const url = normalizeDetailHref(s) ?? storageDetailUrl(s);

  const res = await fetch(url, {
    method: "GET",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });

  if (!res.ok) {
    if (fromList) {
      return {
        ...fromList,
        treant: null,
      };
    }
    throw new Error(`PalDB Storage detail failed: ${res.status}`);
  }

  const html = await res.text();
  const treant = parseTreantTreeFromPage(html);

  if (fromList) {
    return {
      ...fromList,
      treant,
    };
  }

  return {
    slug: s,
    name: cleanKey(s.replace(/_/g, " ")),
    iconUrl: null,
    categoryText: "Storage",
    technologyLevel: null,
    slots: null,
    workSuitability: null,
    description: null,
    recipe: [],
    treant,
  };
}
