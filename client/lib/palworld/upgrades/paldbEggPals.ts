// lib/palworld/paldbEggPals.ts
//
// Fetch + parse PalDB Eggs -> possible hatch pals mapping
// Source: https://paldb.cc/en/Eggs
//
// Output shape is designed for your grids/detail sheets:
// - Each egg has: slug, name, iconUrl, tier (normal/large/huge), pals[]
//
// Depends on your existing helpers in lib/palworld/palworldDB.ts

import { BASE, absUrl, cleanKey, firstMatch } from "@/lib/palworld/palworldDB";

// -----------------------------
// Types
// -----------------------------

export type EggTier = "normal" | "large" | "huge";

export type EggPalRef = {
  slug: string;
  name: string;
  iconUrl: string | null;
};

export type EggRow = {
  egg: {
    slug: string;
    name: string;
    iconUrl: string | null;
    tier: EggTier;
  };
  pals: EggPalRef[];
};

export type EggsIndex = {
  rows: EggRow[];
  byEggSlug: Record<string, EggRow>;
  updatedAt: number; // epoch ms
};

// -----------------------------
// Cache
// -----------------------------

const EGGS_URL = `${BASE}/en/Eggs`;

// paldb eggs list is pretty stable; long TTL is fine
const INDEX_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
let _cache: { at: number; data: EggsIndex } | null = null;

// -----------------------------
// Public API
// -----------------------------

export async function fetchEggsIndex(opts?: { force?: boolean; signal?: AbortSignal }): Promise<EggsIndex> {
  const force = !!opts?.force;

  if (!force && _cache && Date.now() - _cache.at < INDEX_TTL_MS) {
    return _cache.data;
  }

  const html = await fetchText(EGGS_URL, { signal: opts?.signal });
  const rows = parseEggsPage(html);

  const byEggSlug: Record<string, EggRow> = {};
  for (const r of rows) byEggSlug[r.egg.slug] = r;

  const data: EggsIndex = {
    rows,
    byEggSlug,
    updatedAt: Date.now(),
  };

  _cache = { at: Date.now(), data };
  return data;
}

// Convenience: get pals for an egg slug (e.g. "Dark_Egg")
export async function fetchPalsForEggSlug(
  eggSlug: string,
  opts?: { force?: boolean; signal?: AbortSignal }
): Promise<EggPalRef[]> {
  const idx = await fetchEggsIndex(opts);
  return idx.byEggSlug[eggSlug]?.pals ?? [];
}

// -----------------------------
// Parsing
// -----------------------------
//
// Page shape (simplified):
// <div id="Eggs" ...>
//   <table ...>
//     <tbody>
//       <tr>
//         <td> <a ... href="Dark_Egg"><img src="...">Dark Egg</a> </td>
//         <td>
//           <div><a ... href="Hoocrates"><img ...>Hoocrates</a></div>
//           <div><a ... href="Depresso"><img ...>Depresso</a></div>
//           ...
//         </td>
//       </tr>
//     </tbody>
//   </table>
// </div>

export function parseEggsPage(html: string): EggRow[] {
  const eggsPane =
    firstMatch(html, /<div[^>]+id=["']Eggs["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i) ??
    // fallback: just take whole doc
    html;

  const tbody =
    firstMatch(eggsPane, /<tbody[^>]*>([\s\S]*?)<\/tbody>/i) ??
    firstMatch(eggsPane, /<table[\s\S]*?>([\s\S]*?)<\/table>/i) ??
    "";

  if (!tbody) return [];

  // Split rows
  const rowChunks = tbody.split(/<tr\b/i).slice(1).map((s) => "<tr" + s);

  const out: EggRow[] = [];
  for (const rowChunk of rowChunks) {
    const row = parseEggRow(rowChunk);
    if (row) out.push(row);
  }
  return out;
}

function parseEggRow(rowChunk: string): EggRow | null {
  // Grab the two <td> cells
  const tds = extractTdChunks(rowChunk);
  if (tds.length < 2) return null;

  const eggTd = tds[0];
  const palsTd = tds[1];

  const eggAnchor = firstMatch(eggTd, /<a\b[^>]*class=["'][^"']*itemname[^"']*["'][^>]*>[\s\S]*?<\/a>/i);
  if (!eggAnchor) return null;

  const eggSlug = extractHref(eggAnchor);
  const eggName = extractAnchorText(eggAnchor);
  const eggIcon = extractImgSrc(eggAnchor);

  if (!eggSlug || !eggName) return null;

  // Tier: prefer class bg_rarity0/2/4 from egg <img> if present, else infer from name
  const tier = inferEggTierFromEggAnchor(eggAnchor, eggName);

  const pals = parsePalsCell(palsTd);

  return {
    egg: {
      slug: eggSlug,
      name: eggName,
      iconUrl: eggIcon ? absUrl(eggIcon) : null,
      tier,
    },
    pals,
  };
}

function parsePalsCell(palsTd: string): EggPalRef[] {
  const out: EggPalRef[] = [];

  // Each pal is typically inside <div><a class="itemname" ... href="X"><img ...>Name</a></div>
  // But we’ll just find all anchors with href + itemname class.
  const anchors = allTagMatches(palsTd, /<a\b[^>]*class=["'][^"']*itemname[^"']*["'][^>]*>[\s\S]*?<\/a>/gi);

  for (const a of anchors) {
    const slug = extractHref(a);
    const name = extractAnchorText(a);
    const icon = extractImgSrc(a);

    if (!slug || !name) continue;

    out.push({
      slug,
      name,
      iconUrl: icon ? absUrl(icon) : null,
    });
  }

  // Dedup by slug (some pages can repeat in edge cases)
  const seen = new Set<string>();
  const deduped: EggPalRef[] = [];
  for (const p of out) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    deduped.push(p);
  }

  return deduped;
}

// -----------------------------
// Tiny HTML helpers (regex-based)
// -----------------------------

function extractTdChunks(trHtml: string): string[] {
  const tds: string[] = [];
  const re = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(trHtml))) {
    tds.push(m[1] ?? "");
  }
  return tds;
}

function allTagMatches(text: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(text))) {
    const full = m[0];
    if (full) out.push(full);
  }
  return out;
}

