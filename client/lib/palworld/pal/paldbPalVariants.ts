// lib/palworld/paldbPalVariants.ts
//
// PalDB "Tribes" table parser
// - Extracts ALL variant entries from the "Tribes" card table
// - Works for 2 variants (Normal + Boss) and 3+ variants (Normal + Boss + Rampaging, etc.)
// - Dedupes by slug, preserves table order
//
// Depends on your existing primitives from palworldDB:
//   absUrl, cleanKey, firstMatch, htmlToText
//

import { absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";

// -----------------------------
// Types
// -----------------------------

export type PalVariantKind =
  | "normal"
  | "boss"
  | "rampaging"
  | "predator"
  | "tower"
  | "raid"
  | "subspecies"
  | "unknown";

export type PalVariantRef = {
  slug: string;          // e.g. "Direhowl", "Rampaging_Direhowl", "Hunter_of_the_Steppe_Direhowl"
  name: string;          // table text (cleaned)
  iconUrl: string | null;
  tribeLabel: string | null; // e.g. "Tribe Boss", "Tribe Normal"
  kind: PalVariantKind;
};

// -----------------------------
// Public API
// -----------------------------

/**
 * extractPalVariantsFromTribes:
 * - Parses the "Tribes" card table on a PalDB Pal page.
 * - Returns a list of variant refs (including the current entry if present).
 */
export function extractPalVariantsFromTribes(html: string): PalVariantRef[] {
  const tableHtml = extractTribesTableHtml(html);
  if (!tableHtml) return [];

  const rows = splitTableRows(tableHtml);
  if (rows.length === 0) return [];

  const out: PalVariantRef[] = [];
  const seen = new Set<string>();

  for (const rowHtml of rows) {
    const ref = parseTribeRow(rowHtml);
    if (!ref) continue;

    const key = ref.slug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push(ref);
  }

  return out;
}

// -----------------------------
// Internals
// -----------------------------

function extractTribesTableHtml(html: string) {
  // Try a few shapes; PalDB is pretty consistent but safer to be flexible.
  return (
    firstMatch(
      html,
      /<h5[^>]*class="card-title[^"]*"[^>]*>\s*Tribes\s*<\/h5>[\s\S]*?(<table[\s\S]*?<\/table>)/i
    ) ??
    firstMatch(
      html,
      /<h5[^>]*>\s*Tribes\s*<\/h5>[\s\S]*?(<table[\s\S]*?<\/table>)/i
    ) ??
    null
  );
}

function splitTableRows(tableHtml: string) {
  const rows: string[] = [];
  const re = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tableHtml))) rows.push(m[0]);
  return rows;
}

function parseTribeRow(rowHtml: string): PalVariantRef | null {
  // Anchor: <a ... href="Rampaging_Direhowl"> ... </a>
  const href = firstMatch(rowHtml, /<a[^>]*\bhref="([^"]+)"[^>]*>/i);
  if (!href) return null;

  const slug = palSlugFromHref(href);
  if (!slug) return null;

  // Icon: <img ... src="...">
  const iconRaw = firstMatch(rowHtml, /<img[^>]*\bsrc="([^"]+)"[^>]*>/i);
  const iconUrl = iconRaw ? absUrl(iconRaw) : null;

  // Name: prefer anchor inner text (htmlToText handles nested tags and entities)
  const anchorHtml =
    firstMatch(rowHtml, /(<a[^>]*\bhref="[^"]+"[^>]*>[\s\S]*?<\/a>)/i) ?? "";
  let name = htmlToText(anchorHtml).trim();
  name = cleanupName(name);

  // Tribe label: second cell often contains "Tribe Boss" / "Tribe Normal"
  // Example row:
  // <tr><td><a ...>Hunter of the Steppe Direhowl</a><td>Tribe Boss
  const tribeLabelRaw =
    firstMatch(rowHtml, /<\/a>\s*<\/td>\s*<td[^>]*>\s*([^<]+)/i) ??
    firstMatch(rowHtml, /<td[^>]*>\s*(Tribe[^<]+)/i) ??
    null;

  const tribeLabel = tribeLabelRaw ? cleanupCellText(tribeLabelRaw) : null;

  const kind = inferVariantKindFromSlugAndLabel(slug, tribeLabel);

  return {
    slug,
    name: name || slug.replace(/_/g, " "),
    iconUrl,
    tribeLabel,
    kind,
  };
}

function palSlugFromHref(href: string) {
  const s0 = String(href || "").trim();
  if (!s0) return null;

  // Strip query/hash
  const s1 = s0.split("#")[0].split("?")[0];

  // If it’s a path like "/en/Rampaging_Direhowl", take last segment
  const seg = s1.split("/").filter(Boolean).pop() ?? "";
  const slug = cleanKey(seg);

  return slug || null;
}

function cleanupName(name: string) {
  // htmlToText may include extra whitespace/newlines
  const s = String(name || "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

function cleanupCellText(v: string) {
  return String(v || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferVariantKindFromSlugAndLabel(slug: string, tribeLabel: string | null): PalVariantKind {
  const s = slug.toLowerCase();
  const l = (tribeLabel ?? "").toLowerCase();

  // Strong signals from slug prefix
  if (s.startsWith("rampaging_")) return "rampaging";
  if (s.startsWith("predator_")) return "predator";
  if (s.startsWith("tower_")) return "tower";
  if (s.startsWith("raid_")) return "raid";

  // Boss-ish pages often have "BOSS_" codes, but the page slug often includes boss naming like:
  // "Hunter_of_the_Steppe_Direhowl" (still basically a boss variant)
  if (l.includes("tribe boss")) return "boss";
  if (s.includes("hunter_of_the_") || s.includes("_boss_") || s.startsWith("boss_")) return "boss";

  // Subspecies naming: Palworld commonly uses suffixes like Noct / Ignis / Cryst / Terra / Aqua etc.
  // PalDB typically encodes them in the page slug too.
  const subspeciesHints = [
    "_noct",
    "_ignis",
    "_cryst",
    "_terra",
    "_aqua",
    "_lux",
    "_botan",
    "_inferno",
  ];
  if (subspeciesHints.some((h) => s.endsWith(h) || s.includes(h))) return "subspecies";

  if (l.includes("tribe normal")) return "normal";

  return "unknown";
}
