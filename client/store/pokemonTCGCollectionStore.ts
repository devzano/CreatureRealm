import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PokemonTCGCollectionEntry = {
  owned: boolean;
  wanted: boolean;
  count: number;
  notes?: string;
};

type PokemonTCGCollectionState = {
  entries: Record<string, PokemonTCGCollectionEntry>;
  getEntry: (cardId: string) => PokemonTCGCollectionEntry;
  toggleOwned: (cardId: string) => void;
  toggleWanted: (cardId: string) => void;
  setCount: (cardId: string, count: number) => void;
  setNotes: (cardId: string, notes: string) => void;
};

const defaultEntry: PokemonTCGCollectionEntry = {
  owned: false,
  wanted: false,
  count: 0,
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
    }),
    {
      name: "creaturerealm-pokemon-tcg-collection",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
