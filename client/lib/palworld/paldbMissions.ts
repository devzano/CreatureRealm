// lib/palworld/paldbMissions.ts
//
// PalDB Missions (Main + Sub) scraper/parser
// Source page: https://paldb.cc/en/Mission
//
// Exposes:
// - fetchMissionIndex(): { main: MissionIndexItem[]; sub: MissionIndexItem[] }
//
// Notes:
// - Robust pane slicing + robust card splitting (no brittle "close N divs" regex).
// - Fixes missing missions where the title div is empty by deriving a fallback title
//   from data-id / dom id (e.g. Sub_PalDisplay_A_01 -> "Pal Display A").
// - Keeps ORIGINAL page order (no alphabetical sorting).
//

import { absUrl, BASE, cleanKey, htmlToText } from "@/lib/palworld/palworldDB";

export type MissionKind = "main" | "sub";

export type MissionCoord = {
  x: number;
  y: number;
  href?: string | null;
};

export type MissionEntityRef =
  | {
      type: "item";
      name: string;
      href?: string | null;
      icon?: string | null;
      qty?: number | null;
      hover?: string | null;
    }
  | {
      type: "pal";
      name: string;
      href?: string | null;
      icon?: string | null;
      isAlpha?: boolean;
      hover?: string | null;
    }
  | {
      type: "skill";
      name: string;
      href?: string | null;
      hover?: string | null;
    }
  | {
      type: "npc";
      name: string;
      href?: string | null;
      icon?: string | null;
      hover?: string | null;
    }
  | {
      type: "text";
      text: string;
    };

export type MissionReward = {
  exp?: number | null;
  items?: MissionEntityRef[];
};

export type MissionIndexItem = {
  kind: MissionKind;
  id: string;
  title: string;
  icon?: string | null;
  label?: string | null;
  description?: string | null;
  objectives?: MissionEntityRef[];
  rewards?: MissionReward;
  coords?: MissionCoord[];
  nextTitle?: string | null;
};

const MISSION_URL = `${BASE}/en/Mission`;

// -----------------------------
// Cache
// -----------------------------

let _cacheIndex:
  | {
      at: number;
      value: { main: MissionIndexItem[]; sub: MissionIndexItem[] };
    }
  | null = null;

const CACHE_MS = 10 * 60 * 1000;

export async function fetchMissionIndex(): Promise<{
  main: MissionIndexItem[];
  sub: MissionIndexItem[];
}> {
  const now = Date.now();
  if (_cacheIndex && now - _cacheIndex.at < CACHE_MS) return _cacheIndex.value;

  const html = await fetchHtml(MISSION_URL);
  const value = parseMissionIndexFromHtml(html);

  _cacheIndex = { at: now, value };
  return value;
}

// -----------------------------
// Parsing
// -----------------------------

function parseMissionIndexFromHtml(html: string): { main: MissionIndexItem[]; sub: MissionIndexItem[] } {
  const s = String(html ?? "");
  if (!s) return { main: [], sub: [] };

  const mainPane = extractTabPaneHtml(s, "MainMission");
  const subPane = extractTabPaneHtml(s, "SubMission");

  let main = mainPane ? parseMissionCardsFromPane(mainPane, "main") : [];
  let sub = subPane ? parseMissionCardsFromPane(subPane, "sub") : [];

  if (!main.length && !sub.length) {
    const all = parseMissionCardsLoose(s);
    main = all.filter((x) => x.kind === "main");
    sub = all.filter((x) => x.kind === "sub");
  }

  main = dedupeByRawId(main);
  sub = dedupeByRawId(sub);

  return { main, sub };
}

function extractTabPaneHtml(src: string, paneId: string): string | null {
  const s = String(src ?? "");
  const startNeedle = `<div id="${paneId}"`;
  const startIdx = s.indexOf(startNeedle);
  if (startIdx < 0) return null;

  const after = s.slice(startIdx + startNeedle.length);

  // next tab pane (any id)
  const nextIdxRel = after.search(/<div\s+id="[^"]+"\s+class="tab-pane\b/i);

  if (nextIdxRel < 0) {
    const endIdx = s.indexOf(`</div class="tab-content">`, startIdx);
    return endIdx >= 0 ? s.slice(startIdx, endIdx) : s.slice(startIdx);
  }

  const endIdx = startIdx + startNeedle.length + nextIdxRel;
  return s.slice(startIdx, endIdx);
}

