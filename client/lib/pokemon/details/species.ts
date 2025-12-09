// lib/pokemon/pokeapi/species.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type PokemonSpeciesVariety = {
  is_default: boolean;
  pokemon: NamedAPIResource;
};

export type PokemonSpeciesPokedexNumber = {
  entry_number: number;
  pokedex: NamedAPIResource;
};

export type PokemonSpecies = {
  id: number;
  name: string;

  evolution_chain: {
    url: string;
  } | null;

  // National / regional dex numbers
  pokedex_numbers?: PokemonSpeciesPokedexNumber[];

  color?: {
    name: string;
    url: string;
  };

  varieties?: PokemonSpeciesVariety[];

  gender_rate: number;
  capture_rate: number;
  base_happiness: number;

  growth_rate?: {
    name: string;
    url: string;
  };

  habitat?: {
    name: string;
    url: string;
  } | null;

  shape?: {
    name: string;
    url: string;
  } | null;

  egg_groups?: {
    name: string;
    url: string;
  }[];
};

/**
 * Evolution details as returned by PokeAPI on each evolves_to link.
 * This is where things like "trade", "use-item", "min_level", etc. live.
 */
export type EvolutionDetail = {
  item: NamedAPIResource | null;
  trigger: NamedAPIResource | null;
  gender: number | null;
  held_item: NamedAPIResource | null;
  known_move: NamedAPIResource | null;
  known_move_type: NamedAPIResource | null;
  location: NamedAPIResource | null;
  min_affection: number | null;
  min_beauty: number | null;
  min_happiness: number | null;
  min_level: number | null;
  needs_overworld_rain: boolean;
  party_species: NamedAPIResource | null;
  party_type: NamedAPIResource | null;
  relative_physical_stats: number | null;
  time_of_day: string;
  trade_species: NamedAPIResource | null;
  turn_upside_down: boolean;
};

export type EvolutionChainLink = {
  species: NamedAPIResource;
  evolves_to: EvolutionChainLink[];

  // 👇 this is what the detail screen inspects
  evolution_details: EvolutionDetail[];
};

export type EvolutionChain = {
  id: number;
  chain: EvolutionChainLink;

  // sometimes present, not strictly needed for your use-case
  baby_trigger_item?: NamedAPIResource | null;
};

/**
 * Species details (for evolution chain, forms, etc.)
 */
export async function getPokemonSpecies(
  idOrName: string | number
): Promise<PokemonSpecies> {
  return fetchJson<PokemonSpecies>(`/pokemon-species/${idOrName}`);
}

/**
 * Evolution chain by URL from species.evolution_chain.url
 */
export async function getEvolutionChainByUrl(
  url: string
): Promise<EvolutionChain> {
  // fetchJson in your base module should already handle full URLs
  return fetchJson<EvolutionChain>(url);
}
