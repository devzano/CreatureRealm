// lib/palworld/palworldDB.ts

export const BASE = "https://paldb.cc";
export const CDN_BASE = "https://cdn.paldb.cc";

/**
 * absUrl:
 * - Normalizes protocol-relative //...
 * - Routes /image/... and cdn asset paths to CDN_BASE (paldb serves many images from CDN)
 * - Falls back to BASE for other site-relative paths
 */
export function absUrl(pathOrUrl: string) {
  if (!pathOrUrl) return pathOrUrl;

  const s = String(pathOrUrl).trim();
  if (!s) return s;

  // already absolute
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // protocol-relative
  if (s.startsWith("//")) return `https:${s}`;

  // site-relative
  if (s.startsWith("/")) {
    // paldb static assets usually live on CDN (not paldb.cc)
    if (s.startsWith("/image/") || s.startsWith("/cache/") || s.startsWith("/img/")) {
      return `${CDN_BASE}${s}`;
    }
    return `${BASE}${s}`;
  }

  // no leading slash (rare)
  if (s.startsWith("image/") || s.startsWith("cache/") || s.startsWith("img/")) {
    return `${CDN_BASE}/${s}`;
  }

  return `${BASE}/${s}`;
}

/**
 * Returns the first match. If the regex has a capture group, returns group 1.
 * Otherwise returns the full match (m[0]).
 */
export function firstMatch(text: string, re: RegExp) {
  const m = text.match(re);
  const v = (m?.[1] ?? m?.[0] ?? "").trim();
  return v ? v : null;
}

export function allMatches(text: string, re: RegExp) {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(text))) {
    const v = (m[1] ?? "").trim();
    if (v) out.push(v);
  }
  return out;
}

export function dedup<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function cleanKey(s: string) {
  return (s ?? "").replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
}

export function parseNumberRawFromHash(hash: string | null) {
  const raw = (hash ?? "").trim();
  if (!raw) return { number: 0, numberRaw: undefined as string | undefined };
  const numStr = raw.match(/[0-9]{1,4}/)?.[0] ?? "0";
  const number = Number(numStr) || 0;
  return { number, numberRaw: raw };
}

function decodeHtmlEntitiesBasic(s: string) {
  return (s ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, `"`)
    .replace(/&#39;/g, `'`)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
}

/**
 * Shared "HTML -> readable text" helper.
 */
export function htmlToText(html: string) {
  let t = (html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n");

  t = t
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(
      /<\/(p|div|section|article|header|footer|li|ul|ol|h1|h2|h3|h4|h5|h6|table|tr|td|th|thead|tbody)>/gi,
      "\n"
    );

  t = t.replace(/<[^>]+>/g, " ");
  t = decodeHtmlEntitiesBasic(t);

  t = t
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return t;
}

/**
 * Finds the first <img> tag whose class attribute contains `classToken`
 * and returns its src/data-src/data-lazy-src/data-original.
 */
export function extractImgUrlByClassToken(chunk: string, classToken: string): string | null {
  if (!chunk || !classToken) return null;

  const imgTag =
    chunk.match(new RegExp(`<img\\b[^>]*class="[^"]*${classToken}[^"]*"[^>]*>`, "i"))?.[0] ??
    chunk.match(new RegExp(`<img\\b[^>]*class='[^']*${classToken}[^']*'[^>]*>`, "i"))?.[0] ??
    null;

  if (!imgTag) return null;

  const pickAttr = (attr: string) =>
    imgTag.match(new RegExp(`\\b${attr}="([^"]+)"`, "i"))?.[1]?.trim() ??
    imgTag.match(new RegExp(`\\b${attr}='([^']+)'`, "i"))?.[1]?.trim() ??
    null;

  const url =
    pickAttr("src") ??
    pickAttr("data-src") ??
    pickAttr("data-lazy-src") ??
    pickAttr("data-original") ??
    null;

  return url ? absUrl(url) : null;
}

export function extractSize64ImgUrl(chunk: string): string | null {
  const imgTag =
    firstMatch(chunk, /<img\b[^>]*class="[^"]*size64[^"]*"[^>]*>/i) ??
    firstMatch(chunk, /<img\b[^>]*class='[^']*size64[^']*'[^>]*>/i);

  if (!imgTag) return null;

  const src =
    firstMatch(imgTag, /\bsrc="([^"]+)"/i) ??
    firstMatch(imgTag, /\bsrc='([^']+)'/i) ??
    null;

  if (src) return absUrl(src);

  const dataSrc =
    firstMatch(imgTag, /\bdata-src="([^"]+)"/i) ??
    firstMatch(imgTag, /\bdata-src='([^']+)'/i) ??
    null;

  return dataSrc ? absUrl(dataSrc) : null;
}

