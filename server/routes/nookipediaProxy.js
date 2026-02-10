import express from "express";

const router = express.Router();

const NOOKIPEDIA_BASE = "https://api.nookipedia.com";
const NOOKIPEDIA_ACCEPT_VERSION = String("1.7.0").trim();

function getApiKey() {
  const key = String(process.env.NOOKIPEDIA_API_KEY ?? "").trim();
  if (!key) throw new Error("Missing NOOKIPEDIA_API_KEY on server.");
  return key;
}

// Express 5-safe catch-all for everything under /nookipedia
router.get("/:splat(*)", async (req, res) => {
  try {
    const apiKey = getApiKey();

    // req.baseUrl is "/nookipedia"
    // req.originalUrl is "/nookipedia/nh/art?x=y"
    const tail = req.originalUrl.slice(req.baseUrl.length); // "/nh/art?x=y"
    const url = `${NOOKIPEDIA_BASE}${tail}`;

    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-API-KEY": apiKey,
        "Accept-Version": NOOKIPEDIA_ACCEPT_VERSION,
      },
    });

    res.status(upstream.status);
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    res.send(await upstream.text());
  } catch (e) {
    console.warn("[nookipedia-proxy] Error:", e);
    res.status(500).json({
      title: "Proxy Error",
      details: String(e?.message ?? e),
    });
  }
});

export default router;
