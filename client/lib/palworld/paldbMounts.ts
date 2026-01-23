// lib/palworld/paldbMounts.ts
//
// Mounts page parser (tabs on /en/Mounts).
//
// Parses THREE tabs:
//  - #GroundMounts : table (Run Speed, Ride Sprint Speed, Tech, GravityScale, JumpZVelocity, Stamina)
//  - #FlyingMounts : table (same columns as ground)
//  - #WaterMounts  : table (Swim Speed, Swim Dash Speed, Tech, Stamina)
//
// Depends on your existing primitives + parseFirstItemLink.
//

import { absUrl, cleanKey, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { parseFirstItemLink } from "@/lib/palworld/paldbDetailKit";

// -----------------------------
// Types
// -----------------------------

export type MountKind = "ground" | "flying" | "water";
export type PalMountIndexItem = GroundMountRow | FlyingMountRow | WaterMountRow;

export type MountBase = {
  kind: MountKind;
  slug: string;
  name: string;
  iconUrl: string | null;
  techLevel: number | null;
  stamina: number | null;
};

export type GroundMountRow = MountBase & {
  kind: "ground";
  runSpeed: number | null;
  rideSprintSpeed: number | null;
  gravityScale: number | null;
  jumpZVelocity: number | null;
};

export type FlyingMountRow = MountBase & {
  kind: "flying";
  runSpeed: number | null;
  rideSprintSpeed: number | null;
  gravityScale: number | null;
  jumpZVelocity: number | null;
};

export type WaterMountRow = MountBase & {
  kind: "water";
  swimSpeed: number | null;
  swimDashSpeed: number | null;
};

export type MountIndex = {
  ground: GroundMountRow[];
  flying: FlyingMountRow[];
  water: WaterMountRow[];
  all: Array<GroundMountRow | FlyingMountRow | WaterMountRow>;
};

// -----------------------------
// Small helpers (match your style)
// -----------------------------

function toNumberOrNull(v: string | null | undefined): number | null {
  const s = cleanKey(String(v ?? ""));
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(v: string | null | undefined): number | null {
  const n = toNumberOrNull(v);
  return n == null ? null : Math.trunc(n);
}

function extractTabPaneHtml(src: string, paneId: string): string | null {
  // Same philosophy as your Glider parser: slice between sibling tab-panes.
  const start = `<div id="${paneId}"`;
  const s = String(src ?? "");
  const startIdx = s.indexOf(start);
  if (startIdx < 0) return null;

  const after = s.slice(startIdx + start.length);
  const nextIdxRel = after.search(/<div\s+id="[^"]+"\s+class="tab-pane\b/i);
  if (nextIdxRel < 0) {
    const endIdx = s.indexOf(`</div class="tab-content">`, startIdx);
    return endIdx >= 0 ? s.slice(startIdx, endIdx) : s.slice(startIdx);
  }

  const endIdx = startIdx + start.length + nextIdxRel;
  return s.slice(startIdx, endIdx);
}

function extractFirstTableHtml(block: string): string | null {
  return firstMatch(block, /(<table\b[\s\S]*?<\/table>)/i);
}

function splitTrs(tableHtml: string): string[] {
  const s = String(tableHtml ?? "");
  if (!s) return [];
  const tbody =
    firstMatch(s, /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i) ??
    // fallback: sometimes no tbody
    firstMatch(s, /<thead\b[\s\S]*?<\/thead\b[^>]*>([\s\S]*?)<\/table>/i) ??
    "";

  if (!tbody) return [];
  return Array.from(tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).map((m) => m[1] ?? "");
}

function splitTds(trInner: string): string[] {
  return Array.from(String(trInner ?? "").matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map((m) => m[1] ?? "");
}

// -----------------------------
// Core parsers
// -----------------------------

type GroundOrFlyingKind = "ground" | "flying";
type GroundOrFlyingRow<K extends GroundOrFlyingKind> = K extends "ground" ? GroundMountRow : FlyingMountRow;

/**
 * IMPORTANT: generic return type avoids (Ground|Flying) union arrays.
 */
function parseGroundOrFlyingTable<K extends GroundOrFlyingKind>(pageHtml: string, paneId: string, kind: K): GroundOrFlyingRow<K>[] {
  const pane = extractTabPaneHtml(pageHtml, paneId);
  if (!pane) return [];

  const table = extractFirstTableHtml(pane);
  if (!table) return [];

  const rows = splitTrs(table);
  const out: GroundOrFlyingRow<K>[] = [];

  for (const trInner of rows) {
    const tds = splitTds(trInner);

    // Expected 7 cols:
    // 0 name, 1 run, 2 ride sprint, 3 tech, 4 gravity, 5 jump, 6 stamina
    if (tds.length < 4) continue;

    const td0 = tds[0] ?? "";
    const link = parseFirstItemLink(td0);
    if (!link?.slug) continue;

    const slug = cleanKey(link.slug);
    const name = cleanKey(link.name) || cleanKey(htmlToText(td0)) || slug;

    const runSpeed = toNumberOrNull(cleanKey(htmlToText(tds[1] ?? "")) || null);
    const rideSprintSpeed = toNumberOrNull(cleanKey(htmlToText(tds[2] ?? "")) || null);
    const techLevel = toIntOrNull(cleanKey(htmlToText(tds[3] ?? "")) || null);

    // These are sometimes blank on PalDB (null ok)
    const gravityScale = toNumberOrNull(cleanKey(htmlToText(tds[4] ?? "")) || null);
    const jumpZVelocity = toNumberOrNull(cleanKey(htmlToText(tds[5] ?? "")) || null);
    const stamina = toNumberOrNull(cleanKey(htmlToText(tds[6] ?? "")) || null);

    // Build the strongly-typed row without unions
    const base = {
      kind,
      slug,
      name,
      iconUrl: link.iconUrl ? absUrl(link.iconUrl) : null,
      techLevel,
      stamina,
      runSpeed,
      rideSprintSpeed,
      gravityScale,
      jumpZVelocity,
    };

    out.push(base as GroundOrFlyingRow<K>);
  }

  // dedupe by slug (keep first)
  const map = new Map<string, GroundOrFlyingRow<K>>();
  for (const r of out) if (!map.has(r.slug)) map.set(r.slug, r);
  return Array.from(map.values());
}

function parseWaterTable(pageHtml: string): WaterMountRow[] {
  const pane = extractTabPaneHtml(pageHtml, "WaterMounts");
  if (!pane) return [];

  const table = extractFirstTableHtml(pane);
  if (!table) return [];

  const rows = splitTrs(table);
  const out: WaterMountRow[] = [];

  for (const trInner of rows) {
    const tds = splitTds(trInner);

    // Expected 5 cols:
    // 0 name, 1 swim, 2 swim dash, 3 tech, 4 stamina
    if (tds.length < 4) continue;

    const td0 = tds[0] ?? "";
    const link = parseFirstItemLink(td0);
    if (!link?.slug) continue;

    const slug = cleanKey(link.slug);
    const name = cleanKey(link.name) || cleanKey(htmlToText(td0)) || slug;

    const swimSpeed = toNumberOrNull(cleanKey(htmlToText(tds[1] ?? "")) || null);
    const swimDashSpeed = toNumberOrNull(cleanKey(htmlToText(tds[2] ?? "")) || null);
    const techLevel = toIntOrNull(cleanKey(htmlToText(tds[3] ?? "")) || null);
    const stamina = toNumberOrNull(cleanKey(htmlToText(tds[4] ?? "")) || null);

    out.push({
      kind: "water",
      slug,
      name,
      iconUrl: link.iconUrl ? absUrl(link.iconUrl) : null,
      techLevel,
      stamina,
      swimSpeed,
      swimDashSpeed,
    });
  }

  // dedupe by slug (keep first)
  const map = new Map<string, WaterMountRow>();
  for (const r of out) if (!map.has(r.slug)) map.set(r.slug, r);
  return Array.from(map.values());
}

// -----------------------------
// Public fetch + parse
// -----------------------------

export function parseMountIndex(pageHtml: string): MountIndex {
  const ground = parseGroundOrFlyingTable(pageHtml, "GroundMounts", "ground");
  const flying = parseGroundOrFlyingTable(pageHtml, "FlyingMounts", "flying");
  const water = parseWaterTable(pageHtml);

  const all: MountIndex["all"] = [...ground, ...flying, ...water];
  return { ground, flying, water, all };
}

export async function fetchMountIndex(): Promise<MountIndex> {
  const url = absUrl("/en/Mounts");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchMountIndex failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  return parseMountIndex(html);
}
