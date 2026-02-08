// lib/palworld/upgrades/paldbDungeonsPals.ts
//
// Dungeon index + dungeon detail parsing (PalDB)
//
// - Index:  https://paldb.cc/en/Dungeons
//   -> DungeonIndexItem[]
// - Detail: https://paldb.cc/en/<slug> (e.g. Hillside_Cavern, ___)
//   -> DungeonDetail (title, level, code, boss spawns, normal spawns, treasure drops)
//
// Notes:
// - We keep parsing resilient: we anchor on the section headers:
//   "Boss Spawns" and "Normal Spawns" and then read each row block.
// - Treasure parsing:
//   PalDB renders actual treasure drops inside repeated `<div class="card mb-2">` sections
//   (e.g. "Yakushima_Treasure /41", "Yakushima02 /72").
//   The earlier "Possible Drops" card is often an empty table, so we ignore it.

import { BASE, absUrl, firstMatch } from "@/lib/palworld/palworldDB";
import { safeText, safeNum } from "@/components/Palworld/Construction/palGridKit";

const DUNGEONS_INDEX_URL = `${BASE}/en/Dungeons`;
const SPECIAL_SLUG = "___";
const SPECIAL_NAME = "Yakushima";

export type DungeonIndexItem = {
  slug: string; // "Hillside_Cavern" | "___"
  name: string; // "Hillside Cavern" | "Yakushima"
  level: number | null;
  levelText: string | null;
  url: string; // absolute
};

export type DungeonSpawnRow = {
  slug: string; // e.g. "Lifmunk" or "Coward_of_the_Steppe_Lifmunk"
  name: string; // display name
  iconUrl: string | null; // pal icon if present
  isAlpha: boolean;
  levelRangeText: string | null; // e.g. "10–13" or "6–9"
  levelMin: number | null;
  levelMax: number | null;
};

export type DungeonTreasureRow = {
  slug: string;
  name: string;
  iconUrl: string | null;
  qtyText: string | null; // "1" or "1000–1500"
  weightText: string | null; // legacy (was float-end)
  rateText?: string | null; // NEW: drop rate "71.429%"
};

export type DungeonDetail = {
  slug: string;
  name: string;
  level: number | null; // parsed from "Lv. 13" / "Lv 13" / etc.
  levelText: string | null;
  code: string | null; // from Stats -> Code
  bossSpawns: DungeonSpawnRow[];
  normalSpawns: DungeonSpawnRow[];
  treasureDrops: DungeonTreasureRow[];
};

export type DungeonWithPals = {
  slug: string;
  name: string;
  level: number | null;
  levelText: string | null;
  code: string | null;
  pals: Array<{
    palSlug: string | null;
    palName: string;
    iconUrl: string | null;
    levelText: string | null;
    isAlpha: boolean;
    source: "boss" | "normal";
  }>;
  treasure: DungeonTreasureRow[];
};

