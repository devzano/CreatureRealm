// store/palworldCollectionStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HuntMethod = "none" | "random" | "masuda" | "outbreak" | "other";

export type PalworldCollectionEntry = {
  caught: boolean;
  lucky: boolean;
  alpha: boolean;

  base: boolean;
  journal: boolean;
  mission: boolean;

  luckyHuntCount: number;
  luckyHuntMethod: HuntMethod;

  notes?: string;
};

type Team = {
  id: string;
  name: string;
  memberIds: string[];
};

type PalworldCollectionState = {
  entries: Record<string, PalworldCollectionEntry>;
  favorites: Record<string, boolean>;
  teams: Record<string, Team>;

  toggleCaught: (dexId: string) => void;
  toggleLucky: (dexId: string) => void;
  toggleAlpha: (dexId: string) => void;
  getEntry: (dexId: string) => PalworldCollectionEntry;

  toggleBase: (dexId: string) => void;
  toggleJournal: (dexId: string) => void;
  toggleMission: (dexId: string) => void;

  toggleFavorite: (dexId: string) => void;
  isFavorite: (dexId: string) => boolean;

  // lucky hunt
  incrementLuckyHuntCount: (dexId: string) => void;
  decrementLuckyHuntCount: (dexId: string) => void;
  setLuckyHuntMethod: (dexId: string, method: HuntMethod) => void;

  // notes
  setNotes: (dexId: string, notes: string) => void;

  // teams
  createTeam: (team: Omit<Team, "memberIds">) => string;
  addToTeam: (teamId: string, dexId: string) => void;
  removeFromTeam: (teamId: string, dexId: string) => void;
  deleteTeam: (teamId: string) => void;
};

const defaultEntry: PalworldCollectionEntry = {
  caught: false,
  lucky: false,
  alpha: false,

  base: false,
  journal: false,
  mission: false,

  luckyHuntCount: 0,
  luckyHuntMethod: "none",
  notes: "",
};

function makeKey(dexId: string): string {
  const s = String(dexId ?? "").trim();
  return s;
}

let teamCounter = 1;

const STORE_VERSION = 5;