function parseMissionCardsFromPane(paneHtml: string, kind: MissionKind): MissionIndexItem[] {
  const cols = splitCols(paneHtml);
  if (cols.length) {
    const out: MissionIndexItem[] = [];
    for (const colHtml of cols) {
      const card = parseOneMissionCard(colHtml, kind);
      if (card) out.push(card);
    }
    if (out.length) return out;
  }

  const containers = splitByCardContainer(paneHtml);
  return containers.map((c) => parseOneMissionCard(c, kind)).filter(Boolean) as MissionIndexItem[];
}

function splitCols(gridHtml: string): string[] {
  const s = String(gridHtml ?? "");
  if (!s) return [];

  // Match <div class="col"> and also <div class="col ...">
  return s
    .split(/<div\s+class="col\b[^"]*">/i)
    .slice(1)
    .map((chunk) => `<div class="col">${chunk}`);
}

function splitByCardContainer(html: string): string[] {
  const s = String(html ?? "");
  if (!s) return [];

  const parts = s.split(/<div\s+class="d-flex\s+border\s+rounded"[^>]*>/i);
  if (parts.length <= 1) return [];

  const out: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    out.push(`<div class="d-flex border rounded">${parts[i]}`);
  }
  return out;
}

function parseMissionCardsLoose(pageHtml: string): MissionIndexItem[] {
  const s = String(pageHtml ?? "");
  if (!s) return [];

  const hits = Array.from(s.matchAll(/\bdata-id="(Main_[^"]+|Sub_[^"]+)"/gi));
  if (!hits.length) return [];

  const out: MissionIndexItem[] = [];

  for (const hit of hits) {
    const dataId = String(hit[1] ?? "");
    const kind: MissionKind = dataId.startsWith("Main_") ? "main" : "sub";

    const idx = hit.index ?? -1;
    if (idx < 0) continue;

    const start = Math.max(0, idx - 4000);
    const end = Math.min(s.length, idx + 12000);
    const window = s.slice(start, end);

    const relIdx = window.indexOf(hit[0]);
    if (relIdx < 0) continue;

    const before = window.slice(0, relIdx);
    const colStart = before.toLowerCase().lastIndexOf(`<div class="col`);
    const cardStart = before.toLowerCase().lastIndexOf(`<div class="d-flex border rounded`);
    const chosenStart = colStart >= 0 ? colStart : cardStart;

    if (chosenStart < 0) continue;

    const chunk = window.slice(chosenStart);
    const card = parseOneMissionCard(chunk, kind);
    if (card) out.push(card);
  }

  return out;
}

