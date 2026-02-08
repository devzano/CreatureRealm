// lib/palworld/paldbSummonsRaid.ts
//
// PalDB: Summoning Altar + Raid (from /en/Raid)
// - Parses the "SummoningAltar" tab and the "Raid" tab
// - Explicitly ignores the "Raid_marked" markdown tab (per request)
//
// Depends on your shared primitives in palworldDB.ts
//

import { absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";

// ------------------------------------
// Types
// ------------------------------------

export type PaldbIconRef = {
  slug: string;
  name: string;
  iconUrl: string | null;
};

export type SummoningAltarBoss = {
  slab: PaldbIconRef; // the slab / sigil item
  boss: PaldbIconRef; // the raid boss pal (or placeholder)
  elements: string[]; // tooltip titles from element icons (e.g. ["Dark","Dragon"])
  level: number | null;
  hp: number | null; // numeric HP (commas stripped)
  damageReductionPct: number | null; // 0..100
  attackDamagePct: number | null; // 0..N (e.g. 150, 200)
};

export type RaidMember = {
  unit: PaldbIconRef;
  levelMin: number | null;
  levelMax: number | null;
  count: number | null;
};

export type RaidEvent = {
  title: string;
  weight: number | null;
  gradeText: string | null; // e.g. "2–5", "18–99"
  members: RaidMember[];
};

// ------------------------------------
// Fetch
// ------------------------------------

const RAID_PAGE_URL = absUrl("/en/Raid");

export async function fetchSummoningAltarIndex(opts?: {
  signal?: AbortSignal;
  cache?: RequestCache;
}): Promise<SummoningAltarBoss[]> {
  const html = await fetchRaidPageHtml(opts);
  return parseSummoningAltarFromRaidPage(html);
}

export async function fetchRaidIndex(opts?: {
  signal?: AbortSignal;
  cache?: RequestCache;
}): Promise<RaidEvent[]> {
  const html = await fetchRaidPageHtml(opts);
  return parseRaidFromRaidPage(html);
}

async function fetchRaidPageHtml(opts?: { signal?: AbortSignal; cache?: RequestCache }) {
  const res = await fetch(RAID_PAGE_URL, {
    method: "GET",
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    },
    cache: opts?.cache ?? "no-store",
    signal: opts?.signal,
  });

  if (!res.ok) {
    throw new Error(`paldbSummonsRaid: fetch failed (${res.status}) ${RAID_PAGE_URL}`);
  }
  return await res.text();
}

// ------------------------------------
// Parse: Page -> Tabs
// ------------------------------------

export function parseSummoningAltarFromRaidPage(pageHtml: string): SummoningAltarBoss[] {
  const tabHtml = extractTabById(pageHtml, "SummoningAltar", ["Raid", "Raid_marked"]);
  if (!tabHtml) return [];
  return parseSummoningAltarTab(tabHtml);
}

export function parseRaidFromRaidPage(pageHtml: string): RaidEvent[] {
  const tabHtml = extractTabById(pageHtml, "Raid", ["Raid_marked"]);
  if (!tabHtml) return [];
  return parseRaidTab(tabHtml);
}

/**
 * Extract a tab pane by its id, tolerant of PalDB's occasional malformed closing tags.
 * Strategy:
 * - Find `<div id="{id}"` start
 * - Stop at the next `<div id="{nextId}"` for any provided stop ids
 */
function extractTabById(pageHtml: string, id: string, stopIds: string[]): string | null {
  const src = String(pageHtml ?? "");
  if (!src) return null;

  const startNeedle = `<div id="${id}"`;
  const startIdx = src.indexOf(startNeedle);
  if (startIdx < 0) return null;

  const afterStart = src.slice(startIdx);

  let stopIdxAbs: number | null = null;
  for (const stopId of stopIds) {
    const stopNeedle = `<div id="${stopId}"`;
    const i = src.indexOf(stopNeedle, startIdx + 1);
    if (i >= 0) {
      stopIdxAbs = stopIdxAbs == null ? i : Math.min(stopIdxAbs, i);
    }
  }

  return stopIdxAbs == null ? afterStart : src.slice(startIdx, stopIdxAbs);
}

