// components/PokemonMaps/CrimsonMirelandsMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type CrimsonMirelandsMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Values taken from the cat[] inputs for Crimson Mirelands.
const CRIMSON_TOGGLES: MapCategoryToggle[] = [
  {
    id: "pokemon",
    label: "Pokémon",
    kind: "parent",
    values: [
      "map-945",  // Pokemon
      "map-950",  // Alpha Pokemon
      "map-1168", // Legendary Pokemon
      "map-947",  // Noble Pokemon
      "map-1014", // Unowns
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
    values: [
      "map-2435", // Wisps
    ],
  },
  {
    id: "dig-sites",
    label: "Dig Sites",
    kind: "parent",
    values: [
      "map-2436", // Dig Sites
    ],
  },
  {
    id: "old-verses",
    label: "Old Verses",
    kind: "parent",
    values: [
      "map-1351", // Old Verses
    ],
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
    id: "npcs",
    label: "NPCs",
    kind: "parent",
    values: [
      "map-1374", // NPCs
      "map-1459", // Miss Fortune Sisters
    ],
  },
  {
    id: "requests",
    label: "Requests",
    kind: "parent",
    values: [
      "map-1464", // Requests
    ],
  },
];

const CrimsonMirelandsMapModal: React.FC<CrimsonMirelandsMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Crimson Mirelands Map"
      subtitle="Pokémon Legends: Arceus"
      url="https://www.gamerguides.com/pokemon-legends-arceus/maps/crimson-mirelands"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Crimson Mirelands map section."
      mapCategoryToggles={CRIMSON_TOGGLES}
    />
  );
};

export default CrimsonMirelandsMapModal;