function parseOneMissionCard(cardHtml: string, kind: MissionKind): MissionIndexItem | null {
  const s = String(cardHtml ?? "");
  if (!s) return null;

  const iconRaw =
    firstMatch(s, /<img[^>]+class="size64"[^>]+src="([^"]+)"/i) ??
    firstMatch(s, /<img[^>]+src="([^"]+)"[^>]+class="size64"/i) ??
    null;

  const icon = iconRaw ? absUrl(htmlEntityDecode(iconRaw)) : null;

  const dataIdRaw = firstMatch(s, /\bdata-id="([^"]+)"/i) ?? null;

  const titleDivIdRaw =
    firstMatch(s, /<div\s+id="([^"]+)"[^>]*\bdata-id="[^"]+"[^>]*>[\s\S]*?<\/div>/i) ??
    firstMatch(s, /<div\s+id="([^"]+)"[^>]*>\s*[\s\S]*?<\/div>/i) ??
    null;

  const dataId = attrDecodeTrim(dataIdRaw);
  const domId = attrDecodeTrim(titleDivIdRaw);

  const titleRaw =
    firstMatch(s, /\bdata-id="[^"]+"[^>]*>\s*([\s\S]*?)\s*<\/div>/i) ??
    firstMatch(s, /<div[^>]*\bid="[^"]+"[^>]*>\s*([\s\S]*?)\s*<\/div>/i) ??
    null;

  let title = cleanText(titleRaw ?? "");
  if (!title) title = deriveTitleFallback(dataId, domId);
  if (!title) return null;

  const label =
    cleanText(firstMatch(s, /<div[^>]*style="color:\s*#6cffc3;?"[^>]*>\s*([\s\S]*?)\s*<\/div>/i) ?? "") || null;

  const description = extractDescriptionAfterLabel(s);

  const objectives = parseSectionEntities(s, "Objective");
  const rewards = parseRewards(s);
  const coords = parseCoords(s);

  const nextTitle =
    cleanText(
      firstMatch(
        s,
        /<div\s+class="half-bottom-row">\s*<div>\s*Next\s*<\/div>\s*<\/div>\s*<div>\s*([\s\S]*?)\s*<\/div>/i
      ) ?? ""
    ) || null;

  const id = (dataId || domId || slugify(`${kind}-${title}`)).trim();
  if (!id) return null;

  return {
    kind,
    id,
    title,
    icon,
    label,
    description: description || null,
    objectives,
    rewards,
    coords,
    nextTitle,
  };
}

function deriveTitleFallback(dataId: string | null, domId: string | null): string {
  const idToProcess = dataId || domId || "";
  if (!idToProcess) return "";

  let clean = idToProcess.replace(/^(Sub_|Main_)/i, "");

  clean = clean.replace(/PalDisplay/i, "Pal Mission");

  const formatted = clean.replace(/_/g, " ").trim();

  return formatted;
}

function toTitleCase(s: string): string {
  const str = String(s ?? "").trim();
  if (!str) return "";
  return str
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const low = w.toLowerCase();
      return low.length <= 1 ? low.toUpperCase() : low[0].toUpperCase() + low.slice(1);
    })
    .join(" ");
}

function extractDescriptionAfterLabel(cardHtml: string): string | null {
  const s = String(cardHtml ?? "");
  if (!s) return null;

  const labelRe =
    /<div[^>]*style="[^"]*color:\s*(?:#6cffc3|rgb\(\s*108\s*,\s*255\s*,\s*195\s*\))[^"]*"[^>]*>[\s\S]*?<\/div>/i;

  const m = labelRe.exec(s);
  if (!m) return null;

  const after = s.slice(m.index + m[0].length);
  const m2 = /<div>\s*([\s\S]*?)\s*<\/div>/i.exec(after);
  if (!m2) return null;

  const descHtml = m2[1] ?? "";
  const text = cleanTextLoose(descHtml);
  return text || null;
}

