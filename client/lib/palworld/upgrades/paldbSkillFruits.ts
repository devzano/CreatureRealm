// client/lib/palworld/upgrades/paldbSkillFruits.ts
//
// Skill Fruit Orchard index:
//   https://paldb.cc/en/Skill_Fruit   (tab id="SkillfruitOrchard")
//
// Skill Fruit detail example:
//   https://paldb.cc/en/Skill_Fruit%3A_Implode
//
// IMPORTANT: PalDB tables are often malformed HTML:
// - <tbody> may not have </tbody> (it jumps to </table>)
// - <td> may not have </td> (it relies on implicit close)
// - <tr> sometimes omitted / merged
//
// This parser is intentionally tolerant of that.
//

import { BASE, absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { normalizeDetailHref } from "@/lib/palworld/paldbDetailKit";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type SkillFruitOrchardRow = {
  key: string;
  name: string;
  slug: string; // normalized absolute /en/... url
  iconUrl: string | null;

  sameElementPct: number | null;
  sameElementText: string | null;
};

export type SkillFruitDetailKV = { key: string; value: string };

export type SkillFruitDroppedByRow = {
  sourceName: string;
  sourceSlug: string | null;
  sourceIconUrl: string | null; // ✅ capture icon (e.g., Skillfruit Orchard build icon)
  qtyText: string | null;
  probabilityText: string | null;
};

export type SkillFruitMerchantRow = {
  sourceName: string | null;
  sourceSlug: string | null;
};

export type SkillFruitTreasureRow = {
  sourceName: string | null;
  sourceSlug: string | null;
  probabilityText: string | null;
  qtyText: string | null;
};

export type SkillFruitDetail = {
  slug: string;
  name: string;
  iconUrl: string | null;

  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;

  description: string | null;

  stats: SkillFruitDetailKV[];

  rarityText: string | null;
  typeText: string | null;
  rankText: string | null;
  goldCoinValueText: string | null;
  maxStackCountText: string | null;
  wazaName: string | null;
  wazaSlug: string | null;
  codeText: string | null;

  others: SkillFruitDetailKV[];

  droppedBy: SkillFruitDroppedByRow[];
  merchants: SkillFruitMerchantRow[];
  treasures: SkillFruitTreasureRow[];
};

// -----------------------------------------------------------------------------
// Cache
// -----------------------------------------------------------------------------

type CacheEntry = { at: number; data: SkillFruitOrchardRow[] };
let _cache: CacheEntry | null = null;

const INDEX_TTL_MS = 1000 * 60 * 60 * 12; // 12h

type DetailCacheEntry = { at: number; data: SkillFruitDetail };
const DETAIL_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const _detailCache = new Map<string, DetailCacheEntry>();

function now() {
  return Date.now();
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

/**
 * PalDB uses a bunch of internal ids like:
 * - Wander_Shop_1
 * - Arena_Shop_1
 * - Fruits_Grass_1
 *
 * You want display text with spaces instead of underscores.
 */
function humanizeUnderscores(v: any): string {
  const s = cleanKey(safeStr(v));
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

// -----------------------------------------------------------------------------
// Shared tolerant HTML helpers (SINGLE IMPLEMENTATION)
// -----------------------------------------------------------------------------

function extractFirstTableHtml(block: string): string | null {
  return firstMatch(String(block ?? ""), /(<table\b[\s\S]*?<\/table>)/i);
}

/**
 * PalDB often uses <tbody> without </tbody>. This supports:
 * - <tbody> ... </tbody>
 * - <tbody> ... </table>
 * - <tbody> ... EOF
 * If no <tbody>, it falls back to table inner (between <table ...> and </table>)
 */
function extractTbodyInner(tableHtml: string): string {
  const s = String(tableHtml ?? "");
  if (!s) return "";

  const tbodyStart = s.search(/<tbody\b[^>]*>/i);
  if (tbodyStart >= 0) {
    const after = s.slice(tbodyStart);
    const openTag = firstMatch(after, /<tbody\b[^>]*>/i) ?? "";
    const contentStart = after.indexOf(openTag) + openTag.length;
    const rest = after.slice(contentStart);

    const endIdx =
      rest.search(/<\/tbody\b/i) >= 0
        ? rest.search(/<\/tbody\b/i)
        : rest.search(/<\/table\b/i) >= 0
          ? rest.search(/<\/table\b/i)
          : rest.length;

    return rest.slice(0, Math.max(0, endIdx));
  }

  const inner = firstMatch(s, /<table\b[^>]*>([\s\S]*?)<\/table>/i);
  return inner ?? "";
}

function splitLooseRows(tbodyOrTableInnerHtml: string): string[] {
  const s = String(tbodyOrTableInnerHtml ?? "");
  if (!s) return [];
  return Array.from(s.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/table\b|$)/gi)).map((m) => m[1] ?? "");
}

function splitLooseCells(trInnerHtml: string): string[] {
  const s = String(trInnerHtml ?? "");
  if (!s) return [];
  return Array.from(s.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)(?=<t[dh]\b|<\/tr\b|<\/table\b|$)/gi)).map(
    (m) => m[1] ?? ""
  );
}

