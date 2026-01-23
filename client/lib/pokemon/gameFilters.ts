// lib/data/pokemon/gameFilters.ts

export type CreatureRealmGame = {
  id: string;
  title: string;
  subtitle: string;
  generationId: number;
  accentColor: string[];
  backgroundColor: string;
  speciesCount: number;
  shortCode: string;
  versionGroups: string[];
  dlcVersionGroups?: string[];
  versionGroupId?: number;
  coverImageUrl?: string;
  releaseYear?: number;
  platforms: string[];
};

export const games: CreatureRealmGame[] = [
  // 1 - Red
  {
    id: "red",
    title: "Red",
    subtitle: "Kanto Pokédex • Gen 1",
    generationId: 1,
    accentColor: ["#ef4444"], // red
    backgroundColor: "#111827",
    speciesCount: 151,
    shortCode: "Red",
    versionGroups: ["red-blue"],
    versionGroupId: 1,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/5/59/Pokemon_Red_%28NA%29.png/revision/latest/scale-to-width-down/1000?cb=20240413173729&path-prefix=en",
    releaseYear: 1998,
    platforms: ["Game Boy"],
  },

  // 2 - Blue
  {
    id: "blue",
    title: "Blue",
    subtitle: "Kanto Pokédex • Gen 1",
    generationId: 1,
    accentColor: ["#3b82f6"], // blue
    backgroundColor: "#111827",
    speciesCount: 151,
    shortCode: "Blue",
    versionGroups: ["red-blue"],
    versionGroupId: 1,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/6/60/Pokemon_Blue_%28NA%29.png/revision/latest/scale-to-width-down/1000?cb=20240413173720&path-prefix=en",
    releaseYear: 1998,
    platforms: ["Game Boy"],
  },

  // 3 - Yellow
  {
    id: "yellow",
    title: "Yellow",
    subtitle: "Kanto Pokédex • Gen 1 (Pikachu Edition)",
    generationId: 1,
    accentColor: ["#facc15"],
    backgroundColor: "#111827",
    speciesCount: 151,
    shortCode: "Yellow",
    versionGroups: ["yellow"],
    versionGroupId: 2,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/3/38/Pokemon_Yellow_%28NA%29.jpg/revision/latest?cb=20111104144216&path-prefix=en",
    releaseYear: 1998,
    platforms: ["Game Boy Color"],
  },

  // 4 - Gold
  {
    id: "gold",
    title: "Gold",
    subtitle: "Johto Pokédex • Gen 2",
    generationId: 2,
    accentColor: ["#fbbf24"], // gold
    backgroundColor: "#020617",
    speciesCount: 251,
    shortCode: "Gold",
    versionGroups: ["gold-silver"],
    versionGroupId: 3,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/0/08/Pokemon_Gold_%28NA%29.jpg/revision/latest?cb=20111104144754&path-prefix=en",
    releaseYear: 1999,
    platforms: ["Game Boy Color"],
  },

  // 5 - Silver
  {
    id: "silver",
    title: "Silver",
    subtitle: "Johto Pokédex • Gen 2",
    generationId: 2,
    accentColor: ["#9ca3af"], // silver
    backgroundColor: "#020617",
    speciesCount: 251,
    shortCode: "Silver",
    versionGroups: ["gold-silver"],
    versionGroupId: 3,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/3/37/Pokemon_Silver_%28NA%29.jpg/revision/latest?cb=20111104144755&path-prefix=en",
    releaseYear: 1999,
    platforms: ["Game Boy Color"],
  },

  // 6 - Crystal
  {
    id: "crystal",
    title: "Crystal",
    subtitle: "Johto Pokédex • Gen 2 (Suicune Edition)",
    generationId: 2,
    accentColor: ["#38bdf8"],
    backgroundColor: "#020617",
    speciesCount: 251,
    shortCode: "Crystal",
    versionGroups: ["crystal"],
    versionGroupId: 4,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/4/4e/Pokemon_Crystal_%28NA%29.png/revision/latest?cb=20140817222714&path-prefix=en",
    releaseYear: 2000,
    platforms: ["Game Boy Color"],
  },

  // 7 - Ruby
  {
    id: "ruby",
    title: "Ruby",
    subtitle: "Hoenn Pokédex • Gen 3",
    generationId: 3,
    accentColor: ["#f97316"],
    backgroundColor: "#111827",
    speciesCount: 386,
    shortCode: "Ruby",
    versionGroups: ["ruby-sapphire"],
    versionGroupId: 5,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/a/aa/Pokemon_Ruby_%28NA%29.jpg/revision/latest?cb=20140822024920&path-prefix=en",
    releaseYear: 2002,
    platforms: ["Game Boy Advance"],
  },

  // 8 - Sapphire
  {
    id: "sapphire",
    title: "Sapphire",
    subtitle: "Hoenn Pokédex • Gen 3",
    generationId: 3,
    accentColor: ["#0ea5e9"],
    backgroundColor: "#111827",
    speciesCount: 386,
    shortCode: "Sapphire",
    versionGroups: ["ruby-sapphire"],
    versionGroupId: 5,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/c/cb/Pokemon_Sapphire_%28NA%29.jpg/revision/latest/scale-to-width-down/1000?cb=20140822030107&path-prefix=en",
    releaseYear: 2002,
    platforms: ["Game Boy Advance"],
  },

  // 9 - Emerald
  {
    id: "emerald",
    title: "Emerald",
    subtitle: "Hoenn Pokédex • Gen 3 (Battle Frontier)",
    generationId: 3,
    accentColor: ["#22c55e"],
    backgroundColor: "#111827",
    speciesCount: 386,
    shortCode: "Emerald",
    versionGroups: ["emerald"],
    versionGroupId: 6,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/2/26/Pokemon_Emerald_%28NA%29.jpg/revision/latest/scale-to-width-down/1000?cb=20150119184818&path-prefix=en",
    releaseYear: 2004,
    platforms: ["Game Boy Advance"],
  },

  // 10 - FireRed
  {
    id: "firered",
    title: "FireRed",
    subtitle: "Kanto Pokédex • Gen 3 remake",
    generationId: 3,
    accentColor: ["#ef4444"],
    backgroundColor: "#020617",
    speciesCount: 151,
    shortCode: "FireRed",
    versionGroups: ["firered-leafgreen"],
    versionGroupId: 7,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/f/fa/Pokemon_FireRed_%28NA%29.png/revision/latest?cb=20121123224233&path-prefix=en",
    releaseYear: 2004,
    platforms: ["Game Boy Advance"],
  },

  // 11 - LeafGreen
  {
    id: "leafgreen",
    title: "LeafGreen",
    subtitle: "Kanto Pokédex • Gen 3 remake",
    generationId: 3,
    accentColor: ["#22c55e"],
    backgroundColor: "#020617",
    speciesCount: 151,
    shortCode: "LeafGreen",
    versionGroups: ["firered-leafgreen"],
    versionGroupId: 7,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/5/5a/Pokemon_LeafGreen_%28NA%29.png/revision/latest?cb=20230304214522&path-prefix=en",
    releaseYear: 2004,
    platforms: ["Game Boy Advance"],
  },

  // 12 - Diamond
  {
    id: "diamond",
    title: "Diamond",
    subtitle: "Sinnoh Pokédex • Gen 4",
    generationId: 4,
    accentColor: ["#38bdf8"],
    backgroundColor: "#020617",
    speciesCount: 493,
    shortCode: "Diamond",
    versionGroups: ["diamond-pearl"],
    versionGroupId: 8,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/2/20/Pokemon_Diamond_%28NA%29.jpg/revision/latest/scale-to-width-down/1000?cb=20210213015750&path-prefix=en",
    releaseYear: 2006,
    platforms: ["Nintendo DS"],
  },

  // 13 - Pearl
  {
    id: "pearl",
    title: "Pearl",
    subtitle: "Sinnoh Pokédex • Gen 4",
    generationId: 4,
    accentColor: ["#e879f9"],
    backgroundColor: "#020617",
    speciesCount: 493,
    shortCode: "Pearl",
    versionGroups: ["diamond-pearl"],
    versionGroupId: 8,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/4/40/Pokemon_Pearl_%28NA%29.jpg/revision/latest?cb=20111104163712&path-prefix=en",
    releaseYear: 2006,
    platforms: ["Nintendo DS"],
  },

  // 14 - Platinum
  {
    id: "platinum",
    title: "Platinum",
    subtitle: "Sinnoh Pokédex • Gen 4 (Distortion World)",
    generationId: 4,
    accentColor: ["#6366f1"],
    backgroundColor: "#020617",
    speciesCount: 493,
    shortCode: "Platinum",
    versionGroups: ["platinum"],
    versionGroupId: 9,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/0/0f/Pokemon_Platinum_%28NA%29.jpg/revision/latest/scale-to-width-down/1000?cb=20210213022406&path-prefix=en",
    releaseYear: 2008,
    platforms: ["Nintendo DS"],
  },

  // 15 - HeartGold
  {
    id: "heartgold",
    title: "HeartGold",
    subtitle: "Johto Pokédex • Gen 4 remake",
    generationId: 4,
    accentColor: ["#fbbf24"],
    backgroundColor: "#020617",
    speciesCount: 493,
    shortCode: "HeartGold",
    versionGroups: ["heartgold-soulsilver"],
    versionGroupId: 10,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/d/d8/Pokemon_HeartGold_%28NA%29.jpg/revision/latest?cb=20100206201141&path-prefix=en",
    releaseYear: 2009,
    platforms: ["Nintendo DS"],
  },

  // 16 - SoulSilver
  {
    id: "soulsilver",
    title: "SoulSilver",
    subtitle: "Johto Pokédex • Gen 4 remake",
    generationId: 4,
    accentColor: ["#9ca3af"],
    backgroundColor: "#020617",
    speciesCount: 493,
    shortCode: "SoulSilver",
    versionGroups: ["heartgold-soulsilver"],
    versionGroupId: 10,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/a/a8/Pokemon_SoulSilver_%28NA%29.jpg/revision/latest?cb=20100206201210&path-prefix=en",
    releaseYear: 2009,
    platforms: ["Nintendo DS"],
  },

  // 17 - Black
  {
    id: "black",
    title: "Black",
    subtitle: "Unova Pokédex • Gen 5",
    generationId: 5,
    accentColor: ["#000000"],
    backgroundColor: "#020617",
    speciesCount: 649,
    shortCode: "Black",
    versionGroups: ["black-white"],
    versionGroupId: 11,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/8/8d/Pokemon_Black_%28NA%29.png/revision/latest/scale-to-width-down/1000?cb=20120927155809&path-prefix=en",
    releaseYear: 2010,
    platforms: ["Nintendo DS"],
  },

  // 18 - White
  {
    id: "white",
    title: "White",
    subtitle: "Unova Pokédex • Gen 5",
    generationId: 5,
    accentColor: ["#e5e7eb"],
    backgroundColor: "#020617",
    speciesCount: 649,
    shortCode: "White",
    versionGroups: ["black-white"],
    versionGroupId: 11,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/5/5f/Pokemon_White_%28NA%29.png/revision/latest?cb=20120927154300&path-prefix=en",
    releaseYear: 2010,
    platforms: ["Nintendo DS"],
  },

  // 19 - Black 2
  {
    id: "black-2",
    title: "Black 2",
    subtitle: "Unova Pokédex • Gen 5 sequel",
    generationId: 5,
    accentColor: ["#111827"],
    backgroundColor: "#020617",
    speciesCount: 649,
    shortCode: "Black 2",
    versionGroups: ["black-2-white-2"],
    versionGroupId: 14,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/7/78/Pokemon_Black_2_%28NA%29.png/revision/latest?cb=20121222172134&path-prefix=en",
    releaseYear: 2012,
    platforms: ["Nintendo DS"],
  },

  // 20 - White 2
  {
    id: "white-2",
    title: "White 2",
    subtitle: "Unova Pokédex • Gen 5 sequel",
    generationId: 5,
    accentColor: ["#f9fafb"],
    backgroundColor: "#020617",
    speciesCount: 649,
    shortCode: "White 2",
    versionGroups: ["black-2-white-2"],
    versionGroupId: 14,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/6/69/Pokemon_White_2_%28NA%29.png/revision/latest?cb=20121222172239&path-prefix=en",
    releaseYear: 2012,
    platforms: ["Nintendo DS"],
  },

  // 21 - X
  {
    id: "x",
    title: "X",
    subtitle: "Kalos Pokédex • Gen 6",
    generationId: 6,
    accentColor: ["#60a5fa"],
    backgroundColor: "#0b1120",
    speciesCount: 721,
    shortCode: "X",
    versionGroups: ["x-y"],
    versionGroupId: 15,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/7/75/Pok%C3%A9mon_X_%28NA%29.png/revision/latest?cb=20131102210731&path-prefix=en",
    releaseYear: 2013,
    platforms: ["Nintendo 3DS"],
  },

  // 22 - Y
  {
    id: "y",
    title: "Y",
    subtitle: "Kalos Pokédex • Gen 6",
    generationId: 6,
    accentColor: ["#fb7185"],
    backgroundColor: "#0b1120",
    speciesCount: 721,
    shortCode: "Y",
    versionGroups: ["x-y"],
    versionGroupId: 15,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/e/ed/Pok%C3%A9mon_Y_%28NA%29.png/revision/latest?cb=20131102210750&path-prefix=en",
    releaseYear: 2013,
    platforms: ["Nintendo 3DS"],
  },

  // 23 - Omega Ruby
  {
    id: "omega-ruby",
    title: "Omega Ruby",
    subtitle: "Hoenn Pokédex • Gen 6 remake",
    generationId: 6,
    accentColor: ["#f97316"],
    backgroundColor: "#111827",
    speciesCount: 721,
    shortCode: "Omega Ruby",
    versionGroups: ["omega-ruby-alpha-sapphire"],
    versionGroupId: 16,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/c/cb/Pok%C3%A9mon_OmegaRuby_%28NA%29.png/revision/latest/scale-to-width-down/1000?cb=20150120213548&path-prefix=en",
    releaseYear: 2014,
    platforms: ["Nintendo 3DS"],
  },

  // 24 - Alpha Sapphire
  {
    id: "alpha-sapphire",
    title: "Alpha Sapphire",
    subtitle: "Hoenn Pokédex • Gen 6 remake",
    generationId: 6,
    accentColor: ["#0ea5e9"],
    backgroundColor: "#111827",
    speciesCount: 721,
    shortCode: "Alpha Sapphire",
    versionGroups: ["omega-ruby-alpha-sapphire"],
    versionGroupId: 16,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/8/84/Pok%C3%A9mon_AlphaSapphire_%28NA%29.png/revision/latest/scale-to-width-down/1000?cb=20150120214104&path-prefix=en",
    releaseYear: 2014,
    platforms: ["Nintendo 3DS"],
  },

  // 25 - Sun
  {
    id: "sun",
    title: "Sun",
    subtitle: "Alola Pokédex • Gen 7",
    generationId: 7,
    accentColor: ["#facc15"],
    backgroundColor: "#111827",
    speciesCount: 802,
    shortCode: "Sun",
    versionGroups: ["sun-moon"],
    versionGroupId: 17,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/5/56/Pokemon_Sun_%28NA%29.png/revision/latest?cb=20170115011723&path-prefix=en",
    releaseYear: 2016,
    platforms: ["Nintendo 3DS"],
  },

  // 26 - Moon
  {
    id: "moon",
    title: "Moon",
    subtitle: "Alola Pokédex • Gen 7",
    generationId: 7,
    accentColor: ["#6366f1"],
    backgroundColor: "#111827",
    speciesCount: 802,
    shortCode: "Moon",
    versionGroups: ["sun-moon"],
    versionGroupId: 17,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/a/a2/Pokemon_Moon_%28NA%29.png/revision/latest/scale-to-width-down/1000?cb=20170117055107&path-prefix=en",
    releaseYear: 2016,
    platforms: ["Nintendo 3DS"],
  },

  // 27 - Ultra Sun
  {
    id: "ultra-sun",
    title: "Ultra Sun",
    subtitle: "Alola Pokédex • Gen 7 (Ultra)",
    generationId: 7,
    accentColor: ["#f97316"],
    backgroundColor: "#111827",
    speciesCount: 807,
    shortCode: "Ultra Sun",
    versionGroups: ["ultra-sun-ultra-moon"],
    versionGroupId: 18,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/a/a6/Pokemon_Ultra_Sun_%28EU%29.jpg/revision/latest/scale-to-width-down/1000?cb=20170818193937&path-prefix=en",
    releaseYear: 2017,
    platforms: ["Nintendo 3DS"],
  },

  // 28 - Ultra Moon
  {
    id: "ultra-moon",
    title: "Ultra Moon",
    subtitle: "Alola Pokédex • Gen 7 (Ultra)",
    generationId: 7,
    accentColor: ["#4f46e5"],
    backgroundColor: "#111827",
    speciesCount: 807,
    shortCode: "Ultra Moon",
    versionGroups: ["ultra-sun-ultra-moon"],
    versionGroupId: 18,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/7/76/Pokemon_Ultra_Moon_%28EU%29.jpg/revision/latest/scale-to-width-down/1000?cb=20170818193925&path-prefix=en",
    releaseYear: 2017,
    platforms: ["Nintendo 3DS"],
  },

  // 29 - Let's Go Pikachu
  {
    id: "lets-go-pikachu",
    title: "Let's Go Pikachu",
    subtitle: "Kanto Pokédex • Gen 7 style remake",
    generationId: 7,
    accentColor: ["#facc15"],
    backgroundColor: "#020617",
    speciesCount: 151,
    shortCode: "Let’s Go Pikachu",
    versionGroups: ["lets-go-pikachu-lets-go-eevee"],
    versionGroupId: 19,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/4/49/Pok%C3%A9mon_Let%27s_Go_Pikachu_%28NA%29.png/revision/latest?cb=20180606231924&path-prefix=en",
    releaseYear: 2018,
    platforms: ["Nintendo Switch"],
  },

  // 30 - Let's Go Eevee
  {
    id: "lets-go-eevee",
    title: "Let's Go Eevee",
    subtitle: "Kanto Pokédex • Gen 7 style remake",
    generationId: 7,
    accentColor: ["#7C4700"],
    backgroundColor: "#020617",
    speciesCount: 151,
    shortCode: "Let’s Go Eevee",
    versionGroups: ["lets-go-pikachu-lets-go-eevee"],
    versionGroupId: 19,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/3/31/Pok%C3%A9mon_Let%E2%80%99s_Go_Eevee.webp/revision/latest?cb=20221013030641&path-prefix=en",
    releaseYear: 2018,
    platforms: ["Nintendo Switch"],
  },

  // 31 - Sword
  {
    id: "sword",
    title: "Sword",
    subtitle: "Galar Pokédex • Gen 8",
    generationId: 8,
    accentColor: ["#0ea5e9"],
    backgroundColor: "#020617",
    speciesCount: 400,
    shortCode: "Sword",
    versionGroups: ["sword-shield"],
    dlcVersionGroups: ["the-isle-of-armor", "the-crown-tundra"],
    versionGroupId: 20,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/3/3c/Pok%C3%A9mon_Sword_US_boxart.png/revision/latest?cb=20190607105234&path-prefix=en",
    releaseYear: 2019,
    platforms: ["Nintendo Switch"],
  },

  // 32 - Shield
  {
    id: "shield",
    title: "Shield",
    subtitle: "Galar Pokédex • Gen 8",
    generationId: 8,
    accentColor: ["#ec4899"],
    backgroundColor: "#020617",
    speciesCount: 400,
    shortCode: "Shield",
    versionGroups: ["sword-shield"],
    dlcVersionGroups: ["the-isle-of-armor", "the-crown-tundra"],
    versionGroupId: 20,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/3/31/Pok%C3%A9mon_Shield_US_boxart.png/revision/latest?cb=20200502213602&path-prefix=en",
    releaseYear: 2019,
    platforms: ["Nintendo Switch"],
  },

  // 35 - Brilliant Diamond
  {
    id: "brilliant-diamond",
    title: "Brilliant Diamond",
    subtitle: "Sinnoh Pokédex • Gen 4 remake",
    generationId: 4,
    accentColor: ["#38bdf8"],
    backgroundColor: "#020617",
    speciesCount: 493,
    shortCode: "Brilliant Diamond",
    versionGroups: ["brilliant-diamond-and-shining-pearl"],
    versionGroupId: 23,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/6/60/Pokemon_Brilliant_Diamond_%28NA%29.jpg/revision/latest?cb=20211227161743&path-prefix=en",
    releaseYear: 2021,
    platforms: ["Nintendo Switch"],
  },

  // 36 - Shining Pearl
  {
    id: "shining-pearl",
    title: "Shining Pearl",
    subtitle: "Sinnoh Pokédex • Gen 4 remake",
    generationId: 4,
    accentColor: ["#e879f9"],
    backgroundColor: "#020617",
    speciesCount: 493,
    shortCode: "Shining Pearl",
    versionGroups: ["brilliant-diamond-and-shining-pearl"],
    versionGroupId: 23,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/7/7b/Pokemon_Shining_Pearl_%28NA%29.jpg/revision/latest?cb=20211227161802&path-prefix=en",
    releaseYear: 2021,
    platforms: ["Nintendo Switch"],
  },

  // 37 - Legends: Arceus
  {
    id: "legends-arceus",
    title: "Legends: Arceus",
    subtitle: "Hisui Pokédex • Gen 1–8 era",
    generationId: 8,
    accentColor: ["#22d3ee"],
    backgroundColor: "#020617",
    speciesCount: 242,
    shortCode: "Legends: Arceus",
    versionGroups: ["legends-arceus"],
    versionGroupId: 24,
    coverImageUrl:
      "https://static.wikia.nocookie.net/pokemon/images/2/2f/Pok%C3%A9mon_Legends_Arceus.png/revision/latest/scale-to-width-down/1000?cb=20240817172229",
    releaseYear: 2022,
    platforms: ["Nintendo Switch"],
  },

  // 38 - Scarlet
  {
    id: "scarlet",
    title: "Scarlet",
    subtitle: "Paldea Pokédex • Gen 9",
    generationId: 9,
    accentColor: ["#f97373"],
    backgroundColor: "#0b1120",
    speciesCount: 400,
    shortCode: "Scarlet",
    versionGroups: ["scarlet-violet"],
    dlcVersionGroups: ["the-teal-mask", "the-indigo-disk"],
    versionGroupId: 25,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/3/37/Pokemon_Scarlet.jpg/revision/latest?cb=20250624032426&path-prefix=en",
    releaseYear: 2022,
    platforms: ["Nintendo Switch"],
  },

  // 39 - Violet
  {
    id: "violet",
    title: "Violet",
    subtitle: "Paldea Pokédex • Gen 9",
    generationId: 9,
    accentColor: ["#8b5cf6"],
    backgroundColor: "#0b1120",
    speciesCount: 400,
    shortCode: "Violet",
    versionGroups: ["scarlet-violet"],
    dlcVersionGroups: ["the-teal-mask", "the-indigo-disk"],
    versionGroupId: 25,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/f/fd/Pokemon_Violet.jpg/revision/latest/scale-to-width-down/1000?cb=20220601191929&path-prefix=en",
    releaseYear: 2022,
    platforms: ["Nintendo Switch"],
  },

  // 40 - Legends: Z-A
  {
    id: "legends-za",
    title: "Legends: Z-A",
    subtitle: "Kalos Pokédex • Gen 1–9 era",
    generationId: 9,
    accentColor: ["#38bdf8"],
    backgroundColor: "#020617",
    speciesCount: 234,
    shortCode: "Legends: Z-A",
    versionGroups: ["legends-za"],
    dlcVersionGroups: ["mega-dimension"],
    versionGroupId: 30,
    coverImageUrl:
      "https://static.wikia.nocookie.net/nintendo/images/1/1f/Pokemon_Legends_ZA_%28Switch%29_%28NA%29.png/revision/latest?cb=20250529005248&path-prefix=en",
    releaseYear: 2025,
    platforms: ["Nintendo Switch"], // can tweak later if Nintendo announces a successor
  },
];

