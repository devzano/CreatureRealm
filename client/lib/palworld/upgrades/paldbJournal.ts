// lib/palworld/paldbJournal.ts
//
// PalDB Journals scraping helpers
//
// Source index: https://paldb.cc/en/Journals
// Each journal page has:
// - left Menu list of entries (<a href="...">Title</a>)
// - right content area with img.HelpGuide + a <div class="mt-2"> that contains title + <br> text
//
// Output:
// - Index list of all journal entries (title + slug)
// - Detail (title, imageUrl, bodyText)
//
// Depends on your existing primitives from palworldDB:
//   absUrl, cleanKey, firstMatch, htmlToText
//

import { absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";

// -----------------------------
// Types
// -----------------------------

export type JournalIndexItem = {
  title: string; // as displayed in menu
  slug: string; // href normalized (decode + cleanKey)
  url: string; // absolute URL to the page
};

export type JournalIndex = {
  items: JournalIndexItem[];
};

export type JournalDetail = {
  slug: string;
  title: string | null;
  imageUrl: string | null;
  bodyText: string | null; // multiline text, \n preserved
};

// -----------------------------
// Cache
// -----------------------------

let _indexCache: JournalIndex | null = null;
let _indexCacheAt = 0;

const TTL = 10 * 60 * 1000;

// -----------------------------
// Fetch helpers
// -----------------------------

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`PalDB request failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

function safeDecodeURIComponent(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// Normalize a menu href into a stable slug.
// Examples:
//  "Castaways_Journal_-_Day_XX"
//  "Axel_Travers%E2%80%99s_Diary_-_1"
function normalizeHrefToSlug(href: string): string {
  const raw = String(href ?? "").trim();
  if (!raw) return "";

  // Strip any leading /en/ or leading slash
  const noPrefix = raw.replace(/^\/+/, "").replace(/^en\//i, "");

  // Decode percent encoding (’ etc)
  const decoded = safeDecodeURIComponent(noPrefix);

  // Clean but keep internal punctuation/quotes mostly intact
  // (cleanKey typically trims/collapses spaces; slug here is path-ish)
  return cleanKey(decoded) || "";
}

function normalizeMultilineText(s: string): string {
  // Keep line breaks, but clean each line.
  const raw = String(s ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").map((ln) => {
    // collapse whitespace inside line
    return ln.replace(/\s+/g, " ").trim();
  });
  // Remove leading/trailing empty lines, keep internal empties
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();

  // Collapse runs of >2 empty lines to 2 (optional but nice)
  const out: string[] = [];
  let emptyRun = 0;
  for (const ln of lines) {
    if (!ln) {
      emptyRun++;
      if (emptyRun <= 2) out.push("");
      continue;
    }
    emptyRun = 0;
    out.push(ln);
  }

  return out.join("\n").trim();
}

function htmlToTextPreserveBreaks(html: string): string {
  // Convert <br> to newlines BEFORE htmlToText so we keep paragraphs.
  const withBreaks = String(html ?? "").replace(/<br\s*\/?>/gi, "\n");
  return htmlToText(withBreaks);
}

// -----------------------------
// Parse: Index
// -----------------------------

function extractMenuCardHtml(pageHtml: string): string | null {
  // Grab the Menu card body in the left column:
  // <h5 class="card-title text-info">Menu</h5> ... lots of <a href="...">...</a>
  //
  // We'll just slice from "Menu" header to the end of that card-body.
  const s = String(pageHtml ?? "");
  if (!s) return null;

  const start = s.search(/<h5[^>]*>\s*Menu\s*<\/h5>/i);
  if (start < 0) return null;

  const after = s.slice(start);
  const endRel = after.search(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i); // best-effort end of card stack
  if (endRel < 0) return after;

  return after.slice(0, endRel);
}

export function parseJournalIndexHtml(pageHtml: string): JournalIndex {
  const menuHtml = extractMenuCardHtml(pageHtml);
  if (!menuHtml) return { items: [] };

  const items: JournalIndexItem[] = [];

  // Match all anchors in the menu area
  const re = /<a\b[^>]*\bhref="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/gi;

  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(menuHtml))) {
    const href = String(m[1] ?? "").trim();
    const titleRaw = String(m[2] ?? "").trim();

    const slug = normalizeHrefToSlug(href);
    const title = cleanKey(titleRaw) || "";

    if (!slug || !title) continue;

    // Most journal links are relative like "Castaways_Journal_-_Day_XX"
    // so the full page url is /en/<slug>
    const url = absUrl(`/en/${encodeURI(slug)}`);

    items.push({ title, slug, url });
  }

  // Dedupe by slug (keep first)
  const seen = new Set<string>();
  const deduped: JournalIndexItem[] = [];
  for (const it of items) {
    if (seen.has(it.slug)) continue;
    seen.add(it.slug);
    deduped.push(it);
  }

  return { items: deduped };
}

// -----------------------------
// Parse: Detail
// -----------------------------


function parseDetailImageUrl(pageHtml: string): string | null {
  const src =
    firstMatch(pageHtml, /<img\b[^>]*class="[^"]*\bHelpGuide\b[^"]*"[^>]*\bsrc="([^"]+)"/i) ??
    firstMatch(pageHtml, /<img\b[^>]*class='[^']*\bHelpGuide\b[^']*'[^>]*\bsrc='([^']+)'/i) ??
    null;

  return src ? absUrl(src) : null;
}

function parseDetailBodyBlockHtml(pageHtml: string): string | null {
  const scoped =
    firstMatch(
      pageHtml,
      /<div\s+class="col-lg-8">[\s\S]*?<div\s+class="mt-2">\s*([\s\S]*?)\s*<\/div>/i
    ) ?? null;

  if (scoped) return scoped;

  return firstMatch(pageHtml, /<div\s+class="mt-2">\s*([\s\S]*?)\s*<\/div>/i);
}

function parseDetailTitleAndBody(bodyBlockHtml: string): { title: string | null; bodyText: string | null } {
  const raw = String(bodyBlockHtml ?? "");
  if (!raw) return { title: null, bodyText: null };

  // The first line is the title, then <br> <br> then paragraphs.
  // We'll preserve breaks, then take first non-empty line as title.
  const plain = htmlToTextPreserveBreaks(raw);
  const cleaned = normalizeMultilineText(plain);

  const lines = cleaned.split("\n");
  const titleLine = lines.find((x) => String(x ?? "").trim().length > 0) ?? "";
  const title = titleLine ? titleLine.trim() : null;

  // Body: everything after the first occurrence of titleLine
  let bodyLines = lines;
  if (titleLine) {
    const idx = lines.indexOf(titleLine);
    if (idx >= 0) bodyLines = lines.slice(idx + 1);
  }

  const bodyText = normalizeMultilineText(bodyLines.join("\n"));
  return { title, bodyText: bodyText || null };
}

export function parseJournalDetailHtml(slug: string, pageHtml: string): JournalDetail {
  const imageUrl = parseDetailImageUrl(pageHtml);

  const bodyBlockHtml = parseDetailBodyBlockHtml(pageHtml);
  const { title, bodyText } = parseDetailTitleAndBody(bodyBlockHtml ?? "");

  return {
    slug: cleanKey(slug) || slug,
    title,
    imageUrl,
    bodyText,
  };
}

// -----------------------------
// Public API
// -----------------------------

export async function warmJournalIndex(): Promise<void> {
  try {
    await fetchJournalIndex({ force: false });
  } catch {
    // warm never throws
  }
}

export async function fetchJournalIndex(opts?: { force?: boolean }): Promise<JournalIndex> {
  const force = !!opts?.force;
  const now = Date.now();

  if (!force && _indexCache && now - _indexCacheAt < TTL) return _indexCache;

  const url = absUrl("/en/Journals");
  const html = await fetchHtml(url);

  const idx = parseJournalIndexHtml(html);

  _indexCache = idx;
  _indexCacheAt = now;
  return idx;
}

export async function fetchJournalDetail(slugOrHref: string): Promise<JournalDetail> {
  const slug = normalizeHrefToSlug(slugOrHref);
  if (!slug) throw new Error(`fetchJournalDetail: invalid slug "${slugOrHref}"`);

  const url = absUrl(`/en/${encodeURI(slug)}`);
  const html = await fetchHtml(url);

  return parseJournalDetailHtml(slug, html);
}
