// lib/palworld/paldbTechnologies.ts
//
// PalDB Technologies scraping helpers (full list)
//
// Source: https://paldb.cc/en/Technologies
// Hover details source: https://paldb.cc/en/hover?s=Technology/...
//
// Parses each level row and the hoverTech cards.
//
// Also parses the totals:
//  - Technology Points
//  - Ancient Technology Points
//
// Adds hover-card parsing so you can show per-tech:
//  - cost (Technology Points or Ancient Technology Points)
//  - (optional) description
//
// Depends on your existing primitives: absUrl, cleanKey, firstMatch
//

import { absUrl, cleanKey, firstMatch } from "@/lib/palworld/palworldDB";

export type TechnologyItem = {
  level: number;
  category: string; // hoverTechHeader
  name: string; // hoverTechFooter
  iconUrl: string | null; // bg image url
  slug: string; // normalized from data-hover
  isBoss: boolean; // BossTechnology class

  // --- from hover card (optional, lazy-loaded) ---
  costTechPoints?: number | null;
  costAncientTechPoints?: number | null;
  description?: string | null;
};

export type TechnologyPointTotals = {
  technologyPoints: number | null;
  ancientTechnologyPoints: number | null;
};

export type TechnologyHoverDetails = {
  name: string | null;
  category: string | null;
  level: number | null;
  technologyPoints: number | null;
  ancientTechnologyPoints: number | null;
  description: string | null;
};

let _cache: TechnologyItem[] | null = null;
let _cacheAt = 0;

let _totals: TechnologyPointTotals | null = null;

const TTL = 10 * 60 * 1000;

// hover cache (per slug)
let _hoverCache: Map<string, { at: number; value: TechnologyHoverDetails }> = new Map();
const HOVER_TTL = 60 * 60 * 1000; // 1 hour

export function getTechnologyPointTotals(): TechnologyPointTotals | null {
  return _totals;
}

export async function warmTechnologies(): Promise<void> {
  try {
    await fetchTechnologies({ force: false });
  } catch {
    // warm never throws
  }
}

export async function fetchTechnologies(opts?: { force?: boolean }): Promise<TechnologyItem[]> {
  const force = !!opts?.force;
  const now = Date.now();

  if (!force && _cache && now - _cacheAt < TTL) return _cache;

  const url = "https://paldb.cc/en/Technologies";
  const html = await fetchHtml(url);

  _totals = parseTechnologyPointTotals(html);

  const list = parseTechnologiesHtml(html);

  _cache = list;
  _cacheAt = now;
  return list;
}

/**
 * Fetch + parse hover card for a given technology slug, e.g. "Technology/PalFoodBox".
 * This is the data you "see on hover" on the site: level + cost (and description).
 */
export async function fetchTechnologyHoverDetails(
  slug: string,
  opts?: { force?: boolean }
): Promise<TechnologyHoverDetails> {
  const force = !!opts?.force;
  const key = cleanKey(String(slug ?? ""));
  const now = Date.now();

  if (!key) {
    return {
      name: null,
      category: null,
      level: null,
      technologyPoints: null,
      ancientTechnologyPoints: null,
      description: null,
    };
  }

  const cached = _hoverCache.get(key);
  if (!force && cached && now - cached.at < HOVER_TTL) return cached.value;

  const url = `https://paldb.cc/en/hover?s=${encodeURIComponent(key)}`;
  const html = await fetchHtml(url);
  const parsed = parseTechnologyHoverHtml(html);

  _hoverCache.set(key, { at: now, value: parsed });
  return parsed;
}

/**
 * Convenience: enrich a TechnologyItem with hover details.
 * (Does not mutate original object; returns a merged copy)
 */
