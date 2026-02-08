// lib/animalCrossing/nookBoatTour.ts
export type BoatTourIntroSection = {
  title: string; // "Overview", "Probability", "Common factors", etc.
  paragraphs: string[];
};

export type BoatTourIndex = {
  intro: BoatTourIntroSection[];
  islands: BoatTourIslandType[];
};

export type BoatTourHemisphere = "north" | "south";

export type BoatTourDateRule =
  | { kind: "gameTime" }
  | {
      kind: "fixedDate";
      north: string;
      south: string;
      timeOfDay?: string;
    };

export type BoatTourIslandCategory = "normal" | "rare";

export type BoatTourIslandTypeId =
  | "normal"
  | "gyroid"
  | "produce"
  | "vinesMoss"
  | "starFragment"
  | "cherryBlossom"
  | "springBamboo"
  | "summerShell"
  | "mushroom"
  | "mapleLeaf"
  | "snowflake"
  | "unknown";

export type BoatTourGalleryImage = {
  id: string;
  title?: string;
  imageUrl: string;
};

export type BoatTourTableRow = {
  label: string;
  iconKey?: string;
  items: string[];
  note?: string | null;
};

export type BoatTourSpecialRow = {
  name: string;
  probability: string;
  iconUrl?: string | null;
};

export type BoatTourSpecialTable = {
  label: string;
  rows: BoatTourSpecialRow[];
};

export type BoatTourIslandType = {
  id: BoatTourIslandTypeId;
  category: BoatTourIslandCategory;

  name: string;
  subtitle: string;
  emoji?: string;

  chancePct: number;
  internalId: string;

  dateRule: BoatTourDateRule;
  weatherPatterns: string[];

  tables: BoatTourTableRow[];
  specialTables: BoatTourSpecialTable[];

  notes: string[];

  maps: BoatTourGalleryImage[];
  screenshots: BoatTourGalleryImage[];

  _raw?: {
    wikiKey?: string;
    wikiCells?: { label: string; value: string; iconUrl?: string | null }[];
    wikiGalleries?: { caption: string; images: string[] }[];
    wikiDescription?: string[];
    wikiSpecialTables?: { label: string; rows: { name: string; probability: string; iconUrl?: string | null }[] }[];
  };
};

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

export function containsFold(hay: any, needle: any) {
  const h = norm(hay);
  const n = norm(needle);
  if (!n) return true;
  return h.includes(n);
}

export function islandTypeMatchesSearch(type: BoatTourIslandType, search: string) {
  const q = norm(search);
  if (!q) return true;

  const blobs: string[] = [
    type.id,
    type.category,
    type.name,
    type.subtitle,
    type.emoji ?? "",
    type.internalId,
    String(type.chancePct),
    ...(type.weatherPatterns ?? []),
    ...(type.notes ?? []),
    ...((type.tables ?? []).flatMap((t) => [t.label, ...(t.items ?? []), t.note ?? ""])),
    ...((type.specialTables ?? []).flatMap((t) =>
      (t.rows ?? []).flatMap((r) => [t.label, r.name, r.probability, r.iconUrl ?? ""])
    )),
    ...((type.maps ?? []).flatMap((x) => [x.title ?? "", x.imageUrl])),
    ...((type.screenshots ?? []).flatMap((x) => [x.title ?? "", x.imageUrl])),
  ];

  return blobs.some((b) => containsFold(b, q));
}

type WikiGallery = { caption: string; images: string[] };
type WikiCell = { label: string; value: string; iconUrl?: string | null };
type WikiSpecialRow = { name: string; probability: string; iconUrl?: string | null };
type WikiSpecialTable = { label: string; rows: WikiSpecialRow[] };

type WikiSection = {
  key: string;
  title: string;
  chancePct: number | null;
  internalId: string | null;
  cells: WikiCell[];
  description: string[];
  galleries: WikiGallery[];
  specialTables: WikiSpecialTable[];
};

const BOAT_TOUR_WIKI_URL = "https://nookipedia.com/wiki/Boat_tour?action=render";
const BASE_URL = "https://nookipedia.com";

