// lib/animalCrossing/nookMiles.ts
//
// Nook Miles + Nook Miles+ (daily) parser
// Source: https://nookipedia.com/wiki/Nook_Miles?action=render
//
// Nook Miles (achievements) are nested tables where each tier <td> contains "... miles" + a tiny miles badge.
// Nook Miles+ (daily) are sectioned by <h3> (Fishing, Bug catching, etc.) and each section has a table:
// columns: Icon | Name | Amount | Miles Earned
//
// So we:
// - slice into H2 buckets (Nook_Miles / Nook_Miles+)
// - extract nested-safe styled color-* tables
// - for Nook Miles: parse tiers + tier-name pills row
// - for Nook Miles+: map each table to nearest preceding <h3> headline, parse tasks from rows

export type NookMilesBucket = "nookMiles" | "nookMilesPlus";

export type NookMilesTier = {
  task: string;
  miles: number;
  tierNames?: string[]; // e.g. ["Self-Paced", "Chill Soul"]
};

export type NookMilesAchievement = {
  id: string;
  bucket: "nookMiles";
  title: string;
  description?: string | null;
  iconUrl?: string | null;
  tiers: NookMilesTier[];
};

export type NookMilesPlusTask = {
  title: string;
  miles: number;
};

export type NookMilesPlusCategory = {
  id: string;
  bucket: "nookMilesPlus";
  title: string;
  iconUrl?: string | null;
  tasks: NookMilesPlusTask[];
};

export type NookMilesData = {
  achievements: NookMilesAchievement[];
  plusCategories: NookMilesPlusCategory[];
  _raw?: {
    fetchedAtIso: string;
    sourceUrl: string;
  };
};

const NOOK_MILES_URL = "https://nookipedia.com/wiki/Nook_Miles?action=render";
const BASE_URL = "https://nookipedia.com";

