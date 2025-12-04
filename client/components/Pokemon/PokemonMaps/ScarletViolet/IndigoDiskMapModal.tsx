// components/PokemonMaps/IndigoDiskMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type IndigoDiskMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats from The Indigo Disk map:
// db-196 → Medicines
// db-184 → Poké Balls
// map-3537 → Battles
// db-187 → Battle Items
// map-3505 → Locations
// db-197 → Other Items
// map-4577 → Legendary Pokémon (DLC)
// map-3960 → Tera Pokémon
// map-4578 → Stellar Pokémon
// map-4591 → Starter Pokémon
// map-3538 → Pokémon
// db-198 → TMs
// db-200 → Treasures
const INDIGO_DISK_TOGGLES: MapCategoryToggle[] = [
  {
    id: "items",
    label: "Items",
    kind: "parent",
    values: [
      "db-196", // Medicines
      "db-184", // Poké Balls
      "db-187", // Battle Items
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
      "map-3538", // Pokémon
      "map-3960", // Tera Pokémon
      "map-4577", // Legendary Pokémon (DLC)
      "map-4578", // Stellar Pokémon
      "map-4591", // Starter Pokémon
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

const IndigoDiskMapModal: React.FC<IndigoDiskMapModalProps> = (props) => {
  return (
    <PokemonMapModal
      {...props}
      title="Blueberry Academy Region Map"
      subtitle="The Indigo Disk DLC • Pokémon Scarlet & Violet"
      url="https://www.gamerguides.com/pokemon-scarlet-and-violet/maps/indigo-disk-map"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on The Indigo Disk DLC region map."
      mapCategoryToggles={INDIGO_DISK_TOGGLES}
    />
  );
};

export default IndigoDiskMapModal;