function absUrlMaybe(u: string) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${BASE_URL}${s}`;
  return s;
}

function stripTags(html: string) {
  const withBreaks = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n");
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
  const m = hay.match(re);
  return m && m[1] != null ? String(m[1]) : null;
}

function findAll(hay: string, re: RegExp): RegExpMatchArray[] {
  const out: RegExpMatchArray[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = r.exec(hay))) out.push(m as any);
  return out;
}

function parseBoatTourIntroSections(fullHtml: string): BoatTourIntroSection[] {
  const html = String(fullHtml ?? "");
  if (!html) return [];

  const typesH2 = html.search(
    /<h2\b[^>]*>[\s\S]*?<span[^>]*\bclass="mw-headline"[^>]*\bid="Types_of_islands"\b/i
  );

  const stopIdx = typesH2 >= 0 ? typesH2 : html.length;
  const top = html.slice(0, stopIdx);

  const out: BoatTourIntroSection[] = [];

  const firstH2 = top.search(/<h2\b/i);
  const leadChunk = firstH2 >= 0 ? top.slice(0, firstH2) : top;

  const leadParas = findAll(leadChunk, /<p\b[^>]*>([\s\S]*?)<\/p>/gi)
    .map((m) => stripTags(String(m[1] ?? "")).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (leadParas.length) {
    out.push({
      title: "Overview",
      paragraphs: leadParas,
    });
  }

  const h2Heads = findAll(
    top,
    /<h2\b[^>]*>[\s\S]*?<span[^>]*\bclass="mw-headline"[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h2>/gi
  )
    .map((m) => ({
      id: String(m[1] ?? "").trim(),
      title: stripTags(String(m[2] ?? "")).replace(/\s+/g, " ").trim(),
      idx: m.index ?? -1,
    }))
    .filter((h) => h.idx >= 0 && h.id);

  if (!h2Heads.length) return out;

  for (let i = 0; i < h2Heads.length; i++) {
    const a = h2Heads[i];
    const b = h2Heads[i + 1];

    if (a.idx >= stopIdx) continue;

    const start = a.idx;
    const end = b ? Math.min(b.idx, stopIdx) : stopIdx;
    if (end <= start) continue;

    const sectionHtml = top.slice(start, end);

    const paragraphs = findAll(sectionHtml, /<p\b[^>]*>([\s\S]*?)<\/p>/gi)
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
  const raw = firstMatch(sectionHtml, /<b>\s*Internal ID\s*<\/b>\s*<br>\s*<code>([^<]+)<\/code>/i);
  if (raw) return stripTags(raw);
  const fallback = firstMatch(sectionHtml, /<code>([^<]+)<\/code>/i);
  return fallback ? stripTags(fallback) : null;
}

function isKnownBoatTourLabel(labelText: string): boolean {
  const l = norm(labelText).replace(/\s+/g, " ").trim();

  if (l === "internal id") return true;
  if (l === "date") return true;
  if (l === "weather pattern" || l === "weather patterns" || l === "weather") return true;

  if (l === "trees" || l === "tree") return true;
  if (l === "bushes" || l === "bush") return true;
  if (l === "rocks" || l === "rock") return true;

  if (l === "buried items" || l === "buried item") return true;
  if (l === "ground materials" || l === "ground material") return true;

  if (l === "diy recipe type" || l === "diy recipe") return true;

  return false;
}

function parseCellsFromGrid(sectionHtml: string): WikiCell[] {
  const out: WikiCell[] = [];
  const html = String(sectionHtml ?? "");

  const openings = findAll(html, /<div[^>]*style="[^"]*display:\s*table-cell[^"]*"[^>]*>/gi);
  const safeLabelRe = /<b[^>]*>((?:(?!<br\b|<img\b|<b\b)[\s\S])*?)<\/b>\s*<br\s*\/?>/gi;

  for (const open of openings) {
    const start = (open.index ?? -1) + (open[0]?.length ?? 0);
    if (start <= 0) continue;

    const tail = html.slice(start, start + 20000);
    const pInner = firstMatch(tail, /<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!pInner) continue;

    const pHtml = String(pInner);

    const labels: { idx: number; end: number; labelHtml: string }[] = [];
    let lm: RegExpExecArray | null;

    while ((lm = safeLabelRe.exec(pHtml))) {
      const labelHtml = String(lm[1] ?? "");
      const labelText = stripTags(labelHtml).replace(/\s+/g, " ").trim();
      if (!labelText) continue;
      if (!isKnownBoatTourLabel(labelText)) continue;

      labels.push({
        idx: lm.index ?? 0,
        end: (lm.index ?? 0) + (lm[0]?.length ?? 0),
        labelHtml,
      });
    }

    if (!labels.length) continue;

    for (let i = 0; i < labels.length; i++) {
      const cur = labels[i];
      const next = labels[i + 1];

      const label = stripTags(cur.labelHtml).replace(/\s+/g, " ").trim();
      if (!label) continue;

      const valueEnd = next ? next.idx : pHtml.length;
      let rawValueHtml = pHtml.slice(cur.end, valueEnd);

      rawValueHtml = rawValueHtml.replace(/(?:<br\s*\/?>\s*)*(?:<img[^>]*>\s*)+$/i, "");
      rawValueHtml = rawValueHtml.replace(/(?:<br\s*\/?>\s*)+$/i, "");

      const value = stripTags(rawValueHtml).trim();
      if (!value) continue;

      const beforeLabel = pHtml.slice(0, cur.idx);
      const imgsBefore = findAll(beforeLabel, /<img[^>]*(?:src|data-src)="([^"]+)"/gi);
      const last = imgsBefore.length ? String(imgsBefore[imgsBefore.length - 1][1] ?? "") : "";
      const iconUrl = last ? absUrlMaybe(last) : null;

      out.push({ label, value, iconUrl });
    }
  }

  const seen = new Set<string>();
  return out.filter((c) => {
    const k = `${c.label}::${c.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseDescriptionParagraphs(sectionHtml: string): string[] {
  const stripped = sectionHtml.replace(
    /<div[^>]*style="[^"]*display:\s*grid[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i,
    ""
  );

  const ps = findAll(stripped, /<p[^>]*>([\s\S]*?)<\/p>/gi)
    .map((m) => stripTags(m[1] ?? ""))
    .filter(Boolean);

  return ps;
}

function pickBestFromSrcset(srcset: string): string {
  const parts = srcset
    .split(",")
    .map((p) => p.trim())
    .map((p) => p.split(/\s+/)[0])
    .filter(Boolean);

  const best = parts[parts.length - 1] ?? "";
  return best;
}

function parseGalleries(sectionHtml: string): WikiGallery[] {
  const out: WikiGallery[] = [];

  const uls = findAll(sectionHtml, /<ul[^>]*class="[^"]*\bgallery\b[^"]*"[^>]*>[\s\S]*?<\/ul>/gi);

  for (const ul of uls) {
    const ulHtml = ul[0] ?? "";

    const caption =
      stripTags(firstMatch(ulHtml, /<li[^>]*class="gallerycaption"[^>]*>([\s\S]*?)<\/li>/i) ?? "") || "Gallery";

    const imgs = findAll(ulHtml, /<img[^>]*>/gi)
      .map((m) => {
        const tag = m[0] ?? "";
        const srcset = firstMatch(tag, /(?:srcset|data-srcset)="([^"]+)"/i) ?? null;
        if (srcset) return absUrlMaybe(pickBestFromSrcset(srcset));
        const src = firstMatch(tag, /(?:src|data-src)="([^"]+)"/i) ?? null;
        return src ? absUrlMaybe(src) : "";
      })
      .filter(Boolean);

    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const u of imgs) {
      if (seen.has(u)) continue;
      seen.add(u);
      uniq.push(u);
    }

    if (uniq.length) out.push({ caption, images: uniq });
  }

  return out;
}

