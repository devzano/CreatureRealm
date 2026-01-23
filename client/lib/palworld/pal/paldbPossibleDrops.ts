// lib/data/palworld/paldbPossibleDrops.ts
import { absUrl } from "../palworldDB";

export type PossibleDrop = {
  itemName: string;
  itemSlug: string;
  iconUrl?: string;
  quantityText?: string;
  probabilityText?: string;
};

function decodeBasic(s: string) {
  return (s ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function pickAttr(tag: string, attr: string) {
  const m =
    tag.match(new RegExp(`\\b${attr}="([^"]+)"`, "i")) ??
    tag.match(new RegExp(`\\b${attr}='([^']+)'`, "i")) ??
    null;
  const v = (m?.[1] ?? "").trim();
  return v ? v : null;
}

function extractImgUrlFromChunk(chunk: string): string | undefined {
  if (!chunk) return undefined;

  // take the first <img ...> in this chunk
  const imgTag = chunk.match(/<img\b[^>]*>/i)?.[0] ?? null;
  if (!imgTag) return undefined;

  const raw =
    pickAttr(imgTag, "src") ??
    pickAttr(imgTag, "data-src") ??
    pickAttr(imgTag, "data-lazy-src") ??
    pickAttr(imgTag, "data-original");

  if (!raw) return undefined;

  const cleaned = decodeBasic(raw);
  if (!cleaned || cleaned.toLowerCase().startsWith("javascript")) return undefined;

  return absUrl(cleaned);
}

function extractQtyFromChunk(chunk: string): string | undefined {
  if (!chunk) return undefined;

  const m = chunk.match(/<small[^>]+class="itemQuantity"[^>]*>([\s\S]*?)<\/small>/i);
  if (!m) return undefined;

  return decodeBasic((m[1] ?? "").replace(/<[^>]*>/g, " "));
}

function extractProbFromChunk(chunk: string): string | undefined {
  if (!chunk) return undefined;

  const probs = Array.from(chunk.matchAll(/(\d+(?:\.\d+)?)%\s*/g)).map((m) => m[1]);
  if (!probs.length) return undefined;

  return `${probs[probs.length - 1]}%`;
}

export function parsePossibleDropsFromHtml(html: string): PossibleDrop[] {
  const anchor = 'data-i18n="paldex_drop_item_title"';
  const aIdx = html.indexOf(anchor);
  if (aIdx < 0) return [];

  const tableStart = html.indexOf("<table", aIdx);
  if (tableStart < 0) return [];

  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableEnd < 0) return [];

  const tableChunk = html.slice(tableStart, tableEnd + "</table>".length);

  // Find each item anchor (works even when <tr> markup is broken or multi-item rows exist)
  const itemRe =
    /<a[^>]*class=(?:"[^"]*\bitemname\b[^"]*"|'[^']*\bitemname\b[^']*')[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi;

  // Collect matches first so we can segment between items
  const matches: Array<{
    index: number;
    href: string;
    inner: string;
    full: string;
  }> = [];

  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = itemRe.exec(tableChunk))) {
    matches.push({
      index: m.index,
      href: (m[1] ?? m[2] ?? "").trim(),
      inner: m[3] ?? "",
      full: m[0] ?? "",
    });
  }

  const drops: PossibleDrop[] = [];
  const logicalSeen = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];

    const href = cur.href;
    const itemSlug = href.replace(/^\/+/, "").split(/[?#]/)[0].trim();
    if (!itemSlug) continue;

    const itemName = decodeBasic((cur.inner ?? "").replace(/<[^>]*>/g, " "));

    // Segment is from this <a> to the next <a> (or end of table)
    const segStart = Math.max(0, cur.index);
    const segEnd = next ? Math.max(segStart, next.index) : tableChunk.length;
    const segment = tableChunk.slice(segStart, segEnd);

    // Prefer icon inside the anchor HTML, then the segment around it
    const iconUrl = extractImgUrlFromChunk(cur.inner) ?? extractImgUrlFromChunk(segment);

    const quantityText = extractQtyFromChunk(segment);
    const probabilityText = extractProbFromChunk(segment);

    const logicalKey = `${itemSlug}|${itemName}|${quantityText ?? ""}|${probabilityText ?? ""}|${iconUrl ?? ""}`;
    if (logicalSeen.has(logicalKey)) continue;
    logicalSeen.add(logicalKey);

    drops.push({
      itemName: itemName || itemSlug,
      itemSlug,
      iconUrl,
      quantityText,
      probabilityText,
    });
  }

  return drops;
}
