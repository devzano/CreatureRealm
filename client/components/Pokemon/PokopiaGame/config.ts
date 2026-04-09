import type { PokopiaPlannerZoneId } from "@/store/pokopiaPlannerStore";

export type PokopiaSection =
  | "dex"
  | "habitats"
  | "items"
  | "recipes"
  | "abilities"
  | "specialties"
  | "buildings"
  | "collectibles"
  | "info"
  | "planner";

export type RecipeCategoryFilter =
  | "All"
  | "Furniture"
  | "Misc."
  | "Outdoor"
  | "Utilities"
  | "Buildings"
  | "Blocks"
  | "Other";

export type ItemCategoryFilter =
  | "All"
  | "Furniture"
  | "Misc."
  | "Outdoor"
  | "Utilities"
  | "Buildings"
  | "Blocks"
  | "Kits"
  | "Nature"
  | "Food"
  | "Materials"
  | "Key Items"
  | "Other"
  | "Shop";

export type CollectibleCategoryFilter = "All" | "Artifacts" | "Records" | "Highlights" | "CDs";
export type PokopiaInfoSection = "overview" | "islands" | "events" | "guides";
export type PlannerPickerTarget =
  | { zoneId: PokopiaPlannerZoneId; type: "zone" }
  | { zoneId: PokopiaPlannerZoneId; type: "building"; buildingId: string };
export type PlannerBuildingPickerTab = "game" | "custom";
export type CollectibleSubcategoryFilter =
  | "All"
  | "Lost Relics (L)"
  | "Lost Relics (S)"
  | "Fossils"
  | "Newspapers"
  | "Diary Entries"
  | "Magazines"
  | "Notes"
  | "Letters"
  | "Papers"
  | "Photos";

export type PokopiaSectionCard = {
  id: PokopiaSection;
  title: string;
  subtitle: string;
  count: number;
};

export type PokopiaInfoCard = {
  id: Exclude<PokopiaInfoSection, "overview">;
  title: string;
  subtitle: string;
  count: number;
};

export type PokopiaPlannerZoneMeta = {
  id: PokopiaPlannerZoneId;
  title: string;
  badge: string;
  iconUrl: string;
};

export const POKOPIA_COLORS = {
  blue: "#49D4FF",
  blueSoft: "rgba(73,212,255,0.16)",
  blueBorder: "rgba(73,212,255,0.42)",
  blueText: "#C8F4FF",
  lime: "#95E91F",
  limeSoft: "rgba(149,233,31,0.16)",
  limeBorder: "rgba(149,233,31,0.48)",
  limeText: "#E8FFC0",
  orange: "#F6A63A",
  orangeSoft: "rgba(246,166,58,0.16)",
  orangeBorder: "rgba(246,166,58,0.45)",
  orangeText: "#FFD9A8",
  purple: "#C68BFF",
  purpleSoft: "rgba(198,139,255,0.16)",
  purpleBorder: "rgba(198,139,255,0.45)",
  purpleText: "#F0DEFF",
} as const;

export const POKOPIA_SECTION_CARDS: PokopiaSectionCard[] = [
  { id: "dex", title: "Pokédex", subtitle: "Track Pokopia roster progress.", count: 303 },
  { id: "habitats", title: "Habitats", subtitle: "Explore habitat and encounter data.", count: 212 },
  { id: "items", title: "Items", subtitle: "Reference Pokopia item data.", count: 1208 },
  { id: "recipes", title: "Recipes", subtitle: "Review cooking and crafting recipes.", count: 714 },
  { id: "abilities", title: "Abilities", subtitle: "Look up Pokopia ability systems.", count: 8 },
  { id: "specialties", title: "Specialties", subtitle: "See specialties and role data.", count: 31 },
  { id: "buildings", title: "Buildings", subtitle: "Browse structures and unlock paths.", count: 45 },
  { id: "collectibles", title: "Collectibles", subtitle: "Track collectibles outside the dex.", count: 287 },
  { id: "info", title: "Info", subtitle: "Browse Pokopia info pages and references.", count: 3 },
  { id: "planner", title: "Planner", subtitle: "Organize zones, buildings, and Pokemon locally.", count: 5 },
];

export const RECIPE_CATEGORY_FILTERS: RecipeCategoryFilter[] = [
  "All",
  "Furniture",
  "Outdoor",
  "Utilities",
  "Buildings",
  "Blocks",
  "Misc.",
  "Other",
];

export const ITEM_CATEGORY_FILTERS: ItemCategoryFilter[] = [
  "All",
  "Furniture",
  "Outdoor",
  "Utilities",
  "Food",
  "Blocks",
  "Kits",
  "Nature",
  "Buildings",
  "Materials",
  "Shop",
  "Key Items",
  "Misc.",
  "Other",
];

export const COLLECTIBLE_CATEGORY_FILTERS: CollectibleCategoryFilter[] = [
  "All",
  "Artifacts",
  "Records",
  "Highlights",
  "CDs",
];

export const ARTIFACT_COLLECTIBLE_SUBCATEGORY_FILTERS: CollectibleSubcategoryFilter[] = [
  "All",
  "Lost Relics (L)",
  "Lost Relics (S)",
  "Fossils",
];

export const RECORD_COLLECTIBLE_SUBCATEGORY_FILTERS: CollectibleSubcategoryFilter[] = [
  "All",
  "Newspapers",
  "Diary Entries",
  "Magazines",
  "Notes",
  "Letters",
  "Papers",
  "Photos",
];

export const POKOPIA_INFO_CARDS: PokopiaInfoCard[] = [
  {
    id: "islands",
    title: "Islands",
    subtitle: "Dream and Cloud Islands in one view.",
    count: 12,
  },
  {
    id: "events",
    title: "Events",
    subtitle: "Limited-time Pokopia event overviews.",
    count: 2,
  },
  {
    id: "guides",
    title: "Guides",
    subtitle: "Tips, walkthroughs, and database guides.",
    count: 0,
  },
];

export const POKOPIA_PLANNER_ZONES: PokopiaPlannerZoneMeta[] = [
  {
    id: "withered-wasteland",
    title: "Withered Wasteland",
    badge: "Lv 1",
    iconUrl: "https://pokopiadex.com/images/icons/withered-wasteland.png",
  },
  {
    id: "bleak-beach",
    title: "Bleak Beach",
    badge: "Lv 1",
    iconUrl: "https://pokopiadex.com/images/icons/bleak-beach.png",
  },
  {
    id: "rocky-ridges",
    title: "Rocky Ridges",
    badge: "Lv 1",
    iconUrl: "https://pokopiadex.com/images/icons/rocky-ridges.png",
  },
  {
    id: "sparkling-skylands",
    title: "Sparkling Skylands",
    badge: "Lv 1",
    iconUrl: "https://pokopiadex.com/images/icons/sparkling-skylands.png",
  },
  {
    id: "palette-town",
    title: "Palette Town",
    badge: "Lv 1",
    iconUrl: "https://pokopiadex.com/images/icons/palette-town.png",
  },
];