// ------------------------------------
// Parse: Summoning Altar tab
// ------------------------------------

function parseSummoningAltarTab(tabHtml: string): SummoningAltarBoss[] {
  const src = String(tabHtml ?? "");
  if (!src) return [];

  // Each boss block sits inside: <div class="col"><div class="d-flex border rounded"> ... </div></div>
  const cols = Array.from(
    src.matchAll(/<div\b[^>]*class=(?:"[^"]*\bcol\b[^"]*"|'[^']*\bcol\b[^']*')[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)
  ).map((m) => m[1] ?? "");

  const out: SummoningAltarBoss[] = [];

  for (const col of cols) {
    const slab = parseLeftSlab(col);
    const boss = parseBossLink(col);

    // If we can't identify both, skip.
    if (!slab || !boss) continue;

    const elements = parseTooltipTitles(col).filter(Boolean);

    const level = parseInlineNumber(col, /\bLevel:\s*([0-9]+)\b/i);
    const hp = parseInlineNumber(col, /\bHp:\s*([0-9][0-9,]*)\b/i, true);

    const damageReductionPct = parseInlinePct(col, /\bDamage\s*Reduction:\s*([0-9]+)\s*%/i);
    const attackDamagePct = parseInlinePct(col, /\bAttack\s*Damage:\s*([0-9]+)\s*%/i);

    out.push({
      slab,
      boss,
      elements,
      level,
      hp,
      damageReductionPct,
      attackDamagePct,
    });
  }

  // Dedupe by slab slug (stable unique key here)
  const map = new Map<string, SummoningAltarBoss>();
  for (const it of out) {
    if (!map.has(it.slab.slug)) map.set(it.slab.slug, it);
  }
  return Array.from(map.values());
}

function parseLeftSlab(colHtml: string): PaldbIconRef | null {
  const src = String(colHtml ?? "");
  if (!src) return null;

  const href =
    firstMatch(src, /<a\b[^>]*\bhref="([^"]+)"/i) ??
    firstMatch(src, /<a\b[^>]*\bhref='([^']+)'/i) ??
    null;

  const slug = href ? cleanKey(href) : null;
  if (!slug) return null;

  const iconUrl =
    firstMatch(src, /<img\b[^>]*\bclass="[^"]*\bsize64\b[^"]*"[^>]*\bsrc="([^"]+)"/i) ??
    firstMatch(src, /<img\b[^>]*\bclass='[^']*\bsize64\b[^']*'[^>]*\bsrc='([^']+)'/i) ??
    firstMatch(src, /<img\b[^>]*\bsrc="([^"]+)"[^>]*\bclass="[^"]*\bsize64\b[^"]*"/i) ??
    firstMatch(src, /<img\b[^>]*\bsrc='([^']+)'[^>]*\bclass='[^']*\bsize64\b[^']*'/i) ??
    null;

  return {
    slug,
    name: slugToName(slug),
    iconUrl: iconUrl ? absUrl(iconUrl) : null,
  };
}

function parseBossLink(colHtml: string): PaldbIconRef | null {
  const src = String(colHtml ?? "");
  if (!src) return null;

  // Boss anchor: <a class="itemname" ... href="Eclipsed_Siren_Bellanoir"> ...Name...</a>
  const m = src.match(
    /<a\b[^>]*class=(?:"[^"]*\bitemname\b[^"]*"|'[^']*\bitemname\b[^']*')[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/i
  );

  const href = cleanKey(m?.[1] ?? m?.[2] ?? "");
  if (!href) return null;

  const inner = String(m?.[3] ?? "");

  const iconUrl =
    firstMatch(inner, /<img\b[^>]*\bsrc="([^"]+)"/i) ??
    firstMatch(inner, /<img\b[^>]*\bsrc='([^']+)'/i) ??
    null;

  // Name is the rendered anchor text minus images/spans
  const name = cleanKey(htmlToText(inner)) || slugToName(href);

  return {
    slug: href,
    name,
    iconUrl: iconUrl ? absUrl(iconUrl) : null,
  };
}

