import { absUrl, firstMatch, htmlToText } from "@/lib/palworld/palworldDB";
import { getWorkSuitabilityByCode, getWorkSuitabilityBySlug } from "@/lib/palworld/upgrades/paldbWorkSuitability";

export type WorkPriorityItem = {
  id: string;
  name: string;
  code: string;
  priority: number;
  iconUrl: string | null;
  workSlug: string | null;
};

const WORK_PRIORITY_URL = "https://paldb.cc/en/Work_Priority";
const TTL_MS = 1000 * 60 * 10;

let cache: WorkPriorityItem[] | null = null;
let cacheAt = 0;
let pending: Promise<WorkPriorityItem[]> | null = null;

function now() {
  return Date.now();
}

function isFresh() {
  return cache != null && now() - cacheAt < TTL_MS;
}

function safeText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function safeInt(value: unknown) {
  const parsed = Number(safeText(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function stripTags(html: string) {
  return htmlToText(String(html ?? "")).replace(/\s+/g, " ").trim();
}

function captureAll(src: string, re: RegExp): string[][] {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return Array.from(String(src ?? "").matchAll(new RegExp(re.source, flags))).map((m) => Array.from(m));
}

function normalizeSlug(href: string | null | undefined) {
  const raw = safeText(href);
  if (!raw) return null;
  const match = raw.match(/\/en\/([^/?#]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return raw.replace(/^\/+/, "");
}

function deriveWorkMeta(name: string, code: string, workSlug: string | null) {
  const bySlug = workSlug ? getWorkSuitabilityBySlug(workSlug) : null;
  if (bySlug) return bySlug;

  const aliasCodeMap: Record<string, string> = {
    Architecture: "Handcraft",
    ConvertItem: "Handcraft",
    RepairBuildObject: "Handcraft",
    Cooking: "EmitFlame",
    Smelting: "EmitFlame",
    Ignition: "EmitFlame",
    Watering_Farm: "Watering",
    ExtinguishBurn: "Watering",
    FarmHarvest: "Collection",
    HarvestLevelObject: "Collection",
    CollectResourcePickable: "Collection",
    ProductMedicine: "ProductMedicine",
    ProductResource_Mining: "Mining",
    ProductResource_Mining_OnFacility: "Mining",
    ProductResource_Deforest: "Deforest",
    ProductResource_Deforest_OnFacility: "Deforest",
    GenerateEnergy: "GenerateElectricity",
    MonsterFarm: "MonsterFarm",
    Seeding: "Seeding",
    Watering: "Watering",
    Cool: "Cool",
    TransportFoodItemInBaseCamp: "Transport",
    TransportDisposableItemInBaseCamp: "Transport",
    TransportItemInBaseCamp: "Transport",
  };

  const byCode = getWorkSuitabilityByCode(aliasCodeMap[code] ?? code);
  if (byCode) return byCode;

  const aliasNameMap: Record<string, string> = {
    Construction: "Handiwork",
    Repair: "Handiwork",
    Farming: "Farming",
    Grazing: "Farming",
    Refinement: "Kindling",
    Kindling: "Kindling",
    Cooking: "Kindling",
    Harvest: "Gathering",
    Gathering: "Gathering",
    Planting: "Planting",
    Watering: "Watering",
    Extinguish: "Watering",
    Generating_Electricity: "Generating_Electricity",
    "Generating Electricity": "Generating_Electricity",
    Mining: "Mining",
    Lumbering: "Lumbering",
    Transport: "Transporting",
    Cooling: "Cooling",
    Cool: "Cooling",
    "Medicine Production": "Medicine_Production",
  };

  return getWorkSuitabilityBySlug(aliasNameMap[name] ?? null);
}

function parseWorkPriority(html: string): WorkPriorityItem[] {
  const headingIndex = html.search(/Work Priority/i);
  const body = headingIndex >= 0 ? html.slice(headingIndex) : html;

  const rows = captureAll(
    body,
    /<div class="col"><div class="d-flex justify-content-between border p-2"><div>([\s\S]*?)<\/div><div>(\d+)<\/div><\/div><\/div>/g
  );

  return rows
    .map((match, index) => {
      const left = match[1] ?? "";
      const priority = safeInt(match[2]);
      if (priority == null) return null;

      const href =
        firstMatch(left, /<a\b[^>]*\bhref="([^"]+)"/i) ??
        firstMatch(left, /<a\b[^>]*\bhref='([^']+)'/i) ??
        null;
      const iconSrc =
        firstMatch(left, /<img\b[^>]*\bsrc="([^"]+)"/i) ??
        firstMatch(left, /<img\b[^>]*\bsrc='([^']+)'/i) ??
        null;

      const code = safeText(firstMatch(left, /<small>\(([^<]+)\)<\/small>/i));
      const leftWithoutSmall = left.replace(/<small>[\s\S]*?<\/small>/gi, "");
      const name = stripTags(leftWithoutSmall);
      if (!name) return null;
      const workSlug = normalizeSlug(href);
      const derived = deriveWorkMeta(name, code || name, workSlug);

      return {
        id: `${code || name}-${index}`,
        name,
        code: code || name,
        priority,
        iconUrl: iconSrc ? absUrl(iconSrc) : derived?.iconUrl ?? null,
        workSlug: workSlug ?? derived?.slug ?? null,
      } satisfies WorkPriorityItem;
    })
    .filter((item): item is WorkPriorityItem => item != null);
}

export async function fetchWorkPriority(): Promise<WorkPriorityItem[]> {
  if (isFresh()) return cache!;
  if (pending) return pending;

  pending = (async () => {
    const response = await fetch(WORK_PRIORITY_URL, {
      method: "GET",
      headers: { accept: "text/html" },
    });
    if (!response.ok) throw new Error(`Failed to fetch ${WORK_PRIORITY_URL}: ${response.status}`);

    const html = await response.text();
    const next = parseWorkPriority(html);
    cache = next;
    cacheAt = now();
    pending = null;
    return next;
  })().catch((error) => {
    pending = null;
    throw error;
  });

  return pending;
}
