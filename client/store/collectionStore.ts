// state/collectionStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HuntMethod = "none" | "random" | "masuda" | "outbreak" | "other";

export type CollectionEntry = {
  caught: boolean;
  shiny: boolean;
  alpha: boolean;

  shinyHuntCount: number;
  shinyHuntMethod: HuntMethod;

  notes?: string;
};

type Team = {
  id: string;
  name: string;
  gameId: string;
  memberIds: number[]; // species IDs
};

type PokemonCollectionState = {
  entries: Record<string, CollectionEntry>;
  favorites: Record<number, boolean>;
  teams: Record<string, Team>;

  toggleCaught: (gameId: string, speciesId: number) => void;
  toggleShiny: (gameId: string, speciesId: number) => void;
  toggleAlpha: (gameId: string, speciesId: number) => void;
  getEntry: (gameId: string, speciesId: number) => CollectionEntry;

  toggleFavorite: (speciesId: number) => void;
  isFavorite: (speciesId: number) => boolean;

  // shiny hunt
  incrementHuntCount: (gameId: string, speciesId: number) => void;
  decrementHuntCount: (gameId: string, speciesId: number) => void;
  setHuntMethod: (
    gameId: string,
    speciesId: number,
    method: HuntMethod
  ) => void;

  // notes
  setNotes: (gameId: string, speciesId: number, notes: string) => void;

  // teams API
  createTeam: (team: Omit<Team, "memberIds">) => string;
  addToTeam: (teamId: string, speciesId: number) => void;
  removeFromTeam: (teamId: string, speciesId: number) => void;
  deleteTeam: (teamId: string) => void;
};

const defaultEntry: CollectionEntry = {
  caught: false,
  shiny: false,
  alpha: false,
  shinyHuntCount: 0,
  shinyHuntMethod: "none",
  notes: "",
};

const makeKey = (gameId: string, speciesId: number) =>
  `${gameId}:${speciesId}`;

let teamCounter = 1;

export const usePokemonCollectionStore = create<PokemonCollectionState>()(
  persist(
    (set, get) => ({
      entries: {},
      favorites: {},
      teams: {},

      toggleCaught: (gameId, speciesId) =>
        set((state) => {
          const key = makeKey(gameId, speciesId);
          const prev = state.entries[key] ?? defaultEntry;
          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, caught: !prev.caught },
            },
          };
        }),

      toggleShiny: (gameId, speciesId) =>
        set((state) => {
          const key = makeKey(gameId, speciesId);
          const prev = state.entries[key] ?? defaultEntry;
          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, shiny: !prev.shiny },
            },
          };
        }),

      toggleAlpha: (gameId, speciesId) =>
        set((state) => {
          const key = makeKey(gameId, speciesId);
          const prev = state.entries[key] ?? defaultEntry;
          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, alpha: !prev.alpha },
            },
          };
        }),

      getEntry: (gameId, speciesId) => {
        const key = makeKey(gameId, speciesId);
        const raw = get().entries[key];
        return raw ? { ...defaultEntry, ...raw } : defaultEntry;
      },

      toggleFavorite: (speciesId) =>
        set((state) => {
          const next = { ...state.favorites };
          if (next[speciesId]) {
            delete next[speciesId];
          } else {
            next[speciesId] = true;
          }
          return { favorites: next };
        }),

      isFavorite: (speciesId) => {
        return !!get().favorites[speciesId];
      },

      incrementHuntCount: (gameId, speciesId) =>
        set((state) => {
          const key = makeKey(gameId, speciesId);
          const prev = state.entries[key] ?? defaultEntry;
          const nextCount = (prev.shinyHuntCount || 0) + 1;
          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                shinyHuntCount: nextCount,
              },
            },
          };
        }),

      decrementHuntCount: (gameId, speciesId) =>
        set((state) => {
          const key = makeKey(gameId, speciesId);
          const prev = state.entries[key] ?? defaultEntry;
          const nextCount = Math.max((prev.shinyHuntCount || 0) - 1, 0);
          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                shinyHuntCount: nextCount,
              },
            },
          };
        }),

      setHuntMethod: (gameId, speciesId, method) =>
        set((state) => {
          const key = makeKey(gameId, speciesId);
          const prev = state.entries[key] ?? defaultEntry;
          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                shinyHuntMethod: method,
              },
            },
          };
        }),

      setNotes: (gameId, speciesId, notes) =>
        set((state) => {
          const key = makeKey(gameId, speciesId);
          const prev = state.entries[key] ?? defaultEntry;
          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                notes,
              },
            },
          };
        }),

      createTeam: ({ id, name, gameId }) => {
        const teamId = id || `team-${teamCounter++}`;
        set((state) => ({
          teams: {
            ...state.teams,
            [teamId]: {
              id: teamId,
              name,
              gameId,
              memberIds: [],
            },
          },
        }));
        return teamId;
      },

      addToTeam: (teamId, speciesId) =>
        set((state) => {
          const team = state.teams[teamId];
          if (!team) return state;
          if (team.memberIds.includes(speciesId)) return state;
          return {
            teams: {
              ...state.teams,
              [teamId]: {
                ...team,
                memberIds: [...team.memberIds, speciesId],
              },
            },
          };
        }),

      removeFromTeam: (teamId, speciesId) =>
        set((state) => {
          const team = state.teams[teamId];
          if (!team) return state;
          return {
            teams: {
              ...state.teams,
              [teamId]: {
                ...team,
                memberIds: team.memberIds.filter((id) => id !== speciesId),
              },
            },
          };
        }),

      deleteTeam: (teamId) =>
        set((state) => {
          const next = { ...state.teams };
          delete next[teamId];
          return { teams: next };
        }),
    }),
    {
      name: "creaturerealm-collection",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