function parseThumbImageBlocks(sectionHtml: string): WikiGallery[] {
  const out: WikiGallery[] = [];

  const thumbs = findAll(
    sectionHtml,
    /<div[^>]*class="thumb tright"[^>]*>[\s\S]*?<div[^>]*class="thumbcaption"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi
  );

  const maps: string[] = [];
  const shots: string[] = [];

  for (const t of thumbs) {
    const block = t[0] ?? "";

    const imgs = findAll(block, /<img[^>]*>/gi).map((m) => String(m[0] ?? ""));
    for (const tag of imgs) {
      const srcset = firstMatch(tag, /(?:srcset|data-srcset)="([^"]+)"/i);
      const src = firstMatch(tag, /(?:src|data-src)="([^"]+)"/i);
      const url = srcset ? absUrlMaybe(pickBestFromSrcset(srcset)) : src ? absUrlMaybe(src) : "";
      if (!url) continue;

      const alt = firstMatch(tag, /alt="([^"]*)"/i) ?? "";
      const key = norm(`${alt} ${url}`);

      const isJpg = /\.jpe?g(\?|#|$)/i.test(url) || /\.jpe?g(\?|#|$)/i.test(alt);
      const isPng = /\.png(\?|#|$)/i.test(url) || /\.png(\?|#|$)/i.test(alt);

      const isMap =
        (isPng && /(^|[\s(_-])map(\b|[)\s_-])/i.test(alt)) ||
        /nh_map/i.test(url) ||
        /_map\./i.test(url) ||
        /Boat_Tour_Island_.*_Map/i.test(url);

      if (isMap) {
        maps.push(url);
      } else if (isJpg) {
        shots.push(url);
      } else {
        if (/map/i.test(key)) maps.push(url);
        else shots.push(url);
      }
    }
  }

  function uniq(list: string[]): string[] {
    const seen = new Set<string>();
    const out2: string[] = [];
    for (const u of list) {
      const k = u.trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out2.push(k);
    }
    return out2;
  }

  const uMaps = uniq(maps);
  const uShots = uniq(shots);

  if (uMaps.length) out.push({ caption: "Maps", images: uMaps });
  if (uShots.length) out.push({ caption: "Screenshots", images: uShots });

  return out;
}

