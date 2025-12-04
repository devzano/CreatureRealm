// lib/api/pokeapi/encounters.ts
import { fetchJson, NamedAPIResource } from "@/lib/pokemon/base";

export type EncounterConditionValue = NamedAPIResource;
export type EncounterMethod = NamedAPIResource;
export type VersionRef = NamedAPIResource;

export type Encounter = {
  min_level: number;
  max_level: number;
  condition_values: EncounterConditionValue[];
  chance: number;
  method: EncounterMethod;
};

export type VersionEncounterDetail = {
  version: VersionRef;
  max_chance: number;
  encounter_details: Encounter[];
};

export type LocationAreaEncounter = {
  location_area: NamedAPIResource;
  version_details: VersionEncounterDetail[];
};

/**
 * https://pokeapi.co/api/v2/pokemon/{id or name}/encounters
 */
export async function getPokemonEncounters(
  idOrName: string | number
): Promise<LocationAreaEncounter[]> {
  return fetchJson<LocationAreaEncounter[]>(
    `/pokemon/${idOrName}/encounters`
  );
}
