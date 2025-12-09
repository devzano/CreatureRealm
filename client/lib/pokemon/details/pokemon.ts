// lib/pokemon/pokeapi/pokemon.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

// --- List / basic ---

export type PokemonListResult = {
  name: string;
  url: string;
};

export type PokemonListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListResult[];
};

// --- Types / sprites ---

export type PokemonTypeSlot = {
  slot: number;
  type: NamedAPIResource;
};

export type PokemonSpriteSet = {
  front_default: string | null;
  back_default: string | null;
  front_shiny: string | null;
  back_shiny: string | null;
  other?: {
    ["official-artwork"]?: {
      front_default: string | null;
      front_shiny?: string | null;
    };
    home?: {
      front_default: string | null;
      front_female?: string | null;
      front_shiny?: string | null;
      front_shiny_female?: string | null;
    };
    showdown?: {
      front_default: string | null;
      back_default?: string | null;
      front_shiny?: string | null;
      back_shiny?: string | null;
    };
  };
};

export type PokemonCries = {
  latest: string | null;
  legacy: string | null;
};

// --- Stats ---

export type PokemonStatRef = NamedAPIResource;

export type PokemonStat = {
  base_stat: number;
  effort: number;
  stat: PokemonStatRef;
};

// --- Abilities on a Pokémon ---

export type PokemonAbilityRef = NamedAPIResource;

export type PokemonAbilitySlot = {
  is_hidden: boolean;
  slot: number;
  ability: PokemonAbilityRef;
};

// --- Moves on a Pokémon ---

export type PokemonMoveRef = NamedAPIResource;

export type MoveLearnMethodRef = NamedAPIResource;

export type VersionGroupRef = NamedAPIResource;

export type PokemonMoveVersionDetail = {
  level_learned_at: number;
  move_learn_method: MoveLearnMethodRef;
  version_group: VersionGroupRef;
};

export type PokemonMoveSlot = {
  move: PokemonMoveRef;
  version_group_details: PokemonMoveVersionDetail[];
};

// --- Core Pokémon object ---

export type Pokemon = {
  id: number;
  name: string;
  types: PokemonTypeSlot[];
  sprites: PokemonSpriteSet;
  stats: PokemonStat[];
  abilities: PokemonAbilitySlot[];
  moves: PokemonMoveSlot[];
  cries?: PokemonCries;
};

/**
 * Fetches a page of Pokémon from the main Pokédex.
 */
export async function getPokemonList(
  limit = 50,
  offset = 0
): Promise<PokemonListResponse> {
  return fetchJson<PokemonListResponse>(
    `/pokemon?limit=${limit}&offset=${offset}`
  );
}

/**
 * Fetches a single Pokémon by id or name.
 */
export async function getPokemon(
  idOrName: string | number
): Promise<Pokemon> {
  return fetchJson<Pokemon>(`/pokemon/${idOrName}`);
}