function mergeGalleries(a: WikiGallery[], b: WikiGallery[]): WikiGallery[] {
  const all = [...(a ?? []), ...(b ?? [])];
  const out: WikiGallery[] = [];
  const seen = new Set<string>();

  for (const g of all) {
    const cap = String(g.caption ?? "").trim() || "Gallery";
    const imgs = (g.images ?? []).filter(Boolean);
    const uniqImgs: string[] = [];
    const imgSeen = new Set<string>();
    for (const u of imgs) {
      const key = u.trim();
      if (!key || imgSeen.has(key)) continue;
      imgSeen.add(key);
      uniqImgs.push(key);
    }
    if (!uniqImgs.length) continue;

    const sig = `${norm(cap)}::${uniqImgs.join("|")}`;
    if (seen.has(sig)) continue;
    seen.add(sig);

    out.push({ caption: cap, images: uniqImgs });
  }

  return out;
}

function parseSpecialGameplayTables(sectionHtml: string): WikiSpecialTable[] {
  const out: WikiSpecialTable[] = [];

  const tables = findAll(
    sectionHtml,
    /<table[^>]*class="[^"]*(?:\bstyled\b)[^"]*(?:\bcolor-gameplay\b)[^"]*"[^>]*>[\s\S]*?<\/table>/gi
  );

  for (const t of tables) {
    const tableHtml = String(t[0] ?? "");
    const trs = findAll(tableHtml, /<tr[^>]*>[\s\S]*?<\/tr>/gi).map((m) => String(m[0] ?? ""));

    const rows: WikiSpecialRow[] = [];
    let carryProb: string | null = null;

    for (const tr of trs) {
      if (/<th\b/i.test(tr)) continue;

      const tds = findAll(tr, /<td[^>]*>[\s\S]*?<\/td>/gi).map((m) => String(m[0] ?? ""));
      if (!tds.length) continue;

      const tdItem = tds[0] ?? "";
      const itemName = stripTags(tdItem).replace(/\s+/g, " ").trim();
      if (!itemName) continue;

      const imgSrcset = firstMatch(tdItem, /(?:srcset|data-srcset)="([^"]+)"/i) ?? null;
      const imgTag = firstMatch(tdItem, /<img[^>]*(?:src|data-src)="([^"]+)"/i) ?? null;
      const iconUrl = imgSrcset ? absUrlMaybe(pickBestFromSrcset(imgSrcset)) : imgTag ? absUrlMaybe(imgTag) : null;

      let prob = "";
      if (tds.length >= 2) {
        prob = stripTags(tds[1] ?? "").replace(/\s+/g, " ").trim();
        if (prob) carryProb = prob;
      } else if (carryProb) {
        prob = carryProb;
      }

      if (!prob) continue;

      rows.push({ name: itemName, probability: prob, iconUrl });
    }

    if (rows.length) out.push({ label: "Fragments", rows });
  }

  return out;
}

