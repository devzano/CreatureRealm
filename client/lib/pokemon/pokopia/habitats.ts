const POKOPIA_BASE_URL = "https://pokopiadex.com";
const HABITATS_TOKEN = '\\"allHabitats\\":';

const HABITAT_GROUPS = [
  { path: "/habitats", label: "Habitats", slug: "habitats" },
  { path: "/habitats/event", label: "Event Habitats", slug: "event-habitats" },
] as const;

export type PokopiaHabitatPokemon = {
  id: number;
  name: string;
  slug: string;
};

export type PokopiaHabitat = {
  id: number;
  slug: string;
  groupSlug: string;
  groupLabel: string;
  name: string;
  number: string;
  description: string;
  event: string;
  imageSrc: string;
  imageUrl: string;
  pokemon: PokopiaHabitatPokemon[];
  pokemonIds: string[];
};

let habitatCache: PokopiaHabitat[] | null = null;
let habitatsPromise: Promise<PokopiaHabitat[]> | null = null;

function extractEscapedJsonArray(source: string, token: string): string {
  const tokenIndex = source.indexOf(token);
  if (tokenIndex < 0) {
    throw new Error("Pokopia habitats data was not found in the page.");
  }

  const start = source.indexOf("[", tokenIndex);
  if (start < 0) {
    throw new Error("Pokopia habitats array start was not found.");
  }

  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];

    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error("Pokopia habitats array end was not found.");
}

function decodeEscapedJson(escapedJson: string): string {
  return escapedJson
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function normalizeField(value: unknown): string {
  const text = String(value ?? "").trim();
  return text === "$undefined" ? "" : text;
}

function normalizeHabitats(
  raw: any[],
  group: { label: string; slug: string }
): PokopiaHabitat[] {
  return raw.map((item) => ({
    id: Number(item?.id ?? 0),
    slug: normalizeField(item?.slug),
    groupSlug: group.slug,
    groupLabel: group.label,
    name: normalizeField(item?.name),
    number: normalizeField(item?.number),
    description: normalizeField(item?.description),
    event: normalizeField(item?.event),
    imageSrc: normalizeField(item?.imageSrc),
    imageUrl: String(item?.imageSrc ?? "").startsWith("http")
      ? String(item.imageSrc)
      : `${POKOPIA_BASE_URL}${normalizeField(item?.imageSrc)}`,
    pokemon: Array.isArray(item?.pokemon)
      ? item.pokemon.map((pokemon: any) => ({
        id: Number(pokemon?.id ?? 0),
        name: normalizeField(pokemon?.name),
        slug: normalizeField(pokemon?.slug),
      }))
      : [],
    pokemonIds: Array.isArray(item?.pokemonIds)
      ? item.pokemonIds.map((pokemonId: any) => String(pokemonId))
      : [],
  }));
}

export async function fetchPokopiaHabitats(): Promise<PokopiaHabitat[]> {
  if (habitatCache) {
    return habitatCache;
  }

  if (habitatsPromise) {
    return habitatsPromise;
  }

  habitatsPromise = (async () => {
    const groupResults = await Promise.all(
      HABITAT_GROUPS.map(async (group) => {
        const response = await fetch(`${POKOPIA_BASE_URL}${group.path}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch Pokopia habitats (${group.slug}, ${response.status}).`);
        }

        const html = await response.text();
        const escapedJsonArray = extractEscapedJsonArray(html, HABITATS_TOKEN);
        const jsonArray = decodeEscapedJson(escapedJsonArray);
        const parsed = JSON.parse(jsonArray);

        return normalizeHabitats(Array.isArray(parsed) ? parsed : [], group);
      })
    );

    const normalized = groupResults.flat();
    habitatCache = normalized;
    return normalized;
  })();

  try {
    return await habitatsPromise;
  } finally {
    habitatsPromise = null;
  }
}
