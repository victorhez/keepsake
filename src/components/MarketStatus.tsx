"use client";

import { useEffect, useState } from "react";
import { useMarket } from "@/lib/client";
import { countdown } from "@/lib/format";

/** NYSE session from Pyth market-hours data, next to Solana's always-open market. */
export function MarketStatus({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { market } = useMarket();
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const s = market?.session;
  const dim = tone === "dark" ? "text-white/55" : "text-muted";

  return (
    <div className="flex flex-col gap-2 text-[0.9rem]">
      <div className="flex items-center gap-2.5">
        <span className="live-dot h-2 w-2 rounded-full bg-up text-up" />
        <span className="font-medium">Solana</span>
        <span className={dim}>open now, always</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${s?.isOpen ? "bg-up" : "bg-muted/60"}`} />
        <span className="font-medium">NYSE</span>
        <span className={dim}>
          {!s
            ? "checking…"
            : s.isOpen
              ? `open · closes in ${s.nextClose ? countdown(s.nextClose) : "—"}`
              : `closed · opens in ${s.nextOpen ? countdown(s.nextOpen) : "—"}`}
        </span>
      </div>
    </div>
  );
}