// ------------------------------------
// Parse: Raid tab
// ------------------------------------

function parseRaidTab(tabHtml: string): RaidEvent[] {
  const src = String(tabHtml ?? "");
  if (!src) return [];

  // Robust: slice into event blocks by locating repeated "col + d-flex border rounded" starts
  const blocks = extractRaidEventBlocks(src);

  const out: RaidEvent[] = [];

  for (const col of blocks) {
    const title = cleanKey(
      firstMatch(col, /<div>\s*([^<][\s\S]*?)\s*<\/div>\s*<div>\s*Weight:/i) ??
        firstMatch(col, /<div>\s*([^<][\s\S]*?)\s*<\/div>/i) ??
        ""
    );

    if (!title) continue;

    const weight = parseInlineNumber(col, /\bWeight:\s*([0-9]*\.?[0-9]+)\b/i);

    const gradeRaw =
      firstMatch(col, /\bGrade:\s*<\/div>\s*<div>\s*([\s\S]*?)\s*<\/div>/i) ??
      firstMatch(col, /\bGrade:\s*([\s\S]*?)\s*<\/div>/i) ??
      "";

    const gradeText = normalizeDashText(cleanKey(htmlToText(gradeRaw)));

    const members = parseRaidMembers(col);

    out.push({
      title,
      weight,
      gradeText: gradeText || null,
      members,
    });
  }

  // Dedupe by title+grade (PalDB should be stable, but safe)
  const map = new Map<string, RaidEvent>();
  for (const it of out) {
    const k = `${it.title}__${it.gradeText ?? ""}`;
    if (!map.has(k)) map.set(k, it);
  }
  return Array.from(map.values());
}

/**
 * Extract raid event blocks without relying on balanced </div>.
 * We find each start of a "col" that contains "d-flex border rounded" and slice until the next.
 */
function extractRaidEventBlocks(tabHtml: string): string[] {
  const src = String(tabHtml ?? "");
  if (!src) return [];

  // Start pattern:
  // <div class="col"> ... <div class="d-flex border rounded">
  // (class attribute order can vary)
  const re =
    /<div\b[^>]*class=(?:"[^"]*\bcol\b[^"]*"|'[^']*\bcol\b[^']*')[^>]*>\s*<div\b[^>]*class=(?:"[^"]*\bd-flex\b[^"]*\bborder\b[^"]*\brounded\b[^"]*"|'[^']*\bd-flex\b[^']*\bborder\b[^']*\brounded\b[^']*')[^>]*>/gi;

  const starts: number[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(src))) {
    if (typeof m.index === "number") starts.push(m.index);
  }

  if (!starts.length) return [];

  const blocks: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const a = starts[i];
    const b = i + 1 < starts.length ? starts[i + 1] : src.length;
    blocks.push(src.slice(a, b));
  }

  return blocks;
}

