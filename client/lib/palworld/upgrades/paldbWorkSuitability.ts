// lib/palworld/upgrades/paldbWorkSuitability.ts
//
// Merged:
// - Canonical Work Suitability definitions (slug/code/icon) + lookups
// - Work Suitability detail fetch + HTML parsing for pages like:
//     https://paldb.cc/en/Lumbering
//     https://paldb.cc/en/Farming
//     https://paldb.cc/en/Transporting
//     https://paldb.cc/en/Medicine_Production
//     https://paldb.cc/en/Cooling
//     https://paldb.cc/en/Generating_Electricity
//     https://paldb.cc/en/Mining
//     https://paldb.cc/en/Kindling
//     https://paldb.cc/en/Planting
//     https://paldb.cc/en/Watering
//     https://paldb.cc/en/Handiwork
//
// Output includes:
// - stats (type/code + lv scaling info)
// - structures that use this work
// - pals with this work suitability (incl. nocturnal flag if shown)
//   - supports extra table columns (e.g. Transporting has Run Speed / Transport Speed, Farming has Ranch item)
// - research items under the "Research" tab
//
// Dependencies: BASE + absUrl + firstMatch + cleanKey + htmlToText from palworldDB.

import { BASE, absUrl, firstMatch, cleanKey, htmlToText } from "@/lib/palworld/palworldDB";

export type WorkSuitabilityCode =
  | "EmitFlame"
  | "Watering"
  | "Seeding"
  | "GenerateElectricity"
  | "Handcraft"
  | "Collection"
  | "Deforest"
  | "Mining"
  | "ProductMedicine"
  | "Cool"
  | "Transport"
  | "MonsterFarm";

export type WorkSuitabilityItem = {
  slug: string;
  name: string;
  code: WorkSuitabilityCode;
  iconUrl: string;
  iconId: number;
};

export type WorkSuitabilityLevelStat = {
  level: number;
  power: number | null;
  damageRate: number | null;
  rawText: string;
};

export type WorkSuitabilityStats = {
  type: string | null;
  code: string | null;
  levels: WorkSuitabilityLevelStat[];
};

export type WorkStructureRef = {
  slug: string | null;
  name: string | null;
  iconUrl: string | null;
  requiredLevel: number | null;
};

export type WorkPalExtraLink = {
  slug: string | null;
  name: string | null;
  iconUrl: string | null;
};

export type WorkPalExtraCell = {
  text: string | null; // cleaned visible text
  link?: WorkPalExtraLink | null; // if the cell is an item link, etc.
};

export type WorkPalRef = {
  slug: string | null;
  name: string | null;
  iconUrl: string | null;
  level: number | null;
  nocturnal: boolean;

  // extra columns keyed by normalized header key (stable across pages)
  extras?: Record<string, WorkPalExtraCell | null>;
};

export type WorkResearchIngredient = {
  slug: string | null;
  name: string | null;
  iconUrl: string | null;
  qty: number | null;
  qtyText: string | null;
  isCurrency?: boolean;
};

export type WorkResearchItem = {
  title: string | null;
  requiredWorkLevel: number | null;
  effectText: string | null;
  ingredients: WorkResearchIngredient[];
};

export type WorkSuitabilityDetail = {
  slug: string;
  name: string | null;
  iconUrl: string | null;
  stats: WorkSuitabilityStats;
  structures: WorkStructureRef[];

  // pals table
  pals: WorkPalRef[];
  palExtraColumns: { key: string; label: string }[];

  // research tab
  research: WorkResearchItem[];
};

export function workSuitabilityIconUrl(iconId: number): string {
  const two = String(iconId).padStart(2, "0");
  return absUrl(`/image/Pal/Texture/UI/InGame/T_icon_palwork_${two}.webp`);
}