// -----------------------------
// tiny utils
// -----------------------------

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function absUrlMaybe(u: string) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${BASE_URL}${s}`;
  return s;
}

function firstMatch(hay: string, re: RegExp): string | null {
  const m = String(hay ?? "").match(re);
  return m && m[1] != null ? String(m[1]) : null;
}

function pickBestFromSrcset(srcset: string): string {
  const parts = String(srcset ?? "")
    .split(",")
    .map((p) => p.trim())
    .map((p) => p.split(/\s+/)[0])
    .filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function bestImgUrlFromTag(imgTag: string): string {
  const srcset = firstMatch(imgTag, /(?:srcset|data-srcset)="([^"]+)"/i);
  if (srcset) return absUrlMaybe(pickBestFromSrcset(srcset));
  const src = firstMatch(imgTag, /(?:src|data-src)="([^"]+)"/i);
  return src ? absUrlMaybe(src) : "";
}

function decodeEntities(s: string) {
  // Includes numeric entities like &#32; and &#160; (your trailing junk)
  return String(s ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&#32;/gi, " ")
    .replace(/&#x0*20;/gi, " ")
    .replace(/&#x0*a0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, num) => {
      const n = Number(num);
      if (!Number.isFinite(n)) return "";
      try {
        return String.fromCharCode(n);
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = parseInt(String(hex), 16);
      if (!Number.isFinite(n)) return "";
      try {
        return String.fromCharCode(n);
      } catch {
        return "";
      }
    });
}

function stripTagsPreserveLines(html: string) {
  const withBreaks = String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n");

  const noTags = withBreaks.replace(/<[^>]*>/g, "");
  return decodeEntities(noTags)
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function slugify(s: string) {
  const t = String(s ?? "").trim();
  if (!t) return "unknown";
  return t
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// -----------------------------
// headline slicing (H2 buckets)
// -----------------------------

type Headline = { id: string; title: string; idx: number };

function parseHeadlines(html: string): Headline[] {
  const src = String(html ?? "");
  const re = /<span[^>]*class="mw-headline"[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi;
  const out: Headline[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const id = String(m[1] ?? "").trim();
    const title = stripTagsPreserveLines(String(m[2] ?? "")).trim();
    const idx = m.index ?? -1;
    if (idx >= 0 && id && title) out.push({ id, title, idx });
  }
  return out;
}

function isH2At(html: string, idx: number) {
  const w = String(html ?? "").slice(Math.max(0, idx - 220), idx + 140);
  return /<h2[^>]*>[\s\S]*class="mw-headline"/i.test(w);
}

function sliceBucket(html: string, startIdx: number, endIdx: number) {
  const src = String(html ?? "");
  const s = Math.max(0, startIdx);
  const e = Math.max(s, endIdx);
  return src.slice(s, e);
}

// -----------------------------
// nested-safe extractors
// -----------------------------

function startsWithTagAt(src: string, idx: number, tagName: string) {
  const t = tagName.toLowerCase();
  if (src[idx] !== "<") return false;
  const maybe = src.slice(idx + 1, idx + 1 + t.length).toLowerCase();
  if (maybe !== t) return false;
  const after = src[idx + 1 + t.length] ?? "";
  return after === ">" || /\s|\/|\n|\r|\t/.test(after);
}

function startsWithCloseTagAt(src: string, idx: number, tagName: string) {
  const t = tagName.toLowerCase();
  if (src[idx] !== "<" || src[idx + 1] !== "/") return false;
  const maybe = src.slice(idx + 2, idx + 2 + t.length).toLowerCase();
  if (maybe !== t) return false;
  const after = src[idx + 2 + t.length] ?? "";
  return after === ">" || /\s|\/|\n|\r|\t/.test(after);
}

function extractBalancedBlocks(
  html: string,
  tagName: string,
  startPredicate: (openTagText: string) => boolean
): Array<{ start: number; end: number; html: string; openTag: string }> {
  const src = String(html ?? "");
  const out: Array<{ start: number; end: number; html: string; openTag: string }> = [];

  let i = 0;
  while (i < src.length) {
    const openIdx = src.indexOf("<" + tagName, i);
    if (openIdx < 0) break;

    const openEnd = src.indexOf(">", openIdx);
    if (openEnd < 0) break;

    const openTag = src.slice(openIdx, openEnd + 1);
    if (!startPredicate(openTag)) {
      i = openEnd + 1;
      continue;
    }

    let depth = 0;
    let j = openIdx;

    while (j < src.length) {
      if (startsWithTagAt(src, j, tagName)) {
        depth++;
        const tEnd = src.indexOf(">", j);
        if (tEnd < 0) break;
        j = tEnd + 1;
        continue;
      }

      if (startsWithCloseTagAt(src, j, tagName)) {
        depth--;
        const tEnd = src.indexOf(">", j);
        if (tEnd < 0) break;
        j = tEnd + 1;
        if (depth === 0) {
          const block = src.slice(openIdx, j);
          out.push({ start: openIdx, end: j, html: block, openTag });
          i = j;
          break;
        }
        continue;
      }

      j++;
    }

    if (depth !== 0) break;
  }

  return out;
}

function extractStyledTables(bucketHtml: string) {
  return extractBalancedBlocks(bucketHtml, "table", (openTag) => {
    const cls = firstMatch(openTag, /class="([^"]+)"/i) ?? "";
    const c = " " + cls.toLowerCase() + " ";

    const isStyled = c.includes(" styled ");
    const hasColor = /\bcolor-[a-z0-9_-]+\b/i.test(cls);

    return isStyled && hasColor;
  });
}

// -----------------------------
// common table helpers
// -----------------------------

function pickRepresentativeIconUrl(tableHtml: string): string | null {
  const imgs = String(tableHtml ?? "").match(/<img[^>]*>/gi) ?? [];
  if (!imgs.length) return null;

  // For achievements: avoid Icon_Cropped badge
  // For plus: these are actual icons, so first img is fine
  const preferred =
    imgs.find((tag) => /Nook\s*Miles\s*Icon/i.test(tag) && !/Icon_Cropped/i.test(tag)) ??
    imgs.find((tag) => /_NH_Nook_Miles_Icon/i.test(tag) && !/Icon_Cropped/i.test(tag)) ??
    imgs.find((tag) => !/Icon_Cropped/i.test(tag)) ??
    imgs[0] ??
    "";

  const url = bestImgUrlFromTag(preferred);
  return url || null;
}

function splitTrBlocks(tableHtml: string): string[] {
  return String(tableHtml ?? "").match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
}

function extractTdsFromTr(trHtml: string): string[] {
  return trHtml.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? [];
}

function maxNumberInText(s: string): number | null {
  const nums = String(s ?? "").match(/\d[\d,]*/g) ?? [];
  if (!nums.length) return null;
  let best: number | null = null;
  for (const raw of nums) {
    const v = Number(String(raw).replace(/,/g, ""));
    if (!Number.isFinite(v)) continue;
    best = best == null ? v : Math.max(best, v);
  }
  return best;
}

// -----------------------------
// Nook Miles (achievements) parsing
// -----------------------------

function tableHeaderTitle(tableHtml: string): string {
  const th = firstMatch(String(tableHtml ?? ""), /<th[^>]*>([\s\S]*?)<\/th>/i);
  const t = th ? stripTagsPreserveLines(th) : "";
  return t ? t.replace(/\s+/g, " ").trim() : "Nook Miles";
}

function tableDescription(tableHtml: string): string | null {
  const firstTr = firstMatch(String(tableHtml ?? ""), /<tr[^>]*>([\s\S]*?)<\/tr>/i);
  if (!firstTr) return null;

  const tds = (firstTr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? []).map(String);
  if (!tds.length) return null;

  let best: string | null = null;
  let bestLen = 0;

  for (const td of tds) {
    const txt = stripTagsPreserveLines(td).replace(/\s+/g, " ").trim();
    const s = norm(txt);
    if (!txt) continue;
    if (s === "miles" || s === "task" || s === "tier") continue;
    if (txt.length > bestLen) {
      best = txt;
      bestLen = txt.length;
    }
  }

  return best && bestLen >= 20 ? best : null;
}

function parseMilesFromCellText(cellText: string): { task: string; miles: number } | null {
  const raw = String(cellText ?? "").trim();
  if (!raw) return null;

  const m = raw.match(/(\d[\d,]*)\s*miles\b/i);
  if (!m) return null;

  const miles = Number(String(m[1]).replace(/,/g, ""));
  if (!Number.isFinite(miles)) return null;

  const before = raw.slice(0, m.index ?? 0).trim();
  const task = before.replace(/\s+/g, " ").trim();
  if (!task) return null;

  return { task, miles };
}

function isTierRow(trHtml: string) {
  const s = norm(trHtml);
  // achievements have the tiny badge "Nook_Miles_NH_Icon_Cropped.png"
  return s.includes("miles") && s.includes("icon_cropped");
}

function isTierNameRow(trHtml: string) {
  const s = norm(trHtml);
  return s.includes("background-color: lightgray") || s.includes("lightgray");
}

function parseTierNamesFromRow(trHtml: string): Array<string[] | null> {
  const tds = extractTdsFromTr(trHtml);
  const out: Array<string[] | null> = [];

  for (const td of tds) {
    const txt = stripTagsPreserveLines(td);
    const parts = txt
      .split("\n")
      .map((x) => x.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    out.push(parts.length ? parts : null);
  }

  return out;
}

function parseTiersFromTable(tableHtml: string): NookMilesTier[] {
  const trs = splitTrBlocks(tableHtml);

  const tierRowIdx = trs.findIndex((tr) => isTierRow(tr));
  if (tierRowIdx < 0) return [];

  const tierTr = trs[tierRowIdx];
  const tierTds = extractTdsFromTr(tierTr);

  // tier-name row is usually right after tier row
  let tierNamesByCol: Array<string[] | null> = [];
  for (let j = tierRowIdx + 1; j < Math.min(trs.length, tierRowIdx + 4); j++) {
    const tr = trs[j];
    if (isTierNameRow(tr) && !isTierRow(tr)) {
      tierNamesByCol = parseTierNamesFromRow(tr);
      break;
    }
  }

  const tiers: NookMilesTier[] = [];

  for (let col = 0; col < tierTds.length; col++) {
    const td = tierTds[col];
    const text = stripTagsPreserveLines(td);

    const s = norm(text);
    if (!s) continue;
    if (s.includes("name in other languages")) continue;
    if (s === "expand") continue;

    const parsed = parseMilesFromCellText(text);
    if (!parsed) continue;

    const tierNames = tierNamesByCol[col] ?? null;

    tiers.push({
      task: parsed.task,
      miles: parsed.miles,
      tierNames: tierNames && tierNames.length ? tierNames : undefined,
    });
  }

  const seen = new Set<string>();
  return tiers.filter((t) => {
    const k = `${norm(t.task)}::${t.miles}::${(t.tierNames ?? []).map(norm).join("|")}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseNookMilesAchievements(bucketHtml: string): NookMilesAchievement[] {
  const tables = extractStyledTables(bucketHtml);
  const out: NookMilesAchievement[] = [];

  for (let i = 0; i < tables.length; i++) {
    const tbl = tables[i].html;

    const title = tableHeaderTitle(tbl);
    const description = tableDescription(tbl);
    const iconUrl = pickRepresentativeIconUrl(tbl);
    const tiers = parseTiersFromTable(tbl);

    if (!tiers.length) continue;

    out.push({
      id: `nookmiles-${slugify(title)}-${i}`,
      bucket: "nookMiles",
      title,
      description: description ?? null,
      iconUrl: iconUrl ?? null,
      tiers,
    });
  }

  return out;
}

