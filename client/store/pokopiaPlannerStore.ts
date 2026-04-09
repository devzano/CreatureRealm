import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PokopiaPlannerZoneId =
  | "withered-wasteland"
  | "bleak-beach"
  | "rocky-ridges"
  | "sparkling-skylands"
  | "palette-town";

export type PokopiaPlannerPokemon = {
  id: string;
  speciesId: number;
  name: string;
  gameDexNumber: number;
  slug?: string;
  imageUrl?: string;
};

export type PokopiaPlannerBuilding = {
  id: string;
  name: string;
  buildingSlug?: string | null;
  imageUrl?: string | null;
  slots: number;
  buildingType?: string | null;
  source: "game" | "custom";
  pokemon: PokopiaPlannerPokemon[];
};

export type PokopiaPlannerZone = {
  id: PokopiaPlannerZoneId;
  name: string;
  environmentalLevel: number;
  buildings: PokopiaPlannerBuilding[];
  pokemon: PokopiaPlannerPokemon[];
};

type PlannerPokemonInput = Omit<PokopiaPlannerPokemon, "id">;
type PlannerBuildingInput = {
  name: string;
  buildingSlug?: string | null;
  imageUrl?: string | null;
  slots: number;
  buildingType?: string | null;
  source: "game" | "custom";
};

type PokopiaPlannerState = {
  zones: Record<PokopiaPlannerZoneId, PokopiaPlannerZone>;
  setEnvironmentalLevel: (zoneId: PokopiaPlannerZoneId, level: number) => void;
  addBuilding: (zoneId: PokopiaPlannerZoneId) => string;
  removeBuilding: (zoneId: PokopiaPlannerZoneId, buildingId: string) => void;
  setBuildingCatalogEntry: (
    zoneId: PokopiaPlannerZoneId,
    buildingId: string,
    payload: PlannerBuildingInput
  ) => void;
  addPokemonToZone: (zoneId: PokopiaPlannerZoneId, pokemon: PlannerPokemonInput) => void;
  removePokemonFromZone: (zoneId: PokopiaPlannerZoneId, pokemonId: string) => void;
  addPokemonToBuilding: (
    zoneId: PokopiaPlannerZoneId,
    buildingId: string,
    pokemon: PlannerPokemonInput
  ) => void;
  removePokemonFromBuilding: (
    zoneId: PokopiaPlannerZoneId,
    buildingId: string,
    pokemonId: string
  ) => void;
};

const ZONE_DEFS: { id: PokopiaPlannerZoneId; name: string }[] = [
  { id: "withered-wasteland", name: "Withered Wasteland" },
  { id: "bleak-beach", name: "Bleak Beach" },
  { id: "rocky-ridges", name: "Rocky Ridges" },
  { id: "sparkling-skylands", name: "Sparkling Skylands" },
  { id: "palette-town", name: "Palette Town" },
];

const clampLevel = (value: number) => Math.max(1, Math.min(10, Math.round(value || 1)));

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultZones(): Record<PokopiaPlannerZoneId, PokopiaPlannerZone> {
  return ZONE_DEFS.reduce((acc, zone) => {
    acc[zone.id] = {
      id: zone.id,
      name: zone.name,
      environmentalLevel: 1,
      buildings: [],
      pokemon: [],
    };
    return acc;
  }, {} as Record<PokopiaPlannerZoneId, PokopiaPlannerZone>);
}

function makePlannerPokemon(pokemon: PlannerPokemonInput): PokopiaPlannerPokemon {
  return {
    ...pokemon,
    id: makeId(`pokemon-${pokemon.speciesId}`),
  };
}

function removeSpeciesFromZones(
  zones: Record<PokopiaPlannerZoneId, PokopiaPlannerZone>,
  speciesId: number
): Record<PokopiaPlannerZoneId, PokopiaPlannerZone> {
  return Object.fromEntries(
    Object.entries(zones).map(([zoneId, zone]) => [
      zoneId,
      {
        ...zone,
        pokemon: zone.pokemon.filter((pokemon) => pokemon.speciesId !== speciesId),
        buildings: zone.buildings.map((building) => ({
          ...building,
          pokemon: building.pokemon.filter((pokemon) => pokemon.speciesId !== speciesId),
        })),
      },
    ])
  ) as Record<PokopiaPlannerZoneId, PokopiaPlannerZone>;
}