function cleanTextLoose(htmlOrText: string): string {
  const raw = String(htmlOrText ?? "");
  if (!raw) return "";

  return htmlEntityDecode(
    raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/?[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

function parseRewards(cardHtml: string): MissionReward | undefined {
  const rewardBlock = extractSectionHtml(cardHtml, "Reward");
  if (!rewardBlock) return undefined;

  const expStr =
    firstMatch(rewardBlock, /Exp<\/span>\s*\+([\d,]+)/i) ??
    firstMatch(rewardBlock, />\s*Exp\s*<[^>]*>\s*\+([\d,]+)/i) ??
    null;

  const exp = expStr ? safeInt(expStr.replace(/,/g, "")) : null;

  const entities = parseEntitiesFromHtml(rewardBlock);
  const items = entities.length ? entities : undefined;

  if (exp == null && !items) return undefined;
  return { exp, items };
}

function parseSectionEntities(cardHtml: string, sectionName: "Objective" | "Reward" | "Next"): MissionEntityRef[] {
  const sectionHtml = extractSectionHtml(cardHtml, sectionName);
  if (!sectionHtml) return [];
  return parseEntitiesFromHtml(sectionHtml);
}

function extractSectionHtml(cardHtml: string, sectionName: string): string | null {
  const re = new RegExp(
    `<div\\s+class="half-bottom-row">\\s*<div>\\s*${escapeRegExp(sectionName)}\\s*<\\/div>\\s*<\\/div>`,
    "i"
  );

  const m = re.exec(cardHtml);
  if (!m) return null;

  const start = m.index + m[0].length;
  const after = cardHtml.slice(start);

  const next = /<div\s+class="half-bottom-row">/i.exec(after);
  const block = next ? after.slice(0, next.index) : after;

  return block;
}

function parseEntitiesFromHtml(sectionHtml: string): MissionEntityRef[] {
  const out: MissionEntityRef[] = [];
  const s = String(sectionHtml ?? "");
  if (!s) return out;

  const anchors = matchAll(s, /<a\b[^>]*>[\s\S]*?<\/a>/gi);

  for (const aHtml of anchors) {
    const href = firstMatch(aHtml, /\bhref="([^"]+)"/i) ?? null;
    const fullHref = href ? absUrlIfRelative(href) : null;

    const hover = firstMatch(aHtml, /\bdata-hover="([^"]+)"/i) ?? null;
    const fullHover = hover ? absUrlIfRelative(htmlEntityDecode(hover)) : null;

    const img = firstMatch(aHtml, /<img[^>]+src="([^"]+)"/i) ?? null;
    const icon = img ? absUrl(htmlEntityDecode(img)) : null;

    const cls = (firstMatch(aHtml, /\bclass="([^"]+)"/i) ?? "").toLowerCase();

    const inner = firstMatch(aHtml, /<a\b[^>]*>([\s\S]*?)<\/a>/i) ?? "";
    const text = cleanText(inner);

    // skill
    if ((href ?? "").includes("Passive_Skills") || cls.includes("passive")) {
      if (text) out.push({ type: "skill", name: text, href: fullHref, hover: fullHover });
      continue;
    }

    // item
    if (cls.includes("itemname") || (icon && icon.toLowerCase().includes("inventoryitemicon"))) {
      if (text) {
        const qty = findQtyAfterAnchor(s, aHtml);
        out.push({ type: "item", name: text, href: fullHref, icon, qty, hover: fullHover });
      }
      continue;
    }

    // pal
    const isPal =
      !!icon &&
      (icon.toLowerCase().includes("/palicon/") ||
        icon.toLowerCase().includes("/pal/texture/") ||
        cls.includes("rounded-circle"));

    if (isPal && text) {
      const isAlpha = /palalpha/i.test(aHtml) || /border-danger/i.test(aHtml);
      out.push({ type: "pal", name: text, href: fullHref, icon, isAlpha, hover: fullHover });
      continue;
    }

    // npc
    const isNpc = !!icon && icon.toLowerCase().includes("t_character_common_human");
    if (isNpc && text) {
      out.push({ type: "npc", name: text, href: fullHref, icon, hover: fullHover });
      continue;
    }
  }

  // Plain-text fallback ONLY when there are no anchors at all
  if (anchors.length === 0) {
    const plain = cleanText(stripAnchorsKeepText(s));
    if (plain) {
      const lines = plain
        .split(/\n+/g)
        .map((x) => x.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (!line) continue;
        if (/^-?\d+\s*,\s*-?\d+$/.test(line)) continue;
        if (out.some((e) => e.type === "text" && e.text === line)) continue;
        out.push({ type: "text", text: line });
      }
    }
  }

  const hasStructured = out.some((e) => e.type !== "text");
  const cleaned = hasStructured ? out.filter((e) => e.type !== "text") : out;

  return dedupeEntities(cleaned);
}

function findQtyAfterAnchor(sectionHtml: string, anchorHtml: string): number | null {
  const idx = sectionHtml.indexOf(anchorHtml);
  if (idx < 0) return null;

  const after = sectionHtml.slice(idx + anchorHtml.length);
  const qtyStr = firstMatch(after, /<small[^>]*class="itemQuantity"[^>]*>\s*([\d,]+)\s*<\/small>/i) ?? null;
  if (!qtyStr) return null;

  const n = safeInt(qtyStr.replace(/,/g, ""));
  return n == null ? null : n;
}

