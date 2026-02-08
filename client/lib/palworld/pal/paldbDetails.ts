// lib/data/palworld/paldbDetails.ts
import {
  BASE,
  absUrl,
  htmlToText,
  firstMatch,
  allMatches,
  cleanKey,
  splitTableRows,
  parseLevelFromRow,
  parseNumberRawFromHash,
  dedup,
} from "../palworldDB";
import { parsePossibleDropsFromHtml } from "./paldbPossibleDrops";
import { PalActiveSkill, parseActiveSkillsFromHtml } from "./paldbActiveSkills";

export type PalDetail = {
  id: string; // slug
  palCode?: string;
  name: string;
  number: number;
  numberRaw?: string;
  elements: string[]; // e.g. ["Neutral"]
  imageUrl: string | null;
  iconUrl?: string | null; // header icon fallback
  partnerSkillVideo?: { id: string; thumbnail: string; };
  possibleDrops?: Array<{
    name: string;
    iconUrl?: string;
    amount?: string;
    probability?: string;
  }>;
  summary?: string;
  partnerSkillName?: string;
  partnerSkillLevel?: string;
  partnerSkillDescription?: string;
  partnerSkillIconUrl?: string | null;
  partnerSkillEffects?: Array<{
    level: number;
    description: string; // e.g. "CollectItem +0%"
    value?: string;
  }>;
  ranchDrops?: Array<{
    level: number;
    item: string;
    iconUrl: string;
    amount: string; // e.g. "1–5"
    probability: string;
  }>;
  isRanchPal?: boolean;
  partnerSkillTechnology?: {
    itemSlug?: string;
    itemName?: string;
    itemIconUrl?: string | null;
    technology?: number | null;
  };
  partnerSkillActiveStats?: Array<{
    level: number;
    values: Record<string, string>;
  }>;
  workSuitability?: Array<{ name: string; level: string; iconUrl?: string | null; }>;
  stats?: Record<string, string>;
  statsRows?: Array<{ key: string; value: string; iconUrl?: string | null; }>;
  movement?: Record<string, string>;
  level65?: Record<string, string>;
  food?: {
    amount: number;
    max: number;
  };
  others?: Record<string, string>;
  activeSkills?: PalActiveSkill[];
  tribes?: Array<{
    palSlug: string;
    palName: string;
    iconUrl?: string | null;
    tribeRole: string; // e.g. "Tribe Boss" / "Tribe Normal"
  }>;
  isAlpha?: boolean;
  spawner?: Array<{
    palSlug: string;
    palName: string;
    iconUrl?: string | null;
    levelRange: string; // "Lv. 1–3"
    sourceText: string; // raw-ish readable text (keeps codes + percents)
    locations?: Array<{ slug: string; name: string; }>;
  }>;
  uniqueCombo?: {
    parents: [
      { palSlug: string; palName: string; iconUrl?: string | null; },
      { palSlug: string; palName: string; iconUrl?: string | null; }
    ];
    child: { palSlug: string; palName: string; iconUrl?: string | null; };
  };
  breedingParentCalcUrl?: string;
  habitat?: {
    day?: { count: number | null; mapUrl: string | null; };
    night?: { count: number | null; mapUrl: string | null; };
  };
};

const DEBUG_PALDB = true;

function extractCardBodies(html: string) {
  const cards: Array<{ title: string; chunk: string; }> = [];

  CARD_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = CARD_RE.exec(html))) {
    const chunk = m[0];
    const title =
      firstMatch(
        chunk,
        /<h5[^>]*class="card-title[^"]*text-info[^"]*"[^>]*>([\s\S]*?)<\/h5>/i
      ) ??
      firstMatch(chunk, /<h5[^>]*class="card-title[^"]*"[^>]*>([\s\S]*?)<\/h5>/i) ??
      "";

    const titleText = cleanKey(htmlToText(title));
    if (!titleText) continue;

    cards.push({ title: titleText, chunk });
  }

  if (cards.length === 0) {
    CARD_RE2.lastIndex = 0;

    let m2: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m2 = CARD_RE2.exec(html))) {
      const chunk = m2[0];

      const title =
        firstMatch(
          chunk,
          /<h5[^>]*class="card-title[^"]*text-info[^"]*"[^>]*>([\s\S]*?)<\/h5>/i
        ) ??
        firstMatch(chunk, /<h5[^>]*class="card-title[^"]*"[^>]*>([\s\S]*?)<\/h5>/i) ??
        "";

      const titleText = cleanKey(htmlToText(title));
      if (!titleText) continue;

      cards.push({ title: titleText, chunk });
    }
  }

  return cards;
}

const CARD_RE =
  /<div\s+class="card[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>|<div\s+class="card[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;

const CARD_RE2 = /<div\s+class="card[^"]*"[\s\S]*?<\/div>/gi;