function parseIslandTypeSections(fullHtml: string): WikiSection[] {
  const html = String(fullHtml ?? "");

  const heads = findAll(html, /<span[^>]*class="mw-headline"[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi)
    .map((m) => ({
      key: String(m[1] ?? "").trim(),
      title: stripTags(String(m[2] ?? "")),
      idx: m.index ?? -1,
    }))
    .filter((h) => h.idx >= 0 && h.key && h.title);

  const out: WikiSection[] = [];

  for (let i = 0; i < heads.length; i++) {
    const a = heads[i];
    const b = heads[i + 1];
    const sectionHtml = html.slice(a.idx, b?.idx ?? html.length);

    if (!/display:\s*grid/i.test(sectionHtml)) continue;

    const ulGalleries = parseGalleries(sectionHtml);
    const thumbGalleries = parseThumbImageBlocks(sectionHtml);
    const galleries = mergeGalleries(ulGalleries, thumbGalleries);

    out.push({
      key: a.key,
      title: a.title,
      chancePct: parseChancePct(sectionHtml),
      internalId: parseInternalId(sectionHtml),
      cells: parseCellsFromGrid(sectionHtml),
      description: parseDescriptionParagraphs(sectionHtml),
      galleries,
      specialTables: parseSpecialGameplayTables(sectionHtml),
    });
  }

  return out;
}

function idFromWikiTitle(title: string, internalId: string | null): BoatTourIslandTypeId {
  const t = norm(title);
  const id = norm(internalId);

  if (t.includes("produce") || id.includes("vegetable")) return "produce";
  if (t.includes("gyroid") || id.includes("haniwa")) return "gyroid";
  if (t.includes("vine") || t.includes("moss") || id.includes("oneroom")) return "vinesMoss";
  if (t.includes("normal")) return "normal";

  if (t.includes("star") || id.includes("starpiece")) return "starFragment";
  if (t.includes("cherry") || id.includes("sakura")) return "cherryBlossom";
  if (t.includes("bamboo") || id.includes("springbamboo")) return "springBamboo";
  if (t.includes("summer shell") || id.includes("seashell")) return "summerShell";
  if (t.includes("mushroom") || id.includes("mushroom")) return "mushroom";
  if (t.includes("maple") || id.includes("maple")) return "mapleLeaf";
  if (t.includes("snow") || t.includes("snowflake") || id.includes("snowcrystal")) return "snowflake";

  return "unknown";
}

function categoryFromWiki(title: string): BoatTourIslandCategory {
  const t = norm(title);
  if (t.includes("rare")) return "rare";
  return "normal";
}

function splitLines(value: string): string[] {
  return String(value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildTablesFromCells(cells: WikiCell[]): { tables: BoatTourTableRow[]; weather: string[]; dateRule: BoatTourDateRule } {
  const tables: BoatTourTableRow[] = [];
  let weather: string[] = [];
  let dateRule: BoatTourDateRule = { kind: "gameTime" };

  for (const c of cells) {
    const label = stripTags(c.label);
    const v = stripTags(c.value);
    const l = norm(label);

    if (l.includes("weather")) {
      weather = splitLines(v);
      tables.push({ label, iconKey: c.iconUrl ?? undefined, items: weather, note: null });
      continue;
    }

    if (l === "date") {
      const lines = splitLines(v);
      if (lines.some((x) => norm(x).includes("game time"))) {
        dateRule = { kind: "gameTime" };
      } else {
        const north = firstMatch(v, /North:\s*([^\n]+)/i);
        const south = firstMatch(v, /South:\s*([^\n]+)/i);
        if (north || south) {
          dateRule = { kind: "fixedDate", north: north ? north.trim() : "—", south: south ? south.trim() : "—" };
        } else {
          const txt = lines.join(" • ");
          dateRule = { kind: "fixedDate", north: txt || "—", south: txt || "—" };
        }
      }
      continue;
    }

    if (l.includes("internal id")) continue;

    const keep =
      l.includes("trees") ||
      l.includes("bush") ||
      l.includes("rocks") ||
      l.includes("buried") ||
      l.includes("ground") ||
      l.includes("diy");

    if (keep) {
      tables.push({
        label,
        iconKey: c.iconUrl ?? undefined,
        items: splitLines(v),
        note: null,
      });
    }
  }

  return { tables, weather, dateRule };
}

function galleriesToApp(
  galleries: WikiGallery[],
  wikiKey: string
): { maps: BoatTourGalleryImage[]; screenshots: BoatTourGalleryImage[] } {
  const maps: BoatTourGalleryImage[] = [];
  const screenshots: BoatTourGalleryImage[] = [];

  for (const g of galleries) {
    const cap = norm(g.caption);
    const isMaps = cap.includes("map");
    const isShots = cap.includes("screenshot");
    if (!isMaps && !isShots) continue;

    (g.images ?? []).forEach((u, idx) => {
      const tgt = isMaps ? maps : screenshots;
      tgt.push({ id: `${wikiKey}-${isMaps ? "maps" : "shots"}-${idx}`, title: undefined, imageUrl: u });
    });
  }

  return { maps, screenshots };
}

function specialTablesToApp(id: BoatTourIslandTypeId, sec: WikiSection): BoatTourSpecialTable[] {
  const src = sec.specialTables ?? [];
  if (!src.length) return [];
  if (id !== "starFragment") return [];

  return src.map((t, ti) => ({
    label: t.label ? String(t.label) : `Items ${ti + 1}`,
    rows: (t.rows ?? []).map((r) => ({
      name: String(r.name ?? "").trim(),
      probability: String(r.probability ?? "").trim(),
      iconUrl: r.iconUrl ?? null,
    })),
  })).filter((t) => (t.rows ?? []).some((r) => r.name && r.probability));
}

function wikiToAppType(sec: WikiSection): BoatTourIslandType {
  const id = idFromWikiTitle(sec.title, sec.internalId);
  const category = categoryFromWiki(sec.title);

  const chancePct = Number(sec.chancePct ?? 0);
  const internalId = String(sec.internalId ?? "—");

  const { tables, weather, dateRule } = buildTablesFromCells(sec.cells ?? []);
  const { maps, screenshots } = galleriesToApp(sec.galleries ?? [], sec.key);
  const specialTables = specialTablesToApp(id, sec);

  const name = sec.title;
  const subtitle = internalId && internalId !== "—" ? `Internal ID: ${internalId}` : "Boat tour island type";

  const inferredCategory: BoatTourIslandCategory =
    id === "starFragment" ||
    id === "cherryBlossom" ||
    id === "springBamboo" ||
    id === "summerShell" ||
    id === "mushroom" ||
    id === "mapleLeaf" ||
    id === "snowflake"
      ? "rare"
      : category;

  return {
    id,
    category: inferredCategory,
    name,
    subtitle,
    emoji: inferredCategory === "rare" ? "✨" : "🏝️",
    chancePct: Number.isFinite(chancePct) ? chancePct : 0,
    internalId,
    dateRule,
    weatherPatterns: weather.length ? weather : [],
    tables,
    specialTables,
    notes: sec.description ?? [],
    maps,
    screenshots,
    _raw: {
      wikiKey: sec.key,
      wikiCells: sec.cells ?? [],
      wikiGalleries: sec.galleries ?? [],
      wikiDescription: sec.description ?? [],
      wikiSpecialTables: sec.specialTables ?? [],
    },
  };
}

export async function fetchBoatTourIndex(): Promise<BoatTourIndex> {
  try {
    const res = await fetch(BOAT_TOUR_WIKI_URL, {
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) throw new Error(`Boat tour wiki fetch failed (${res.status})`);
    const html = await res.text();

    const intro = parseBoatTourIntroSections(html);

    const wiki = parseIslandTypeSections(html);
    const islands = wiki.map(wikiToAppType);

    islands.sort((a, b) => {
      if (a.category !== b.category) return a.category === "normal" ? -1 : 1;
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

export async function fetchBoatTourIslandTypes(): Promise<BoatTourIslandType[]> {
  const idx = await fetchBoatTourIndex();
  return idx.islands;
}