export const WORK_SUITABILITIES: WorkSuitabilityItem[] = [
  { slug: "Kindling", name: "Kindling", code: "EmitFlame", iconId: 0, iconUrl: workSuitabilityIconUrl(0) },
  { slug: "Watering", name: "Watering", code: "Watering", iconId: 1, iconUrl: workSuitabilityIconUrl(1) },
  { slug: "Planting", name: "Planting", code: "Seeding", iconId: 2, iconUrl: workSuitabilityIconUrl(2) },
  {
    slug: "Generating_Electricity",
    name: "Generating Electricity",
    code: "GenerateElectricity",
    iconId: 3,
    iconUrl: workSuitabilityIconUrl(3),
  },
  { slug: "Handiwork", name: "Handiwork", code: "Handcraft", iconId: 4, iconUrl: workSuitabilityIconUrl(4) },
  { slug: "Gathering", name: "Gathering", code: "Collection", iconId: 5, iconUrl: workSuitabilityIconUrl(5) },
  { slug: "Lumbering", name: "Lumbering", code: "Deforest", iconId: 6, iconUrl: workSuitabilityIconUrl(6) },
  { slug: "Mining", name: "Mining", code: "Mining", iconId: 7, iconUrl: workSuitabilityIconUrl(7) },
  {
    slug: "Medicine_Production",
    name: "Medicine Production",
    code: "ProductMedicine",
    iconId: 8,
    iconUrl: workSuitabilityIconUrl(8),
  },
  { slug: "Cooling", name: "Cooling", code: "Cool", iconId: 10, iconUrl: workSuitabilityIconUrl(10) },
  { slug: "Transporting", name: "Transporting", code: "Transport", iconId: 11, iconUrl: workSuitabilityIconUrl(11) },
  { slug: "Farming", name: "Farming", code: "MonsterFarm", iconId: 12, iconUrl: workSuitabilityIconUrl(12) },
];

const BY_SLUG = new Map<string, WorkSuitabilityItem>(WORK_SUITABILITIES.map((w) => [w.slug.toLowerCase(), w]));
const BY_CODE = new Map<WorkSuitabilityCode, WorkSuitabilityItem>(WORK_SUITABILITIES.map((w) => [w.code, w]));

export function getWorkSuitabilityBySlug(slug?: string | null): WorkSuitabilityItem | null {
  if (!slug) return null;
  return BY_SLUG.get(String(slug).trim().toLowerCase()) ?? null;
}

export function getWorkSuitabilityByCode(code?: string | null): WorkSuitabilityItem | null {
  if (!code) return null;
  const c = String(code).trim() as WorkSuitabilityCode;
  return BY_CODE.get(c) ?? null;
}

export function listWorkSuitabilities(): WorkSuitabilityItem[] {
  return WORK_SUITABILITIES.slice();
}

