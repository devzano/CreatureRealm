// lib/palworld/paldbBase.ts
//
// PalDB Base (Base Level /30) scraper/parser
// Source page: https://paldb.cc/en/Base
//
// Exposes:
// - fetchBaseLevels(): BaseIndex
//
// What we parse:
// - count ("/30" from tab/button/header when present)
// - rows in the Base table (level + requirements lines + rewards)
//
// Notes:
// - Preserves original order (level ascending as shown on the site). NO alphabetical sorting.
// - Requirements are parsed into structured tasks when possible:
//   - "Pals xN"
//   - "Build <item>. xN"
//   - otherwise falls back to a text line.
//
// Depends on your existing primitives from palworldDB:
//   absUrl, BASE, cleanKey, firstMatch, htmlToText
//

import { absUrl, BASE, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";

export type BaseKind = "pals" | "build" | "text";

export type BaseItemRef = {
  slug: string;
  name: string;
  iconUrl: string | null;
  hover?: string | null;
};

export type BaseTask =
  | {
    kind: "pals";
    count: number;
    text: string;
  }
  | {
    kind: "build";
    item: BaseItemRef | null;
    qty: number | null;
    text: string;
  }
  | {
    kind: "text";
    text: string;
  };

export type BaseRewardKV = {
  key: string;
  valueText: string | null;
};

export type BaseLevelRow = {
  level: number; // 1..30
  tasks: BaseTask[];
  rewards: BaseRewardKV[];
  rawText?: string | null; // full cell text (optional, helpful for debugging/UI)
};

export type BaseIndex = {
  count: number | null; // typically 30
  items: BaseLevelRow[];
};

const BASE_URL = `${BASE}/en/Base`;

// -----------------------------
// Fetch
// -----------------------------

let _cache:
  | {
    at: number;
    value: BaseIndex;
  }
  | null = null;

const CACHE_MS = 10 * 60 * 1000;

export async function fetchBaseLevels(): Promise<BaseIndex> {
  const now = Date.now();
  if (_cache && now - _cache.at < CACHE_MS) return _cache.value;

  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: { Accept: "text/html,application/xhtml+xml" },
  });

  if (!res.ok) {
    const t = await safeReadText(res);
    throw new Error(`fetchBaseLevels failed: ${res.status} ${res.statusText}${t ? `\n${t.slice(0, 200)}` : ""}`);
  }

  const html = await res.text();
  const value = parseBaseIndexFromHtml(html);

  _cache = { at: now, value };
  return value;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

// -----------------------------
// Parse
// -----------------------------

export function parseBaseIndexFromHtml(pageHtml: string): BaseIndex {
  const s = String(pageHtml ?? "");
  if (!s) return { count: null, items: [] };

  const pane = extractTabPaneHtml(s, "Base");
  if (!pane) return { count: null, items: [] };

  const count =
    toIntOrNull(
      firstMatch(pane, /\bBase\s*\/\s*([0-9]{1,4})\b/i) ??
      firstMatch(s, /data-bs-target="#Base"[^>]*>\s*Base\s*\/\s*([0-9]{1,4})/i)
    ) ?? null;

  const tableHtml = extractFirstBaseTable(pane);
  if (!tableHtml) return { count, items: [] };

  const rows = splitLooseRowsFromTable(tableHtml);

  const items: BaseLevelRow[] = [];
  for (const trInner of rows) {
    const tds = splitLooseTds(trInner);
    if (tds.length < 2) continue;

    const levelTd = tds[0] ?? "";
    const bodyTd = tds[1] ?? "";

    const level = parseLevel(levelTd, trInner);
    if (!level) continue;

    const { tasks, rewards, rawText } = parseBaseRowBody(bodyTd);

    items.push({
      level,
      tasks,
      rewards,
      rawText,
    });
  }

  // Preserve original order as displayed (already ascending).
  // If site ever reorders, we can stable-sort by level.
  items.sort((a, b) => a.level - b.level);

  return { count, items };
}

// -----------------------------
// Pane + Table extraction
// -----------------------------

