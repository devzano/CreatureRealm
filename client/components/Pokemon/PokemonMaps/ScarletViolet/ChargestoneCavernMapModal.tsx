// components/PokemonMaps/ChargestoneCavernMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type ChargestoneCavernMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats (Chargestone Cavern):
// db-196 → Medicines
// db-184 → Poké Balls
// map-3537 → Battles
// map-3505 → Locations
// db-197 → Other Items
// map-3960 → Tera Pokémon
// db-198 → TMs
// db-200 → Treasures
const CHARGESTONE_TOGGLES: MapCategoryToggle[] = [
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

const ChargestoneCavernMapModal: React.FC<ChargestoneCavernMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Chargestone Cavern Map"
      subtitle="Pokémon Scarlet & Violet"
      url="https://www.gamerguides.com/pokemon-scarlet-and-violet/maps/chargestone-cavern"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Chargestone Cavern area."
      mapCategoryToggles={CHARGESTONE_TOGGLES}
    />
  );
};

export default ChargestoneCavernMapModal;
