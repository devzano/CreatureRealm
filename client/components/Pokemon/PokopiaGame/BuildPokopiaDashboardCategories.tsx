import React from "react";

import type { DashboardCategory } from "@/components/Palworld/PalworldDashboardGrid";
import {
  POKOPIA_INFO_CARDS,
  POKOPIA_PLANNER_ZONES,
  POKOPIA_SECTION_CARDS,
  type PokopiaSection,
} from "./config";

type NamedEntry = {
  name: string;
};

type Params = {
  filteredItems: NamedEntry[];
  habitats: NamedEntry[];
  themeItems: NamedEntry[];
  pokopiaItems: NamedEntry[];
  recipes: NamedEntry[];
  traitItems: NamedEntry[];
  buildings: NamedEntry[];
  collectibles: NamedEntry[];
  totalMon: number;
  renderDexContent: () => React.ReactNode;
  renderHabitatsContent: () => React.ReactNode;
  renderThemesContent: () => React.ReactNode;
  renderItemsContent: () => React.ReactNode;
  renderRecipesContent: () => React.ReactNode;
  renderTraitsContent: () => React.ReactNode;
  renderBuildingsContent: () => React.ReactNode;
  renderCollectiblesContent: () => React.ReactNode;
  renderInfoContent: () => React.ReactNode;
  renderPlannerContent: () => React.ReactNode;
};

export default function BuildPokopiaDashboardCategories({
  filteredItems,
  habitats,
  themeItems,
  pokopiaItems,
  recipes,
  traitItems,
  buildings,
  collectibles,
  totalMon,
  renderDexContent,
  renderHabitatsContent,
  renderThemesContent,
  renderItemsContent,
  renderRecipesContent,
  renderTraitsContent,
  renderBuildingsContent,
  renderCollectiblesContent,
  renderInfoContent,
  renderPlannerContent,
}: Params): DashboardCategory<PokopiaSection>[] {
  return POKOPIA_SECTION_CARDS.map((section) => ({
    key: section.id,
    title: section.title,
    subtitle: section.subtitle,
    shown:
      section.id === "dex"
        ? filteredItems.length
        : section.id === "habitats"
          ? habitats.length
          : section.id === "themes"
            ? themeItems.length
            : section.id === "items"
                ? pokopiaItems.length
                : section.id === "recipes"
                  ? recipes.length
                  : section.id === "traits"
                    ? traitItems.length
                      : section.id === "buildings"
                        ? buildings.length
                        : section.id === "collectibles"
                          ? collectibles.length
                          : section.id === "info"
                            ? POKOPIA_INFO_CARDS.length
                            : section.id === "planner"
                              ? POKOPIA_PLANNER_ZONES.length
                              : section.count,
    total:
      section.id === "dex"
        ? totalMon
        : section.id === "habitats"
          ? habitats.length || section.count
          : section.id === "themes"
            ? themeItems.length || section.count
            : section.id === "items"
                ? pokopiaItems.length || section.count
                : section.id === "recipes"
                  ? recipes.length || section.count
                  : section.id === "traits"
                    ? traitItems.length || section.count
                      : section.id === "buildings"
                        ? buildings.length || section.count
                        : section.id === "collectibles"
                          ? collectibles.length || section.count
                          : section.id === "info"
                            ? POKOPIA_INFO_CARDS.length
                            : section.id === "planner"
                              ? POKOPIA_PLANNER_ZONES.length
                              : section.count,
    items:
      section.id === "dex"
        ? filteredItems
        : section.id === "habitats"
          ? habitats
          : section.id === "themes"
            ? themeItems
            : section.id === "items"
                ? pokopiaItems
                : section.id === "recipes"
                  ? recipes
                  : section.id === "traits"
                    ? traitItems
                      : section.id === "buildings"
                        ? buildings
                        : section.id === "collectibles"
                          ? collectibles
                          : section.id === "info"
                            ? POKOPIA_INFO_CARDS
                            : section.id === "planner"
                              ? POKOPIA_PLANNER_ZONES
                              : [
                                  { name: `${section.title} index` },
                                  { name: "Browse entries" },
                                  { name: "Open section" },
                                ],
    previewItems:
      section.id === "dex"
        ? filteredItems.slice(0, 6).map((item) => ({ name: item.name }))
        : section.id === "habitats"
          ? habitats.slice(0, 6).map((habitat) => ({ name: habitat.name }))
          : section.id === "themes"
            ? themeItems.slice(0, 6).map((item) => ({ name: item.name }))
            : section.id === "items"
                ? pokopiaItems.slice(0, 6).map((item) => ({ name: item.name }))
                : section.id === "recipes"
                  ? recipes.slice(0, 6).map((recipe) => ({ name: recipe.name }))
                  : section.id === "traits"
                    ? traitItems.slice(0, 6).map((item) => ({ name: item.name }))
                      : section.id === "buildings"
                        ? buildings.slice(0, 6).map((building) => ({ name: building.name }))
                        : section.id === "collectibles"
                          ? collectibles.slice(0, 6).map((collectible) => ({ name: collectible.name }))
                          : section.id === "info"
                            ? POKOPIA_INFO_CARDS.map((item) => ({ name: item.title }))
                            : section.id === "planner"
                              ? POKOPIA_PLANNER_ZONES.map((item) => ({ name: item.title }))
                              : [
                                  { name: `${section.title} index` },
                                  { name: "Browse entries" },
                                  { name: "Open section" },
                                ],
    render: () =>
      section.id === "dex"
        ? renderDexContent()
        : section.id === "habitats"
          ? renderHabitatsContent()
          : section.id === "themes"
            ? renderThemesContent()
            : section.id === "items"
                ? renderItemsContent()
                : section.id === "recipes"
                  ? renderRecipesContent()
                  : section.id === "traits"
                    ? renderTraitsContent()
                      : section.id === "buildings"
                        ? renderBuildingsContent()
                        : section.id === "collectibles"
                          ? renderCollectiblesContent()
                          : section.id === "info"
                            ? renderInfoContent()
                            : renderPlannerContent(),
  }));
}