export async function enrichTechnologyItemWithHover(
  it: TechnologyItem,
  opts?: { force?: boolean }
): Promise<TechnologyItem> {
  const slug = cleanKey(it?.slug ?? "");
  if (!slug) return it;

  const details = await fetchTechnologyHoverDetails(slug, opts);

  return {
    ...it,
    // per-tech cost
    costTechPoints: details.technologyPoints,
    costAncientTechPoints: details.ancientTechnologyPoints,
    description: details.description,
    // If hover returns better name/category (rare), keep your list values as source of truth
  };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`PalDB request failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

function parseIntLoose(v: any): number | null {
  const s = String(v ?? "").replace(/[^0-9]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseTechnologyPointTotals(html: string): TechnologyPointTotals {
  const src = String(html ?? "");
  if (!src) return { technologyPoints: null, ancientTechnologyPoints: null };

  const techStr =
    firstMatch(src, /Technology\s*Points<\/span>\s*<span[^>]*>\s*([0-9][0-9,]*)\s*<\/span>/i) ?? null;

  const ancientStr =
    firstMatch(
      src,
      /Ancient\s*Technology\s*Points<\/span>\s*<span[^>]*>\s*([0-9][0-9,]*)\s*<\/span>/i
    ) ?? null;

  return {
    technologyPoints: techStr ? parseIntLoose(techStr) : null,
    ancientTechnologyPoints: ancientStr ? parseIntLoose(ancientStr) : null,
  };
}

function normalizeDataHoverToSlug(dataHover: string): string {
  // Examples:
  //   "?s=Technology/Workbench"
  //   "?s=Technology/Product_Axe_Grade_01"
  const raw = cleanKey(String(dataHover ?? ""));
  if (!raw) return "Technology";

  const sParam = raw.match(/[?&]s=([^&#]+)/i)?.[1];
  if (sParam) return cleanKey(decodeURIComponent(sParam));

  return cleanKey(raw.replace(/^[?&]/, ""));
}

function parseLevelNumber(block: string): number {
  const nStr =
    firstMatch(block, /<div[^>]*position:\s*absolute[^>]*>\s*([0-9]{1,4})\s*<\/div>/i) ??
    firstMatch(block, />\s*([0-9]{1,4})\s*<\/div>\s*<\/div>\s*<div[^>]*class="d-inline-block\s+hoverTech/i);

  const n = Number((nStr ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function parseTechnologiesHtml(html: string): TechnologyItem[] {
  const src = String(html ?? "");
  if (!src) return [];

  const chunks = src.split(/<div class="col pt-2 pb-1 border-bottom">/i).slice(1);

  const out: TechnologyItem[] = [];

  for (const raw of chunks) {
    const block = `<div class="col pt-2 pb-1 border-bottom">${raw}`;
    const level = parseLevelNumber(block);
    if (!level) continue;

    const re =
      /<div\b[^>]*class=(?:"([^"]*\bhoverTech\b[^"]*)"|'([^']*\bhoverTech\b[^']*)')[^>]*style=(?:"[^"]*background-image:\s*url\(([^)]+)\)[^"]*"|'[^']*background-image:\s*url\(([^)]+)\)[^']*')[^>]*data-hover=(?:"([^"]+)"|'([^']+)')[^>]*>\s*<div\b[^>]*class=(?:"[^"]*\bhoverTechHeader\b[^"]*"|'[^']*\bhoverTechHeader\b[^']*')[^>]*>\s*([^<]+?)\s*<\/div>\s*<div\b[^>]*class=(?:"[^"]*\bhoverTechFooter\b[^"]*"|'[^']*\bhoverTechFooter\b[^']*')[^>]*>\s*([^<]+?)\s*<\/div>\s*<\/div>/gi;

    let m: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(block))) {
      const classAttr = (m[1] ?? m[2] ?? "").trim();
      const bgUrl = (m[3] ?? m[4] ?? "").trim();
      const dataHover = (m[5] ?? m[6] ?? "").trim();
      const header = cleanKey(m[7] ?? "");
      const footer = cleanKey(m[8] ?? "");

      if (!footer) continue;

      out.push({
        level,
        category: header || "Unknown",
        name: footer,
        iconUrl: bgUrl ? absUrl(bgUrl) : null,
        slug: normalizeDataHoverToSlug(dataHover),
        isBoss: /\bBossTechnology\b/i.test(classAttr),
      });
    }
  }

  const seen = new Set<string>();
  const deduped: TechnologyItem[] = [];
  for (const t of out) {
    const k = `${t.level}::${t.slug}::${t.name}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(t);
  }

  return deduped;
}

// -----------------------------
// Hover card parsing (per-tech)
// -----------------------------

function htmlToLooseText(html: string): string {
  const s = String(html ?? "");
  return cleanKey(
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/div>\s*<div/gi, "</div>\n<div")
      .replace(/<[^>]+>/g, " ")
  );
}

/**
 * Parses https://paldb.cc/en/hover?s=Technology/... response HTML
 * Extracts: name, category, level, (tech points / ancient points), description.
 */
export function parseTechnologyHoverHtml(html: string): TechnologyHoverDetails {
  const src = String(html ?? "");
  if (!src) {
    return {
      name: null,
      category: null,
      level: null,
      technologyPoints: null,
      ancientTechnologyPoints: null,
      description: null,
    };
  }

  // Name in banner
  const name =
    cleanKey(
      firstMatch(src, /class="align-self-center"[^>]*>\s*([^<]+?)\s*<\/div>/i) ?? ""
    ) || null;

  // Category in banner (often "Structures", "Items", etc.)
  const category =
    cleanKey(
      firstMatch(src, /<span[^>]*style="color:\s*#959ea9[^"]*"[^>]*>\s*([^<]+?)\s*<\/span>/i) ?? ""
    ) || null;

  // Key/value pills (label + value)
  const pairs = Array.from(
    src.matchAll(
      /<span[^>]*class="bg-dark[^"]*"[^>]*>\s*([^<]+?)\s*<\/span>\s*<span[^>]*class="border[^"]*"[^>]*>\s*([^<]+?)\s*<\/span>/gi
    )
  ).map((m) => ({
    label: cleanKey(m[1] ?? "").toLowerCase(),
    value: cleanKey(m[2] ?? ""),
  }));

  let level: number | null = null;
  let technologyPoints: number | null = null;
  let ancientTechnologyPoints: number | null = null;

  for (const p of pairs) {
    const vLower = String(p.value ?? "").toLowerCase();

    // Usually: label "Technology" value "Lv. 4"
    if (p.label === "technology" && vLower.includes("lv")) {
      level = parseIntLoose(p.value);
      continue;
    }

    if (p.label === "technology points") {
      technologyPoints = parseIntLoose(p.value);
      continue;
    }

    if (p.label === "ancient technology points") {
      ancientTechnologyPoints = parseIntLoose(p.value);
      continue;
    }
  }

  // Description (first div inside card-body)
  const descHtml = firstMatch(src, /<div class="card-body[^"]*">\s*<div>\s*([\s\S]*?)\s*<\/div>/i) ?? null;
  const description = descHtml ? (htmlToLooseText(descHtml) || null) : null;

  return {
    name,
    category,
    level,
    technologyPoints,
    ancientTechnologyPoints,
    description,
  };
}