function parseFirstLinkHref(html: string): string | null {
  const href = firstMatch(String(html ?? ""), /\bhref=["']([^"']+)["']/i);
  return href ? cleanKey(href) : null;
}

function parseAnchorItem(tdHtml: string): { name: string; href: string | null; iconUrl: string | null } {
  const td = String(tdHtml ?? "");
  if (!td) return { name: "", href: null, iconUrl: null };

  const a =
    firstMatch(td, /(<a\b[^>]*class="[^"]*\bitemname\b[^"]*"[\s\S]*?<\/a>)/i) ??
    firstMatch(td, /(<a\b[^>]*class='[^']*\bitemname\b[^']*'[\s\S]*?<\/a>)/i) ??
    firstMatch(td, /(<a\b[\s\S]*?<\/a>)/i);

  const href =
    (a && (firstMatch(a, /\bhref="([^"]+)"/i) ?? firstMatch(a, /\bhref='([^']+)'/i))) || null;

  const icon =
    (a && (firstMatch(a, /<img\b[^>]*\bsrc="([^"]+)"/i) ?? firstMatch(a, /<img\b[^>]*\bsrc='([^']+)'/i))) ||
    null;

  const name = cleanKey(htmlToText(a ?? td));

  return {
    name,
    href: href ? cleanKey(href) : null,
    iconUrl: icon ? absUrl(icon) : null,
  };
}

function parsePercentNumber(v: any): { n: number | null; text: string | null } {
  const s = cleanKey(safeStr(v));
  if (!s) return { n: null, text: null };

  const m = s.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return { n: null, text: s };

  const n = Number(m[1]);
  return { n: Number.isFinite(n) ? n : null, text: s };
}

// -----------------------------------------------------------------------------
// Index: Skillfruit Orchard tab on /en/Skill_Fruit
// -----------------------------------------------------------------------------

function extractTabPaneById(html: string, id: string): string | null {
  const src = String(html ?? "");
  if (!src) return null;

  const needleA = `id="${id}"`;
  const needleB = `id='${id}'`;

  let idIdx = src.indexOf(needleA);
  if (idIdx < 0) idIdx = src.indexOf(needleB);
  if (idIdx < 0) return null;

  const openDiv = src.lastIndexOf("<div", idIdx);
  if (openDiv < 0) return null;

  const after = src.slice(openDiv);

  const nextTabPane = after
    .slice(1)
    .search(/<div\b[^>]*class=(?:"[^"]*\btab-pane\b|\'[^\']*\btab-pane\b)/i);
  const nextAnyId = after.slice(1).search(/<div\b[^>]*\bid=(?:"|')/i);

  let stop = -1;
  if (nextTabPane >= 0) stop = nextTabPane + 1;
  else if (nextAnyId >= 0) stop = nextAnyId + 1;

  return stop > 0 ? after.slice(0, stop) : after.slice(0, 70000);
}

function ensureSkillFruitEncodedColon(pathOrHref: string): string {
  return String(pathOrHref ?? "").replace(/Skill_Fruit:/gi, "Skill_Fruit%3A");
}

export function normalizeSkillFruitDetailHref(hrefOrSlug: string): string | null {
  const raw = cleanKey(String(hrefOrSlug ?? ""));
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    const u = new URL(raw);
    const fixedPath = ensureSkillFruitEncodedColon(u.pathname);
    return absUrl(fixedPath + (u.search || ""));
  }

  if (raw.startsWith("/")) {
    const fixedPath = ensureSkillFruitEncodedColon(raw);
    return absUrl(fixedPath);
  }

  const fixed = ensureSkillFruitEncodedColon(raw);
  return absUrl(`/en/${fixed}`);
}

export function parseSkillfruitOrchardFromPage(html: string): SkillFruitOrchardRow[] {
  const pane = extractTabPaneById(html, "SkillfruitOrchard");
  if (!pane) return [];

  const table = extractFirstTableHtml(pane);
  if (!table) return [];

  const inner = extractTbodyInner(table);
  const rows = splitLooseRows(inner);

  const out: SkillFruitOrchardRow[] = [];

  for (const trInner of rows) {
    const cells = splitLooseCells(trInner);
    if (cells.length < 2) continue;

    const itemTd = cells[0] ?? "";
    const pctTd = cells[1] ?? "";

    const item = parseAnchorItem(itemTd);
    const pct = parsePercentNumber(htmlToText(pctTd));

    const name = cleanKey(item.name);
    const slug = item.href ? normalizeSkillFruitDetailHref(item.href) : null;
    if (!name && !slug) continue;

    const key = cleanKey(slug ?? name);

    out.push({
      key,
      name: name || "Skill Fruit",
      slug: slug ?? absUrl(`/en/Skill_Fruit`),
      iconUrl: item.iconUrl,
      sameElementPct: pct.n,
      sameElementText: pct.text,
    });
  }

  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)));
}

export async function fetchSkillfruitOrchard(opts?: {
  force?: boolean;
  signal?: AbortSignal;
}): Promise<SkillFruitOrchardRow[]> {
  const force = !!opts?.force;

  if (!force && _cache && now() - _cache.at < INDEX_TTL_MS) return _cache.data;

  const url = `${BASE}/en/Skill_Fruit`;
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "text/html,application/xhtml+xml" },
    signal: opts?.signal,
  });

  if (!res.ok) {
    if (_cache?.data?.length) return _cache.data;
    throw new Error(`fetchSkillfruitOrchard: HTTP ${res.status}`);
  }

  const html = await res.text();
  const data = parseSkillfruitOrchardFromPage(html);

  _cache = { at: now(), data };
  return data;
}

