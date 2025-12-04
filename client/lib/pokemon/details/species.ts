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

  // 👇 add this if it's not already there
  pokedex_numbers?: PokemonSpeciesPokedexNumber[];

  // existing fields...
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

export type EvolutionChainLink = {
  species: NamedAPIResource;
  evolves_to: EvolutionChainLink[];
};

export type EvolutionChain = {
  id: number;
  chain: EvolutionChainLink;
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
  return fetchJson<EvolutionChain>(url);
}