export async function fetchDungeonIndex(): Promise<DungeonIndexItem[]> {
  const res = await fetch(DUNGEONS_INDEX_URL, {
    method: "GET",
    headers: { Accept: "text/html" },
  });

  if (!res.ok) throw new Error(`fetchDungeonIndex failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  return parseDungeonIndexFromHtml(html);
}

export async function fetchDungeonDetail(slug: string): Promise<DungeonDetail> {
  const s = (slug ?? "").trim();
  if (!s) throw new Error(`fetchDungeonDetail: missing slug`);

  const url = absUrl(`/en/${s}`);
  const res = await fetch(url, { method: "GET", headers: { Accept: "text/html" } });

  if (!res.ok) throw new Error(`fetchDungeonDetail(${slug}) failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  return parseDungeonDetailFromHtml(s, html);
}

export async function fetchAllDungeonDetails(opts?: {
  concurrency?: number; // default 6
  onProgress?: (done: number, total: number) => void;
}): Promise<DungeonWithPals[]> {
  const concurrency = clampInt(opts?.concurrency ?? 6, 1, 16);

  const indexRaw = await fetchDungeonIndex();
  const index = ensureSpecialDungeon(indexRaw);

  const total = index.length;

  let done = 0;
  const limiter = createConcurrencyLimiter(concurrency);

  const detailResults = await Promise.all(
    index.map((it) =>
      limiter(async () => {
        try {
          const detail = await fetchDungeonDetail(it.slug);
          return detailToDungeonWithPals(detail);
        } finally {
          done += 1;
          opts?.onProgress?.(done, total);
        }
      })
    )
  );

  return detailResults
    .filter(Boolean)
    .sort((a, b) => {
      const aIsYak = safeText(a.slug) === SPECIAL_SLUG || safeText(a.name).toLowerCase() === "yakushima";
      const bIsYak = safeText(b.slug) === SPECIAL_SLUG || safeText(b.name).toLowerCase() === "yakushima";
      if (aIsYak !== bIsYak) return aIsYak ? 1 : -1;

      const al = a.level ?? Number.POSITIVE_INFINITY;
      const bl = b.level ?? Number.POSITIVE_INFINITY;
      if (al !== bl) return al - bl;
      return (a.name || "").localeCompare(b.name || "");
    });
}

export async function fetchDungeonWithPals(): Promise<DungeonWithPals[]> {
  return fetchAllDungeonDetails({ concurrency: 6 });
}

export function parseDungeonIndexFromHtml(html: string): DungeonIndexItem[] {
  const tableChunk =
    firstMatch(html, /<table[^>]+id="DataTables_Table_0"[\s\S]*?<\/table>/i) ?? html;

  const tbody =
    firstMatch(tableChunk, /<tbody[^>]*>([\s\S]*?)<\/tbody>/i) ??
    firstMatch(html, /<tbody[^>]*>([\s\S]*?)<\/tbody>/i) ??
    "";

  if (!tbody) return [];

  const rowHtmls = allMatches(tbody, /(<tr\b[\s\S]*?<\/tr>)/gi);
  const out: DungeonIndexItem[] = [];

  for (const row of rowHtmls) {
    const hrefRaw = firstMatch(row, /<a[^>]+href="([^"]+)"/i);
    const nameRaw = firstMatch(row, /<a[^>]*>([\s\S]*?)<\/a>/i);
    const tds = allMatches(row, /<td[^>]*>([\s\S]*?)<\/td>/gi);

    const name = normalizeText(stripTags(nameRaw ?? "")) ?? null;
    const levelCell = normalizeText(stripTags(tds[1] ?? "")) ?? null;
    const level = safeNum(levelCell);

    if (!name && !hrefRaw && !levelCell) continue;

    const slug = normalizeHrefToSlug(hrefRaw) ?? SPECIAL_SLUG;

    const safeName =
      slug === SPECIAL_SLUG
        ? SPECIAL_NAME
        : name || slug.replace(/_/g, " ");

    const url = absUrl(`/en/${slug}`);

    out.push({
      slug,
      name: safeName,
      level,
      levelText: levelCell ? normalizeLv(levelCell) : null,
      url,
    });
  }

  return out;
}

export function parseDungeonDetailFromHtml(slug: string, html: string): DungeonDetail {
  const defaultName =
    slug === SPECIAL_SLUG ? SPECIAL_NAME : slug.replace(/_/g, " ");

  const name =
    normalizeText(
      stripTags(
        firstMatch(
          html,
          /<h5[^>]*class="[^"]*\bcard-title\b[^"]*"[^>]*>([\s\S]*?)<\/h5>/i
        ) ?? ""
      )
    ) ?? defaultName;

  const lvBlock =
    firstMatch(
      html,
      /<div[^>]*class="[^"]*\btext-center\b[^"]*"[^>]*>\s*Lv\.?\s*([0-9]+)[\s\S]*?<\/div>/i
    ) ?? null;

  const level = lvBlock ? safeNum(lvBlock) : null;
  const levelText = level != null ? `Lv. ${level}` : null;

  const statsBlock = extractCardBodyByHeader(html, "Stats");
  const code = statsBlock ? extractKeyValueFromFlexRows(statsBlock, "Code") : null;

  const bossBlock = extractCardBodyByHeader(html, "Boss Spawns");
  const normalBlock = extractCardBodyByHeader(html, "Normal Spawns");

  const bossSpawns = bossBlock ? parseSpawnRowsFromSectionHtml(bossBlock) : [];
  const normalSpawns = normalBlock ? parseSpawnRowsFromSectionHtml(normalBlock) : [];

  const treasureDrops = parseDungeonTreasureDropsFromHtml(html);

  return {
    slug,
    name,
    level,
    levelText,
    code,
    bossSpawns,
    normalSpawns,
    treasureDrops,
  };
}

