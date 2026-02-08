export type TypeStyle = {
  bg: string;
  text: string;
  tint: string;
};

export const TYPE_STYLE_MAP: Record<string, TypeStyle> = {
  normal: {
    bg: "bg-slate-700/70",
    text: "text-slate-50",
    tint: "#94a3b8",
  },
  fire: {
    bg: "bg-orange-700/70",
    text: "text-orange-50",
    tint: "#ea580c",
  },
  water: {
    bg: "bg-sky-800/80",
    text: "text-sky-50",
    tint: "#0ea5e9",
  },
  grass: {
    bg: "bg-emerald-800/80",
    text: "text-emerald-50",
    tint: "#10b981",
  },
  electric: {
    bg: "bg-yellow-700/80",
    text: "text-yellow-50",
    tint: "#eab308",
  },
  ice: {
    bg: "bg-cyan-700/70",
    text: "text-cyan-50",
    tint: "#06b6d4",
  },
  fighting: {
    bg: "bg-red-800/80",
    text: "text-red-50",
    tint: "#dc2626",
  },
  poison: {
    bg: "bg-purple-800/80",
    text: "text-purple-50",
    tint: "#a855f7",
  },
  ground: {
    bg: "bg-amber-900/80",
    text: "text-amber-50",
    tint: "#d97706",
  },
  flying: {
    bg: "bg-indigo-800/80",
    text: "text-indigo-50",
    tint: "#6366f1",
  },
  psychic: {
    bg: "bg-pink-700/80",
    text: "text-pink-50",
    tint: "#ec4899",
  },
  bug: {
    bg: "bg-lime-800/80",
    text: "text-lime-50",
    tint: "#84cc16",
  },
  rock: {
    bg: "bg-stone-800/80",
    text: "text-stone-50",
    tint: "#78716c",
  },
  ghost: {
    bg: "bg-violet-900/80",
    text: "text-violet-50",
    tint: "#8b5cf6",
  },
  dragon: {
    bg: "bg-indigo-900/80",
    text: "text-indigo-50",
    tint: "#4f46e5",
  },
  dark: {
    bg: "bg-zinc-900/80",
    text: "text-zinc-50",
    tint: "#52525b",
  },
  steel: {
    bg: "bg-slate-800/80",
    text: "text-slate-50",
    tint: "#6b7280",
  },
  fairy: {
    bg: "bg-fuchsia-700/80",
    text: "text-fuchsia-50",
    tint: "#e879f9",
  },
};

export const DEFAULT_TYPE_STYLE: TypeStyle = {
  bg: "bg-rose-900/60",
  text: "text-rose-100",
  tint: "#be123c",
};

export function getTypeStyle(typeName: string): TypeStyle {
  const key = typeName.toLowerCase().trim();
  return TYPE_STYLE_MAP[key] ?? DEFAULT_TYPE_STYLE;
}

export type EvolutionChipStyle = {
  tint: string;
  bgClass: string;
  textClass: string;
};

export const SPECIES_COLOR_MAP: Record<string, EvolutionChipStyle> = {
  // PokéAPI species colors: black, blue, brown, gray, green, pink, purple, red, white, yellow
  blue: {
    tint: "#0ea5e9",
    bgClass: "bg-sky-900/70",
    textClass: "text-sky-50",
  },
  red: {
    tint: "#ef4444",
    bgClass: "bg-red-900/70",
    textClass: "text-red-50",
  },
  yellow: {
    tint: "#eab308",
    bgClass: "bg-yellow-900/70",
    textClass: "text-yellow-50",
  },
  green: {
    tint: "#22c55e",
    bgClass: "bg-emerald-900/70",
    textClass: "text-emerald-50",
  },
  pink: {
    tint: "#ec4899",
    bgClass: "bg-pink-900/70",
    textClass: "text-pink-50",
  },
  purple: {
    tint: "#a855f7",
    bgClass: "bg-purple-900/70",
    textClass: "text-purple-50",
  },
  brown: {
    tint: "#b45309",
    bgClass: "bg-amber-950/80",
    textClass: "text-amber-50",
  },
  gray: {
    tint: "#6b7280",
    bgClass: "bg-slate-900/80",
    textClass: "text-slate-50",
  },
  white: {
    tint: "#e5e7eb",
    bgClass: "bg-slate-800/80",
    textClass: "text-slate-50",
  },
  black: {
    tint: "#020617",
    bgClass: "bg-zinc-950/80",
    textClass: "text-zinc-50",
  },
};

export const DEFAULT_EVOLUTION_CHIP_STYLE: EvolutionChipStyle = {
  tint: "#1f2937",
  bgClass: "bg-slate-900/80",
  textClass: "text-slate-100",
};

export function getEvolutionChipStyleFromSpeciesColor(colorName?: string | null) {
  if (!colorName) return DEFAULT_EVOLUTION_CHIP_STYLE;
  const key = colorName.toLowerCase().trim();
  return SPECIES_COLOR_MAP[key] ?? DEFAULT_EVOLUTION_CHIP_STYLE;
}