function normalizeWorkSuitabilitySlug(input: string) {
  const s = String(input || "").trim();
  if (!s) return "Lumbering";

  const m = s.match(/\/en\/([^/?#]+)\b/i);
  if (m?.[1]) return decodeURIComponent(m[1]);

  return s.replace(/^\/+/, "");
}

async function fetchHtml(urlOrSlug: string): Promise<string> {
  const slug = normalizeWorkSuitabilitySlug(urlOrSlug);
  const url = `${BASE}/en/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "text/html" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

function safeText(v: any): string {
  return String(v ?? "").trim();
}

function firstGroup(text: string, re: RegExp, groupIndex: number): string | null {
  const m = String(text ?? "").match(re);
  const v = (m?.[groupIndex] ?? "").trim();
  return v ? v : null;
}

function parseNum(v: any): number | null {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDamageRate(raw: string): number | null {
  const m = raw.match(/DamageRate\s*x\s*([0-9]*\.?[0-9]+)/i);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function stripTags(html: string): string {
  return htmlToText(String(html ?? "")).replace(/\s+/g, " ").trim();
}

function pickImgSrc(block: string): string | null {
  const src = firstGroup(block, /<img[^>]+src="([^"]+)"/i, 1) ?? firstGroup(block, /<img[^>]+src='([^']+)'/i, 1);
  return src ? absUrl(src) : null;
}

function pickHref(block: string): string | null {
  const href = firstGroup(block, /<a[^>]+href="([^"]+)"/i, 1) ?? firstGroup(block, /<a[^>]+href='([^']+)'/i, 1);
  return href ? safeText(href) : null;
}

function pickAnchorText(block: string): string | null {
  const inner = firstGroup(block, /<a[^>]*>([\s\S]*?)<\/a>/i, 1);
  if (!inner) return null;
  const t = stripTags(inner);
  return t || null;
}

function hrefToSlug(href: string | null): string | null {
  const raw = String(href ?? "").trim();
  if (!raw) return null;

  const m = raw.match(/\/en\/([^/?#]+)/i);
  if (m?.[1]) return decodeURIComponent(m[1]);

  const s = raw.replace(/^\/+/, "").replace(/[#?].*$/, "");
  if (!s) return null;

  const last = s.split("/").filter(Boolean).slice(-1)[0] ?? s;
  return last ? last : null;
}

function splitCardsByClass(html: string, className: string): string[] {
  const src = String(html ?? "");
  if (!src) return [];

  const re = new RegExp(`<div\\s+class="card[^"]*\\b${className}\\b[^"]*"[^>]*>`, "ig");
  const starts: number[] = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) starts.push(m.index);

  if (starts.length === 0) return [];

  const out: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const a = starts[i];
    const b = i + 1 < starts.length ? starts[i + 1] : src.length;
    out.push(src.slice(a, b));
  }
  return out;
}

function extractCardByTitle(src: string, titleNeedleLower: string): string | null {
  const s = String(src ?? "");
  if (!s) return null;

  const parts = s.split(/<div class="card mt-3">/i).slice(1);
  for (const raw of parts) {
    const card = `<div class="card mt-3">${raw}`;

    const h5Inner =
      firstGroup(
        card,
        /<h5\b[^>]*class=(?:"[^"]*\bcard-title\b[^"]*"|'[^']*\bcard-title\b[^']*')[^>]*>\s*([\s\S]*?)\s*<\/h5>/i,
        1
      ) ?? null;

    const title = cleanKey(htmlToText(h5Inner ?? "")).toLowerCase();
    if (!title) continue;

    if (title.includes(titleNeedleLower)) return card;
  }

  return null;
}

function extractTabPane(html: string, paneId: string): string | null {
  const s = String(html ?? "");
  if (!s) return null;

  const startRe = new RegExp(`<div\\s+id="${paneId}"\\s+class="tab-pane[^"]*"[^>]*>`, "i");
  const startIdx = s.search(startRe);
  if (startIdx < 0) return null;

  const afterStart = s.slice(startIdx);
  const nextIdx = afterStart.slice(1).search(/<div\s+id="[^"]+"\s+class="tab-pane\b/i);
  const endIdx = nextIdx >= 0 ? startIdx + 1 + nextIdx : s.length;

  const paneBlock = s.slice(startIdx, endIdx);
  const gt = paneBlock.indexOf(">");
  if (gt >= 0) return paneBlock.slice(gt + 1);
  return paneBlock;
}

function lastIntInText(htmlOrText: string): number | null {
  const t = stripTags(String(htmlOrText ?? ""));
  if (!t) return null;
  const re = /(\d+)\b/g;
  let m: RegExpExecArray | null;
  let last: string | null = null;
  while ((m = re.exec(t))) last = m[1];
  return last ? parseNum(last) : null;
}

function lastDivNumber(html: string): { qty: number | null; qtyText: string | null } {
  const src = String(html ?? "");
  const re = /<div\b[^>]*>\s*([0-9][0-9,]*)\s*<\/div>/gi;
  let m: RegExpExecArray | null;
  let last: string | null = null;

  while ((m = re.exec(src))) last = (m[1] ?? "").trim();

  if (!last) return { qty: null, qtyText: null };

  const qtyText = last;
  const qty = parseNum(last.replace(/,/g, ""));
  return { qty, qtyText };
}

function splitRecipeRows(recipesHtml: string): string[] {
  const src = String(recipesHtml ?? "");
  if (!src) return [];

  const re = /<div\s+class="d-flex[^"]*\bborder-top\b[^"]*"[^>]*>/ig;
  const starts: number[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(src))) starts.push(m.index);

  if (!starts.length) return [];

  const out: string[] = [];
  for (let i = 0; i < starts.length; i++) {
    const a = starts[i];
    const b = i + 1 < starts.length ? starts[i + 1] : src.length;
    out.push(src.slice(a, b));
  }
  return out;
}

function parseLeftHeader(html: string): { name: string | null; iconUrl: string | null } {
  const iconRaw =
    firstGroup(html, /<img[^>]+width="80"[^>]+src="([^"]+)"/i, 1) ??
    firstGroup(html, /<img[^>]+width="80"[^>]+src='([^']+)'/i, 1) ??
    null;

  const iconUrl = iconRaw ? absUrl(iconRaw) : null;

  const nameRaw = firstGroup(html, /<h5 class="text-center card-title">\s*([\s\S]*?)\s*<\/h5>/i, 1) ?? "";
  const name = stripTags(nameRaw) || null;

  return { name, iconUrl };
}