// -----------------------------
// Nook Miles+ parsing (H3 + table)
// -----------------------------

type SubHeadline = { id: string; title: string; idx: number };

function parseH3Headlines(html: string): SubHeadline[] {
  const src = String(html ?? "");
  const re = /<h3[^>]*>[\s\S]*?<span[^>]*class="mw-headline"[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h3>/gi;
  const out: SubHeadline[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const id = String(m[1] ?? "").trim();
    const title = stripTagsPreserveLines(String(m[2] ?? "")).trim();
    const idx = m.index ?? -1;
    if (idx >= 0 && title) out.push({ id, title, idx });
  }
  return out.sort((a, b) => a.idx - b.idx);
}

function nearestH3TitleBefore(h3s: SubHeadline[], tableStartIdx: number): string | null {
  let best: SubHeadline | null = null;
  for (const h of h3s) {
    if (h.idx < tableStartIdx) best = h;
    else break;
  }
  return best?.title ?? null;
}

function parsePlusTasksFromPlusTable(tableHtml: string): NookMilesPlusTask[] {
  const trs = splitTrBlocks(tableHtml);
  const out: NookMilesPlusTask[] = [];

  for (const tr of trs) {
    // Skip header rows (they contain <th>)
    if (/<th\b/i.test(tr)) continue;

    const tds = extractTdsFromTr(tr);
    if (tds.length < 3) continue;

    // Expected: [icon td, name td, amount td, miles td]
    const titleRaw = stripTagsPreserveLines(tds[1] ?? "");
    const title = titleRaw.replace(/\s+/g, " ").trim();
    if (!title) continue;

    const milesCell = stripTagsPreserveLines(tds[tds.length - 1] ?? "");
    const miles = maxNumberInText(milesCell);

    if (miles == null) continue;

    out.push({ title, miles });
  }

  // de-dupe by title+miles
  const seen = new Set<string>();
  return out.filter((t) => {
    const k = `${norm(t.title)}::${t.miles}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseNookMilesPlusCategories(plusHtml: string): NookMilesPlusCategory[] {
  const tables = extractStyledTables(plusHtml); // returns with start/end
  const h3s = parseH3Headlines(plusHtml);

  const out: NookMilesPlusCategory[] = [];

  for (let i = 0; i < tables.length; i++) {
    const tbl = tables[i];
    const titleFromH3 = nearestH3TitleBefore(h3s, tbl.start) ?? "Nook Miles+";

    const iconUrl = pickRepresentativeIconUrl(tbl.html);
    const tasks = parsePlusTasksFromPlusTable(tbl.html);

    if (!tasks.length) continue;

    out.push({
      id: `nookmilesplus-${slugify(titleFromH3)}-${i}`,
      bucket: "nookMilesPlus",
      title: titleFromH3,
      iconUrl: iconUrl ?? null,
      tasks,
    });
  }

  return out;
}

// -----------------------------
// public fetch
// -----------------------------

export async function fetchNookMilesData(): Promise<NookMilesData> {
  const base: NookMilesData = {
    achievements: [],
    plusCategories: [],
    _raw: { fetchedAtIso: new Date().toISOString(), sourceUrl: NOOK_MILES_URL },
  };

  try {
    const res = await fetch(NOOK_MILES_URL);
    if (!res.ok) return base;

    const html = await res.text();

    const heads = parseHeadlines(html);
    const h2s = heads.filter((h) => isH2At(html, h.idx)).sort((a, b) => a.idx - b.idx);

    const h2Miles = h2s.find((h) => h.id === "Nook_Miles" || norm(h.title) === "nook miles") ?? null;
    const h2Plus =
      h2s.find((h) => h.id === "Nook_Miles.2B" || norm(h.title) === "nook miles+") ??
      h2s.find((h) => norm(h.title).includes("nook miles+")) ??
      null;

    // stop Plus section at Gallery if present
    const h2Gallery =
      h2s.find((h) => h.id === "Gallery" || norm(h.title) === "gallery") ??
      h2s.find((h) => norm(h.title).includes("gallery")) ??
      null;

    if (!h2Miles) return base;

    const milesHtml = sliceBucket(html, h2Miles.idx, h2Plus ? h2Plus.idx : html.length);

    let plusHtml = "";
    if (h2Plus) {
      const plusEnd = h2Gallery ? h2Gallery.idx : html.length;
      plusHtml = sliceBucket(html, h2Plus.idx, plusEnd);
    }

    const achievements = parseNookMilesAchievements(milesHtml);
    const plusCategories = plusHtml ? parseNookMilesPlusCategories(plusHtml) : [];

    return {
      achievements,
      plusCategories,
      _raw: { fetchedAtIso: new Date().toISOString(), sourceUrl: NOOK_MILES_URL },
    };
  } catch {
    return base;
  }
}