function parseRaidMembers(colHtml: string): RaidMember[] {
  const src = String(colHtml ?? "");
  if (!src) return [];

  // Each member line is typically:
  // <div ...><a class="itemname" ...>...</a> LvX-Y xN</div>
  // Make div tag tolerant of attributes and whitespace/newlines.
  const lines = Array.from(
    src.matchAll(
      /<div\b[^>]*>\s*(<a\b[^>]*class=(?:"[^"]*\bitemname\b[^"]*"|'[^']*\bitemname\b[^']*')[\s\S]*?<\/a>)\s*([^<]*)\s*<\/div>/gi
    )
  );

  const out: RaidMember[] = [];

  for (const m of lines) {
    const aHtml = String(m[1] ?? "");
    if (!aHtml) continue;

    // NOTE: the trailing part is plain text (Lv.. x..)
    const trailing = cleanKey(htmlToText(String(m[2] ?? "")));

    const unit = parseRaidUnitAnchor(aHtml);
    if (!unit) continue;

    const { levelMin, levelMax, count } = parseRaidTrailingLvCount(trailing);

    out.push({
      unit,
      levelMin,
      levelMax,
      count,
    });
  }

  // Keep order; dedupe by slug+lv+count combo
  const seen = new Set<string>();
  return out.filter((x) => {
    const k = `${x.unit.slug}__${x.levelMin ?? ""}-${x.levelMax ?? ""}__${x.count ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseRaidUnitAnchor(aHtml: string): PaldbIconRef | null {
  const src = String(aHtml ?? "");
  if (!src) return null;

  const href =
    firstMatch(src, /\bhref="([^"]+)"/i) ??
    firstMatch(src, /\bhref='([^']+)'/i) ??
    null;

  if (!href) return null;

  const iconUrl =
    firstMatch(src, /<img\b[^>]*\bsrc="([^"]+)"/i) ??
    firstMatch(src, /<img\b[^>]*\bsrc='([^']+)'/i) ??
    null;

  const name = cleanKey(htmlToText(src)) || slugToName(href);

  return {
    slug: cleanKey(href),
    name,
    iconUrl: iconUrl ? absUrl(iconUrl) : null,
  };
}

function parseRaidTrailingLvCount(trailingText: string): {
  levelMin: number | null;
  levelMax: number | null;
  count: number | null;
} {
  const t = cleanKey(String(trailingText ?? ""));

  // Examples:
  // "Lv1-2 x3"
  // "Lv13-14 x1"
  // Sometimes could be "Lv39-39 x4"
  const lvA = t.match(/\bLv\.?\s*([0-9]+)\s*-\s*([0-9]+)\b/i);
  const lvB = t.match(/\bLv\.?\s*([0-9]+)\b/i);

  let levelMin: number | null = null;
  let levelMax: number | null = null;

  if (lvA) {
    levelMin = safeInt(lvA[1]);
    levelMax = safeInt(lvA[2]);
  } else if (lvB) {
    levelMin = safeInt(lvB[1]);
    levelMax = levelMin;
  }

  const cx = t.match(/\bx\s*([0-9]+)\b/i);
  const count = cx ? safeInt(cx[1]) : null;

  return { levelMin, levelMax, count };
}

// ------------------------------------
// Small helpers
// ------------------------------------

function parseInlineNumber(src: string, re: RegExp, allowCommas = false): number | null {
  const raw = firstMatch(src, re);
  if (!raw) return null;

  const s = allowCommas ? String(raw).replace(/,/g, "") : String(raw);
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseInlinePct(src: string, re: RegExp): number | null {
  const raw = firstMatch(src, re);
  if (!raw) return null;
  const n = Number(String(raw));
  return Number.isFinite(n) ? n : null;
}

function parseTooltipTitles(src: string): string[] {
  const s = String(src ?? "");
  if (!s) return [];

  // element icons: data-bs-title="Dark" etc.
  const out = Array.from(s.matchAll(/\bdata-bs-title=(?:"([^"]+)"|'([^']+)')/gi))
    .map((m) => cleanKey(m[1] ?? m[2] ?? ""))
    .filter(Boolean);

  // Dedup preserving order
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

function normalizeDashText(s: string | null | undefined): string | null {
  const t = cleanKey(String(s ?? ""));
  if (!t) return null;

  // Convert HTML entity dashes / variants into en dash
  const fixed = t
    .replace(/&ndash;|&#8211;|&#x2013;/gi, "–")
    .replace(/\s*-\s*/g, "–")
    .replace(/\s*–\s*/g, "–");

  return fixed || null;
}

function safeInt(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function slugToName(slugOrHref: string): string {
  const raw = String(slugOrHref ?? "").trim();
  if (!raw) return "-";

  // Remove query/hash and decode
  const base = raw.replace(/[#?].*$/, "");
  const last = base.split("/").filter(Boolean).slice(-1)[0] ?? base;

  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {
    // ignore
  }

  // PalDB uses underscores often; we convert to spaces for display names
  const name = decoded.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return name || decoded || raw;
}