export const usePokopiaPlannerStore = create<PokopiaPlannerState>()(
  persist(
    (set) => ({
      zones: createDefaultZones(),

      setEnvironmentalLevel: (zoneId, level) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              environmentalLevel: clampLevel(level),
            },
          },
        })),

      addBuilding: (zoneId) => {
        const nextId = makeId(`building-${zoneId}`);
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              buildings: [
                ...state.zones[zoneId].buildings,
                {
                  id: nextId,
                  name: `New Building ${state.zones[zoneId].buildings.length + 1}`,
                  buildingSlug: null,
                  imageUrl: null,
                  slots: 1,
                  buildingType: "Custom",
                  source: "custom",
                  pokemon: [],
                },
              ],
            },
          },
        }));
        return nextId;
      },

      removeBuilding: (zoneId, buildingId) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              buildings: state.zones[zoneId].buildings.filter((building) => building.id !== buildingId),
            },
          },
        })),

      setBuildingCatalogEntry: (zoneId, buildingId, payload) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              buildings: state.zones[zoneId].buildings.map((building) =>
                building.id === buildingId
                  ? {
                      ...building,
                      name: payload.name,
                      buildingSlug: payload.buildingSlug ?? null,
                      imageUrl: payload.imageUrl ?? null,
                      slots: Math.max(1, Math.min(4, Math.round(payload.slots || 1))),
                      buildingType: payload.buildingType ?? null,
                      source: payload.source,
                      pokemon:
                        building.pokemon.length > Math.max(1, Math.min(4, Math.round(payload.slots || 1)))
                          ? building.pokemon.slice(0, Math.max(1, Math.min(4, Math.round(payload.slots || 1))))
                          : building.pokemon,
                    }
                  : building
              ),
            },
          },
        })),

      addPokemonToZone: (zoneId, pokemon) =>
        set((state) => {
          const cleanedZones = removeSpeciesFromZones(state.zones, pokemon.speciesId);
          return {
            zones: {
              ...cleanedZones,
              [zoneId]: {
                ...cleanedZones[zoneId],
                pokemon: [...cleanedZones[zoneId].pokemon, makePlannerPokemon(pokemon)],
              },
            },
          };
        }),

      removePokemonFromZone: (zoneId, pokemonId) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              pokemon: state.zones[zoneId].pokemon.filter((pokemon) => pokemon.id !== pokemonId),
            },
          },
        })),

      addPokemonToBuilding: (zoneId, buildingId, pokemon) =>
        set((state) => {
          const cleanedZones = removeSpeciesFromZones(state.zones, pokemon.speciesId);
          const targetZone = cleanedZones[zoneId];
          return {
            zones: {
              ...cleanedZones,
              [zoneId]: {
                ...targetZone,
                buildings: targetZone.buildings.map((building) => {
                  if (building.id !== buildingId) return building;
                  const capacity = Math.max(0, building.slots || 0);
                  if (capacity <= 0 || building.pokemon.length >= capacity) {
                    return building;
                  }
                  return {
                    ...building,
                    pokemon: [...building.pokemon, makePlannerPokemon(pokemon)],
                  };
                }),
              },
            },
          };
        }),

      removePokemonFromBuilding: (zoneId, buildingId, pokemonId) =>
        set((state) => ({
          zones: {
            ...state.zones,
            [zoneId]: {
              ...state.zones[zoneId],
              buildings: state.zones[zoneId].buildings.map((building) =>
                building.id === buildingId
                  ? {
                      ...building,
                      pokemon: building.pokemon.filter((pokemon) => pokemon.id !== pokemonId),
                    }
                  : building
              ),
            },
          },
        })),
    }),
    {
      name: "pokopia-planner-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
