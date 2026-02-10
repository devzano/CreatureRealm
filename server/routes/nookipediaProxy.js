import express from "express";

const router = express.Router();

const NOOKIPEDIA_BASE = "https://api.nookipedia.com";
const NOOKIPEDIA_ACCEPT_VERSION = String("1.7.0").trim();

function getApiKey() {
  const key = String(process.env.NOOKIPEDIA_API_KEY ?? "").trim();
  if (!key) throw new Error("Missing NOOKIPEDIA_API_KEY on server.");
  return key;
}

/**
 * Catch-all proxy without path patterns (Express 5-safe).
 * Since this router is mounted at /nookipedia, this will receive:
 *   req.baseUrl    = "/nookipedia"
 *   req.originalUrl= "/nookipedia/nh/art?x=y"
 */
router.use(async (req, res) => {
  try {
    // Only proxy GET requests (optional safety)
    if (req.method !== "GET") {
      return res.status(405).json({ title: "Method Not Allowed", details: "Only GET is supported." });
    }

    const apiKey = getApiKey();

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
