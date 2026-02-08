// lib/animalCrossing/nookMysteryTour.ts

export type MysteryTourIntroSection = {
  title: string;
  paragraphs: string[];
};

export type MysteryTourIndex = {
  intro: MysteryTourIntroSection[];
  islands: MysteryTourIslandType[];
};

export type MysteryTourIslandCategory = "current" | "previous";

export type MysteryTourGalleryImage = {
  id: string;
  title?: string;
  imageUrl: string;
};

export type MysteryTourTableRow = {
  label: string;
  iconKey?: string;
  items: string[];
  note?: string | null;
};

export type MysteryTourIslandType = {
  id: string;
  category: MysteryTourIslandCategory;
  name: string;
  chancePct: number;
  internalId: string;
  requirements: string[];
  requirementsIconUrl?: string | null;
  tables: MysteryTourTableRow[];
  notes: string[];
  screenshots: MysteryTourGalleryImage[];
  _raw?: {
    wikiKey?: string;
    wikiSectionTitle?: string;
    wikiCategoryHeader?: string;
    wikiHtmlSnippet?: string;
  };
};

const MYSTERY_TOUR_WIKI_URL = "https://nookipedia.com/wiki/Mystery_Tour?action=render";
const BASE_URL = "https://nookipedia.com";

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

function stripTags(html: string) {
  const withBreaks = String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n");

  const noTags = withBreaks.replace(/<[^>]*>/g, "");
  return noTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function firstMatch(hay: string, re: RegExp): string | null {
  const m = String(hay ?? "").match(re);
  return m && m[1] != null ? String(m[1]) : null;
}

function findAll(hay: string, re: RegExp): RegExpMatchArray[] {
  const out: RegExpMatchArray[] = [];
  const src = String(hay ?? "");
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = r.exec(src))) out.push(m as any);
  return out;
}

function splitLines(value: string): string[] {
  return String(value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
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

function pickBestFromSrcset(srcset: string): string {
  const parts = String(srcset ?? "")
    .split(",")
    .map((p) => p.trim())
    .map((p) => p.split(/\s+/)[0])
    .filter(Boolean);

  const best = parts[parts.length - 1] ?? "";
  return best;
}

function bestImgUrlFromTag(imgTag: string): string {
  const srcset = firstMatch(imgTag, /(?:srcset|data-srcset)="([^"]+)"/i);
  if (srcset) return absUrlMaybe(pickBestFromSrcset(srcset));
  const src = firstMatch(imgTag, /(?:src|data-src)="([^"]+)"/i);
  return src ? absUrlMaybe(src) : "";
}