function extractBestCardChunkContaining(html: string, contains: RegExp) {
  try {
    const isPartnerSkillQuery =
      contains.test("Partner Skill") ||
      /partner\s*skill/i.test(String((contains as any)?.source ?? ""));

    if (isPartnerSkillQuery) {
      const psH5Index = html.search(
        /<h5[^>]*class="card-title[^"]*text-info[^"]*"[^>]*>[\s\S]*?<span[^>]*>\s*Partner Skill\s*<\/span>[\s\S]*?<\/h5>/i
      );

      if (psH5Index >= 0) {
        const cardStart = html.lastIndexOf('<div class="card', psH5Index);

        if (cardStart >= 0) {
          let nextCard = html.indexOf('<div class="card mt-3">', psH5Index + 1);
          if (nextCard < 0) nextCard = html.indexOf('<div class="card', psH5Index + 1);

          const sliced = html.slice(cardStart, nextCard > 0 ? nextCard : html.length);

          if (/Partner Skill/i.test(sliced) && /<table/i.test(sliced)) {
            return sliced;
          }
        }
      }
    }
  } catch {
    // ignored and fell back to regex-scoring path below
  }

  CARD_RE.lastIndex = 0;

  let best: { chunk: string; score: number; } | null = null;

  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = CARD_RE.exec(html))) {
    const chunk = m[0];
    if (!contains.test(chunk)) continue;

    const tableCount = (chunk.match(/<table/gi) ?? []).length;
    const hasFlexGrow = /class="[^"]*flex-grow-1[^"]*"/i.test(chunk);

    const hasPassiveTable = /<table[^>]*class="[^"]*\bpassive\b[^"]*"/i.test(chunk);
    const hasActiveTable = /<table[^>]*class="[^"]*\bactive\b[^"]*"/i.test(chunk);

    const hasItemQty = /class="itemQuantity"/i.test(chunk);
    const hasItemname = /class="itemname"/i.test(chunk);

    const hasSkillIcon =
      /T_icon_skill_pal_/i.test(chunk) ||
      /\bsize64\b[^>]*>\s*<\/img>/i.test(chunk) ||
      /class="[^"]*\bsize64\b[^"]*"/i.test(chunk);

    const score =
      tableCount * 10 +
      (hasFlexGrow ? 2 : 0) +
      (hasSkillIcon ? 5 : 0) +
      (hasPassiveTable ? 50 : 0) +
      (hasActiveTable ? 45 : 0) +
      (hasItemQty ? 25 : 0) +
      (hasItemname ? 5 : 0) +
      chunk.length / 10000;

    if (!best || score > best.score) best = { chunk, score };
  }

  if (!best) {
    CARD_RE2.lastIndex = 0;

    let m2: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m2 = CARD_RE2.exec(html))) {
      const chunk = m2[0];
      if (!contains.test(chunk)) continue;

      const tableCount = (chunk.match(/<table/gi) ?? []).length;
      const hasFlexGrow = /class="[^"]*flex-grow-1[^"]*"/i.test(chunk);

      const hasPassiveTable = /<table[^>]*class="[^"]*\bpassive\b[^"]*"/i.test(chunk);
      const hasActiveTable = /<table[^>]*class="[^"]*\bactive\b[^"]*"/i.test(chunk);

      const hasItemQty = /class="itemQuantity"/i.test(chunk);
      const hasItemname = /class="itemname"/i.test(chunk);

      const hasSkillIcon =
        /T_icon_skill_pal_/i.test(chunk) ||
        /class="[^"]*\bsize64\b[^"]*"/i.test(chunk);

      const score =
        tableCount * 10 +
        (hasFlexGrow ? 2 : 0) +
        (hasSkillIcon ? 5 : 0) +
        (hasPassiveTable ? 50 : 0) +
        (hasActiveTable ? 45 : 0) +
        (hasItemQty ? 25 : 0) +
        (hasItemname ? 5 : 0) +
        chunk.length / 10000;

      if (!best || score > best.score) best = { chunk, score };
    }
  }

  return best?.chunk ?? null;
}

function parseKeyValueRowsFromCard(cardChunk: string) {
  const map: Record<string, string> = {};

  const rowRe =
    /<div[^>]+class="[^"]*d-flex[^"]*justify-content-between[^"]*"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/div>/gi;

  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = rowRe.exec(cardChunk))) {
    const kRaw = cleanKey(htmlToText(m[1] ?? ""));
    const vRaw = cleanKey(htmlToText(m[2] ?? ""));
    if (!kRaw || !vRaw) continue;

    if (kRaw.length <= 1) continue;
    if (!map[kRaw]) map[kRaw] = vRaw;
  }

  return map;
}

function parseKeyValueRowsWithIconsFromCard(cardChunk: string) {
  const rows: Array<{ key: string; value: string; iconUrl?: string | null; }> = [];

  const rowRe =
    /<div[^>]+class="[^"]*\bd-flex\b[^"]*\bjustify-content-between\b[^"]*"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/div>/gi;

  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = rowRe.exec(cardChunk))) {
    const leftHtml = m[1] ?? "";
    const rightHtml = m[2] ?? "";

    const keyText = cleanKey(htmlToText(leftHtml));
    const valText = cleanKey(htmlToText(rightHtml));
    if (!keyText || !valText) continue;

    const icon =
      firstMatch(leftHtml, /<img[^>]+src="([^"]+)"/i) ??
      firstMatch(leftHtml, /<img[^>]+src='([^']+)'/i) ??
      null;

    rows.push({
      key: keyText,
      value: valText,
      iconUrl: icon ? absUrl(icon) : null,
    });
  }

  return rows;
}

function parseSummaryFromHtml(html: string): string | undefined {
  const divHtml =
    firstMatch(
      html,
      /<h5[^>]*class="card-title[^"]*"[^>]*>\s*Summary\s*<\/h5>\s*<div[^>]*>([\s\S]*?)<\/div>/i
    ) ??
    firstMatch(
      html,
      /<h5[^>]*>\s*Summary\s*<\/h5>\s*<div[^>]*>([\s\S]*?)<\/div>/i
    );

  if (!divHtml) return undefined;

  const text = htmlToText(divHtml).trim();
  return text ? text : undefined;
}

