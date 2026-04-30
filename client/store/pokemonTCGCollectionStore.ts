import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PokemonTCGCollectionEntry = {
  owned: boolean;
  wanted: boolean;
  count: number;
  digitalCount: number;
  notes?: string;
};

type PokemonTCGCollectionState = {
  entries: Record<string, PokemonTCGCollectionEntry>;
  getEntry: (cardId: string) => PokemonTCGCollectionEntry;
  toggleOwned: (cardId: string) => void;
  toggleWanted: (cardId: string) => void;
  setCount: (cardId: string, count: number) => void;
  setNotes: (cardId: string, notes: string) => void;
  addDigitalCopies: (cardId: string, amount?: number) => void;
  syncDigitalInventory: (inventory: Record<string, number>) => void;
};

const defaultEntry: PokemonTCGCollectionEntry = {
  owned: false,
  wanted: false,
  count: 0,
  digitalCount: 0,
  notes: "",
};

function normalizeCardId(cardId: string) {
  return String(cardId ?? "").trim().toLowerCase();
}

export const usePokemonTCGCollectionStore = create<PokemonTCGCollectionState>()(
  persist(
    (set, get) => ({
      entries: {},

      getEntry: (cardId) => {
        const key = normalizeCardId(cardId);
        return get().entries[key] ?? defaultEntry;
      },

      toggleOwned: (cardId) =>
        set((state) => {
          const key = normalizeCardId(cardId);
          if (!key) return state;

          const prev = state.entries[key] ?? defaultEntry;
          const owned = !prev.owned;

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                owned,
                count: owned ? Math.max(prev.count || 0, 1) : 0,
              },
            },
          };
        }),

      toggleWanted: (cardId) =>
        set((state) => {
          const key = normalizeCardId(cardId);
          if (!key) return state;

          const prev = state.entries[key] ?? defaultEntry;

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                wanted: !prev.wanted,
              },
            },
          };
        }),

      setCount: (cardId, count) =>
        set((state) => {
          const key = normalizeCardId(cardId);
          if (!key) return state;

          const prev = state.entries[key] ?? defaultEntry;
          const nextCount = Math.max(0, Number(count || 0));

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                owned: nextCount > 0,
                count: nextCount,
              },
            },
          };
        }),

      setNotes: (cardId, notes) =>
        set((state) => {
          const key = normalizeCardId(cardId);
          if (!key) return state;

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

      addDigitalCopies: (cardId, amount = 1) =>
        set((state) => {
          const key = normalizeCardId(cardId);
          if (!key) return state;

          const prev = state.entries[key] ?? defaultEntry;
          const nextDigitalCount = Math.max(0, (prev.digitalCount ?? 0) + Math.max(0, Number(amount || 0)));

          return {
            entries: {
              ...state.entries,
              [key]: {
                ...defaultEntry,
                ...prev,
                digitalCount: nextDigitalCount,
              },
            },
          };
        }),

      syncDigitalInventory: (inventory) =>
        set((state) => {
          const nextEntries = { ...state.entries };

          for (const [key, entry] of Object.entries(nextEntries)) {
            if ((entry.digitalCount ?? 0) > 0) {
              nextEntries[key] = {
                ...defaultEntry,
                ...entry,
                digitalCount: 0,
              };
            }
          }

          for (const [rawCardId, count] of Object.entries(inventory ?? {})) {
            const key = normalizeCardId(rawCardId);
            if (!key) continue;

            const prev = nextEntries[key] ?? defaultEntry;
            nextEntries[key] = {
              ...defaultEntry,
              ...prev,
              digitalCount: Math.max(0, Number(count || 0)),
            };
          }

          return { entries: nextEntries };
        }),
    }),
    {
      name: "creaturerealm-pokemon-tcg-collection",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
