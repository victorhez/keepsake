import "server-only";
import { XSTOCKS, SOL_MINT, USDC_MINT, type Category, type Issuer } from "./catalog";
import { getPythSnapshot, type SessionState } from "./pyth";

export interface Asset {
  mint: string;
  symbol: string;
  ticker: string;
  name: string;
  issuer: Issuer;
  category: Category;
  blurb?: string;
  logo?: string;
  decimals: number;
  /** USD price of one displayed token (one share-equivalent). */
  price: number;
  /** USD value of one raw token unit before the scaled-UI multiplier. */
  rawPrice: number;
  /** Scaled-UI multiplier: displayed amount = raw amount × multiplier. */
  multiplier: number;
  change24h: number | null;
  liquidity: number | null;
  /** Pyth price of the underlying listed share, when available. */
  underlying?: { price: number; source: "pyth"; publishTime: number };
  prestocks?: {
    markPrice: number;
    impliedValuation: number;
    markValuation: number;
    /** Token price relative to the PreStocks mark, as a fraction. */
    premium: number;
    description: string;
    url: string;
  };
}

export interface MarketSnapshot {
  assets: Asset[];
  solPrice: number;
  session: SessionState;
  pyth: boolean;
  pythStatus: string;
  updatedAt: number;
}

const JUP_BASE = process.env.JUPITER_API_KEY ? "https://api.jup.ag" : "https://lite-api.jup.ag";

export function jupHeaders(): HeadersInit {
  return process.env.JUPITER_API_KEY ? { "x-api-key": process.env.JUPITER_API_KEY } : {};
}

export function jupUrl(path: string) {
  return `${JUP_BASE}${path}`;
}

interface JupPrice {
  usdPrice: number;
  decimals: number;
  liquidity?: number;
  priceChange24h?: number;
  scaledUiConfig?: {
    multiplier: number;
    newMultiplier: number;
    newMultiplierEffectiveAt: string;
    usdPricePrescaled?: number;
  };
}

interface JupToken {
  id: string;
  icon?: string;
}

interface PreStock {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  contract_address: string;
  markPrice: number;
  markValuation: number;
  tokenPrice: number;
  impliedValuation: number;
}

async function getJson<T>(url: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: "application/json", ...(init?.headers ?? {}) },
    next: { revalidate: init?.revalidate ?? 20 },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

async function getPrices(mints: string[]): Promise<Record<string, JupPrice>> {
  const out: Record<string, JupPrice> = {};
  // The price endpoint accepts up to 50 ids per call.
  for (let i = 0; i < mints.length; i += 50) {
    const ids = mints.slice(i, i + 50).join(",");
    Object.assign(out, await getJson<Record<string, JupPrice>>(jupUrl(`/price/v3?ids=${ids}`), { headers: jupHeaders() }));
  }
  return out;
}

async function getIcons(mints: string[]): Promise<Record<string, string>> {
  try {
    const tokens = await getJson<JupToken[]>(jupUrl(`/tokens/v2/search?query=${mints.join(",")}`), {
      headers: jupHeaders(),
      revalidate: 86_400,
    });
    return Object.fromEntries(tokens.filter((t) => t.icon).map((t) => [t.id, t.icon!]));
  } catch {
    return {};
  }
}

function currentMultiplier(p: JupPrice): number {
  const cfg = p.scaledUiConfig;
  if (!cfg) return 1;
  const effective = Date.parse(cfg.newMultiplierEffectiveAt);
  return Number.isFinite(effective) && effective <= Date.now() ? cfg.newMultiplier : cfg.multiplier;
}

export async function getMarket(): Promise<MarketSnapshot> {
  const [prestocks, pyth] = await Promise.all([
    getJson<PreStock[]>("https://prestocks.com/api/prestocks", { revalidate: 30 }).catch(() => [] as PreStock[]),
    getPythSnapshot(XSTOCKS.flatMap((x) => (x.pythEquity ? [x.pythEquity] : []))),
  ]);

  const mints = [...XSTOCKS.map((x) => x.mint), ...prestocks.map((p) => p.contract_address), SOL_MINT, USDC_MINT];
  const [prices, icons] = await Promise.all([getPrices(mints), getIcons(XSTOCKS.map((x) => x.mint))]);

  const assets: Asset[] = [];

  for (const p of prestocks) {
    const jp = prices[p.contract_address];
    const multiplier = jp ? currentMultiplier(jp) : 1;
    const price = jp?.usdPrice ?? p.tokenPrice;
    assets.push({
      mint: p.contract_address,
      symbol: p.symbol,
      ticker: p.symbol,
      name: p.name.replace(/\s*PreStocks$/i, ""),
      issuer: "PreStocks",
      category: "pre-ipo",
      logo: p.image,
      decimals: jp?.decimals ?? 9,
      price,
      rawPrice: price * multiplier,
      multiplier,
      change24h: jp?.priceChange24h ?? null,
      liquidity: jp?.liquidity ?? null,
      prestocks: {
        markPrice: p.markPrice,
        impliedValuation: p.impliedValuation,
        markValuation: p.markValuation,
        premium: p.markPrice > 0 ? p.tokenPrice / p.markPrice - 1 : 0,
        description: p.description.split("\n")[0],
        url: p.external_url,
      },
    });
  }
  assets.sort((a, b) => (b.prestocks?.impliedValuation ?? 0) - (a.prestocks?.impliedValuation ?? 0));

  for (const x of XSTOCKS) {
    const jp = prices[x.mint];
    if (!jp) continue;
    const multiplier = currentMultiplier(jp);
    const underlying = x.pythEquity ? pyth.prices[x.pythEquity] : undefined;
    assets.push({
      ...x,
      logo: icons[x.mint],
      decimals: jp.decimals,
      price: jp.usdPrice,
      rawPrice: jp.scaledUiConfig?.usdPricePrescaled ?? jp.usdPrice * multiplier,
      multiplier,
      change24h: jp.priceChange24h ?? null,
      liquidity: jp.liquidity ?? null,
      underlying: underlying ? { price: underlying.price, source: "pyth", publishTime: underlying.publishTime } : undefined,
    });
  }

  return {
    assets,
    solPrice: prices[SOL_MINT]?.usdPrice ?? 0,
    session: pyth.session,
    pyth: pyth.live,
    pythStatus: pyth.status,
    updatedAt: Date.now(),
  };
}