function parsePartnerSkillEffectsFromPassiveTable(passiveTable: string) {
  const effects: Array<{ level: number; description: string; value?: string; }> = [];

  const rowChunks = splitTableRows(passiveTable);
  for (const rowChunk of rowChunks) {
    const level = parseLevelFromRow(rowChunk);
    if (!level) continue;

    const value =
      firstMatch(
        rowChunk,
        /<span[^>]*class="(?:negative|positive)[^"]*"[^>]*>\s*([^<]+)\s*/i
      ) ??
      firstMatch(rowChunk, /([+-]?\d+(?:\.\d+)?%)/i) ??
      undefined;

    let desc = cleanKey(htmlToText(rowChunk));
    desc = desc.replace(/^\s*\d+\s*/, "").trim();
    if (!desc) continue;

    effects.push({
      level,
      description: desc,
      value: value ? cleanKey(value) : undefined,
    });
  }

  return effects;
}

function parsePartnerSkillActiveStatsFromActiveTable(activeTable: string) {
  const out: Array<{ level: number; values: Record<string, string>; }> = [];
  const table = String(activeTable ?? "");
  if (!table) return out;

  const ths = Array.from(
    table.matchAll(
      /<th[^>]*>([\s\S]*?)(?=<th\b|<tbody\b|<\/tr\b|<\/thead\b|<\/table\b|$)/gi
    )
  ).map((m) => cleanKey(htmlToText(m[1] ?? "")));

  const headers = ths
    .map((h) => cleanKey(h))
    .filter(Boolean)
    .filter((h, idx) => {
      if (idx === 0) {
        const n = h.toLowerCase().replace(/\./g, "");
        return !(n === "lv" || n === "level");
      }
      return true;
    });

  if (headers.length === 0) return out;

  const parts = table.split(/<tr\b/i).slice(1);

  const tdText = (html: string) =>
    String(htmlToText(html ?? ""))
      .replace(/\u00a0/g, " ")
      .trim();

  for (const p of parts) {
    const rowChunk = "<tr" + p;

    if (!/<td\b/i.test(rowChunk)) continue;

    const tds = Array.from(
      rowChunk.matchAll(/<td[^>]*>([\s\S]*?)(?=<td\b|<\/tr\b|<\/tbody\b|<\/table\b|$)/gi)
    ).map((m) => tdText(m[1] ?? ""));

    if (tds.length < 2) continue;

    const lvlNum = Number(String(tds[0] ?? "").match(/[0-9]+/)?.[0] ?? "");
    const level =
      Number.isFinite(lvlNum) && lvlNum > 0 ? lvlNum : parseLevelFromRow(rowChunk);

    if (!level) continue;

    const values: Record<string, string> = {};

    // tds[1...] map to headers[0...]
    for (let i = 1; i < tds.length; i++) {
      const key = headers[i - 1] ?? `value${i}`;
      const rawVal = tds[i] ?? "";
      if (!key) continue;
      values[key] = rawVal;
    }

    if (Object.keys(values).length === 0) continue;

    out.push({ level, values });
  }

  // Dedup by level (keep last)
  const byLevel = new Map<number, { level: number; values: Record<string, string>; }>();
  for (const r of out) byLevel.set(r.level, r);

  return Array.from(byLevel.values()).sort((a, b) => a.level - b.level);
}

function parsePartnerRanchDropsFromItemTable(itemTable: string) {
  const drops: Array<{
    level: number;
    item: string;
    iconUrl: string;
    amount: string;
    probability: string;
  }> = [];

  const rowChunks = splitTableRows(itemTable);

  for (const rowChunk of rowChunks) {
    const level = parseLevelFromRow(rowChunk);
    if (!level) continue;

    const icon =
      firstMatch(rowChunk, /<img[^>]+src="([^"]+)"[^>]*>/i) ??
      firstMatch(rowChunk, /<img[^>]+src='([^']+)'[^>]*>/i);

    const aInner = firstMatch(rowChunk, /<a[^>]+class="itemname"[^>]*>([\s\S]*?)<\/a>/i);

    const item = cleanKey(
      htmlToText((aInner ?? "").replace(/<img[\s\S]*?>/gi, " ").trim())
    );

    const amountRaw =
      firstMatch(
        rowChunk,
        /<small[^>]*class="itemQuantity"[^>]*>\s*([^<]+)\s*<\/small>/i
      ) ?? "";

    const amount = cleanKey(amountRaw).replace(/&ndash;?/g, "–").replace(/&mdash;?/g, "—");

    const probSpan =
      firstMatch(
        rowChunk,
        /<span[^>]*class="[^"]*\bfloat-end\b[^"]*"[^>]*>\s*([^<]+)\s*(?:<\/span>)?/i
      ) ?? null;

    let probability = cleanKey(probSpan ?? "");
    if (!probability) {
      const probs = Array.from(rowChunk.matchAll(/(\d+(?:\.\d+)?)%\s*/g)).map((m) => m[1]);
      if (probs.length) probability = `${probs[probs.length - 1]}%`;
    }

    if (!item || !icon) continue;

    drops.push({
      level,
      item,
      iconUrl: absUrl(icon),
      amount: amount || "-",
      probability: probability || "-",
    });
  }

  return drops;
}

function normalizePalSlugFromHref(hrefRaw: string) {
  const href = String(hrefRaw ?? "").trim();
  if (!href) return "";

  if (href.startsWith("?")) return "";

  let h = href.replace(/^https?:\/\/paldb\.cc/i, "");
  h = h.split("#")[0].split("?")[0];

  h = h.replace(/^\/+/, "");
  if (h.toLowerCase().startsWith("en/")) h = h.slice(3);

  return cleanKey(h);
}

