import type { PokopiaPlannerZoneId } from "@/store/pokopiaPlannerStore";

export type PokopiaSection =
  | "dex"
  | "habitats"
  | "themes"
  | "items"
  | "recipes"
  | "traits"
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

export type PokopiaFavoriteListItem = {
  slug: string;
  label: string;
  href: string;
  iconUrl?: string;
};

export type PokopiaEffectListItem = {
  slug: string;
  label: string;
  href: string;
  iconUrl: string;
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
  { id: "themes", title: "Filters", subtitle: "Browse favorites, effects, and food flavors.", count: 54 },
  { id: "items", title: "Items", subtitle: "Reference Pokopia item data.", count: 1208 },
  { id: "recipes", title: "Recipes", subtitle: "Review cooking and crafting recipes.", count: 714 },
  { id: "traits", title: "Abilities & Specialties", subtitle: "Browse move teaching and role data.", count: 39 },
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

const POKOPIA_FAVORITE_ICON_BY_SLUG: Record<string, string> = {
  "blocky-stuff": "https://pokopiadex.com/images/items/crafting_ui/iron-chair.png",
  cleanliness: "https://pokopiadex.com/images/items/item_ui/bathtime-set.png",
  "colorful-stuff": "https://pokopiadex.com/images/items/item_ui/pop-art-sofa.png",
  "complicated-stuff": "https://pokopiadex.com/images/items/item_ui/polygonal-shelf.png",
  construction: "https://pokopiadex.com/images/items/item_ui/lumber.png",
  containers: "https://pokopiadex.com/images/items/item_ui/poke-ball-chest.png",
  "cute-stuff": "https://pokopiadex.com/images/items/item_ui/cute-chair.png",
  electronics: "https://pokopiadex.com/images/items/item_ui/munna-bank.png",
  exercise: "https://pokopiadex.com/images/items/item_ui/bouncy-blue-bathtub.png",
  fabric: "https://pokopiadex.com/images/items/item_ui/fluff.png",
  garbage: "https://pokopiadex.com/images/items/item_ui/recycled-bread.png",
  gatherings: "https://pokopiadex.com/images/items/item_ui/pop-art-table.png",
  "glass-stuff": "https://pokopiadex.com/images/items/item_ui/wiggly-mirror.png",
  "group-activities": "https://pokopiadex.com/images/items/item_ui/pop-art-sofa.png",
  "hard-stuff": "https://pokopiadex.com/images/items/item_ui/iron-ingot.png",
  healing: "https://pokopiadex.com/images/items/item_ui/lum-berry.png",
  "letters-and-words": "https://pokopiadex.com/images/items/item_ui/berry-case.png",
  "looks-like-food": "https://pokopiadex.com/images/items/item_ui/ribbon-cake.png",
  "lots-of-dirt": "https://pokopiadex.com/images/items/item_ui/potato.png",
  "lots-of-fire": "https://pokopiadex.com/images/items/crafting_ui/cooking-pot.png",
  "lots-of-nature": "https://pokopiadex.com/images/items/item_ui/healthy-hedge-seeds.png",
  "lots-of-water": "https://pokopiadex.com/images/items/item_ui/fresh-water.png",
  luxury: "https://pokopiadex.com/images/items/item_ui/berry-bed.png",
  "metal-stuff": "https://pokopiadex.com/images/items/item_ui/pokemetal.png",
  "nice-breezes": "https://pokopiadex.com/images/items/item_ui/seaweed.png",
  "noisy-stuff": "https://pokopiadex.com/images/items/item_ui/munna-bank.png",
  "ocean-vibes": "https://pokopiadex.com/images/items/item_ui/seaweed.png",
  "play-spaces": "https://pokopiadex.com/images/items/item_ui/bouncy-blue-bathtub.png",
  "pretty-flowers": "https://pokopiadex.com/images/items/item_ui/healthy-hedge-seeds.png",
  rides: "https://pokopiadex.com/images/items/item_ui/poke-ball-chest.png",
  "round-stuff": "https://pokopiadex.com/images/items/item_ui/poke-ball-chest.png",
  "sharp-stuff": "https://pokopiadex.com/images/items/item_ui/iron-ingot.png",
  "shiny-stuff": "https://pokopiadex.com/images/items/item_ui/pokemetal.png",
  "slender-objects": "https://pokopiadex.com/images/items/item_ui/wheat.png",
  "soft-stuff": "https://pokopiadex.com/images/items/item_ui/pop-art-sofa.png",
  "spinning-stuff": "https://pokopiadex.com/images/items/item_ui/poke-ball-chest.png",
  "spooky-stuff": "https://pokopiadex.com/images/items/item_ui/munna-bank.png",
  "stone-stuff": "https://pokopiadex.com/images/items/item_ui/potato.png",
  "strange-stuff": "https://pokopiadex.com/images/items/item_ui/munna-bank.png",
  symbols: "https://pokopiadex.com/images/items/item_ui/berry-case.png",
  "watching-stuff": "https://pokopiadex.com/images/items/item_ui/wiggly-mirror.png",
  "wobbly-stuff": "https://pokopiadex.com/images/items/item_ui/wiggly-mirror.png",
  "wooden-stuff": "https://pokopiadex.com/images/items/item_ui/lumber.png",
};

export const POKOPIA_FAVORITES: PokopiaFavoriteListItem[] = [
  "Blocky stuff",
  "Cleanliness",
  "Colorful stuff",
  "Complicated stuff",
  "Construction",
  "Containers",
  "Cute stuff",
  "Electronics",
  "Exercise",
  "Fabric",
  "Garbage",
  "Gatherings",
  "Glass stuff",
  "Group Activities",
  "Hard stuff",
  "Healing",
  "Letters and words",
  "Looks like food",
  "Lots of dirt",
  "Lots of fire",
  "Lots of nature",
  "Lots of water",
  "Luxury",
  "Metal stuff",
  "Nice breezes",
  "Noisy stuff",
  "Ocean vibes",
  "Play spaces",
  "Pretty flowers",
  "Rides",
  "Round stuff",
  "Sharp stuff",
  "Shiny stuff",
  "Slender objects",
  "Soft stuff",
  "Spinning stuff",
  "Spooky stuff",
  "Stone stuff",
  "Strange stuff",
  "Symbols",
  "Watching stuff",
  "Wobbly stuff",
  "Wooden stuff",
].map((label) => {
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return {
    slug,
    label,
    href: `https://pokopiadex.com/pokedex/favorites/${slug}`,
    iconUrl: POKOPIA_FAVORITE_ICON_BY_SLUG[slug],
  };
});

export const POKOPIA_EFFECTS: PokopiaEffectListItem[] = [
  { slug: "decoration", label: "Decoration", count: 172 },
  { slug: "food", label: "Food", count: 46 },
  { slug: "relaxation", label: "Relaxation", count: 68 },
  { slug: "road", label: "Road", count: 55 },
  { slug: "toy", label: "Toy", count: 55 },
].map((effect) => ({
  ...effect,
  href: `https://pokopiadex.com/items?tag=${effect.slug}`,
  iconUrl: `https://pokopiadex.com/images/icons/${effect.slug}.png`,
}));
