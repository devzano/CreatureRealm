// components/PokemonMaps/AncientRetreatMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type AncientRetreatMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats from your HTML for Ancient Retreat:
// - map-1490 → Missions
// - map-922  → Points of Interest
// - map-1374 → NPCs
const ANCIENT_RETREAT_TOGGLES: MapCategoryToggle[] = [
  {
    id: "missions",
    label: "Missions",
    kind: "parent",
    values: ["map-1490"],
  },
  {
    id: "pois",
    label: "POIs",
    kind: "parent",
    values: ["map-922"],
  },
  {
    id: "npcs",
    label: "NPCs",
    kind: "parent",
    values: ["map-1374"],
  },
];

const AncientRetreatMapModal: React.FC<AncientRetreatMapModalProps> = (
  props
) => {
  return (
    <PokemonMapModal
      {...props}
      title="Ancient Retreat Map"
      subtitle="Pokémon Legends: Arceus"
      url="https://www.gamerguides.com/pokemon-legends-arceus/maps/ancient-retreat"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Ancient Retreat map section."
      mapCategoryToggles={ANCIENT_RETREAT_TOGGLES}
    />
  );
};

export default AncientRetreatMapModal;
