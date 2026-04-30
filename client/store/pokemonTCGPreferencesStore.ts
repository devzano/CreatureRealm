import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PokemonTCGCardFilterPreset = {
  id: string;
  name: string;
  search: string;
  ownership: "all" | "owned" | "wanted" | "missing" | "duplicates";
  type: string | null;
  supertype: string | null;
  rarity: string | null;
};

type PokemonTCGPreferencesState = {
  savedCardFilters: PokemonTCGCardFilterPreset[];
  saveCardFilter: (preset: PokemonTCGCardFilterPreset) => void;
  deleteCardFilter: (presetId: string) => void;
};

export const usePokemonTCGPreferencesStore = create<PokemonTCGPreferencesState>()(
  persist(
    (set) => ({
      savedCardFilters: [],

      saveCardFilter: (preset) =>
        set((state) => {
          const next = state.savedCardFilters.filter((entry) => entry.id !== preset.id);
          return {
            savedCardFilters: [preset, ...next].slice(0, 12),
          };
        }),

      deleteCardFilter: (presetId) =>
        set((state) => ({
          savedCardFilters: state.savedCardFilters.filter((entry) => entry.id !== presetId),
        })),
    }),
    {
      name: "creaturerealm-pokemon-tcg-preferences",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