function parsePowerFromStatText(raw: string): number | null {
  const s = safeText(raw);
  if (!s) return null;

  const m = s.match(/^\s*([0-9][0-9,]*)\b/);
  if (!m?.[1]) return null;

  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseStats(html: string): WorkSuitabilityStats {
  const statsCard = extractCardByTitle(html, "stats");
  if (!statsCard) return { type: null, code: null, levels: [] };

  const type =
    stripTags(firstGroup(statsCard, /<div>\s*Type\s*<\/div>\s*<div>([\s\S]*?)<\/div>/i, 1) ?? "") || null;

  const code =
    stripTags(firstGroup(statsCard, /<div>\s*Code\s*<\/div>\s*<div>([\s\S]*?)<\/div>/i, 1) ?? "") || null;

  const levels: WorkSuitabilityLevelStat[] = [];
  const lvRe = /<div>\s*Lv\.\s*([0-9]+)\s*<\/div>\s*<div>\s*([^<]+?)\s*<\/div>/gi;

  let m: RegExpExecArray | null;
  while ((m = lvRe.exec(statsCard))) {
    const level = Number(m[1]);
    const rawText = safeText(m[2]);
    const power = parsePowerFromStatText(rawText);
    const damageRate = parseDamageRate(rawText);

    levels.push({
      level: Number.isFinite(level) ? level : 0,
      power,
      damageRate,
      rawText,
    });
  }

  levels.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  return { type, code, levels };
}

function parseStructures(html: string): WorkStructureRef[] {
  const card = extractCardByTitle(html, "structures");
  if (!card) return [];

  const rowRe = /<div class="d-flex[^"]*border-bottom[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  const out: WorkStructureRef[] = [];

  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(card))) {
    const rowInner = m[1] ?? "";

    const aBlock = firstGroup(rowInner, /(<a\b[^>]*>[\s\S]*?<\/a>)/i, 1) ?? rowInner;
    const href = pickHref(aBlock);
    const slug = hrefToSlug(href);
    const name = pickAnchorText(aBlock);
    const iconUrl = pickImgSrc(aBlock);
    const requiredLevel = lastIntInText(rowInner);

    out.push({
      slug,
      name: name || null,
      iconUrl: iconUrl || null,
      requiredLevel,
    });
  }

  return out;
}

function normalizeHeaderKey(label: string): string {
  const t = cleanKey(stripTags(label));
  if (!t) return "";
  return t
    .replace(/\s+/g, "_")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function extractAllTds(rowHtml: string): string[] {
  const out: string[] = [];
  const re = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowHtml))) out.push(m[1] ?? "");
  return out;
}

function extractAllThs(tableHtml: string): string[] {
  const out: string[] = [];
  const thead = firstGroup(tableHtml, /<thead\b[^>]*>([\s\S]*?)<\/thead>/i, 1) ?? "";
  if (!thead) return out;

  const re = /<th\b[^>]*>([\s\S]*?)<\/th>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(thead))) out.push(m[1] ?? "");
  return out;
}

function parseExtraCell(cellHtml: string): WorkPalExtraCell | null {
  const raw = String(cellHtml ?? "");
  if (!raw) return null;

  const hasLink = /<a\b[^>]*\bclass=(?:"[^"]*\bitemname\b[^"]*"|'[^']*\bitemname\b[^']*')[^>]*>/i.test(raw);

  if (hasLink) {
    const aBlock =
      firstGroup(raw, /(<a\b[^>]*\bclass="itemname"[^>]*>[\s\S]*?<\/a>)/i, 1) ??
      firstGroup(raw, /(<a\b[^>]*\bclass='itemname'[^>]*>[\s\S]*?<\/a>)/i, 1) ??
      null;

    if (aBlock) {
      const href = pickHref(aBlock);
      const slug = hrefToSlug(href);
      const name = pickAnchorText(aBlock);
      const iconUrl = pickImgSrc(aBlock);

      return {
        text: name || stripTags(raw) || null,
        link: { slug, name: name || null, iconUrl: iconUrl || null },
      };
    }
  }

  const text = stripTags(raw);
  return text ? { text, link: null } : null;
}