export function getGameById(
  id: string | string[] | undefined
): CreatureRealmGame | null {
  if (!id || Array.isArray(id)) return null;
  return games.find((g) => g.id === id) ?? null;
}

// spin-offs
  // - Colosseum
  // {
  //   id: "colosseum",
  //   title: "Colosseum",
  //   subtitle: "Orre Region • GameCube spin-off",
  //   generationId: 3,
  //   accentColor: ["#f97316"],
  //   backgroundColor: "#111827",
  //   speciesCount: 386,
  //   shortCode: "Colosseum",
  //   versionGroups: ["colosseum"],
  //   versionGroupId: 12,
  //   coverImageUrl:
  //     "https://static.wikia.nocookie.net/nintendo/images/5/59/Pokemon_Red_%28NA%29.png/revision/latest/scale-to-width-down/1000?cb=20240413173729&path-prefix=en",
  //   releaseYear: 1998,
  // },

  // - XD: Gale of Darkness
  // {
  //   id: "xd",
  //   title: "XD: Gale of Darkness",
  //   subtitle: "Orre Region • GameCube spin-off",
  //   generationId: 3,
  //   accentColor: ["#a855f7"],
  //   backgroundColor: "#111827",
  //   speciesCount: 386,
  //   shortCode: "XD",
  //   versionGroups: ["xd"],
  //   versionGroupId: 13,coverImageUrl:
  //     "https://static.wikia.nocookie.net/nintendo/images/5/59/Pokemon_Red_%28NA%29.png/revision/latest/scale-to-width-down/1000?cb=20240413173729&path-prefix=en",
  //   releaseYear: 1998,
  // },