function parseSpawnRowsFromSectionHtml(sectionHtml: string): DungeonSpawnRow[] {
  const re =
    /<div[^>]*class="[^"]*\bd-flex\b[^"]*\bjustify-content-between\b[^"]*\bborder-bottom\b[^"]*"[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

  let match: RegExpExecArray | null;

  const out: DungeonSpawnRow[] = [];

  while ((match = re.exec(sectionHtml))) {
    const leftHtml = match[1] ?? "";
    const rightHtml = match[2] ?? "";
    const aHref = firstMatch(leftHtml, /<a[^>]+href="([^"]+)"/i);
    const aInner = firstMatch(leftHtml, /<a[^>]*>([\s\S]*?)<\/a>/i);
    const palSlug = normalizeHrefToSlug(aHref) ?? null;
    const name = normalizeText(stripTags(aInner ?? "")) ?? null;
    const levelRangeText = normalizeRangeText(normalizeText(stripTags(rightHtml)) ?? null);
    const iconUrl = firstMatch(leftHtml, /<img[^>]+src="([^"]+)"/i);
    const isAlpha =
      /\bpalAlpha\b/i.test(leftHtml) || /\bborder-danger\b/i.test(leftHtml);

    if (!palSlug && !name) continue;

    const lvl = parseRange(levelRangeText);

    out.push({
      slug: palSlug ?? "",
      name: name ?? palSlug ?? "???",
      iconUrl: iconUrl ? absUrl(iconUrl) : null,
      isAlpha,
      levelRangeText,
      levelMin: lvl.min,
      levelMax: lvl.max,
    });
  }

  return uniqBy(out, (r) => `${r.slug}|${r.levelRangeText ?? ""}|${r.isAlpha ? "A" : "N"}`);
}

function extractFloatEndText(blockHtml: string): string | null {
  const m = blockHtml.match(/<span[^>]*class="[^"]*\bfloat-end\b[^"]*"[^>]*>/i);
  if (!m || m.index == null) return null;

  const start = m.index + m[0].length;
  const rest = blockHtml.slice(start);

  const end = rest.indexOf("<");
  const rawText = (end >= 0 ? rest.slice(0, end) : rest).trim();

  return rawText ? rawText : null;
}

function parseDungeonTreasureDropsFromHtml(html: string): DungeonTreasureRow[] {
  const src = String(html ?? "");
  if (!src) return [];

  const mb2Chunks: string[] = [];
  const starts = Array.from(
    src.matchAll(/<div[^>]*class="[^"]*\bcard\b[^"]*\bmb-2\b[^"]*"[^>]*>/gi)
  );

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index ?? 0;
    const end = i + 1 < starts.length ? (starts[i + 1].index ?? src.length) : src.length;
    const chunk = src.slice(start, end);

    if (/\bd-flex\b[\s\S]*\bborder\b[\s\S]*\brounded\b/i.test(chunk)) {
      mb2Chunks.push(chunk);
    }
  }

  const candidates: string[] = mb2Chunks.length > 0 ? mb2Chunks : [src];

  const out: DungeonTreasureRow[] = [];

  for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
    const chunk = candidates[cIdx];

    const rowStarts = Array.from(
      chunk.matchAll(/<div[^>]*class="[^"]*\bd-flex\b[^"]*\bborder\b[^"]*\brounded\b[^"]*"[^>]*>/gi)
    );

    for (let i = 0; i < rowStarts.length; i++) {
      const start = rowStarts[i].index ?? 0;
      const end = i + 1 < rowStarts.length ? (rowStarts[i + 1].index ?? chunk.length) : chunk.length;
      const blockHtml = chunk.slice(start, end);

      const nameHtml =
        firstMatch(blockHtml, /<a[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ??
        firstMatch(blockHtml, /<a[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*href="[^"]*"[^>]*>([\s\S]*?)<\/a>/i);

      const hrefRaw =
        firstMatch(blockHtml, /<a[^>]*class="[^"]*\bitemname\b[^"]*"[^>]*href="([^"]+)"/i) ??
        firstMatch(blockHtml, /<a[^>]+href="([^"]+)"[^>]*data-hover=/i) ??
        firstMatch(blockHtml, /<a[^>]+href="([^"]+)"/i);

      const iconRaw = firstMatch(blockHtml, /<img[^>]+src="([^"]+)"/i);

      const qtyRaw = firstMatch(
        blockHtml,
        /<small[^>]*class="[^"]*\bitemQuantity\b[^"]*"[^>]*>([\s\S]*?)<\/small>/i
      );

      const rateRaw = extractFloatEndText(blockHtml);

      const slug = normalizeHrefToSlug(hrefRaw) ?? null;
      const name = normalizeText(stripTags(nameHtml ?? "")) ?? null;

      if (!slug && !name) continue;

      const qtyText = normalizeText(stripTags(qtyRaw ?? "")) ?? null;
      const rateText = normalizeText(stripTags(rateRaw ?? "")) ?? null;

      out.push({
        slug: slug ?? "",
        name: name ?? slug ?? "???",
        iconUrl: iconRaw ? absUrl(iconRaw) : null,
        qtyText,
        weightText: rateText,
        rateText,
      });
    }
  }

  return uniqBy(out, (r) => `${r.slug}|${r.qtyText ?? ""}|${r.rateText ?? r.weightText ?? ""}`);
}

