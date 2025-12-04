// components/PokemonMaps/ObsidianFieldlandsMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type ObsidianFieldlandsMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Values taken from the cat[] inputs in your pasted HTML for Obsidian Fieldlands.
const OBSIDIAN_TOGGLES: MapCategoryToggle[] = [
  {
    id: "pokemon",
    label: "Pokémon",
    kind: "parent",
    values: [
      "map-945", // Pokemon
      "map-950", // Alpha Pokemon
      "map-1168", // Legendary Pokemon
      "map-1303", // Mythical Pokémon
      "map-947", // Noble Pokemon
      "map-1014", // Unowns Pokemon
    ],
  },
  {
    id: "pois",
    label: "POIs",
    kind: "parent",
    values: [
      "map-922", // Points of Interest
      // you can add more here later, e.g. NPCs / Requests:
      // "map-1374", // NPCs
      // "map-1464", // Requests
      // "map-1459", // Miss Fortune Sisters
    ],
  },
  {
    id: "wisps",
    label: "Wisps",
    kind: "parent",
    values: ["map-2435"], // Wisps
  },
  {
    id: "outbreaks",
    label: "Outbreaks",
    kind: "parent",
    values: [
      "map-2437", // Space Time Distortions
      "map-1863", // Mass Outbreaks
    ],
  },
];

const ObsidianFieldlandsMapModal: React.FC<
  ObsidianFieldlandsMapModalProps
> = (props) => {
  return (
    <PokemonMapModal
      {...props}
      title="Obsidian Fieldlands Map"
      subtitle="Pokémon Legends: Arceus"
      url="https://www.gamerguides.com/pokemon-legends-arceus/maps/obsidian-fieldlands"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Obsidian Fieldlands map section."
      mapCategoryToggles={OBSIDIAN_TOGGLES}
    />
  );
};

export default ObsidianFieldlandsMapModal;
