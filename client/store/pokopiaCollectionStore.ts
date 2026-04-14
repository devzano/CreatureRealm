import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PokopiaCollectKind = "item" | "recipe";

type PokopiaCollectionState = {
  collected: Record<PokopiaCollectKind, string[]>;
  isCollected: (kind: PokopiaCollectKind, slug: string) => boolean;
  toggleCollected: (kind: PokopiaCollectKind, slug: string) => void;
};

function normalizeSlug(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean)));
}

export const usePokopiaCollectionStore = create<PokopiaCollectionState>()(
  persist(
    (set, get) => ({
      collected: {
        item: [],
        recipe: [],
      },

      isCollected: (kind, slug) => {
        const normalized = normalizeSlug(slug);
        if (!normalized) return false;
        return get().collected[kind].includes(normalized);
      },

      toggleCollected: (kind, slug) =>
        set((state) => {
          const normalized = normalizeSlug(slug);
          if (!normalized) return state;

          const current = state.collected[kind];
          const next =
            current.includes(normalized)
              ? current.filter((entry) => entry !== normalized)
              : unique([...current, normalized]);

          return {
            collected: {
              ...state.collected,
              [kind]: next,
            },
          };
        }),
    }),
    {
      name: "pokopia.collection.v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
