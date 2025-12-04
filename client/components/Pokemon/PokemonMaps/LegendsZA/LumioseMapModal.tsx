// components/PokemonMaps/LumioseMapModal.tsx
import React from "react";
import PokemonMapModal, {
  type MapCategoryToggle,
} from "../PokemonMapModal";

type LumioseMapModalProps = {
  visible: boolean;
  onClose: () => void;
};

// Parent cats for Lumiose City:
//
// db-116577 → Pokedex
// db-116591 → Alpha Pokemon
// map-5912  → Alpha Pokémon
// map-5845  → TMs (map-level parent)
// map-5857  → Misc. (map-level parent)
// map-5844  → Travel Points
// map-5985  → Locations
// map-5869  → NPCs
// map-5847  → Navigation
// db-116579 → Items
// db-116595 → Missions
//
// Items subcats (subcat[]):
// db-116582 → Other Items
// db-116585 → Treasures
// db-116580 → Poké Balls
// db-116590 → TMs
// db-116586 → Key Items
// db-116581 → Medicines
// db-116584 → Berries
//
// Plus various item[] IDs used for spotlight chips (Evo Stones, Exp Candy, etc.)
const LUMIOSE_TOGGLES: MapCategoryToggle[] = [
  {
    id: "pokemon",
    label: "Pokémon",
    kind: "parent",
    values: [
      "db-116577", // Pokedex
      "db-116591", // Alpha Pokemon (DB)
      "map-5912",  // Alpha Pokémon (Map)
    ],
  },
  {
    id: "items",
    label: "Items",
    kind: "parent",
    values: [
      "db-116579", // Items (main items parent)
      // TMs and Misc deliberately split out into their own chips below
      // "map-5845", // TMs (map-level parent)
      // "map-5857", // Misc. (map-level parent)
    ],
  },
  {
    id: "pois",
    label: "POIs",
    kind: "parent",
    values: [
      "map-5844", // Travel Points
      "map-5985", // Locations
      "map-5869", // NPCs
      "map-5847", // Navigation
      "db-116595", // Missions
    ],
  },

  // ---- Item subcategory + item-level chips (shown in secondary row when "items" is active) ----

  // Whole "Key Items” bucket
  {
    id: "items-key-items",
    label: "Key Items",
    kind: "sub",
    values: ["db-116586"],
  },

  // Treasures (Tiny Mushroom, Pearls, Nuggets, etc.)
  {
    id: "items-treasures",
    label: "Treasures",
    kind: "sub",
    values: ["db-116585"],
  },

  // Poké Balls (Ultra / Great / Poké / Net / Dive / Nest / Repeat / Timer / Luxury / Dusk / Heal / Quick, etc.)
  {
    id: "items-pokeballs",
    label: "Poké Balls",
    kind: "sub",
    values: ["db-116580"],
  },

  // Medicines (Potions, Revives, EV items, Rare Candy, etc.)
  {
    id: "items-medicines",
    label: "Medicines",
    kind: "sub",
    values: ["db-116581"],
  },

  // TMs as an item subcategory
  {
    id: "items-tms",
    label: "TMs",
    kind: "sub",
    values: ["db-116590"],
  },

  // Misc as a separate map-level parent category
  {
    id: "items-misc",
    label: "Misc",
    kind: "parent",
    values: ["map-5857"],
  },

  // Evolution stones
  {
    id: "items-evo-stones",
    label: "Evo Stones",
    kind: "item",
    values: [
      "662649", // Sun Stone
      "662650", // Moon Stone
      "662651", // Fire Stone
      "662652", // Thunder Stone
      "662653", // Water Stone
      "662654", // Leaf Stone
      "662655", // Shiny Stone
      "662656", // Dusk Stone
      "662657", // Dawn Stone
      "662716", // Ice Stone
    ],
  },

  // Exp Candy group
  {
    id: "items-exp-candy",
    label: "Exp Candy",
    kind: "item",
    values: [
      "662717", // Exp. Candy XS
      "662718", // Exp. Candy S
      "662719", // Exp. Candy M
      "662720", // Exp. Candy L
    ],
  },

  // Bottle Cap as a quick single toggle
  {
    id: "items-bottle-cap",
    label: "Bottle Cap",
    kind: "item",
    values: ["662714"],
  },

  // Spotlighted misc items
  {
    id: "items-colorful-screw",
    label: "Colorful Screw",
    kind: "item",
    values: ["662540"],
  },
  {
    id: "items-mega-shard",
    label: "Mega Shard",
    kind: "item",
    values: ["662734"],
  },
];

const LumioseMapModal: React.FC<LumioseMapModalProps> = (props) => {
  return (
    <PokemonMapModal
      {...props}
      title="Lumiose City Map"
      subtitle="Pokémon Legends: Z-A"
      url="https://www.gamerguides.com/pokemon-legends-z-a/maps/lumiose-city"
      disclaimer="Interactive map powered by GamerGuides.com — embedded view focuses on the Lumiose City map section."
      mapCategoryToggles={LUMIOSE_TOGGLES}
    />
  );
};

export default LumioseMapModal;