/**
 * Optional shared helper for malformed tables: split by <tr ...>
 */
export function splitTableRows(tableHtml: string) {
  return (tableHtml ?? "").split(/<tr\b/i).slice(1);
}

/**
 * Optional shared helper: extract "level" from a table row chunk.
 */
export function parseLevelFromRow(rowChunk: string) {
  const tdLevel =
    firstMatch(rowChunk, /<td[^>]*>\s*([0-9]+)\s*<\/td>/i) ??
    firstMatch(rowChunk, /\bLv\.?\s*([0-9]+)\b/i) ??
    firstMatch(rowChunk, /\b([0-9]+)\b/i);

  const lv = Number((tdLevel ?? "").trim());
  return Number.isFinite(lv) && lv > 0 ? lv : 0;
}

export function normalizeElementKey(el?: string | null) {
  const e = (el ?? "").toLowerCase();
  if (e.includes("fire")) return "fire";
  if (e.includes("water")) return "water";
  if (e.includes("ice")) return "ice";
  if (e.includes("electric") || e.includes("thunder")) return "electric";
  if (e.includes("grass") || e.includes("leaf")) return "grass";
  if (e.includes("ground") || e.includes("earth")) return "ground";
  if (e.includes("dark")) return "dark";
  if (e.includes("dragon")) return "dragon";
  if (e.includes("neutral") || e.includes("normal")) return "neutral";
  return (el ?? "").trim().toLowerCase();
}

export function elementHex(el?: string | null) {
  const k = normalizeElementKey(el);
  if (k === "ice") return "#1BB3BB";
  if (k === "water") return "#1673D3";
  if (k === "electric") return "#CEAA0F";
  if (k === "grass") return "#64A805";
  if (k === "neutral") return "#B39690";
  if (k === "ground") return "#905521";
  if (k === "dark") return "#9B124A";
  if (k === "dragon") return "#A84BC2";
  if (k === "fire") return "#f97316";
  return "#0ea5e9";
}
// Picks <meta property="og:image" content="...">
export function extractOgImageUrl(html: string): string | null {
  return (
    firstMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    null
  );
}

// Finds an <img> by class token (you already have extractImgUrlByClassToken)
export function extractSize128ImgUrl(chunk: string): string | null {
  const imgTag =
    firstMatch(chunk, /<img\b[^>]*class="[^"]*size128[^"]*"[^>]*>/i) ??
    firstMatch(chunk, /<img\b[^>]*class='[^']*size128[^']*'[^>]*>/i);

  if (!imgTag) return null;

  const src =
    firstMatch(imgTag, /\bsrc="([^"]+)"/i) ??
    firstMatch(imgTag, /\bsrc='([^']+)'/i) ??
    null;

  if (src) return absUrl(src);

  const dataSrc =
    firstMatch(imgTag, /\bdata-src="([^"]+)"/i) ??
    firstMatch(imgTag, /\bdata-src='([^']+)'/i) ??
    null;

  return dataSrc ? absUrl(dataSrc) : null;
}

// Generic “inventory item icon” url pull (covers InventoryItemIcon + other cdn variants)
export function extractAnyInventoryIconUrl(html: string): string | null {
  return (
    firstMatch(
      html,
      /(https?:\/\/cdn\.paldb\.cc\/[^"']*\/InventoryItemIcon\/[^"']+\.(?:png|jpg|jpeg|webp))/i
    ) ??
    firstMatch(
      html,
      /(https?:\/\/cdn\.paldb\.cc\/[^"']*T_itemicon_[^"']+\.(?:png|jpg|jpeg|webp))/i
    ) ??
    null
  );
}

/**
 * Item-page icon resolver (Pal_Sphere style pages)
 * Order:
 *  1) og:image
 *  2) size128 icon in the main card
 *  3) any inventory icon url anywhere
 */
export function resolveItemPageIconUrl(html: string): string | null {
  const og = extractOgImageUrl(html);
  if (og) return absUrl(og);

  const size128 = extractSize128ImgUrl(html);
  if (size128) return absUrl(size128);

  const any = extractAnyInventoryIconUrl(html);
  return any ? absUrl(any) : null;
}