function parsePartnerTechnologyFromFlexGrow(
  flexGrowHtml: string
): PalDetail["partnerSkillTechnology"] | undefined {
  const h = String(flexGrowHtml ?? "");
  if (!h) return undefined;

  if (!/Technology/i.test(h)) return undefined;

  const aHref =
    firstMatch(h, /<a[^>]+href="([^"]+)"[^>]*>/i) ??
    firstMatch(h, /<a[^>]+href='([^']+)'/i) ??
    "";

  const itemSlug = cleanKey(String(aHref ?? "").split("#")[0].split("?")[0].replace(/^\/+/, ""));
  if (!itemSlug) return undefined;

  const img =
    firstMatch(h, /<img[^>]+src="([^"]+)"/i) ??
    firstMatch(h, /<img[^>]+src='([^']+)'/i) ??
    null;

  const techRaw =
    firstMatch(h, /Technology<\/span>\s*<span[^>]*>\s*([0-9]{1,4})\s*<\/span>/i) ??
    firstMatch(h, /Technology[\s\S]*?([0-9]{1,4})/i) ??
    "";

  const techNum = Number(String(techRaw ?? "").match(/[0-9]+/)?.[0] ?? "");
  const technology = Number.isFinite(techNum) && techNum > 0 ? techNum : null;
  const itemName = cleanKey(itemSlug)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/([A-Za-z])ss\b/g, "$1s’s") // Foxparkss -> Foxparks’s
    .trim();


  return {
    itemSlug,
    itemName,
    itemIconUrl: img ? absUrl(img) : null,
    technology,
  };
}

function extractPartnerSkillFlexGrowHtml(psCardChunk: string): string | null {
  const html = String(psCardChunk ?? "");
  if (!html) return null;

  const start = html.search(/<div[^>]*class="[^"]*\bflex-grow-1\b[^"]*"[^>]*>/i);
  if (start < 0) return null;

  let end = html.search(/<div[^>]*class="mt-4\s+ps-2"[^>]*>/i);
  if (end > start) return html.slice(start, end);

  end = html.slice(start + 1).search(/<h5\b[^>]*class="card-title\b/i);
  if (end >= 0) return html.slice(start, start + 1 + end);

  return html.slice(start);
}

function stripPartnerSkillTechBlockFromFlexGrow(flexGrowHtml: string): string {
  let h = String(flexGrowHtml ?? "");
  if (!h) return h;
  h = h.replace(
    /<div>\s*<a\b[^>]*data-hover="[^"]*Items%2FSkillUnlock_[^"]*"[^>]*>[\s\S]*?<\/a>\s*<span\b[^>]*class="d-inline-block[^"]*"[^>]*>[\s\S]*?<span\b[^>]*>\s*Technology\s*<\/span>[\s\S]*?<\/span>\s*<\/div>/gi,
    " "
  );
  h = h.replace(
    /<div>\s*[\s\S]*?<span\b[^>]*class="d-inline-block[^"]*"[^>]*>[\s\S]*?<span\b[^>]*>\s*Technology\s*<\/span>[\s\S]*?<\/span>[\s\S]*?<\/div>/gi,
    " "
  );
  h = h.replace(/<table[\s\S]*?<\/table>/gi, "");
  h = h.replace(/(<\/div>)([^<]*)(?=<\/div>|$)/gi, (match, tag, trailing) => {
    const trimmed = trailing.trim();
    if (!trimmed || /^(\.|,|;|:|\?|!|\(|\))$/.test(trimmed)) return tag;
    return tag;
  });

  return h;
}

function extractTribesTableHtml(htmlOrCard: string) {
  return (
    firstMatch(
      htmlOrCard,
      /<h5[^>]*class="card-title[^"]*"[^>]*>\s*Tribes\s*<\/h5>[\s\S]*?(<table[\s\S]*?<\/table>)/i
    ) ??
    firstMatch(
      htmlOrCard,
      /<h5[^>]*>\s*Tribes\s*<\/h5>[\s\S]*?(<table[\s\S]*?<\/table>)/i
    ) ??
    null
  );
}

