import express from "express";

import {
  CURATED_DIGITAL_PACKS,
  DAILY_PACK_LIMIT,
  DIGITAL_PACK_HISTORY_LIMIT,
} from "../lib/pokemonTCGDigitalConfig.js";
import {
  insertDigitalHistoryEntry,
  loadDigitalHistory,
  loadDigitalProfile,
  saveDigitalProfile,
  trimDigitalHistory,
  withDigitalProfileTransaction,
} from "../lib/pokemonTCGDigitalDb.js";

const router = express.Router();

const POKEMON_TCG_BASE = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 250;

const setCache = new Map();
const cardsBySetCache = new Map();

function getApiKey() {
  const key = String(
    process.env.POKEMONTCG_API_KEY ??
      process.env.POKEMON_TCG_API_KEY ??
      process.env.EXPO_POKEMON_TCG_API_KEY ??
      process.env.EXPO_POKEMONTCG_API_KEY ??
      ""
  ).trim();

  if (!key) {
    throw new Error("Missing POKEMONTCG_API_KEY on server.");
  }

  return key;
}

function nowIso() {
  return new Date().toISOString();
}

function getUtcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getNextResetIso(date = new Date()) {
  const next = new Date(date);
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}

function normalizeDeviceId(deviceId) {
  return String(deviceId ?? "").trim().toLowerCase();
}

function normalizeCardId(cardId) {
  return String(cardId ?? "").trim().toLowerCase();
}

