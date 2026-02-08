// components/PokemonMaps/GrandUndergroundMapModal.tsx
import React from "react";
import PokemonMapModal, { type MapCategoryToggle } from "../PokemonMapModal";

type GrandUndergroundMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats from your HTML:
// - map-718 → Points of Interest
// - map-776 → Hideaways
// - map-856 → Misc Items
// - map-797 → TMs
// - map-874 → Named NPCs (Spiritomb Quest)
const GRAND_UNDERGROUND_TOGGLES: MapCategoryToggle[] = [
  {
    id: "pois",
    label: "POIs",
    kind: "parent",
    values: [
      "map-718", // Points of Interest
      "map-776", // Hideaways
    ],
  },
  {
    id: "items",
    label: "Items",
    kind: "parent",
    values: [
      "map-856", // Misc Items
      "map-797", // TMs
    ],
  },
  {
    id: "npcs",
    label: "NPCs",
    kind: "parent",
    values: [
      "map-874", // Named NPCs (Spiritomb Quest)
    ],
  },
];

const GrandUndergroundMapModal: React.FC<GrandUndergroundMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Grand Underground Map"
      subtitle="Pokémon Brilliant Diamond & Shining Pearl"
      url="https://www.gamerguides.com/pokemon-brilliant-diamond-and-shining-pearl/maps/grand-underground"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Grand Underground map section."
      mapCategoryToggles={GRAND_UNDERGROUND_TOGGLES}
    />
  );
};

export default GrandUndergroundMapModal;