function parseTribesFromTable(tableHtml: string) {
  const out: Array<{
    palSlug: string;
    palName: string;
    iconUrl?: string | null;
    tribeRole: string;
  }> = [];

  const table = String(tableHtml ?? "");
  if (!table) return out;

  const parts = table.split(/<tr\b/i).slice(1);

  for (const p of parts) {
    const rowChunk = "<tr" + p;

    const href =
      firstMatch(rowChunk, /<a[^>]+href="([^"]+)"/i) ??
      firstMatch(rowChunk, /<a[^>]+href='([^']+)'/i) ??
      "";

    const palSlug = normalizePalSlugFromHref(href);

    const tdMatches = Array.from(rowChunk.matchAll(/<td[^>]*>([\s\S]*?)(?=<td\b|<\/tr>|$)/gi)).map(
      (m) => m[1] ?? ""
    );

    const firstTd = tdMatches[0] ?? "";
    const secondTd = tdMatches[1] ?? "";

    const icon =
      firstMatch(firstTd, /<img[^>]+src="([^"]+)"/i) ??
      firstMatch(firstTd, /<img[^>]+src='([^']+)'/i) ??
      null;

    const palName = cleanKey(htmlToText(firstTd));
    const tribeRole = cleanKey(htmlToText(secondTd));

    if (!palSlug || !palName || !tribeRole) continue;

    out.push({
      palSlug,
      palName,
      iconUrl: icon ? absUrl(icon) : null,
      tribeRole,
    });
  }

  const seen = new Set<string>();
  const deduped: typeof out = [];
  for (const r of out) {
    const k = `${r.palSlug}__${r.tribeRole}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }

  return deduped;
}

function isAlphaFromTribes(tribes?: PalDetail["tribes"]): boolean {
  if (!tribes || tribes.length === 0) return false;
  return tribes.some(
    (t) => t.tribeRole.toLowerCase() === "tribe boss"
  );
}

function extractSpawnerTableHtml(htmlOrCard: string) {
  return (
    firstMatch(
      htmlOrCard,
      /<h5[^>]*class="card-title[^"]*"[^>]*>\s*Spawner\s*<\/h5>[\s\S]*?(<table[\s\S]*?<\/table>)/i
    ) ??
    firstMatch(
      htmlOrCard,
      /<h5[^>]*>\s*Spawner\s*<\/h5>[\s\S]*?(<table[\s\S]*?<\/table>)/i
    ) ??
    null
  );
}

function parseSpawnerFromTable(tableHtml: string) {
  const out: Array<{
    palSlug: string;
    palName: string;
    iconUrl?: string | null;
    levelRange: string;
    sourceText: string;
    locations?: Array<{ slug: string; name: string; }>;
  }> = [];

  const table = String(tableHtml ?? "");
  if (!table) return out;

  const parts = table.split(/<tr\b/i).slice(1);

  for (const p of parts) {
    const rowChunk = "<tr" + p;

    const tdMatches = Array.from(
      rowChunk.matchAll(/<td[^>]*>([\s\S]*?)(?=<td\b|<\/tr>|$)/gi)
    ).map((m) => m[1] ?? "");

    const td0 = tdMatches[0] ?? "";
    const td1 = tdMatches[1] ?? "";
    const td2 = tdMatches[2] ?? "";

    const href =
      firstMatch(td0, /<a[^>]+href="([^"]+)"/i) ??
      firstMatch(td0, /<a[^>]+href='([^']+)'/i) ??
      "";

    const palSlug = normalizePalSlugFromHref(href);

    const icon =
      firstMatch(td0, /<img[^>]+src="([^"]+)"/i) ??
      firstMatch(td0, /<img[^>]+src='([^']+)'/i) ??
      null;

    const palName = cleanKey(htmlToText(td0));

    const levelRange = cleanKey(htmlToText(td1))
      .replace(/_/g, " ")
      .replace(/&ndash;?/g, "–")
      .replace(/&mdash;?/g, "—");

    const sourceText = cleanKey(htmlToText(td2))
      .replace(/_/g, " ")
      .replace(/&ndash;?/g, "–")
      .replace(/&mdash;?/g, "—");

    const locations = Array.from(
      td2.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)
    )
      .map((m) => {
        const hrefRaw = m[1] ?? "";
        const nameRaw = m[2] ?? "";

        const slug = cleanKey(String(hrefRaw).split("#")[0].split("?")[0].replace(/^\/+/, ""));

        const name = cleanKey(htmlToText(nameRaw)).replace(/_/g, " ").trim();

        return slug && name ? { slug, name } : null;
      })
      .filter(Boolean) as Array<{ slug: string; name: string; }>;

    if (!palSlug || !palName || !levelRange || !sourceText) continue;

    out.push({
      palSlug,
      palName,
      iconUrl: icon ? absUrl(icon) : null,
      levelRange,
      sourceText,
      locations: locations.length ? locations : undefined,
    });
  }

  const seen = new Set<string>();
  const deduped: typeof out = [];
  for (const r of out) {
    const k = `${r.palSlug}__${r.levelRange}__${r.sourceText}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }

  return deduped;
}

function parseUniqueComboFromBreedingFarmCard(
  cardChunk: string
): PalDetail["uniqueCombo"] | undefined {
  const chunk = String(cardChunk ?? "");
  if (!chunk) return undefined;

  const hasUnique =
    /Unique\s*Combo/i.test(chunk) || /data-i18n-tw\s*=\s*["']獨特配種["']/i.test(chunk);

  if (!hasUnique) return undefined;

  const idx =
    chunk.search(/Unique\s*Combo/i) >= 0
      ? chunk.search(/Unique\s*Combo/i)
      : chunk.search(/獨特配種/i);

  const scan = idx >= 0 ? chunk.slice(idx) : chunk;

  const anchors = Array.from(
    scan.matchAll(/<a[^>]+class="itemname"[^>]*>[\s\S]*?<\/a>/gi)
  ).map((m) => m[0] ?? "");

  if (anchors.length < 3) return undefined;

  const take3 = anchors.slice(0, 3);

  const pals = take3
    .map((aHtml) => {
      const href =
        firstMatch(aHtml, /<a[^>]+href="([^"]+)"/i) ??
        firstMatch(aHtml, /<a[^>]+href='([^']+)'/i) ??
        "";

      const palSlug = normalizePalSlugFromHref(href);

      const img =
        firstMatch(aHtml, /<img[^>]+src="([^"]+)"/i) ??
        firstMatch(aHtml, /<img[^>]+src='([^']+)'/i) ??
        null;

      const palName = cleanKey(
        htmlToText(String(aHtml).replace(/<img[\s\S]*?>/gi, " ").trim())
      );

      if (!palSlug || !palName) return null;

      return {
        palSlug,
        palName,
        iconUrl: img ? absUrl(img) : null,
      };
    })
    .filter(Boolean) as Array<{ palSlug: string; palName: string; iconUrl?: string | null; }>;

  if (pals.length < 3) return undefined;

  return {
    parents: [pals[0], pals[1]],
    child: pals[2],
  };
}

