// lib/palworld/paldbPassiveSkills.ts
//
// Passive Skills page parser (/en/Passive_Skills)
//
// Parses the #PalPassiveSkills tab-pane which is a grid of cards, not a table.
// Each card includes:
// - rank (from passive_banner_rankN / passive-rankN)
// - name
// - tooltip meta (Weight + tags like Pal/RarePal) from data-bs-title (HTML-escaped)
// - effects text from the card body
// - optional "only on these pals" icon links in the body
//
// Depends on your existing primitives from palworldDB:
//   absUrl, cleanKey, firstMatch, htmlToText
//

import { absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";

// -----------------------------
// Types
// -----------------------------

export type PassiveSkillTag = "Pal" | "RarePal" | "Unknown";

export type PassiveSkillPalRef = {
  slug: string;
  iconUrl: string | null;
};

export type PassiveSkillRow = {
  name: string;
  rank: number; // 1..4 (or 0 if unknown)
  rankArrowIconUrl: string | null;

  weight: number | null;
  tags: PassiveSkillTag[];

  // Main text in the card body (includes +/-% lines, notes, etc)
  effectsText: string | null;

  // Tooltip text (decoded + htmlToText). Sometimes includes extra effect lines.
  tooltipText: string | null;

  // Pals shown as small icons in the card body (Legend, etc)
  pals: PassiveSkillPalRef[];
};

export type PassiveSkillIndex = {
  count: number | null; // from the "<small>92</small>" header if present
  items: PassiveSkillRow[];
};

// -----------------------------
// Small helpers
// -----------------------------

function decodeHtmlEntities(s: string) {
  // keep it simple + consistent with your other parsers
  return String(s ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&#60;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#62;/g, ">");
}

function normalizeTooltipText(s: string) {
  return String(s ?? "")
    // underscores -> spaces
    .replace(/_/g, " ")
    // collapse extra whitespace that can result
    .replace(/\s+/g, " ")
    .trim();
}

function toIntOrNull(v: string | null | undefined): number | null {
  const s = cleanKey(String(v ?? ""));
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function extractTabPaneHtml(src: string, paneId: string): string | null {
  // Slice between sibling tab-panes (same strategy you used for Mounts)
  const startNeedle = `<div id="${paneId}"`;
  const s = String(src ?? "");
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

function splitCols(gridHtml: string): string[] {
  const s = String(gridHtml ?? "");
  if (!s) return [];
  // Safe-ish split: each skill is in <div class="col"> ... </div>
  // We'll keep the chunk raw until the next <div class="col">
  return s.split(/<div class="col">/i).slice(1).map((chunk) => `<div class="col">${chunk}`);
}

function extractCardBodyHtml(colHtml: string): string | null {
  // <div class="p-2"> ... </div>
  return firstMatch(colHtml, /<div class="p-2">\s*([\s\S]*?)\s*<\/div>\s*<\/div>/i);
}

function parseRank(colHtml: string): number {
  const m = colHtml.match(/\bpassive_banner_rank-?([0-9]+)/i);
  const n = Number(m?.[1] ?? "");
  return Number.isFinite(n) ? n : 0;
}

function parseName(colHtml: string, rank: number): string | null {
  const re = new RegExp(
    `<div\\s+class="[^"]*\\bpassive-rank-?${rank}\\b[^"]*"[^>]*>\\s*([^<]+?)\\s*<\\/div>`,
    "i"
  );
  return cleanKey(firstMatch(colHtml, re) ?? "") || null;
}

function parseNameAnyRank(colHtml: string): string | null {
  // Try to grab any passive-rankX / passive-rank-X
  const raw =
    firstMatch(colHtml, /<div\s+class="[^"]*\bpassive-rank-?\d+\b[^"]*"[^>]*>\s*([^<]+?)\s*<\/div>/i) ?? null;
  return raw ? cleanKey(raw) : null;
}

function parseRankArrowIconUrl(colHtml: string): string | null {
  const src =
    firstMatch(colHtml, /<img\b[^>]*class="[^"]*\bpassive_img_rank\b[^"]*"[^>]*\bsrc="([^"]+)"/i) ??
    firstMatch(colHtml, /<img\b[^>]*class='[^']*\bpassive_img_rank\b[^']*'[^>]*\bsrc='([^']+)'/i) ??
    null;
  return src ? absUrl(src) : null;
}

function parseTooltipText(colHtml: string): string | null {
  const raw =
    firstMatch(colHtml, /\bdata-bs-title="([\s\S]*?)"/i) ??
    firstMatch(colHtml, /\bdata-bs-title='([\s\S]*?)'/i) ??
    null;

  if (!raw) return null;

  const decoded = decodeHtmlEntities(raw);
  const plain = htmlToText(decoded);
  const normalized = normalizeTooltipText(plain);
  const txt = cleanKey(normalized);

  return txt || null;
}

function parseWeightAndTags(tooltipText: string | null): { weight: number | null; tags: PassiveSkillTag[]; } {
  if (!tooltipText) return { weight: null, tags: [] };

  const weight = toIntOrNull(tooltipText.match(/\bWeight\s*([0-9][0-9,]*)\b/i)?.[1] ?? null);

  const tags: PassiveSkillTag[] = [];
  // PalDB tooltip typically includes "Pal" or "RarePal"
  if (/\bRarePal\b/i.test(tooltipText)) tags.push("RarePal");
  if (/\bPal\b/i.test(tooltipText)) tags.push("Pal");

  // Avoid returning ["Pal"] when the only match came from "RarePal" (since RarePal contains "Pal")
  if (tags.includes("RarePal") && tags.includes("Pal")) {
    // Keep both, but ensure order (RarePal first feels more specific)
    return { weight, tags: ["RarePal", "Pal"] };
  }

  return { weight, tags };
}

function parsePalsFromBody(bodyHtml: string): PassiveSkillPalRef[] {
  const s = String(bodyHtml ?? "");
  if (!s) return [];

  // Match anchors that contain an <img ... size32 ... src="...">
  const matches = Array.from(
    s.matchAll(
      /<a\b[^>]*\bhref="([^"]+)"[^>]*>\s*<img\b[^>]*\bsrc="([^"]+)"[^>]*\bsize32\b[^>]*>\s*<\/a>/gi
    )
  );

  const out: PassiveSkillPalRef[] = [];
  for (const m of matches) {
    const href = cleanKey(m[1] ?? "");
    const img = cleanKey(m[2] ?? "");
    if (!href) continue;

    // Pal pages here are like href="Paladius" (no /en/)
    out.push({
      slug: href,
      iconUrl: img ? absUrl(img) : null,
    });
  }

  // dedupe by slug, keep first
  const map = new Map<string, PassiveSkillPalRef>();
  for (const p of out) if (!map.has(p.slug)) map.set(p.slug, p);
  return Array.from(map.values());
}

function rankSortKey(rank: number) {
  // Unknown rank (0) goes last
  const r = Number(rank);
  if (!Number.isFinite(r) || r <= 0) return 999;
  return r;
}

// -----------------------------
// Main parse
// -----------------------------

export function parsePassiveSkillIndex(pageHtml: string): PassiveSkillIndex {
  const pane = extractTabPaneHtml(pageHtml, "PalPassiveSkills");
  if (!pane) return { count: null, items: [] };

  const count = toIntOrNull(firstMatch(pane, /<h2>\s*Pal Passive Skills[\s\S]*?<small>\s*([0-9]+)\s*<\/small>/i));

  const cols = splitCols(pane);
  const items: PassiveSkillRow[] = [];

  for (const colHtml of cols) {
    const rank = parseRank(colHtml);
    const name = parseName(colHtml, rank) ?? parseNameAnyRank(colHtml);
    if (!name) continue;

    const rankArrowIconUrl = parseRankArrowIconUrl(colHtml);
    const tooltipText = parseTooltipText(colHtml);
    const { weight, tags } = parseWeightAndTags(tooltipText);

    const bodyHtml = extractCardBodyHtml(colHtml) ?? "";
    const effectsText = cleanKey(htmlToText(bodyHtml)) || null;

    const pals = parsePalsFromBody(bodyHtml);

    items.push({
      name,
      rank,
      rankArrowIconUrl,
      weight,
      tags,
      effectsText,
      tooltipText,
      pals,
    });
  }

  // dedupe by name (keep first)
  const map = new Map<string, PassiveSkillRow>();
  for (const it of items) if (!map.has(it.name)) map.set(it.name, it);

  const deduped = Array.from(map.values());

  deduped.sort((a, b) => {
    const ra = rankSortKey(a.rank);
    const rb = rankSortKey(b.rank);
    if (ra !== rb) return ra - rb;

    // deterministic within each rank
    return String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base" });
  });

  return { count, items: deduped };
}

// -----------------------------
// Fetch
// -----------------------------

export async function fetchPassiveSkillIndex(): Promise<PassiveSkillIndex> {
  const url = absUrl("/en/Passive_Skills");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchPassiveSkillIndex failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  return parsePassiveSkillIndex(html);
}
