// components/PokemonMaps/KitakamiRegionMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type KitakamiRegionMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats from Kitakami Region interactive map:
// db-196 → Medicines
// db-184 → Poké Balls
// map-3537 → Battles
// db-187 → Battle Items
// map-3505 → Locations
// db-197 → Other Items
// map-4577 → Legendary Pokémon (DLC)
// map-3960 → Tera Pokémon
// map-3538 → Pokémon
// db-198 → TMs
// db-200 → Treasures
const KITAKAMI_TOGGLES: MapCategoryToggle[] = [
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

const KitakamiRegionMapModal: React.FC<KitakamiRegionMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Kitakami Region Map"
      subtitle="The Teal Mask DLC • Pokémon Scarlet & Violet"
      url="https://www.gamerguides.com/pokemon-scarlet-and-violet/maps/the-teal-mask-dlc-kitakami-region-interactive-map"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Kitakami Region map section."
      mapCategoryToggles={KITAKAMI_TOGGLES}
    />
  );
};

export default KitakamiRegionMapModal;