function parseHabitatFromCard(cardChunk: string): PalDetail["habitat"] | undefined {
  const chunk = String(cardChunk ?? "");
  if (!chunk) return undefined;

  // Collect all map links inside the Habitat card
  const links = Array.from(
    chunk.matchAll(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi)
  ).map((m) => ({
    href: String(m[1] ?? "").trim(),
    aHtml: String(m[0] ?? ""),
  }));

  if (!links.length) return undefined;

  const pickCount = (aHtml: string): number | null => {
    // "Day (107)" / "Night (107)" — most stable is grabbing (...) anywhere in anchor text
    const text = cleanKey(htmlToText(aHtml));
    const m = text.match(/\((\d{1,6})\)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  const pickType = (aHtml: string, href: string): "day" | "night" | null => {
    const h = `${aHtml} ${href}`.toLowerCase();
    if (h.includes("daytimelocations")) return "day";
    if (h.includes("nighttimelocations")) return "night";

    // fallback: sometimes the anchor contains the daytime/night icon
    if (h.includes("timezone_daytime")) return "day";
    if (h.includes("timezone_night")) return "night";

    // last fallback: textual
    if (/\bday\b/i.test(h)) return "day";
    if (/\bnight\b/i.test(h)) return "night";

    return null;
  };

  const out: NonNullable<PalDetail["habitat"]> = {};

  for (const l of links) {
    const hrefRaw = l.href;
    if (!hrefRaw) continue;

    // Normalize to absolute URL you can open later
    const mapUrl = absUrl(hrefRaw);

    const type = pickType(l.aHtml, hrefRaw);
    if (!type) continue;

    const count = pickCount(l.aHtml);

    if (type === "day") out.day = { count, mapUrl };
    if (type === "night") out.night = { count, mapUrl };
  }

  if (!out.day && !out.night) return undefined;
  return out;
}

export function parsePalDetailHtml(html: string, slug: string): PalDetail {
  const name =
    firstMatch(
      html,
      /<a[^>]+class="itemname"[^>]+href="[^"]+"[^>]*>\s*([^<]+)\s*<\/a>/i
    ) ?? slug;

  const numberRaw =
    firstMatch(
      html,
      /<span[^>]*class="text-white-50"[^>]*>\s*#\s*([0-9]{1,4}[A-Za-z]?)\s*<\/span>/i
    ) ??
    firstMatch(html, /<span[^>]*>\s*#\s*([0-9]{1,4}[A-Za-z]?)\s*<\/span>/i) ??
    undefined;

  const parsedNum = parseNumberRawFromHash(numberRaw ?? null);
  const number = parsedNum.number || 0;

  const elements = dedup(
    allMatches(
      html,
      /palstatus_element_[^>]*>[\s\S]*?<span[^>]*>\s*([^<]+)\s*<\/span>/gi
    ).map(cleanKey)
  );

  const iconUrl =
    firstMatch(
      html,
      /<img[^>]+src="(https?:\/\/cdn\.paldb\.cc\/[^"]+\/Pal\/Texture\/PalIcon\/[^"]+\.(?:png|jpg|jpeg|webp))"[^>]*>/i
    ) ??
    firstMatch(
      html,
      /<img[^>]+src="(https?:\/\/cdn\.paldb\.cc\/[^"]+PalIcon[^"]+\.(?:png|jpg|jpeg|webp))"[^>]*>/i
    );

  const hover =
    firstMatch(html, /data-hover="([^"]+\/cache\/[^"]+Game_Pals_hover\/[^"]+)"/i) ??
    firstMatch(html, /data-hover="(\/cache\/[^"]+Game_Pals_hover\/[^"]+)"/i);

  const directImg =
    firstMatch(html, /(https?:\/\/paldb\.cc\/[^"']+\.(png|jpg|jpeg|webp))/i) ??
    firstMatch(html, /(\/[^"']+\.(png|jpg|jpeg|webp))/i);

  const imageUrl = hover ? absUrl(hover) : directImg ? absUrl(directImg) : null;

  const summary = parseSummaryFromHtml(html);
  const videoId = firstMatch(html, /data-video-id=["']([^"']+)["']/i) ?? null;
  const partnerSkillVideo = videoId
    ? { id: videoId, thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` }
    : undefined;
  const possibleDrops = parsePossibleDropsFromHtml(html);
  const activeSkills = parseActiveSkillsFromHtml(html);

  // --- Partner skill ---
  let partnerSkillName: string | undefined;
  let partnerSkillLevel: string | undefined;
  let partnerSkillDescription: string | undefined;

  let partnerSkillEffects: PalDetail["partnerSkillEffects"];
  let ranchDrops: PalDetail["ranchDrops"];
  let isRanchPal: boolean | undefined;

  let partnerSkillTechnology: PalDetail["partnerSkillTechnology"];
  let partnerSkillActiveStats: PalDetail["partnerSkillActiveStats"];

  const psLeftName = firstMatch(
    html,
    /Partner Skill[\s\S]*?<span[^>]*class="ms-2"[^>]*>\s*([^<]+)\s*<\/span>/i
  );
  const psLeftLv = firstMatch(html, /Partner Skill[\s\S]*?<\/span>\s*Lv\.?\s*([0-9]+)/i);
  const psCardTitle = firstMatch(
    html,
    /<h5[^>]*>\s*<span>\s*Partner Skill\s*<\/span>\s*:\s*([^<]+)\s*<\/h5>/i
  );

  partnerSkillName = cleanKey(psCardTitle ?? psLeftName ?? "") || undefined;
  partnerSkillLevel = psLeftLv ? `Lv ${cleanKey(psLeftLv)}` : undefined;

  const psCardChunk = extractBestCardChunkContaining(html, /Partner Skill/i);

  let partnerSkillIconUrl: string | undefined;

  if (psCardChunk) {
    const psIcon =
      firstMatch(
        psCardChunk,
        /<img[^>]+src="([^"]+T_icon_skill_pal_[^"]+\.(?:png|jpg|jpeg|webp))"[^>]*>/i
      ) ??
      firstMatch(
        psCardChunk,
        /<img[^>]+src='([^']+T_icon_skill_pal_[^']+\.(?:png|jpg|jpeg|webp))'[^>]*>/i
      ) ??
      firstMatch(psCardChunk, /<img[^>]+src="([^"]+)"[^>]*\bsize64\b[^>]*>/i) ??
      firstMatch(psCardChunk, /<img[^>]+src='([^']+)'[^>]*\bsize64\b[^>]*>/i);

    if (psIcon) partnerSkillIconUrl = absUrl(psIcon);

    const flexGrowHtml = extractPartnerSkillFlexGrowHtml(psCardChunk);

    if (flexGrowHtml) {
      partnerSkillTechnology = parsePartnerTechnologyFromFlexGrow(flexGrowHtml);
      const cleanedForDesc = stripPartnerSkillTechBlockFromFlexGrow(flexGrowHtml);
      const desc = cleanKey(htmlToText(cleanedForDesc)).replace(/\s+([.,;!?])/g, "$1");
      if (desc) partnerSkillDescription = desc;
    }

    const tables = psCardChunk.match(/<table[\s\S]*?<\/table>/gi) ?? [];

    const passiveTable = tables.find((t) => /<table[^>]*class="[^"]*\bpassive\b[^"]*"/i.test(t));
    if (passiveTable) {
      const effects = parsePartnerSkillEffectsFromPassiveTable(passiveTable);
      if (effects.length > 0) partnerSkillEffects = effects;
    }

    const itemTable = tables.find((t) => {
      if (/class="[^"]*\bpassive\b[^"]*"/i.test(t)) return false;

      if (/data-i18n-tw\s*=\s*"(?:物品|Item)"/i.test(t)) return true;
      if (/data-i18n-tw\s*=\s*'(?:物品|Item)'/i.test(t)) return true;

      if (/<th[^>]*>\s*Item\b/i.test(t)) return true;

      const hasItemname = /class="[^"]*\bitemname\b[^"]*"/i.test(t);
      const hasQty = /class="itemQuantity"/i.test(t);
      const hasPercent = /(\d+(?:\.\d+)?)%/i.test(t);
      if (hasItemname && (hasQty || hasPercent)) return true;

      return false;
    });

    if (itemTable) {
      const dropsOut = parsePartnerRanchDropsFromItemTable(itemTable);
      if (dropsOut.length > 0) {
        ranchDrops = dropsOut;
        isRanchPal = true;
      }
    }

    const activeTable =
      firstMatch(
        psCardChunk,
        /(<table[^>]*class="[^"]*\bactive\b[^"]*"[\s\S]*?<\/table>)/i
      ) ??
      firstMatch(
        html,
        /Partner Skill[\s\S]*?(<table[^>]*class="[^"]*\bactive\b[^"]*"[\s\S]*?<\/table>)/i
      ) ??
      null;


    if (activeTable) {
      const parsed = parsePartnerSkillActiveStatsFromActiveTable(activeTable);

      if (parsed.length > 0) partnerSkillActiveStats = parsed;
    }
  } else {
    const psLeftDescHtml = firstMatch(
      html,
      /Partner Skill[\s\S]*?<div[^>]*class="flex-grow-1[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (psLeftDescHtml) {
      partnerSkillDescription = cleanKey(htmlToText(psLeftDescHtml));
      partnerSkillTechnology = parsePartnerTechnologyFromFlexGrow(psLeftDescHtml);
    }
  }

  // --- Work suitability ---
  let workSuitability:
    | Array<{ name: string; level: string; iconUrl?: string | null; }>
    | undefined;

  const wsChunk =
    firstMatch(
      html,
      /Work Suitability[\s\S]*?(<div class="border-bottom[\s\S]*?)<div class="mt-2 d-flex justify-content-between/i
    ) ??
    firstMatch(
      html,
      /Work Suitability[\s\S]*?(<div class="border-bottom[\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i
    );

  if (wsChunk) {
    const rows: Array<{ name: string; level: string; iconUrl?: string | null; }> = [];

    const rowRe =
      /<div[^>]*class="border-bottom[^"]*"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/div>/gi;

    let rm: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((rm = rowRe.exec(wsChunk))) {
      const nameHtml = rm[1] ?? "";
      const levelHtml = rm[2] ?? "";

      const icon =
        firstMatch(nameHtml, /<img[^>]+src="([^"]+)"/i) ??
        firstMatch(nameHtml, /<img[^>]+src='([^']+)'/i) ??
        null;

      const nameText = cleanKey(htmlToText(nameHtml)).replace(/^Lv\s*/i, "").trim();

      const levelText = cleanKey(htmlToText(levelHtml));
      const lvNum =
        firstMatch(levelText, /Lv\.?\s*([0-9]+)/i) ?? firstMatch(levelText, /([0-9]+)/i);

      const level = lvNum ? cleanKey(lvNum) : cleanKey(levelText);

      if (!nameText || !level) continue;

      rows.push({
        name: nameText,
        level,
        iconUrl: icon ? absUrl(icon) : null,
      });
    }

    if (rows.length > 0) workSuitability = rows;
  }

  const cards = extractCardBodies(html);
  const findCard = (name: string) => cards.find((c) => c.title.toLowerCase().includes(name));
  const habitatCard = findCard("habitat");
  const habitat = habitatCard ? parseHabitatFromCard(habitatCard.chunk) : undefined;

  const statsCard = findCard("stats");
  const stats = statsCard ? parseKeyValueRowsFromCard(statsCard.chunk) : undefined;
  const statsRows = statsCard ? parseKeyValueRowsWithIconsFromCard(statsCard.chunk) : undefined;

  const movementCard = findCard("movement");
  const movement = movementCard ? parseKeyValueRowsFromCard(movementCard.chunk) : undefined;

  const level65Card = findCard("level 65");
  const level65 = level65Card ? parseKeyValueRowsFromCard(level65Card.chunk) : undefined;

  let tribes: PalDetail["tribes"] | undefined;

  const tribesCard = findCard("tribes");
  const tribesTableFromCard = tribesCard ? extractTribesTableHtml(tribesCard.chunk) : null;
  if (tribesTableFromCard) {
    const parsed = parseTribesFromTable(tribesTableFromCard);
    if (parsed.length > 0) tribes = parsed;
  }

  if (!tribes || tribes.length === 0) {
    const tribesChunk =
      extractBestCardChunkContaining(
        html,
        /<h5[^>]*class="card-title[^"]*text-info[^"]*"[^>]*>\s*Tribes\s*<\/h5>/i
      ) ??
      extractBestCardChunkContaining(html, /Tribes/i) ??
      null;

    const tribesTable = tribesChunk ? extractTribesTableHtml(tribesChunk) : null;

    if (tribesTable) {
      const parsed = parseTribesFromTable(tribesTable);
      if (parsed.length > 0) tribes = parsed;
    }
  }

  const isAlpha = isAlphaFromTribes(tribes);

  let spawner: PalDetail["spawner"] | undefined;

  const spawnerCard = findCard("spawner");
  const spawnerTableFromCard = spawnerCard ? extractSpawnerTableHtml(spawnerCard.chunk) : null;

  if (spawnerTableFromCard) {
    const parsed = parseSpawnerFromTable(spawnerTableFromCard);
    if (parsed.length > 0) spawner = parsed;
  }

  if (!spawner || spawner.length === 0) {
    const spawnerChunk =
      extractBestCardChunkContaining(
        html,
        /<h5[^>]*class="card-title[^"]*text-info[^"]*"[^>]*>\s*Spawner\s*<\/h5>/i
      ) ??
      extractBestCardChunkContaining(html, /Spawner/i) ??
      null;

    const spawnerTable = spawnerChunk ? extractSpawnerTableHtml(spawnerChunk) : null;

    if (spawnerTable) {
      const parsed = parseSpawnerFromTable(spawnerTable);
      if (parsed.length > 0) spawner = parsed;
    }
  }

  const othersCard = findCard("others");
  const others = othersCard ? parseKeyValueRowsFromCard(othersCard.chunk) : undefined;
  const foodAmountRaw =
    others?.FoodAmount ??
    stats?.FoodAmount ??
    undefined;

  const foodStatRaw =
    stats?.Food ??
    undefined;

  const foodAmount = Number(foodAmountRaw);
  const foodMax = Number(foodStatRaw);

  const food =
    Number.isFinite(foodAmount) || Number.isFinite(foodMax)
      ? {
        amount: Number.isFinite(foodAmount) ? foodAmount : 0,
        max: Number.isFinite(foodMax) ? foodMax : 0,
      }
      : undefined;

  const breedingFarmCard = findCard("breeding farm");
  const uniqueCombo = breedingFarmCard
    ? parseUniqueComboFromBreedingFarmCard(breedingFarmCard.chunk)
    : undefined;

  const palCode = (stats?.Code || others?.Code || "").trim() || undefined;

  const breedingParentCalcUrl =
    palCode ? `${BASE}/en/Breed?child=${encodeURIComponent(palCode)}` : undefined;

  return {
    id: slug,
    palCode,
    name: cleanKey(name || slug),
    number,
    numberRaw: parsedNum.numberRaw,
    elements,
    imageUrl,
    iconUrl: iconUrl ? absUrl(iconUrl) : null,
    summary,
    activeSkills,
    possibleDrops: possibleDrops.map((d) => ({
      name: d.itemName,
      iconUrl: d.iconUrl,
      amount: d.quantityText,
      probability: d.probabilityText,
    })),
    partnerSkillName,
    partnerSkillIconUrl: partnerSkillIconUrl ?? null,
    partnerSkillLevel,
    partnerSkillDescription,
    partnerSkillEffects,
    ranchDrops,
    isRanchPal,
    partnerSkillTechnology,
    partnerSkillActiveStats,
    partnerSkillVideo,
    workSuitability,
    stats,
    statsRows,
    food,
    movement,
    level65,
    others,
    tribes,
    isAlpha,
    spawner,
    uniqueCombo,
    breedingParentCalcUrl,
    habitat,
  };
}

export async function fetchPalDetail(slug: string): Promise<PalDetail> {
  const url = `${BASE}/en/${encodeURIComponent(slug)}`;

  const res = await fetch(url, {
    headers: { Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
  });

  const html = await res.text();
  return parsePalDetailHtml(html, slug);
}