function detailToDungeonWithPals(detail: DungeonDetail): DungeonWithPals {
  const pals: DungeonWithPals["pals"] = [];

  for (const r of detail.bossSpawns ?? []) {
    if (!safeText(r.slug) && !safeText(r.name)) continue;

    pals.push({
      palSlug: safeText(r.slug) ? r.slug : null,
      palName: r.name,
      iconUrl: r.iconUrl,
      levelText: r.levelRangeText,
      isAlpha: r.isAlpha,
      source: "boss",
    });
  }

  for (const r of detail.normalSpawns ?? []) {
    if (!safeText(r.slug) && !safeText(r.name)) continue;

    pals.push({
      palSlug: safeText(r.slug) ? r.slug : null,
      palName: r.name,
      iconUrl: r.iconUrl,
      levelText: r.levelRangeText,
      isAlpha: r.isAlpha,
      source: "normal",
    });
  }

  const merged = mergePals(pals);

  return {
    slug: detail.slug,
    name: detail.slug === SPECIAL_SLUG ? SPECIAL_NAME : detail.name,
    level: detail.level,
    levelText: detail.levelText,
    code: detail.code,
    pals: merged,
    treasure: detail.treasureDrops ?? [],
  };
}

function mergePals(pals: DungeonWithPals["pals"]): DungeonWithPals["pals"] {
  const map = new Map<string, DungeonWithPals["pals"][number]>();

  for (const p of pals) {
    const key = `${p.palSlug ?? ""}|${p.levelText ?? ""}|${p.source}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, p);
      continue;
    }

    map.set(key, {
      ...prev,
      palName: prev.palName || p.palName,
      iconUrl: prev.iconUrl || p.iconUrl,
      isAlpha: prev.isAlpha || p.isAlpha,
      source: prev.source === "boss" || p.source === "boss" ? "boss" : "normal",
    });
  }

  return Array.from(map.values());
}

function ensureSpecialDungeon(index: DungeonIndexItem[]): DungeonIndexItem[] {
  const list = Array.isArray(index) ? [...index] : [];
  if (list.some((x) => String(x?.slug ?? "").trim() === SPECIAL_SLUG)) return list;

  list.push({
    slug: SPECIAL_SLUG,
    name: SPECIAL_NAME,
    level: null,
    levelText: null,
    url: absUrl(`/en/${SPECIAL_SLUG}`),
  });

  return list;
}

function extractCardBodyByHeader(html: string, headerText: string): string | null {
  const want = normalizeHeader(headerText);
  if (!want) return null;

  const src = String(html ?? "");
  if (!src) return null;

  const parts = src.split(/<div[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>/gi);
  if (parts.length <= 1) return null;

  const cardStarts = Array.from(src.matchAll(/<div[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>/gi));
  if (cardStarts.length === 0) return null;

  for (let i = 0; i < cardStarts.length; i++) {
    const start = cardStarts[i].index ?? 0;
    const end =
      i + 1 < cardStarts.length ? (cardStarts[i + 1].index ?? src.length) : src.length;

    const cardChunk = src.slice(start, end);

    const bodyOpen = cardChunk.match(/<div[^>]*class="[^"]*\bcard-body\b[^"]*"[^>]*>/i);
    if (!bodyOpen || bodyOpen.index == null) continue;

    const bodyStart = bodyOpen.index + bodyOpen[0].length;
    const bodyAndAfter = cardChunk.slice(bodyStart);

    const closePair = bodyAndAfter.lastIndexOf("</div>");
    if (closePair < 0) continue;

    const bodyInner = bodyAndAfter.slice(0, closePair);

    const h5 = firstMatch(
      bodyInner,
      /<h5[^>]*class="[^"]*\bcard-title\b[^"]*"[^>]*>([\s\S]*?)<\/h5>/i
    );

    const got = normalizeHeader(h5 ? stripTags(h5) : null);
    if (got && got === want) {
      return bodyInner;
    }
  }

  return null;
}

function normalizeHeader(s: string | null): string | null {
  const t = normalizeText(stripTags(s ?? ""));
  return t ? t.toLowerCase() : null;
}

function extractKeyValueFromFlexRows(cardBodyHtml: string, key: string): string | null {
  const rows = allMatches(
    cardBodyHtml,
    /<div[^>]*class="[^"]*\bd-flex\b[^"]*\bjustify-content-between\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  );

  for (const row of rows) {
    const cells = allMatches(row, /<div[^>]*>([\s\S]*?)<\/div>/gi).map((x) => stripTags(x));
    if (cells.length < 2) continue;

    const left = normalizeText(cells[0]);
    const right = normalizeText(cells[cells.length - 1]);

    if (left && left.toLowerCase() === key.toLowerCase()) {
      return right ?? null;
    }
  }

  return null;
}

function decodeHtml(s: string) {
  return String(s ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(s: string) {
  return decodeHtml(String(s ?? "").replace(/<[^>]+>/g, "")).trim();
}

function normalizeText(s: string | null): string | null {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t ? t : null;
}

function allMatches(haystack: string, re: RegExp): string[] {
  const out: string[] = [];
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const r = new RegExp(re.source, flags);

  let m: RegExpExecArray | null;
  while ((m = r.exec(haystack))) out.push((m[1] ?? m[0] ?? "") as string);

  return out;
}

function normalizeRangeText(s: string | null): string | null {
  if (!s) return null;
  const t = s.replace(/-/g, "–").replace(/\s+/g, " ").trim();
  return t ? t : null;
}

function normalizeLv(s: string): string | null {
  const t = normalizeText(s);
  if (!t) return null;
  if (/lv\.?/i.test(t)) return t.replace(/\s+/g, " ").trim();
  const n = safeNum(t.replace(/[^\d]/g, ""));
  return n != null ? `Lv. ${n}` : t;
}

function normalizeHrefToSlug(hrefRaw: string | null): string | null {
  if (!hrefRaw) return null;
  let href = String(hrefRaw).trim();
  if (!href) return null;

  if (href === SPECIAL_SLUG) return SPECIAL_SLUG;

  href = href.replace(/^https?:\/\/[^/]+/i, "");
  href = href.split("#")[0] ?? href;
  href = href.split("?")[0] ?? href;

  if (!href.includes("/")) return href;

  const parts = href.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

function parseRange(rangeText: string | null): { min: number | null; max: number | null } {
  if (!rangeText) return { min: null, max: null };

  const t = rangeText.replace(/-/g, "–").replace(/\s+/g, " ").trim();
  const m = t.match(/(\d+)\s*–\s*(\d+)/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return {
      min: Number.isFinite(a) ? a : null,
      max: Number.isFinite(b) ? b : null,
    };
  }

  const n = safeNum(t.replace(/[^\d.]/g, ""));
  return { min: n, max: n };
}

function uniqBy<T>(items: T[], keyFn: (t: T) => string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function clampInt(n: number, lo: number, hi: number) {
  const x = Math.floor(Number.isFinite(n) ? n : lo);
  return Math.max(lo, Math.min(hi, x));
}

function createConcurrencyLimiter(maxConcurrent: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= maxConcurrent) return;
    const fn = queue.shift();
    if (!fn) return;
    fn();
  };

  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const run = () => {
        active += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      };

      queue.push(run);
      next();
    });
  };
}