export const usePalworldCollectionStore = create<PalworldCollectionState>()(
  persist(
    (set, get) => ({
      entries: {},
      favorites: {},
      teams: {},

      toggleCaught: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;
          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, caught: !prev.caught },
            },
          };
        }),

      toggleLucky: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;
          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, lucky: !prev.lucky },
            },
          };
        }),

      toggleAlpha: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;
          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, alpha: !prev.alpha },
            },
          };
        }),

      getEntry: (dexId) => {
        const key = makeKey(dexId);
        if (!key) return defaultEntry;
        const raw = get().entries[key];
        return raw ? { ...defaultEntry, ...raw } : defaultEntry;
      },

      toggleBase: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;
          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, base: !prev.base },
            },
          };
        }),

      toggleJournal: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;
          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, journal: !prev.journal },
            },
          };
        }),

      toggleMission: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;
          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, mission: !prev.mission },
            },
          };
        }),

      toggleFavorite: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;

          const next = { ...state.favorites };
          if (next[key]) delete next[key];
          else next[key] = true;

          return { favorites: next };
        }),

      isFavorite: (dexId) => {
        const key = makeKey(dexId);
        if (!key) return false;
        return !!get().favorites[key];
      },

      incrementLuckyHuntCount: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;

          const prev = state.entries[key] ?? defaultEntry;
          const nextCount = (prev.luckyHuntCount || 0) + 1;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, luckyHuntCount: nextCount },
            },
          };
        }),

      decrementLuckyHuntCount: (dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;

          const prev = state.entries[key] ?? defaultEntry;
          const nextCount = Math.max((prev.luckyHuntCount || 0) - 1, 0);

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, luckyHuntCount: nextCount },
            },
          };
        }),

      setLuckyHuntMethod: (dexId, method) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;

          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, luckyHuntMethod: method },
            },
          };
        }),

      setNotes: (dexId, notes) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;

          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: { ...defaultEntry, ...prev, notes },
            },
          };
        }),

      createTeam: ({ id, name }) => {
        const teamId = id || `pal-team-${teamCounter++}`;

        set((state) => ({
          teams: {
            ...state.teams,
            [teamId]: {
              id: teamId,
              name,
              memberIds: [],
            },
          },
        }));

        return teamId;
      },

      addToTeam: (teamId, dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;

          const team = state.teams[teamId];
          if (!team) return state;
          if (team.memberIds.includes(key)) return state;

          return {
            teams: {
              ...state.teams,
              [teamId]: { ...team, memberIds: [...team.memberIds, key] },
            },
          };
        }),

      removeFromTeam: (teamId, dexId) =>
        set((state) => {
          const key = makeKey(dexId);
          if (!key) return state;

          const team = state.teams[teamId];
          if (!team) return state;

          return {
            teams: {
              ...state.teams,
              [teamId]: { ...team, memberIds: team.memberIds.filter((x) => x !== key) },
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
      name: "creaturerealm-palworld-collection",
      storage: createJSONStorage(() => AsyncStorage),
      version: STORE_VERSION,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;

        if (version < 2) {
          const prev = persistedState as any;

          const prevEntries: Record<string, any> = { ...(prev.entries ?? {}) };
          const nextEntries: Record<string, any> = {};

          for (const rawKey of Object.keys(prevEntries)) {
            const k = String(rawKey ?? "").trim();
            if (!k) continue;

            const e = prevEntries[rawKey] ?? {};
            const hasLucky = Object.prototype.hasOwnProperty.call(e, "lucky");
            const hasShiny = Object.prototype.hasOwnProperty.call(e, "shiny");

            if (!hasLucky && hasShiny) {
              nextEntries[k] = {
                ...defaultEntry,
                ...e,
                lucky: !!e.shiny,
                luckyHuntCount: Number(e.shinyHuntCount || 0),
                luckyHuntMethod: (e.shinyHuntMethod ?? "none") as HuntMethod,
              };
              delete nextEntries[k].shiny;
              delete nextEntries[k].shinyHuntCount;
              delete nextEntries[k].shinyHuntMethod;
            } else {
              nextEntries[k] = {
                ...defaultEntry,
                ...e,
              };
            }
          }

          const prevFav = prev.favorites ?? {};
          const nextFav: Record<string, boolean> = {};
          for (const rawKey of Object.keys(prevFav)) {
            const k = String(rawKey ?? "").trim();
            if (!k) continue;
            nextFav[k] = !!prevFav[rawKey];
          }

          const prevTeams = prev.teams ?? {};
          const nextTeams: Record<string, Team> = {};
          for (const teamId of Object.keys(prevTeams)) {
            const t = prevTeams[teamId];
            if (!t) continue;

            const ids = Array.isArray(t.memberIds) ? t.memberIds : [];
            nextTeams[teamId] = {
              id: String(t.id ?? teamId),
              name: String(t.name ?? ""),
              memberIds: ids.map((x: any) => String(x ?? "").trim()).filter(Boolean),
            };
          }

          return {
            ...prev,
            entries: nextEntries,
            favorites: nextFav,
            teams: nextTeams,
          };
        }

        if (version < 4) {
          const prev = persistedState as any;
          const prevEntries: Record<string, any> = { ...(prev.entries ?? {}) };
          const nextEntries: Record<string, any> = {};

          for (const rawKey of Object.keys(prevEntries)) {
            const k = String(rawKey ?? "").trim();
            if (!k) continue;

            const e = prevEntries[rawKey] ?? {};
            nextEntries[k] = {
              ...defaultEntry,
              ...e,
              mission: typeof e.mission === "boolean" ? e.mission : false,
            };
          }

          return {
            ...prev,
            entries: nextEntries,
          };
        }

        if (version < 5) {
          const prev = persistedState as any;
          const prevEntries: Record<string, any> = { ...(prev.entries ?? {}) };
          const nextEntries: Record<string, any> = {};

          for (const rawKey of Object.keys(prevEntries)) {
            const k = String(rawKey ?? "").trim();
            if (!k) continue;

            const e = prevEntries[rawKey] ?? {};
            nextEntries[k] = {
              ...defaultEntry,
              ...e,
              base: typeof e.base === "boolean" ? e.base : false,
            };
          }

          return {
            ...prev,
            entries: nextEntries,
          };
        }

        return persistedState;
      },
    }
  )
);
