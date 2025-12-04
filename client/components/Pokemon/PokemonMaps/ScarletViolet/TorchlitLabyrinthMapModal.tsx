// components/PokemonMaps/TorchlitLabyrinthMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type TorchlitLabyrinthMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats (Torchlit Labyrinth):
// db-196 → Medicines
// db-184 → Poké Balls
// map-3537 → Battles
// map-3505 → Locations
// db-197 → Other Items
// map-3960 → Tera Pokémon
// db-198 → TMs
// db-200 → Treasures
const TORCHLIT_TOGGLES: MapCategoryToggle[] = [
  {
    id: "items",
    label: "Items",
    kind: "parent",
    values: [
      "db-196", // Medicines
      "db-184", // Poké Balls
      "db-197", // Other Items
      "db-198", // TMs
      "db-200", // Treasures
    ],
  },
  {
    id: "pokemon",
    label: "Pokémon",
    kind: "parent",
    values: [
      "map-3960", // Tera Pokémon
    ],
  },
  {
    id: "locations",
    label: "Locations",
    kind: "parent",
    values: [
      "map-3505", // Locations
    ],
  },
  {
    id: "battles",
    label: "Battles",
    kind: "parent",
    values: [
      "map-3537", // Battles
    ],
  },
];

const TorchlitLabyrinthMapModal: React.FC<TorchlitLabyrinthMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Torchlit Labyrinth Map"
      subtitle="Pokémon Scarlet & Violet"
      url="https://www.gamerguides.com/pokemon-scarlet-and-violet/maps/torchlit-labyrinth"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Torchlit Labyrinth area."
      mapCategoryToggles={TORCHLIT_TOGGLES}
    />
  );
};

export default TorchlitLabyrinthMapModal;