function extractTabPaneHtml(src: string, paneId: string): string | null {
  const s = String(src ?? "");
  const startNeedle = `<div id="${paneId}"`;
  const startIdx = s.indexOf(startNeedle);
  if (startIdx < 0) return null;

  const after = s.slice(startIdx + startNeedle.length);
  const nextIdxRel = after.search(/<div\s+id="[^"]+"\s+class="tab-pane\b/i);

  if (nextIdxRel < 0) {
    const endIdx = s.indexOf(`</div class="tab-content">`, startIdx);
    return endIdx >= 0 ? s.slice(startIdx, endIdx) : s.slice(startIdx);
  }

  const endIdx = startIdx + startNeedle.length + nextIdxRel;
  return s.slice(startIdx, endIdx);
}

function extractFirstBaseTable(paneHtml: string): string | null {
  // Base page uses:
  // <table class='table table-hover table-striped DataTable '>
  return (
    firstMatch(
      paneHtml,
      /(<table\b[^>]*class=(?:"[^"]*\bDataTable\b[^"]*"|'[^']*\bDataTable\b[^']*')[\s\S]*?<\/table>)/i
    ) ?? null
  );
}

// -----------------------------
// Row parsing
// -----------------------------

function parseLevel(levelTdHtml: string, trInnerHtml: string): number {
  // Prefer first <td> number
  const n1 = toIntOrNull(firstMatch(levelTdHtml, /\b([0-9]{1,4})\b/i));
  if (n1 != null && n1 > 0) return n1;

  // Fallback: any number in first part of row
  const n2 = toIntOrNull(firstMatch(trInnerHtml, /<td[^>]*>\s*([0-9]{1,4})\s*<\/td>/i));
  return n2 != null && n2 > 0 ? n2 : 0;
}

function parseBaseRowBody(bodyTdHtml: string): { tasks: BaseTask[]; rewards: BaseRewardKV[]; rawText: string | null; } {
  const td = String(bodyTdHtml ?? "");
  if (!td) return { tasks: [], rewards: [], rawText: null };

  const rawText = tightenPunctuationSpacing(cleanKey(htmlToText(td))) || null;

  const rewardIdx = td.toLowerCase().indexOf("rewards:");
  const pre = rewardIdx >= 0 ? td.slice(0, rewardIdx) : td;
  const rewardPart = rewardIdx >= 0 ? td.slice(rewardIdx) : "";

  const tasks = parseTasksFromPreRewards(pre);
  const rewards = parseRewardsFromRewardsChunk(rewardPart);

  return { tasks, rewards, rawText };
}

function tightenPunctuationSpacing(s: string): string {
  return String(s ?? "")
    // remove spaces before punctuation: "Box . x3" -> "Box. x3"
    .replace(/\s+([.,;:!?])/g, "$1")
    // also remove spaces after "(" and before ")"
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    // collapse any accidental double spaces
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseTasksFromPreRewards(preHtml: string): BaseTask[] {
  const out: BaseTask[] = [];
  const s = String(preHtml ?? "");
  if (!s) return out;

  // Base rows are built as multiple <div>...</div>
  const divs = Array.from(s.matchAll(/<div\b[^>]*>([\s\S]*?)<\/div>/gi)).map((m) => m[1] ?? "");

  for (const inner of divs) {
    const txt = tightenPunctuationSpacing(cleanKey(htmlToText(inner)));
    if (!txt) continue;

    // 1) Pals xN
    const palsN = toIntOrNull(txt.match(/\bPals\s*x\s*([0-9]{1,4})\b/i)?.[1] ?? null);
    if (palsN != null && palsN > 0) {
      out.push({ kind: "pals", count: palsN, text: `Pals x${palsN}` });
      continue;
    }

    // 2) Build <item>. xN
    // Example:
    // "Build Wooden Chest. x1"
    if (/^\s*Build\b/i.test(txt)) {
      const item = parseFirstItemLink(inner);
      const qty = toIntOrNull(txt.match(/\bx\s*([0-9]{1,4})\b/i)?.[1] ?? null);

      // Keep the line readable (strip double spaces)
      out.push({
        kind: "build",
        item,
        qty,
        text: txt,
      });
      continue;
    }

    // 3) Fallback text line
    out.push({ kind: "text", text: txt });
  }

  return out;
}

function parseRewardsFromRewardsChunk(rewardHtml: string): BaseRewardKV[] {
  const out: BaseRewardKV[] = [];
  const s = String(rewardHtml ?? "");
  if (!s) return out;

  // Rewards are inside <ul><li>Key: Value</li>...</ul>
  const lis = Array.from(s.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)).map((m) => m[1] ?? "");

  for (const liInner of lis) {
    const txt = cleanKey(htmlToText(liInner));
    if (!txt) continue;

    const m = txt.match(/^([^:]+?)\s*:\s*(.+)$/);
    if (m) {
      out.push({
        key: cleanKey(m[1]),
        valueText: cleanKey(m[2]) || null,
      });
    } else {
      // If the site ever changes formatting, still keep the line.
      out.push({ key: txt, valueText: null });
    }
  }

  return out;
}