function parseCoords(cardHtml: string): MissionCoord[] {
  const out: MissionCoord[] = [];
  const s = String(cardHtml ?? "");
  if (!s) return out;

  const links = matchAll(s, /<a\b[^>]*href="([^"]*Map\?item=[^"]*pos=[^"]+)"[^>]*>[\s\S]*?<\/a>/gi);

  for (const aHtml of links) {
    const href = firstMatch(aHtml, /\bhref="([^"]+)"/i) ?? null;
    if (!href) continue;

    const pos = firstMatch(href, /\bpos=([^"&]+)/i) ?? null;
    if (!pos) continue;

    const decoded = decodeURIComponentSafe(pos);
    const parts = decoded.split(",");
    if (parts.length !== 2) continue;

    const x = safeFloat(parts[0]);
    const y = safeFloat(parts[1]);
    if (x == null || y == null) continue;

    out.push({ x, y, href: absUrlIfRelative(href) });
  }

  const seen = new Set<string>();
  const deduped: MissionCoord[] = [];
  for (const c of out) {
    const k = `${c.x},${c.y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(c);
  }
  return deduped;
}

function dedupeByRawId(list: MissionIndexItem[]): MissionIndexItem[] {
  const map = new Map<string, MissionIndexItem>();
  for (const it of list) {
    const id = String(it.id ?? "").trim();
    if (!id) continue;
    if (!map.has(id)) map.set(id, it);
  }
  return Array.from(map.values());
}

// -----------------------------
// Fetch
// -----------------------------

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "text/html,application/xhtml+xml" },
  });

  if (!res.ok) {
    const t = await safeReadText(res);
    throw new Error(`PalDB fetch failed (${res.status}) ${url}${t ? `\n${t.slice(0, 200)}` : ""}`);
  }

  return await res.text();
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

// -----------------------------
// Utils
// -----------------------------

function firstMatch(s: string, re: RegExp): string | null {
  const m = re.exec(s);
  if (!m) return null;
  return m[1] ?? null;
}

function matchAll(s: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[0]);
  return out;
}

function cleanText(htmlOrText: string): string {
  const raw = String(htmlOrText ?? "");
  const decoded = htmlEntityDecode(raw);
  const text = cleanKey(htmlToText(decoded));
  return text;
}

function stripAnchorsKeepText(html: string): string {
  return String(html ?? "")
    .replace(/<a\b[^>]*>/gi, "")
    .replace(/<\/a>/gi, "");
}

function htmlEntityDecode(s: string): string {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function attrDecodeTrim(v: string | null | undefined): string {
  if (!v) return "";
  return htmlEntityDecode(String(v)).trim();
}

function absUrlIfRelative(href: string): string {
  const h = String(href ?? "").trim();
  if (!h) return h;
  if (h.startsWith("http://") || h.startsWith("https://") || h.startsWith("//")) return absUrl(h);
  if (h.startsWith("/")) return absUrl(h);
  return `${BASE}/en/${h}`.replace(/\/en\/en\//g, "/en/");
}

function safeInt(v: any): number | null {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function safeFloat(v: any): number | null {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegExp(s: string): string {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeEntities(list: MissionEntityRef[]): MissionEntityRef[] {
  const seen = new Set<string>();
  const out: MissionEntityRef[] = [];

  for (const e of list) {
    const k =
      e.type === "text"
        ? `text:${e.text}`
        : e.type === "item"
        ? `item:${e.name}:${e.qty ?? ""}`
        : e.type === "pal"
        ? `pal:${e.name}:${e.isAlpha ? "a" : ""}`
        : e.type === "skill"
        ? `skill:${e.name}`
        : e.type === "npc"
        ? `npc:${e.name}`
        : JSON.stringify(e);

    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }

  return out;
}
