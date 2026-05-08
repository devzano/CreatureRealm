import * as SecureStore from "expo-secure-store";

const DEVICE_KEY = "creaturerealm-pokemon-tcg-digital-device-id";

type TCGDigitalErrorPayload = {
  title?: string;
  details?: string;
};

export type PokemonTCGDigitalPack = {
  id: string;
  setId: string;
  name: string;
  subtitle: string;
  series: string;
  releaseDate: string;
  total: number;
  printedTotal?: number;
  images: {
    symbol: string;
    logo: string;
  };
  unlockCost: number;
  slot: number;
  packSize?: number;
  slotOdds: {
    tier: string;
    fallback?: string[];
  }[];
};

export type PokemonTCGDigitalRevealCard = {
  slot: number;
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  supertype: string;
  subtypes: string[];
  images: {
    small: string;
    large: string;
  };
  set: {
    id: string;
    name: string;
    series: string;
  };
};

export type PokemonTCGDigitalHistoryEntry = {
  id: string;
  packId: string;
  setId: string;
  setName: string;
  openedAt: string;
  cards: PokemonTCGDigitalRevealCard[];
};

export type PokemonTCGDigitalProfile = {
  deviceId: string;
  windowKey: string;
  openedToday: number;
  remainingToday: number;
  dailyLimit: number;
  nextResetAt: string;
  totalOpened: number;
  poolRefreshedToday: boolean;
  inventory: Record<string, number>;
  history: PokemonTCGDigitalHistoryEntry[];
  packs: PokemonTCGDigitalPack[];
};

function getBaseUrl() {
  const base = String(process.env.EXPO_PUBLIC_RENDER_BASE_URL ?? "").trim();
  if (!base) {
    throw new Error("Missing Render base URL.");
  }

  return base.replace(/\/+$/, "");
}

async function request<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}/pokemontcg-digital${pathname}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    let parsed: TCGDigitalErrorPayload | null = null;

    try {
      parsed = raw ? (JSON.parse(raw) as TCGDigitalErrorPayload) : null;
    } catch {}

    throw new Error(parsed?.details ?? parsed?.title ?? raw ?? response.statusText);
  }

  return response.json() as Promise<T>;
}

export async function getPokemonTCGDigitalDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY);
  if (existing?.trim()) return existing;

  const nextId = `tcg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_KEY, nextId);
  return nextId;
}

export async function fetchPokemonTCGDigitalProfile(
  deviceId: string,
  options?: {
    refreshPool?: boolean;
  }
) {
  const search = new URLSearchParams({ deviceId });
  if (options?.refreshPool) {
    search.set("refreshPool", "1");
  }

  const result = await request<{ ok: true; profile: PokemonTCGDigitalProfile }>(
    `/profile?${search.toString()}`
  );

  return result.profile;
}

export async function openPokemonTCGDigitalPack(deviceId: string, packId: string) {
  const result = await request<{
    ok: true;
    profile: PokemonTCGDigitalProfile;
    reveal: PokemonTCGDigitalRevealCard[];
  }>("/open", {
    method: "POST",
    body: JSON.stringify({ deviceId, packId }),
  });

  return result;
}