function createProfile(deviceId) {
  return {
    deviceId,
    windowKey: getUtcDayKey(),
    openedToday: 0,
    remainingToday: DAILY_PACK_LIMIT,
    totalOpened: 0,
    inventory: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function hydrateProfile(row, deviceId) {
  if (!row) return createProfile(deviceId);

  return {
    deviceId: row.device_id,
    windowKey: row.window_key,
    openedToday: Number(row.opened_today ?? 0),
    remainingToday: Number(row.remaining_today ?? DAILY_PACK_LIMIT),
    totalOpened: Number(row.total_opened ?? 0),
    inventory: row.inventory && typeof row.inventory === "object" ? row.inventory : {},
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function refreshProfileWindow(profile) {
  const currentWindowKey = getUtcDayKey();
  if (profile.windowKey !== currentWindowKey) {
    profile.windowKey = currentWindowKey;
    profile.openedToday = 0;
    profile.remainingToday = DAILY_PACK_LIMIT;
  }

  profile.updatedAt = nowIso();
  return profile;
}

async function tcgFetch(pathname) {
  const apiKey = getApiKey();
  const response = await fetch(`${POKEMON_TCG_BASE}${pathname}`, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Pokemon TCG upstream failed (${response.status}): ${body || response.statusText}`);
  }

  return response.json();
}

async function fetchSetById(setId) {
  if (setCache.has(setId)) return setCache.get(setId);

  const promise = (async () => {
    const result = await tcgFetch(`/sets/${encodeURIComponent(setId)}`);
    return result.data;
  })();

  setCache.set(setId, promise);
  return promise;
}

async function fetchCardsForSet(setId) {
  if (cardsBySetCache.has(setId)) return cardsBySetCache.get(setId);

  const promise = (async () => {
    const cards = [];
    let page = 1;

    while (true) {
      const query = encodeURIComponent(`set.id:${setId}`);
      const result = await tcgFetch(`/cards?q=${query}&page=${page}&pageSize=${PAGE_SIZE}&orderBy=number,name`);
      const pageCards = Array.isArray(result?.data) ? result.data : [];
      cards.push(...pageCards);

      if (pageCards.length < PAGE_SIZE || cards.length >= Number(result?.totalCount ?? 0)) {
        break;
      }

      page += 1;
    }

    return cards;
  })();

  cardsBySetCache.set(setId, promise);
  return promise;
}

function classifyRarity(card) {
  const rarity = String(card?.rarity ?? "").toLowerCase();

  if (!rarity) return "common";
  if (/secret|hyper|illustration|special illustration|ultra|rainbow|ace spec|double rare/.test(rarity)) return "ultra";
  if (/rare|holo|amazing|radiant|promo/.test(rarity)) return "rare";
  if (/uncommon/.test(rarity)) return "uncommon";
  return "common";
}

function buildPools(cards) {
  return {
    common: cards.filter((card) => classifyRarity(card) === "common"),
    uncommon: cards.filter((card) => classifyRarity(card) === "uncommon"),
    rare: cards.filter((card) => classifyRarity(card) === "rare"),
    ultra: cards.filter((card) => classifyRarity(card) === "ultra"),
  };
}

function chooseRandomUnique(pool, usedIds) {
  const available = pool.filter((card) => !usedIds.has(card.id));
  if (!available.length) return null;
  const chosen = available[Math.floor(Math.random() * available.length)];
  usedIds.add(chosen.id);
  return chosen;
}

function selectForTier(pools, tierConfig, usedIds, fullPool) {
  const orderedTiers = [tierConfig.tier, ...(tierConfig.fallback ?? [])];

  for (const tier of orderedTiers) {
    const chosen = chooseRandomUnique(pools[tier] ?? [], usedIds);
    if (chosen) return chosen;
  }

  return chooseRandomUnique(fullPool, usedIds);
}

function buildPackReveal(cards, packConfig) {
  const pools = buildPools(cards);
  const usedIds = new Set();
  const reveal = [];

  for (const slot of packConfig.slotOdds) {
    const chosen = selectForTier(pools, slot, usedIds, cards);
    if (chosen) reveal.push(chosen);
    if (reveal.length >= packConfig.packSize) break;
  }

  return reveal.slice(0, packConfig.packSize).map((card, index) => ({
    slot: index + 1,
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity ?? null,
    supertype: card.supertype,
    subtypes: card.subtypes ?? [],
    images: card.images,
    set: {
      id: card.set?.id,
      name: card.set?.name,
      series: card.set?.series,
    },
  }));
}

async function resolveCuratedPacks() {
  return Promise.all(
    CURATED_DIGITAL_PACKS.map(async (config, index) => {
      const set = await fetchSetById(config.setId);
      return {
        id: config.id,
        setId: config.setId,
        name: config.name,
        subtitle: config.subtitle,
        series: set.series,
        releaseDate: set.releaseDate,
        total: set.total,
        printedTotal: set.printedTotal,
        images: set.images,
        unlockCost: config.unlockCost,
        slot: index + 1,
        packSize: config.packSize,
        slotOdds: config.slotOdds,
      };
    })
  );
}

function getProfileSummary(profile, packs, history) {
  return {
    deviceId: profile.deviceId,
    windowKey: profile.windowKey,
    openedToday: profile.openedToday,
    remainingToday: profile.remainingToday,
    dailyLimit: DAILY_PACK_LIMIT,
    nextResetAt: getNextResetIso(),
    totalOpened: profile.totalOpened,
    inventory: profile.inventory,
    history,
    packs,
  };
}

async function loadProfileContext(deviceId) {
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  if (!normalizedDeviceId) {
    throw new Error("Missing deviceId.");
  }

  return withDigitalProfileTransaction(async (client) => {
    const row = await loadDigitalProfile(client, normalizedDeviceId);
    const profile = refreshProfileWindow(hydrateProfile(row, normalizedDeviceId));
    await saveDigitalProfile(client, profile);
    const history = await loadDigitalHistory(client, normalizedDeviceId, DIGITAL_PACK_HISTORY_LIMIT);
    return { client, profile, history, normalizedDeviceId };
  });
}

router.use(express.json({ limit: "1mb" }));

router.get("/profile", async (req, res) => {
  try {
    const packs = await resolveCuratedPacks();
    const { profile, history } = await loadProfileContext(req.query.deviceId);

    res.json({
      ok: true,
      profile: getProfileSummary(profile, packs, history),
    });
  } catch (error) {
    console.warn("[pokemontcg-digital] profile error:", error);
    res.status(500).json({
      title: "Digital TCG Error",
      details: String(error?.message ?? error),
    });
  }
});

router.post("/open", async (req, res) => {
  try {
    const packs = await resolveCuratedPacks();
    const packId = String(req.body?.packId ?? "").trim();
    const packMeta = packs.find((entry) => entry.id === packId);
    const packConfig = CURATED_DIGITAL_PACKS.find((entry) => entry.id === packId);

    if (!packMeta || !packConfig) {
      return res.status(404).json({
        title: "Pack Not Found",
        details: "This digital pack is unavailable.",
      });
    }

    const normalizedDeviceId = normalizeDeviceId(req.body?.deviceId);
    if (!normalizedDeviceId) {
      return res.status(400).json({
        title: "Missing Device",
        details: "A device id is required to open packs.",
      });
    }

    const setCards = await fetchCardsForSet(packConfig.setId);
    if (!setCards.length) {
      return res.status(500).json({
        title: "Pack Empty",
        details: "This pack has no cards available from the upstream set.",
      });
    }

    const reveal = buildPackReveal(setCards, packConfig);

    const { profile, history } = await withDigitalProfileTransaction(async (client) => {
      const row = await loadDigitalProfile(client, normalizedDeviceId);
      const profile = refreshProfileWindow(hydrateProfile(row, normalizedDeviceId));

      if (profile.remainingToday < packConfig.unlockCost) {
        const error = new Error("You have used all daily pack opens for this reset window.");
        error.statusCode = 429;
        throw error;
      }

      const historyEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        packId: packConfig.id,
        setId: packConfig.setId,
        setName: packMeta.name,
        openedAt: nowIso(),
        cards: reveal,
      };

      profile.remainingToday = Math.max(0, profile.remainingToday - packConfig.unlockCost);
      profile.openedToday += 1;
      profile.totalOpened += 1;
      profile.inventory = profile.inventory ?? {};

      for (const card of reveal) {
        const inventoryKey = normalizeCardId(card.id);
        profile.inventory[inventoryKey] = Math.max(0, Number(profile.inventory[inventoryKey] ?? 0)) + 1;
      }

      profile.updatedAt = nowIso();

      await saveDigitalProfile(client, profile);
      await insertDigitalHistoryEntry(client, normalizedDeviceId, historyEntry);
      await trimDigitalHistory(client, normalizedDeviceId, DIGITAL_PACK_HISTORY_LIMIT);
      const nextHistory = await loadDigitalHistory(client, normalizedDeviceId, DIGITAL_PACK_HISTORY_LIMIT);
      return { profile, history: nextHistory };
    });

    res.json({
      ok: true,
      reveal,
      profile: getProfileSummary(profile, packs, history),
    });
  } catch (error) {
    console.warn("[pokemontcg-digital] open error:", error);
    res.status(error?.statusCode ?? 500).json({
      title: "Digital TCG Error",
      details: String(error?.message ?? error),
    });
  }
});

export default router;
