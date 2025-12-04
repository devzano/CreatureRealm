// components/PokemonMaps/AlabasterIcelandsMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type AlabasterIcelandsMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats from your HTML for Alabaster Icelands
const ALABASTER_TOGGLES: MapCategoryToggle[] = [
  {
    id: "pokemon",
    label: "Pokémon",
    kind: "parent",
    values: [
      "map-945",  // Pokemon
      "map-950",  // Alpha Pokemon
      "map-1168", // Legendary Pokemon
      "map-1303", // Mythical Pokémon
      "map-947",  // Noble Pokemon
    ],
  },
  {
    id: "pois",
    label: "POIs",
    kind: "parent",
    values: [
      "map-922", // Points of Interest
    ],
  },
  {
    id: "wisps",
    label: "Wisps",
    kind: "parent",
    values: ["map-2435"],
  },
  {
    id: "unowns",
    label: "Unowns",
    kind: "parent",
    values: ["map-1014"],
  },
  {
    id: "dig-sites",
    label: "Dig Sites",
    kind: "parent",
    values: ["map-2436"],
  },
  {
    id: "old-verses",
    label: "Old Verses",
    kind: "parent",
    values: ["map-1351"],
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
  {
    id: "requests",
    label: "Requests",
    kind: "parent",
    values: ["map-1464"],
  },
  {
    id: "npcs",
    label: "NPCs",
    kind: "parent",
    values: [
      "map-1374", // NPCs
      "map-1459", // Miss Fortune Sisters
      "map-1482", // NPCs (Galaxy Hall)
    ],
  },
];

const AlabasterIcelandsMapModal: React.FC<AlabasterIcelandsMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Alabaster Icelands Map"
      subtitle="Pokémon Legends: Arceus"
      url="https://www.gamerguides.com/pokemon-legends-arceus/maps/alabaster-icelands"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Alabaster Icelands map section."
      mapCategoryToggles={ALABASTER_TOGGLES}
    />
  );
};

export default AlabasterIcelandsMapModal;
