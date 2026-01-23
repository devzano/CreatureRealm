// store/animalCrossingCollectionStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ACCollectionKind =
  | "villager"
  | "art"
  | "bug"
  | "clothing"
  | "fish"
  | "fossil"
  | "furniture"
  | "gyroid"
  | "interior"
  | "item"
  | "photo"
  | "recipe"
  | "seaCreature"
  | "tool";

export type ACCollectionEntry = {
  collected: boolean;
  count: number;
  notes?: string;
};

type ACCollectionState = {
  entries: Record<string, ACCollectionEntry>;
  toggleCollected: (kind: ACCollectionKind, id: string) => void;
  setCount: (kind: ACCollectionKind, id: string, count: number) => void;
  incrementCount: (kind: ACCollectionKind, id: string) => void;
  decrementCount: (kind: ACCollectionKind, id: string) => void;
  getEntry: (kind: ACCollectionKind, id: string) => ACCollectionEntry;
  setNotes: (kind: ACCollectionKind, id: string, notes: string) => void;
};

const defaultEntry: ACCollectionEntry = {
  collected: false,
  count: 0,
  notes: "",
};

const cleanId = (id: string) => String(id ?? "").trim();
const makeKey = (kind: ACCollectionKind, id: string) => `${kind}:${cleanId(id)}`;

const STORE_VERSION = 2;

export const useAnimalCrossingCollectionStore = create<ACCollectionState>()(
  persist(
    (set, get) => ({
      entries: {},

      toggleCollected: (kind, id) =>
        set((state) => {
          const key = makeKey(kind, id);
          const prev = state.entries[key] ?? defaultEntry;

          const nextCollected = !prev.collected;
          const nextCount = nextCollected ? Math.max(prev.count || 0, 1) : 0;

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                collected: nextCollected,
                count: nextCount,
              },
            },
          };
        }),

      setCount: (kind, id, count) =>
        set((state) => {
          const key = makeKey(kind, id);
          const prev = state.entries[key] ?? defaultEntry;

          const nextCount = Math.max(Number(count || 0), 0);
          const nextCollected = nextCount > 0 ? true : prev.collected;

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                collected: nextCollected,
                count: nextCollected ? nextCount : 0,
              },
            },
          };
        }),

      incrementCount: (kind, id) =>
        set((state) => {
          const key = makeKey(kind, id);
          const prev = state.entries[key] ?? defaultEntry;

          const nextCount = (prev.count || 0) + 1;

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                collected: true,
                count: nextCount,
              },
            },
          };
        }),

      decrementCount: (kind, id) =>
        set((state) => {
          const key = makeKey(kind, id);
          const prev = state.entries[key] ?? defaultEntry;

          const nextCount = Math.max((prev.count || 0) - 1, 0);

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                collected: nextCount > 0 ? true : false,
                count: nextCount,
              },
            },
          };
        }),

      getEntry: (kind, id) => {
        const key = makeKey(kind, id);
        return get().entries[key] ?? defaultEntry;
      },

      setNotes: (kind, id, notes) =>
        set((state) => {
          const key = makeKey(kind, id);
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
    }),
    {
      name: "creaturerealm-animalcrossing-collection",
      storage: createJSONStorage(() => AsyncStorage),
      version: STORE_VERSION,
      migrate: (persisted: any, version: number) => {
        return persisted;
      },
    }
  )
);

export function acMakeKey(kind: ACCollectionKind, id: string) {
  return makeKey(kind, id);
}
