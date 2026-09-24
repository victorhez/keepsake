import "server-only";

/**
 * Pyth Network integration.
 *
 * Feed metadata and market hours come from the public Hermes catalogue.
 * Live prices come from Hermes' authenticated endpoint and are used when a
 * PYTH_API_KEY is configured.
 */

const CATALOGUE = "https://hermes.pyth.network/v2/price_feeds";
const HERMES = process.env.PYTH_HERMES_URL ?? "https://pyth.dourolabs.app/hermes";

export interface SessionState {
  isOpen: boolean;
  nextOpen: number | null;
  nextClose: number | null;
}

export interface PythPrice {
  price: number;
  conf: number;
  publishTime: number;
}

interface FeedMeta {
  id: string;
  market_hours?: { is_open: boolean; next_open: number | null; next_close: number | null };
  attributes: { symbol: string };
}

interface ParsedUpdate {
  id: string;
  price: { price: string; conf: string; expo: number; publish_time: number };
}

async function feedIds(): Promise<Map<string, string>> {
  const res = await fetch(`${CATALOGUE}?asset_type=equity`, { next: { revalidate: 86_400 } });
  if (!res.ok) return new Map();
  const feeds = (await res.json()) as FeedMeta[];
  return new Map(feeds.map((f) => [f.attributes.symbol, f.id]));
}

async function nyseSession(): Promise<SessionState> {
  try {
    const res = await fetch(`${CATALOGUE}?query=SPY&asset_type=equity`, { next: { revalidate: 60 } });
    const feeds = (await res.json()) as FeedMeta[];
    const spy = feeds.find((f) => f.attributes.symbol === "Equity.US.SPY/USD");
    if (spy?.market_hours) {
      return {
        isOpen: spy.market_hours.is_open,
        nextOpen: spy.market_hours.next_open,
        nextClose: spy.market_hours.next_close,
      };
    }
  } catch {
    // fall through to a neutral state
  }
  return { isOpen: false, nextOpen: null, nextClose: null };
}

/** Last outcome of the price request, reported without any secret material. */
let priceStatus = "not configured";

async function latestPrices(symbols: string[]): Promise<Record<string, PythPrice>> {
  const key = process.env.PYTH_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!key || symbols.length === 0) return {};

  const ids = await feedIds();
  const wanted = symbols.flatMap((s) => {
    const id = ids.get(s);
    return id ? [[s, id] as const] : [];
  });
  if (wanted.length === 0) {
    priceStatus = "feed catalogue unavailable";
    return {};
  }

  const query = wanted.map(([, id]) => `ids[]=${id}`).join("&");
  const res = await fetch(`${HERMES}/v2/updates/price/latest?${query}&parsed=true&ignore_invalid_price_ids=true`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 15 },
  });
  priceStatus = `hermes ${res.status}`;
  if (!res.ok) return {};

  const body = (await res.json()) as { parsed?: ParsedUpdate[] };
  const bySymbol = new Map(wanted.map(([s, id]) => [id.replace(/^0x/, ""), s]));
  const out: Record<string, PythPrice> = {};
  for (const u of body.parsed ?? []) {
    const symbol = bySymbol.get(u.id.replace(/^0x/, ""));
    if (!symbol) continue;
    const scale = 10 ** u.price.expo;
    out[symbol] = {
      price: Number(u.price.price) * scale,
      conf: Number(u.price.conf) * scale,
      publishTime: u.price.publish_time,
    };
  }
  return out;
}

export async function getPythSnapshot(symbols: string[]) {
  const [session, prices] = await Promise.all([
    nyseSession(),
    latestPrices(symbols).catch((err) => {
      priceStatus = err instanceof Error ? err.name : "error";
      return {};
    }),
  ]);
  return { session, prices: prices as Record<string, PythPrice>, live: Object.keys(prices).length > 0, status: priceStatus };
}
