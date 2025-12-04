// components/PokemonMaps/JubilifeVillageMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type JubilifeVillageMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Values taken from the cat[] inputs for Jubilife Village.
const JUBILIFE_TOGGLES: MapCategoryToggle[] = [
  {
    id: "pokemon",
    label: "Pokémon",
    kind: "parent",
    values: [
      "map-945", // Pokemon
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
    id: "npcs",
    label: "NPCs",
    kind: "parent",
    values: [
      "map-1482", // NPCs (Galaxy Hall)
      "map-1374", // NPCs
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

const JubilifeVillageMapModal: React.FC<JubilifeVillageMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Jubilife Village Map"
      subtitle="Pokémon Legends: Arceus"
      url="https://www.gamerguides.com/pokemon-legends-arceus/maps/jubilife-village"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Jubilife Village map section."
      mapCategoryToggles={JUBILIFE_TOGGLES}
    />
  );
};

export default JubilifeVillageMapModal;