function extractHref(aTagHtml: string): string | null {
  const href =
    firstMatch(aTagHtml, /\bhref=["']([^"']+)["']/i) ??
    // extremely rare: href without quotes
    firstMatch(aTagHtml, /\bhref=([^\s>]+)/i) ??
    null;

  if (!href) return null;

  // paldb uses relative slugs like "Dark_Egg" or "Hoocrates" (no leading slash)
  // Keep slug only (strip any query/hash)
  const clean = href.split("#")[0].split("?")[0].trim();
  if (!clean) return null;

  // If it’s a full URL, reduce to pathname-ish slug (but keep stable behavior)
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const u = new URL(clean);
      const p = u.pathname.replace(/^\/+/, "");
      return p || null;
    } catch {
      return clean;
    }
  }

  return clean.replace(/^\/+/, "");
}

function extractImgSrc(html: string): string | null {
  // Prefer <img ... src="..."> (page uses loading="lazy" but still src present)
  const imgTag =
    firstMatch(html, /<img\b[^>]*>/i) ??
    firstMatch(html, /<img\b[^>]*\/>/i) ??
    null;

  if (!imgTag) return null;

  const src =
    firstMatch(imgTag, /\bsrc=["']([^"']+)["']/i) ??
    firstMatch(imgTag, /\bdata-src=["']([^"']+)["']/i) ??
    firstMatch(imgTag, /\bdata-lazy-src=["']([^"']+)["']/i) ??
    null;

  return src ? src.trim() : null;
}

function extractAnchorText(aTagHtml: string): string | null {
  // Remove tags but keep inner text.
  // These anchors are simple (img + text), so a basic strip works.
  const inner = firstMatch(aTagHtml, /<a\b[^>]*>([\s\S]*?)<\/a>/i) ?? aTagHtml;
  const stripped = cleanKey((inner ?? "").replace(/<[^>]+>/g, " "));
  return stripped ? stripped : null;
}

function inferEggTierFromEggAnchor(eggAnchor: string, eggName: string): EggTier {
  // Egg icons carry bg_rarity0 / bg_rarity2 / bg_rarity4 for normal/large/huge
  const cls = firstMatch(eggAnchor, /<img\b[^>]*class=["']([^"']+)["'][^>]*>/i) ?? "";
  const c = ` ${cls} `.toLowerCase();

  if (c.includes("bg_rarity4")) return "huge";
  if (c.includes("bg_rarity2")) return "large";
  if (c.includes("bg_rarity0")) return "normal";

  const n = (eggName ?? "").toLowerCase();
  if (n.includes("huge")) return "huge";
  if (n.includes("large")) return "large";
  return "normal";
}

// -----------------------------
// Networking
// -----------------------------

async function fetchText(url: string, opts?: { signal?: AbortSignal }): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      // Helps some CDNs return consistent HTML
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: opts?.signal,
  });

  if (!res.ok) {
    throw new Error(`paldbEggPals: request failed ${res.status} ${res.statusText} for ${url}`);
  }

  return await res.text();
}
