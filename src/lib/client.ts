"use client";

import { Connection } from "@solana/web3.js";
import { useEffect, useState } from "react";
import type { Asset, MarketSnapshot } from "./market";

export type { Asset, MarketSnapshot };

let connection: Connection | null = null;

/** Browser connection that routes through the app's RPC relay. */
export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(`${window.location.origin}/api/rpc`, { commitment: "confirmed" });
  }
  return connection;
}

let cached: MarketSnapshot | null = null;
let inflight: Promise<MarketSnapshot> | null = null;
const listeners = new Set<(m: MarketSnapshot) => void>();

async function loadMarket(): Promise<MarketSnapshot> {
  if (!inflight) {
    inflight = fetch("/api/market")
      .then(async (r) => {
        if (!r.ok) throw new Error("market unavailable");
        return (await r.json()) as MarketSnapshot;
      })
      .then((m) => {
        cached = m;
        listeners.forEach((l) => l(m));
        return m;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Shared, self-refreshing market snapshot. */
export function useMarket(refreshMs = 30_000) {
  const [market, setMarket] = useState<MarketSnapshot | null>(cached);
  const [error, setError] = useState(false);

  useEffect(() => {
    listeners.add(setMarket);
    const tick = () => loadMarket().then(() => setError(false), () => setError(true));
    if (!cached || Date.now() - cached.updatedAt > refreshMs) tick();
    const id = setInterval(tick, refreshMs);
    return () => {
      listeners.delete(setMarket);
      clearInterval(id);
    };
  }, [refreshMs]);

  return { market, error };
}

export function findAsset(market: MarketSnapshot | null, mint: string | undefined): Asset | undefined {
  return mint ? market?.assets.find((a) => a.mint === mint) : undefined;
}
