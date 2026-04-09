import { warmEventsIndex } from "./nookipediaEvents";

const WARMUP_COOLDOWN_MS = 1000 * 60 * 10;
const WARMUP_TIMEOUT_MS = 25000;

let lastWarmupStartedAt = 0;
let inflightWarmup: Promise<void> | null = null;

function getRenderBaseUrl(): string | null {
  const base = String(process.env.EXPO_PUBLIC_RENDER_BASE_URL ?? "").trim();
  if (!base) return null;
  return base.replace(/\/+$/, "");
}

async function pingRenderRoot(signal: AbortSignal): Promise<void> {
  const baseUrl = getRenderBaseUrl();
  if (!baseUrl) return;

  const response = await fetch(baseUrl, {
    method: "GET",
    signal,
    headers: {
      Accept: "text/plain,application/json;q=0.9,*/*;q=0.8",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Warmup failed (${response.status})`);
  }
}

export async function warmAnimalCrossingServer(force = false): Promise<void> {
  const now = Date.now();

  if (!force && inflightWarmup) {
    return inflightWarmup;
  }

  if (!force && now - lastWarmupStartedAt < WARMUP_COOLDOWN_MS) {
    return;
  }

  lastWarmupStartedAt = now;

  inflightWarmup = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, WARMUP_TIMEOUT_MS);

    try {
      await pingRenderRoot(controller.signal);
      await warmEventsIndex();
    } catch (error: any) {
      const message = String(error?.message ?? error ?? "");
      if (message.toLowerCase().includes("aborted")) {
        return;
      }

      console.warn("[animalCrossingWarmup] Failed to warm server:", error);
    } finally {
      clearTimeout(timeoutId);
      inflightWarmup = null;
    }
  })();

  return inflightWarmup;
}
