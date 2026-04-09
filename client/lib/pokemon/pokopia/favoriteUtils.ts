export function favoriteLabelToSlug(label: string): string {
  return String(label ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function favoriteHrefToSlug(href?: string | null): string {
  const value = String(href ?? "").trim();
  if (!value) return "";

  try {
    const url = value.startsWith("http") ? new URL(value) : new URL(value, "https://pokopiadex.com");
    const match = url.pathname.match(/\/pokedex\/favorites\/([^/]+)/i);
    return match?.[1] ?? "";
  } catch {
    const match = value.match(/\/pokedex\/favorites\/([^/?#]+)/i);
    return match?.[1] ?? "";
  }
}

export function resolveFavoriteSlug(label: string, href?: string | null): string {
  return favoriteHrefToSlug(href) || favoriteLabelToSlug(label);
}