// -----------------------------------------------------------------------------
// Detail page parsing
// -----------------------------------------------------------------------------

function getOgMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta\\s+property=["']${prop}["']\\s+content=["']([^"']*)["']\\s*\\/?>`, "i");
  const m = String(html ?? "").match(re);
  return m?.[1] ? cleanKey(m[1]) : null;
}

function extractItemPopupName(html: string): string | null {
  const a = firstMatch(
    html,
    /<a\b[^>]*class=["'][^"']*\bitemname\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
  );
  const t = cleanKey(htmlToText(a ?? ""));
  return t || null;
}

function extractItemPopupIcon(html: string): string | null {
  const img = firstMatch(html, /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\bsize128\b/i);
  return img ? absUrl(img) : null;
}

function extractItemPopupDescription(html: string): string | null {
  const body = firstMatch(
    html,
    /<div\b[^>]*class=["'][^"']*\bcard-body\b[^"']*py-2\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  const t = cleanKey(htmlToText(body ?? ""));
  return t || null;
}

function extractCardBlockByTitle(html: string, titleText: string): string | null {
  const src = String(html ?? "");
  if (!src) return null;

  const needle = cleanKey(titleText).toLowerCase();

  const parts = src.split(/<div class="card mt-3">/i).slice(1);
  for (const raw of parts) {
    const card = `<div class="card mt-3">${raw}`;

    const h5Inner =
      firstMatch(
        card,
        /<h5\b[^>]*class=(?:"[^"]*\bcard-title\b[^"]*"|'[^']*\bcard-title\b[^']*')[^>]*>\s*([\s\S]*?)\s*<\/h5>/i
      ) ?? null;

    const title = cleanKey(htmlToText(h5Inner ?? "")).toLowerCase();
    if (!title) continue;

    if (title.includes(needle)) return card;
  }

  return null;
}

function parseKeyValueRowsFromCard(cardHtml: string): SkillFruitDetailKV[] {
  const out: SkillFruitDetailKV[] = [];
  const s = String(cardHtml ?? "");
  if (!s) return out;

  const rows = Array.from(
    s.matchAll(
      /<div\b[^>]*class=["'][^"']*\bd-flex\b[^"']*justify-content-between\b[^"']*["'][^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
    )
  );

  for (const m of rows) {
    const k = cleanKey(htmlToText(m[1] ?? ""));
    const v = cleanKey(htmlToText(m[2] ?? ""));
    if (!k && !v) continue;
    out.push({ key: k || "—", value: v || "—" });
  }

  return out;
}

function kvFind(kvs: SkillFruitDetailKV[], key: string): string | null {
  const target = cleanKey(key).toLowerCase();
  for (const kv of kvs) {
    if (cleanKey(kv.key).toLowerCase() === target) return cleanKey(kv.value) || null;
  }
  return null;
}

function parseDroppedBy(html: string): SkillFruitDroppedByRow[] {
  const card = extractCardBlockByTitle(html, "Dropped By");
  if (!card) return [];

  const table = extractFirstTableHtml(card);
  if (!table) return [];

  const inner = extractTbodyInner(table);
  const rows = splitLooseRows(inner);

  const out: SkillFruitDroppedByRow[] = [];

  for (const trInner of rows) {
    const cells = splitLooseCells(trInner);
    if (cells.length < 3) continue;

    const srcTd = cells[0] ?? "";
    const qtyTd = cells[1] ?? "";
    const probTd = cells[2] ?? "";

    // ✅ Use the shared anchor parser so we capture the icon too.
    const item = parseAnchorItem(srcTd);

    const rawName = cleanKey(item.name);
    const srcSlug = item.href ? normalizeDetailHref(item.href) : null;

    out.push({
      sourceName: humanizeUnderscores(rawName) || "—",
      sourceSlug: srcSlug,
      sourceIconUrl: item.iconUrl,
      qtyText: cleanKey(htmlToText(qtyTd)) || null,
      probabilityText: cleanKey(htmlToText(probTd)) || null,
    });
  }

  return out;
}

function parseMerchants(html: string): SkillFruitMerchantRow[] {
  const card = extractCardBlockByTitle(html, "Wandering Merchant");
  if (!card) return [];

  const table = extractFirstTableHtml(card);
  if (!table) return [];

  const inner = extractTbodyInner(table);
  const rows = splitLooseRows(inner);

  const out: SkillFruitMerchantRow[] = [];

  for (const trInner of rows) {
    const cells = splitLooseCells(trInner);
    if (cells.length < 2) continue;

    const sourceTd = cells[1] ?? "";
    const a = firstMatch(sourceTd, /(<a\b[\s\S]*?<\/a>)/i);

    const rawName = cleanKey(htmlToText(a ?? sourceTd)) || null;
    const name = rawName ? humanizeUnderscores(rawName) : null;

    const href = a ? parseFirstLinkHref(a) : null;
    const slug = href ? normalizeDetailHref(href) : null;

    out.push({ sourceName: name, sourceSlug: slug });
  }

  return out;
}

function parseTreasures(html: string): SkillFruitTreasureRow[] {
  const card = extractCardBlockByTitle(html, "Treasure Box");
  if (!card) return [];

  const table = extractFirstTableHtml(card);
  if (!table) return [];

  const inner = extractTbodyInner(table);
  const rows = splitLooseRows(inner);

  const out: SkillFruitTreasureRow[] = [];

  for (const trInner of rows) {
    const cells = splitLooseCells(trInner);
    if (cells.length < 2) continue;

    const sourceTd = cells[1] ?? "";
    const a = firstMatch(sourceTd, /(<a\b[\s\S]*?<\/a>)/i);

    const rawName = cleanKey(htmlToText(a ?? sourceTd)) || null;
    const sourceName = rawName ? humanizeUnderscores(rawName) : null;

    const href = a ? parseFirstLinkHref(a) : null;
    const sourceSlug = href ? normalizeDetailHref(href) : null;

    const qty =
      cleanKey(
        htmlToText(
          firstMatch(
            trInner,
            /<small\b[^>]*class=["'][^"']*\bitemQuantity\b[^"']*["'][^>]*>([\s\S]*?)<\/small>/i
          ) ?? ""
        )
      ) || null;

    const probText = cleanKey(htmlToText(sourceTd)) || null;
    const prob = probText ? probText.match(/([0-9]+(?:\.[0-9]+)?)\s*%/i)?.[0] ?? null : null;

    out.push({
      sourceName,
      sourceSlug,
      probabilityText: prob ?? probText,
      qtyText: qty,
    });
  }

  return out;
}

export function parseSkillFruitDetailFromPage(html: string, slugAbs: string): SkillFruitDetail {
  const ogTitle = getOgMeta(html, "og:title");
  const ogDescription = getOgMeta(html, "og:description");
  const ogImage = getOgMeta(html, "og:image");

  const name = extractItemPopupName(html) || ogTitle || "Skill Fruit";
  const iconUrl = extractItemPopupIcon(html) || ogImage || null;
  const description = extractItemPopupDescription(html) || ogDescription || null;

  const statsCard = extractCardBlockByTitle(html, "Stats");
  const stats = statsCard ? parseKeyValueRowsFromCard(statsCard) : [];

  const othersCard = extractCardBlockByTitle(html, "Others");
  const others = othersCard ? parseKeyValueRowsFromCard(othersCard) : [];

  const rarityText = kvFind(stats, "Rarity");
  const typeText = kvFind(stats, "Type");
  const rankText = kvFind(stats, "Rank");
  const maxStackCountText = kvFind(stats, "MaxStackCount");
  const codeText = kvFind(stats, "Code");

  let goldCoinValueText: string | null = null;
  for (const kv of stats) {
    if (cleanKey(kv.key).toLowerCase().includes("gold coin")) {
      goldCoinValueText = cleanKey(kv.value) || null;
      break;
    }
  }

  let wazaName: string | null = null;
  let wazaSlug: string | null = null;
  if (statsCard) {
    const wazaRow = firstMatch(
      statsCard,
      /<div\b[^>]*class=["'][^"']*\bd-flex\b[^"']*["'][^>]*>\s*<div[^>]*>\s*Waza\s*<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i
    );
    if (wazaRow) {
      const a = firstMatch(wazaRow, /(<a\b[\s\S]*?<\/a>)/i);
      wazaName = cleanKey(htmlToText(a ?? wazaRow)) || null;

      const href = a ? parseFirstLinkHref(a) : null;
      wazaSlug = href ? normalizeDetailHref(href) : null;
    }
  }

  const droppedBy = parseDroppedBy(html);
  const merchants = parseMerchants(html);
  const treasures = parseTreasures(html);

  return {
    slug: slugAbs,
    name,
    iconUrl,

    ogTitle,
    ogDescription,
    ogImage,

    description,

    stats,
    rarityText,
    typeText,
    rankText,
    goldCoinValueText,
    maxStackCountText,
    wazaName,
    wazaSlug,
    codeText,

    others,

    droppedBy,
    merchants,
    treasures,
  };
}

export async function fetchSkillFruitDetail(
  slugOrHref: string,
  opts?: { force?: boolean; signal?: AbortSignal }
): Promise<SkillFruitDetail> {
  const slugAbs = normalizeSkillFruitDetailHref(slugOrHref);
  if (!slugAbs) throw new Error("fetchSkillFruitDetail: missing slug");

  const force = !!opts?.force;

  const cached = _detailCache.get(slugAbs);
  if (!force && cached && now() - cached.at < DETAIL_TTL_MS) return cached.data;

  const res = await fetch(slugAbs, {
    method: "GET",
    headers: { accept: "text/html,application/xhtml+xml" },
    signal: opts?.signal,
  });

  if (!res.ok) {
    if (cached) return cached.data;
    throw new Error(`fetchSkillFruitDetail: HTTP ${res.status}`);
  }

  const html = await res.text();
  const data = parseSkillFruitDetailFromPage(html, slugAbs);

  _detailCache.set(slugAbs, { at: now(), data });
  return data;
}
