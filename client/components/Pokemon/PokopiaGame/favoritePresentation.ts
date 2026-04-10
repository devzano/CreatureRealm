import { resolveFavoriteSlug } from "@/lib/pokemon/pokopia/favoriteUtils";

type FavoriteTheme = {
  bg: string;
  border: string;
  text: string;
  hint: string;
};

const THEMES = {
  pink: {
    bg: "rgba(225,56,87,0.18)",
    border: "rgba(225,56,87,0.42)",
    text: "#ffd2dc",
    hint: "#ff9fb1",
  },
  blue: {
    bg: "rgba(42,102,125,0.18)",
    border: "rgba(42,102,125,0.42)",
    text: "#cceef8",
    hint: "#95d8ee",
  },
  lime: {
    bg: "rgba(113,152,32,0.18)",
    border: "rgba(113,152,32,0.42)",
    text: "#e6f7be",
    hint: "#c7e77a",
  },
  yellow: {
    bg: "rgba(214,158,11,0.18)",
    border: "rgba(214,158,11,0.42)",
    text: "#ffe9a8",
    hint: "#ffd54d",
  },
  red: {
    bg: "rgba(202,41,16,0.18)",
    border: "rgba(202,41,16,0.42)",
    text: "#ffd4cc",
    hint: "#ff9b87",
  },
  purple: {
    bg: "rgba(168,85,247,0.18)",
    border: "rgba(168,85,247,0.42)",
    text: "#edd8ff",
    hint: "#d4adff",
  },
  cyan: {
    bg: "rgba(34,211,238,0.18)",
    border: "rgba(34,211,238,0.42)",
    text: "#d3fbff",
    hint: "#8cecf6",
  },
  amber: {
    bg: "rgba(245,158,11,0.18)",
    border: "rgba(245,158,11,0.42)",
    text: "#ffe4b5",
    hint: "#ffc663",
  },
  mint: {
    bg: "rgba(45,191,175,0.18)",
    border: "rgba(45,191,175,0.42)",
    text: "#d4fff9",
    hint: "#8ef0e6",
  },
  slate: {
    bg: "rgba(71,85,105,0.28)",
    border: "rgba(100,116,139,0.42)",
    text: "#e2e8f0",
    hint: "#aab8cb",
  },
} as const;

export function getPokopiaFavoriteTheme(label: string, href?: string | null): FavoriteTheme {
  const slug = resolveFavoriteSlug(label, href);

  if (slug === "sweet-flavors") return THEMES.pink;
  if (slug === "dry-flavors") return THEMES.blue;
  if (slug === "bitter-flavors") return THEMES.lime;
  if (slug === "sour-flavors") return THEMES.yellow;
  if (slug === "spicy-flavors") return THEMES.red;
  if (slug === "no-flavor") return THEMES.amber;

  if (slug.includes("water") || slug.includes("ocean")) return THEMES.blue;
  if (slug.includes("fire")) return THEMES.red;
  if (
    slug.includes("nature") ||
    slug.includes("flowers") ||
    slug.includes("wooden") ||
    slug.includes("dirt")
  ) {
    return THEMES.lime;
  }
  if (
    slug.includes("cute") ||
    slug.includes("soft") ||
    slug.includes("fabric") ||
    slug.includes("luxury") ||
    slug.includes("play")
  ) {
    return THEMES.pink;
  }
  if (
    slug.includes("metal") ||
    slug.includes("electronics") ||
    slug.includes("glass") ||
    slug.includes("shiny")
  ) {
    return THEMES.cyan;
  }
  if (
    slug.includes("spooky") ||
    slug.includes("strange") ||
    slug.includes("symbols") ||
    slug.includes("group")
  ) {
    return THEMES.purple;
  }
  if (
    slug.includes("construction") ||
    slug.includes("stone") ||
    slug.includes("blocky") ||
    slug.includes("hard") ||
    slug.includes("containers") ||
    slug.includes("round") ||
    slug.includes("wooden")
  ) {
    return THEMES.amber;
  }
  if (slug.includes("cleanliness") || slug.includes("healing") || slug.includes("breezes")) {
    return THEMES.mint;
  }
  if (
    slug.includes("food") ||
    slug.includes("letters") ||
    slug.includes("looks-like-food") ||
    slug.includes("gatherings")
  ) {
    return THEMES.yellow;
  }

  return THEMES.slate;
}