function parseIntroSections(fullHtml: string): MysteryTourIntroSection[] {
  const html = String(fullHtml ?? "");
  if (!html) return [];

  const heads = findAll(
    html,
    /<(h2|h3)\b[^>]*>[\s\S]*?<span[^>]*\bclass="mw-headline"[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/\1>/gi
  )
    .map((m) => ({
      tag: String(m[1] ?? "").toLowerCase(),
      id: String(m[2] ?? "").trim(),
      title: stripTags(String(m[3] ?? "")).replace(/\s+/g, " ").trim(),
      idx: m.index ?? -1,
    }))
    .filter((h) => h.idx >= 0 && h.id);

  if (!heads.length) return [];

  const out: MysteryTourIntroSection[] = [];

  const startPos = heads.findIndex((h) => norm(h.id) === "characteristics");
  if (startPos < 0) return [];

  const charHead = heads[startPos];
  const overviewChunk = html.slice(0, charHead.idx);

  const overviewParas = findAll(overviewChunk, /<p\b[^>]*>([\s\S]*?)<\/p>/gi)
    .map((mm) => stripTags(String(mm[1] ?? "")).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (overviewParas.length) {
    out.push({ title: "Overview", paragraphs: overviewParas });
  }

  const endPos = heads.findIndex((h) => norm(h.id) === "types_of_mystery_islands");
  const stopAt = endPos >= 0 ? endPos : heads.length;

  const windowHeads = heads.slice(startPos, stopAt);
  if (!windowHeads.length) return out;

  for (let i = 0; i < windowHeads.length; i++) {
    const a = windowHeads[i];
    const b = windowHeads[i + 1];

    const start = a.idx;
    const end = b ? b.idx : endPos >= 0 ? heads[endPos].idx : html.length;

    if (start < 0 || end <= start) continue;

    const sub = html.slice(start, end);

    const paragraphs = findAll(sub, /<p\b[^>]*>([\s\S]*?)<\/p>/gi)
      .map((mm) => stripTags(String(mm[1] ?? "")).replace(/\s+/g, " ").trim())
      .filter(Boolean);

    if (!paragraphs.length) continue;

    out.push({
      title: a.title || a.id,
      paragraphs,
    });
  }

  return out;
}

function parseChancePct(sectionHtml: string): number | null {
  const raw = firstMatch(sectionHtml, /Chance:\s*([0-9]+(?:\.[0-9]+)?)%/i);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseInternalId(sectionHtml: string): string | null {
  const code = firstMatch(sectionHtml, /Internal\s*name[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>/i);
  const v = code ? stripTags(code).trim() : "";
  if (v) return v;

  const bt = firstMatch(sectionHtml, /Internal\s*name[\s\S]*?`([^`]+)`/i);
  const v2 = bt ? stripTags(bt).trim() : "";
  return v2 || null;
}

function parseRequirementsBlock(sectionHtml: string): { items: string[]; iconUrl: string | null } {
  const ps = findAll(sectionHtml, /<p[^>]*>[\s\S]*?<\/p>/gi).map((m) => String(m[0] ?? ""));
  const p = ps.find((x) => /<b[^>]*>\s*Requirements\s*<\/b>/i.test(x));
  if (!p) return { items: [], iconUrl: null };

  const bIdx = p.search(/<b[^>]*>\s*Requirements\s*<\/b>/i);

  let iconUrl: string | null = null;
  if (bIdx >= 0) {
    const before = p.slice(0, bIdx);
    const imgs = findAll(before, /<img[^>]*>/gi).map((m) => String(m[0] ?? ""));
    if (imgs.length) {
      const url = bestImgUrlFromTag(imgs[imgs.length - 1]);
      if (url) iconUrl = url;
    }
  }

  const after = bIdx >= 0 ? p.slice(bIdx) : p;
  const afterB = firstMatch(after, /<\/b>\s*<br\s*\/?>\s*([\s\S]*?)<\/p>/i) ?? "";
  const txt = stripTags(afterB);
  const lines = splitLines(txt).filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const k = norm(l);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }

  return { items: out, iconUrl };
}

function parseTopScreenshots(sectionHtml: string, wikiKey: string): MysteryTourGalleryImage[] {
  const out: MysteryTourGalleryImage[] = [];
  const html = String(sectionHtml ?? "");
  const cutIdx = html.search(/Chance:\s*[0-9]/i);
  const head = cutIdx >= 0 ? html.slice(0, cutIdx) : html.slice(0, 8000);

  const imgs = findAll(head, /<img[^>]*>/gi).map((m) => String(m[0] ?? ""));
  const urls: { url: string; alt: string }[] = [];

  for (const tag of imgs) {
    const url = bestImgUrlFromTag(tag);
    if (!url) continue;

    const alt = firstMatch(tag, /alt="([^"]*)"/i) ?? "";

    const looksLikeIsland =
      /\.jpe?g(\?|#|$)/i.test(url) ||
      /mystery[^a-z0-9]*island/i.test(alt) ||
      /mystery[^a-z0-9]*island/i.test(url);

    if (!looksLikeIsland) continue;

    urls.push({ url, alt });
  }

  const seen = new Set<string>();
  let idx = 0;
  for (const it of urls) {
    const k = it.url.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);

    const title = it.alt ? it.alt.replace(/\s+/g, " ").trim() : undefined;
    out.push({
      id: `${wikiKey}-shot-${idx++}`,
      title: title || undefined,
      imageUrl: k,
    });
  }

  return out;
}

function parseLabelValueAndIconFromParagraphs(sectionHtml: string, label: string): { value: string; iconUrl: string | null } {
  const ps = findAll(sectionHtml, /<p[^>]*>[\s\S]*?<\/p>/gi).map((m) => String(m[0] ?? ""));
  const labelRe = new RegExp(`<b[^>]*>\\s*${label}\\s*:?[\\s]*<\\/b>`, "i");

  for (const p of ps) {
    const m = labelRe.exec(p);
    if (!m || m.index == null) continue;

    const bIdx = m.index;

    let iconUrl: string | null = null;
    const before = p.slice(0, bIdx);
    const imgs = findAll(before, /<img[^>]*>/gi).map((x) => String(x[0] ?? ""));
    if (imgs.length) {
      const url = bestImgUrlFromTag(imgs[imgs.length - 1]);
      if (url) iconUrl = url;
    }

    const after = p.slice(bIdx);
    const rawVal =
      firstMatch(
        after,
        new RegExp(
          `<b[^>]*>\\s*${label}\\s*:?[\\s]*<\\/b>\\s*:?[\\s]*([\\s\\S]*?)(?:<br\\s*\\/?>|<\\/p>)`,
          "i"
        )
      ) ?? "";

    const value = stripTags(rawVal).replace(/\s+/g, " ").trim();
    if (!value) continue;

    return { value, iconUrl };
  }

  return { value: "", iconUrl: null };
}

function parseCharacteristicRows(sectionHtml: string): MysteryTourTableRow[] {
  const labels = ["Trees", "Flowers", "Bugs", "Fish", "Rocks", "Limit"];
  const out: MysteryTourTableRow[] = [];

  for (const label of labels) {
    const { value, iconUrl } = parseLabelValueAndIconFromParagraphs(sectionHtml, label);
    if (!value) continue;

    out.push({
      label,
      iconKey: iconUrl || undefined,
      items: [value],
      note: null,
    });
  }

  return out;
}

function parseNotes(sectionHtml: string): string[] {
  const html = String(sectionHtml ?? "");

  let body = html;
  const limitIdx = body.search(/Limit\s*:/i);
  if (limitIdx >= 0) {
    body = body.slice(limitIdx);
    const afterLimitP = body.search(/<\/p>/i);
    if (afterLimitP >= 0) body = body.slice(afterLimitP + 4);
  }

  const blocks = findAll(body, /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)
    .map((m) => stripTags(String(m[2] ?? "")))
    .filter(Boolean);

  const out: string[] = [];

  function pushLine(raw: string) {
    const t = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!t) return;

    const isMainSection = /^The following .+?:$/i.test(t);
    const isSizeSection = /^(Large|Very Large|Extra Large)$/i.test(t);

    const finalLine = isMainSection || isSizeSection ? `${t}` : t;

    const prev = out.length ? out[out.length - 1] : "";
    if (norm(prev) === norm(finalLine)) return;

    out.push(finalLine);
  }

  for (const block of blocks) {
    const lines = splitLines(block);
    for (const line of lines) pushLine(line);
  }

  return out;
}

type WikiSubSection = {
  key: string;
  title: string;
  html: string;
  categoryHeader: string;
};

function parseMysteryTourSubSections(fullHtml: string): WikiSubSection[] {
  const html = String(fullHtml ?? "");

  const spans = findAll(html, /<span[^>]*class="mw-headline"[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi)
    .map((m) => ({
      id: String(m[1] ?? "").trim(),
      title: stripTags(String(m[2] ?? "")),
      idx: m.index ?? -1,
    }))
    .filter((x) => x.idx >= 0 && x.id && x.title);

  function isH2At(idx: number) {
    const w = html.slice(Math.max(0, idx - 140), idx + 140);
    return /<h2[^>]*>[\s\S]*class="mw-headline"/i.test(w);
  }

  function isH3At(idx: number, bucketHtml: string) {
    const w = bucketHtml.slice(Math.max(0, idx - 140), idx + 140);
    return /<h3[^>]*>[\s\S]*class="mw-headline"/i.test(w);
  }

  const h2s = spans.filter((s) => isH2At(s.idx)).sort((a, b) => a.idx - b.idx);

  const bucketA = h2s.find((x) => norm(x.title) === "types of mystery islands");
  const bucketB = h2s.find((x) => norm(x.title) === "previously available mystery islands");

  if (!bucketA) return [];

  const bucketAEnd = bucketB ? bucketB.idx : html.length;
  const bucketAHtml = html.slice(bucketA.idx, bucketAEnd);

  let bucketBHtml = "";
  if (bucketB) {
    const bPos = h2s.findIndex((x) => x.idx === bucketB.idx);
    const nextH2 = bPos >= 0 ? h2s[bPos + 1] : undefined;
    const bucketBEnd = nextH2 ? nextH2.idx : html.length;
    bucketBHtml = html.slice(bucketB.idx, bucketBEnd);
  }

  function parseH3Subsections(bucketHtml: string, bucketTitle: string): WikiSubSection[] {
    const subs: WikiSubSection[] = [];

    const bucketSpans = findAll(bucketHtml, /<span[^>]*class="mw-headline"[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi)
      .map((m) => ({
        key: String(m[1] ?? "").trim(),
        title: stripTags(String(m[2] ?? "")),
        idx: m.index ?? -1,
      }))
      .filter((h) => h.idx >= 0 && h.key && h.title);

    const h3Spans = bucketSpans
      .filter((h) => isH3At(h.idx, bucketHtml))
      .sort((a, b) => a.idx - b.idx);

    for (let i = 0; i < h3Spans.length; i++) {
      const a = h3Spans[i];
      const b = h3Spans[i + 1];

      const start = a.idx;
      const end = b?.idx ?? bucketHtml.length;

      subs.push({
        key: a.key,
        title: a.title,
        html: bucketHtml.slice(start, end),
        categoryHeader: bucketTitle,
      });
    }

    return subs;
  }

  const aSubs = parseH3Subsections(bucketAHtml, bucketA.title);
  const bSubs = bucketB ? parseH3Subsections(bucketBHtml, bucketB.title) : [];

  return [...aSubs, ...bSubs];
}

function wikiToApp(sub: WikiSubSection): MysteryTourIslandType {
  const category: MysteryTourIslandCategory =
    norm(sub.categoryHeader) === "previously available mystery islands" ? "previous" : "current";

  const chancePct = Number(parseChancePct(sub.html) ?? 0);
  const internalId = parseInternalId(sub.html) ?? "—";

  const req = parseRequirementsBlock(sub.html);
  const tables = parseCharacteristicRows(sub.html);
  const notes = parseNotes(sub.html);
  const screenshots = parseTopScreenshots(sub.html, sub.key);

  const id = `${category}-${slugify(sub.title)}-${slugify(sub.key || sub.title)}`;

  return {
    id,
    category,
    name: sub.title || "Mystery Island",
    chancePct: Number.isFinite(chancePct) ? chancePct : 0,
    internalId: internalId && internalId.trim() ? internalId : "—",
    requirements: req.items,
    requirementsIconUrl: req.iconUrl,
    tables,
    notes,
    screenshots,
    _raw: {
      wikiKey: sub.key,
      wikiSectionTitle: sub.title,
      wikiCategoryHeader: sub.categoryHeader,
      wikiHtmlSnippet: sub.html.slice(0, 2000),
    },
  };
}

export async function fetchMysteryTourIndex(): Promise<MysteryTourIndex> {
  try {
    const res = await fetch(MYSTERY_TOUR_WIKI_URL);
    if (!res.ok) throw new Error(`Mystery Tour wiki fetch failed (${res.status})`);
    const html = await res.text();

    const intro = parseIntroSections(html);

    const subs = parseMysteryTourSubSections(html);
    const islands = subs.map(wikiToApp);

    islands.sort((a, b) => {
      if (a.category !== b.category) return a.category === "current" ? -1 : 1;
      const ca = Number(a.chancePct ?? 0);
      const cb = Number(b.chancePct ?? 0);
      if (cb !== ca) return cb - ca;
      return a.name.localeCompare(b.name);
    });

    return { intro, islands };
  } catch {
    return { intro: [], islands: [] };
  }
}

export async function fetchMysteryTourIslandTypes(): Promise<MysteryTourIslandType[]> {
  const idx = await fetchMysteryTourIndex();
  return idx.islands;
}
