// components/Pokemon/PokemonDetails/helpers/pokemonDetailHelpers.ts
import { PokemonVariantKind } from "@/components/Pokemon/PokemonDetails/PokemonVariantBrowser";

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleCaseFromSlug(str: string) {
  return str
    .split("-")
    .map((part) => capitalize(part))
    .join(" ");
}

export function humanizeSlug(name?: string | null): string {
  if (!name) return "-";
  return name
    .split("-")
    .map((p) => (p ? capitalize(p) : p))
    .join(" ");
}

export function inferVariantKind(name: string): {
  kind: PokemonVariantKind;
  regionTag?: string;
} {
  const n = name.toLowerCase();

  if (n.includes("alola")) return { kind: "alolan", regionTag: "Alola" };
  if (n.includes("galar")) return { kind: "galarian", regionTag: "Galar" };
  if (n.includes("hisui")) return { kind: "hisuian", regionTag: "Hisui" };
  if (n.includes("paldea")) return { kind: "paldean", regionTag: "Paldea" };
  if (n.includes("mega")) return { kind: "mega", regionTag: "Mega" };
  if (n.includes("gmax") || n.includes("gigantamax")) {
    return { kind: "gigantamax", regionTag: "G-Max" };
  }

  return { kind: "other" };
}

export function buildVariantLabel(
  monName: string,
  speciesName: string,
  isDefault: boolean
): string {
  if (isDefault) return "Base";

  const lowerSpecies = speciesName.toLowerCase();
  const lowerMon = monName.toLowerCase();

  if (lowerMon.startsWith(lowerSpecies)) {
    const suffix = lowerMon.slice(lowerSpecies.length).replace(/^-/, "");
    if (!suffix) return capitalize(monName);
    return capitalize(suffix);
  }

  return capitalize(monName);
}