// -----------------------------
// Item link parsing (Build lines)
// -----------------------------

function parseFirstItemLink(html: string): BaseItemRef | null {
  const src = String(html ?? "");
  if (!src) return null;

  // Expect: <a class="itemname" data-hover="..." href="Wooden_Chest"><img ... src="..."/>Wooden Chest</a>
  const href = firstMatch(src, /\bhref="([^"]+)"/i) ?? firstMatch(src, /\bhref='([^']+)'/i) ?? null;
  if (!href) return null;

  const hover =
    firstMatch(src, /\bdata-hover="([^"]+)"/i) ?? firstMatch(src, /\bdata-hover='([^']+)'/i) ?? null;

  const icon =
    firstMatch(src, /<img\b[^>]*\bsrc="([^"]+)"/i) ?? firstMatch(src, /<img\b[^>]*\bsrc='([^']+)'/i) ?? null;

  // Name is text inside the <a> after the <img>
  const name =
    firstMatch(src, /<\/img>\s*([^<]+?)\s*<\/a>/i) ??
    firstMatch(src, /\/>\s*([^<]+?)\s*<\/a>/i) ??
    cleanKey(htmlToText(src));
  const nameClean = tightenPunctuationSpacing(cleanKey(name || href));

  return {
    slug: cleanKey(href),
    name: cleanKey(nameClean || href),
    iconUrl: icon ? absUrl(icon) : null,
    hover: hover ? normalizeHover(hover) : null,
  };
}

function normalizeHover(hover: string): string {
  const h = String(hover ?? "").trim();
  if (!h) return h;

  // hover is either:
  // - "?s=MapObjects%2FItemChest" (relative query)
  // - "/cache/en/Game_MapObjects_hover/...." (absolute-ish)
  if (h.startsWith("http://") || h.startsWith("https://") || h.startsWith("//")) return absUrl(h);
  if (h.startsWith("/")) return absUrl(h);

  // if it starts with "?" treat as relative to /cache? or current page – safest: prefix BASE
  if (h.startsWith("?")) return `${BASE}${h}`;

  return absUrl(h);
}

// -----------------------------
// Loose table splitting (tolerant to odd markup)
// -----------------------------

function splitLooseRowsFromTable(tableHtml: string): string[] {
  const s = String(tableHtml ?? "");
  if (!s) return [];

  // prefer tbody if present
  const tbody = firstMatch(s, /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i) ?? s;
  const body = String(tbody ?? "");
  if (!body) return [];

  return Array.from(body.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/tbody\b|<\/table\b|$)/gi)).map(
    (m) => m[1] ?? ""
  );
}

function splitLooseTds(trInnerHtml: string): string[] {
  const s = String(trInnerHtml ?? "");
  if (!s) return [];
  return Array.from(s.matchAll(/<td\b[^>]*>([\s\S]*?)(?=<td\b|<\/tr\b|$)/gi)).map((m) => m[1] ?? "");
}

function toIntOrNull(v: any): number | null {
  const s = cleanKey(String(v ?? ""));
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
