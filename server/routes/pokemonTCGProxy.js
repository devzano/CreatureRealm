import express from "express";

const router = express.Router();

const POKEMON_TCG_BASE = "https://api.pokemontcg.io/v2";

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

router.use(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        title: "Method Not Allowed",
        details: "Only GET is supported.",
      });
    }

    const apiKey = getApiKey();
    const tail = req.originalUrl.slice(req.baseUrl.length);
    const url = `${POKEMON_TCG_BASE}${tail}`;

    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
    });

    res.status(upstream.status);
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    res.send(await upstream.text());
  } catch (error) {
    console.warn("[pokemontcg-proxy] Error:", error);
    res.status(500).json({
      title: "Proxy Error",
      details: String(error?.message ?? error),
    });
  }
});

export default router;
