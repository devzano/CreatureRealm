// lib/pokemon/pokeapi/dex/gamedex.ts
import { CreatureRealmGame, games } from "@/lib/data/pokemon/gameFilters";
import { extractPokemonIdFromUrl } from "@/lib/pokemon/base";
import { getVersionGroup } from "@/lib/pokemon/dex/versionGroup";
import { getPokedex, Pokedex } from "@/lib/pokemon/dex/pokedex";

/**
 * Internal cache so we don't hammer PokeAPI every time.
 * gameId -> sorted list of National Dex ids
 */
const gameDexCache: Record<string, number[]> = {};
const gameDexPromises: Record<string, Promise<number[]> | undefined> = {};

export type GameId = CreatureRealmGame["id"];

/**
 * Find a CreatureRealmGame by id.
 */
export function getGameByIdStrict(id: GameId): CreatureRealmGame {
  const game = games.find((g) => g.id === id);
  if (!game) {
    throw new Error(`Unknown game id: ${id}`);
  }
  return game;
}

/**
 * Async: fetch (or return cached) National Dex ids for a given game.
 * Uses PokeAPI version-groups + pokedex endpoints.
 */
export async function fetchGameDexIds(gameId: GameId): Promise<number[]> {
  // 1) If we already have a cached result, return it
  if (gameDexCache[gameId]) {
    return gameDexCache[gameId];
  }

  // 2) If there is already a promise in-flight, reuse it
  if (gameDexPromises[gameId]) {
    return gameDexPromises[gameId]!;
  }

  const promise = (async () => {
    const game = getGameByIdStrict(gameId);

    // Collect pokedex names attached to this game's versionGroups,
    // but avoid "national", "updated-national", conquest, etc.
    const pokedexNames: string[] = [];

    for (const vgName of game.versionGroups) {
      const vg = await getVersionGroup(vgName);

      vg.pokedexes.forEach((pd) => {
        if (!pd.name) return;

        const name = pd.name;

        // Filter out global/side dexes that don't represent a game's main dex order
        if (name === "national") return;
        if (name.startsWith("updated-national")) return;
        if (name.includes("conquest")) return;
        if (name.includes("letsgo-gallery")) return;

        // Preserve first-seen order, avoid duplicates
        if (!pokedexNames.includes(name)) {
          pokedexNames.push(name);
        }
      });
    }

    // If we somehow have no pokedex names, fall back to old behavior (just in case)
    if (pokedexNames.length === 0) {
      const fallbackIdSet = new Set<number>();

      for (const vgName of game.versionGroups) {
        const vg = await getVersionGroup(vgName);
        const dexFetches: Promise<Pokedex>[] = vg.pokedexes
          .filter((pd) => !!pd.name)
          .map((pd) => getPokedex(pd.name));

        const dexes = await Promise.all(dexFetches);

        dexes.forEach((dex) => {
          dex.pokemon_entries.forEach((entry) => {
            const id = extractPokemonIdFromUrl(entry.pokemon_species.url);
            if (id != null) {
              fallbackIdSet.add(id);
            }
          });
        });
      }

      const fallbackIds = Array.from(fallbackIdSet);
      fallbackIds.sort((a, b) => a - b);
      gameDexCache[gameId] = fallbackIds;
      return fallbackIds;
    }

    // 3) Fetch each pokedex and build a mapping:
    // speciesId -> smallest entry_number across all selected pokedexes
    const entryMap = new Map<number, { id: number; order: number }>();

    const pokedexFetches: Promise<Pokedex>[] = pokedexNames.map((name) =>
      getPokedex(name)
    );
    const pokedexes = await Promise.all(pokedexFetches);

    pokedexes.forEach((dex) => {
      dex.pokemon_entries.forEach((entry) => {
        const id = extractPokemonIdFromUrl(entry.pokemon_species.url);
        if (id == null) return;

        const order = entry.entry_number;
        const existing = entryMap.get(id);

        // Keep the smallest dex entry number if the mon appears multiple times
        if (!existing || order < existing.order) {
          entryMap.set(id, { id, order });
        }
      });
    });

    // 4) Sort by "game dex" order (entry_number),
    // with a small tie-breaker on the id for stability
    const ordered = Array.from(entryMap.values()).sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id - b.id;
    });

    const ids = ordered.map((e) => e.id);

    // Cache and return
    gameDexCache[gameId] = ids;
    return ids;
  })();

  gameDexPromises[gameId] = promise;

  try {
    const result = await promise;
    return result;
  } finally {
    delete gameDexPromises[gameId];
  }
}

/**
 * Optional synchronous accessor if you only want already-loaded data.
 * Returns null if we have not loaded this game yet.
 */
export function getCachedGameDexIds(gameId: GameId): number[] | null {
  return gameDexCache[gameId] ?? null;
}
