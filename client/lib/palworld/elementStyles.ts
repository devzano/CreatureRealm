export type ElementStyle = {
  bg: string;
  text: string;
  tint: string;
};

export const ELEMENT_STYLE_MAP: Record<string, ElementStyle> = {
  fire: {
    bg: "bg-orange-700/70",
    text: "text-orange-50",
    tint: "#f97316",
  },
  water: {
    bg: "bg-sky-800/80",
    text: "text-sky-50",
    tint: "#1673D3",
  },
  grass: {
    bg: "bg-emerald-800/80",
    text: "text-emerald-50",
    tint: "#64A805",
  },
  electric: {
    bg: "bg-yellow-700/80",
    text: "text-yellow-50",
    tint: "#CEAA0F",
  },
  ice: {
    bg: "bg-cyan-700/70",
    text: "text-cyan-50",
    tint: "#1BB3BB",
  },
  ground: {
    bg: "bg-amber-900/80",
    text: "text-amber-50",
    tint: "#905521",
  },
  dark: {
    bg: "bg-zinc-900/80",
    text: "text-zinc-50",
    tint: "#9B124A",
  },
  dragon: {
    bg: "bg-purple-900/80",
    text: "text-purple-50",
    tint: "#A84BC2",
  },
  neutral: {
    bg: "bg-slate-700/70",
    text: "text-slate-50",
    tint: "#B39690",
  },
};

export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  bg: "bg-slate-800/70",
  text: "text-slate-100",
  tint: "#94a3b8",
};

export function getElementStyle(typeName: string): ElementStyle {
  const key = typeName.toLowerCase().trim();
  return ELEMENT_STYLE_MAP[key] ?? DEFAULT_ELEMENT_STYLE;
}