function parsePalsTable(html: string): {
  pals: WorkPalRef[];
  extraColumns: { key: string; label: string }[];
} {
  const src = String(html ?? "");
  if (!src) return { pals: [], extraColumns: [] };

  // Grab the table after the header title
  const table =
    firstGroup(
      src,
      /Pals with this Work Suitability[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i,
      1
    ) ?? "";

  if (!table) return { pals: [], extraColumns: [] };

  // ---- HEADERS (broken HTML-safe) ----
  const rawHeaders = table.match(/<th[^>]*>([\s\S]*?)(?=<th|<tbody|<tr|$)/gi) ?? [];
  const headers = rawHeaders.map((h) => stripTags(h)).filter(Boolean);

  const extraColumns: { key: string; label: string }[] = [];
  for (let i = 2; i < headers.length; i++) {
    const label = headers[i];
    const key = normalizeHeaderKey(label) || `extra_${i - 1}`;
    extraColumns.push({ key, label });
  }

  const colCount = Math.max(headers.length, 2);

  // ---- CELLS (flat stream) ----
  const cells = table.match(/<td[^>]*>([\s\S]*?)(?=<td|<tr|$)/gi) ?? [];
  if (!cells.length) return { pals: [], extraColumns };

  const pals: WorkPalRef[] = [];

  for (let i = 0; i + colCount - 1 < cells.length; i += colCount) {
    const row = cells.slice(i, i + colCount);

    const palCell = row[0] ?? "";
    const levelCell = row[1] ?? "";

    const anchor =
      firstGroup(palCell, /(<a\b[^>]*\bclass="itemname"[^>]*>[\s\S]*?<\/a>)/i, 1) ??
      null;

    if (!anchor) continue;

    const slug = hrefToSlug(pickHref(anchor));
    const name = pickAnchorText(anchor);
    const iconUrl = pickImgSrc(anchor);
    const nocturnal = /Nocturnal/i.test(palCell);

    const level = parseNum(stripTags(levelCell));

    const extras: Record<string, WorkPalExtraCell | null> = {};
    for (let j = 0; j < extraColumns.length; j++) {
      extras[extraColumns[j].key] = parseExtraCell(row[j + 2] ?? "");
    }

    pals.push({
      slug,
      name: name || null,
      iconUrl: iconUrl || null,
      level,
      nocturnal,
      extras: extraColumns.length ? extras : undefined,
    });
  }

  return { pals, extraColumns };
}

function parseResearch(html: string): WorkResearchItem[] {
  const pane = extractTabPane(html, "Research");
  if (!pane) return [];

  const cards = splitCardsByClass(pane, "itemPopup");
  if (!cards.length) return [];

  const out: WorkResearchItem[] = [];

  for (const card of cards) {
    const titleRaw = firstGroup(card, /<div class="align-self-center"[^>]*>\s*([\s\S]*?)\s*<\/div>/i, 1) ?? "";
    const title = stripTags(titleRaw) || null;

    const reqRaw = firstGroup(card, /<span[^>]*>\s*[^<]*Lv\.\s*([0-9]+)\s*<\/span>/i, 1) ?? "";
    const requiredWorkLevel = parseNum(reqRaw);

    const bodyRaw = firstGroup(card, /<div class="card-body[^"]*">([\s\S]*?)<\/div>/i, 1) ?? "";
    const effectText = stripTags(bodyRaw) || null;

    const recipesBlock = firstGroup(card, /<div class="recipes">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i, 1) ?? "";
    const ingredients: WorkResearchIngredient[] = [];

    if (recipesBlock) {
      const rows = splitRecipeRows(recipesBlock);

      for (const rowHtml of rows) {
        const { qty, qtyText } = lastDivNumber(rowHtml);

        const hasLink = /<a class="itemname"/i.test(rowHtml);

        if (hasLink) {
          const aBlock = firstGroup(rowHtml, /(<a class="itemname"[\s\S]*?<\/a>)/i, 1) ?? "";
          const href = pickHref(aBlock);
          const slug = hrefToSlug(href);
          const name = pickAnchorText(aBlock);
          const iconUrl = pickImgSrc(aBlock);

          ingredients.push({
            slug,
            name: name || null,
            iconUrl: iconUrl || null,
            qty,
            qtyText,
          });
        }
      }
    }

    if (title || effectText || ingredients.length) {
      out.push({
        title,
        requiredWorkLevel,
        effectText,
        ingredients,
      });
    }
  }

  return out;
}

export async function fetchWorkSuitabilityDetail(slugOrUrl: string): Promise<WorkSuitabilityDetail> {
  const slug = normalizeWorkSuitabilitySlug(slugOrUrl);
  const html = await fetchHtml(slug);
  return parseWorkSuitabilityDetailFromHtml(slug, html);
}

export function parseWorkSuitabilityDetailFromHtml(slugOrUrl: string, html: string): WorkSuitabilityDetail {
  const slug = normalizeWorkSuitabilitySlug(slugOrUrl);

  const { name, iconUrl } = parseLeftHeader(html);
  const stats = parseStats(html);
  const structures = parseStructures(html);
  const palsParsed = parsePalsTable(html);
  const research = parseResearch(html);

  return {
    slug,
    name,
    iconUrl,
    stats,
    structures,
    pals: palsParsed.pals,
    palExtraColumns: palsParsed.extraColumns,
    research,
  };
}
