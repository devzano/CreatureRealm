// components/PokemonMaps/PaldeaRegionMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type PaldeaRegionMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats for Paldea Region:
//
// db-196  → Medicines
// db-184  → Poké Balls
// db-187  → Battle Items
// db-197  → Other Items
// db-198  → TMs
// db-199  → TM Materials
// db-200  → Treasures
// db-201  → Picnic Items
// db-202  → Key Items
//
// map-3943 → Stakes
// map-3951 → Shrines
// map-3508 → Gimmighouls
// map-3484 → Victory Road
// map-3485 → Starfall Street
// map-3486 → Path of Legends
// map-4043 → Area Zero
// map-3537 → Battles
// map-3505 → Locations
// map-3530 → Shops and Trades
// map-3963 → Legendary Pokemon
// map-4577 → Legendary Pokémon (DLC)
// map-3960 → Tera Pokémon
// map-3538 → Pokemon
const PALDEA_TOGGLES: MapCategoryToggle[] = [
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
      "db-199", // TM Materials
      "db-200", // Treasures
      "db-201", // Picnic Items
      "db-202", // Key Items
    ],
  },
  {
    id: "pokemon",
    label: "Pokémon",
    kind: "parent",
    values: [
      "map-3538", // Pokemon
      "map-3960", // Tera Pokémon
      "map-3963", // Legendary Pokemon
      "map-4577", // Legendary Pokémon (DLC)
    ],
  },
  {
    id: "locations",
    label: "Locations",
    kind: "parent",
    values: [
      "map-3505", // Locations (fast travel)
      "map-3530", // Shops and Trades
    ],
  },
  {
    id: "quests",
    label: "Quest Paths",
    kind: "parent",
    values: [
      "map-3484", // Victory Road
      "map-3485", // Starfall Street
      "map-3486", // Path of Legends
      "map-4043", // Area Zero
    ],
  },
  {
    id: "collectables",
    label: "Collectables",
    kind: "parent",
    values: [
      "map-3943", // Stakes
      "map-3951", // Shrines
      "map-3508", // Gimmighouls
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

const PaldeaRegionMapModal: React.FC<PaldeaRegionMapModalProps> = (props) => {
  return (
    <PokemonMapModal
      {...props}
      title="Paldea Region Map"
      subtitle="Pokémon Scarlet & Violet"
      url="https://www.gamerguides.com/pokemon-scarlet-and-violet/maps/paldea-region-map"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Paldea Region map section."
      mapCategoryToggles={PALDEA_TOGGLES}
    />
  );
};

export default PaldeaRegionMapModal;
