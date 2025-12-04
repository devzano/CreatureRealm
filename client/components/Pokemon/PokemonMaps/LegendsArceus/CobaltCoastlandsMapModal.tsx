// components/PokemonMaps/CobaltCoastlandsMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type CobaltCoastlandsMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Values taken from the cat[] inputs for Cobalt Coastlands.
const COBALT_TOGGLES: MapCategoryToggle[] = [
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

const CobaltCoastlandsMapModal: React.FC<CobaltCoastlandsMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Cobalt Coastlands Map"
      subtitle="Pokémon Legends: Arceus"
      url="https://www.gamerguides.com/pokemon-legends-arceus/maps/cobalt-coastlands"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Cobalt Coastlands map section."
      mapCategoryToggles={COBALT_TOGGLES}
    />
  );
};

export default CobaltCoastlandsMapModal;
