"use client";

import type { CSSProperties } from "react";
import { themeById } from "@/lib/themes";
import { useMarket } from "@/lib/client";
import { GiftCard } from "./GiftCard";

const STACK = [
  { symbol: "SPY", name: "S&P 500", issuer: "xStocks", theme: "arrival", to: "Baby Noor", from: "Grandma", usd: 250, x: -10, y: 70, r: -9 },
  { symbol: "ANTHROPIC", name: "Anthropic", issuer: "PreStocks", theme: "congrats", to: "Priya", from: "the team", usd: 100, x: 70, y: -40, r: 7 },
  { symbol: "NVDA", name: "NVIDIA", issuer: "xStocks", theme: "birthday", to: "Tomi", from: "Dad", usd: 50, x: 20, y: 10, r: -2 },
];

export function HeroCards() {
  const { market } = useMarket();

  return (
    <div className="relative mx-auto aspect-[1/0.9] w-full max-w-[560px]">
      {STACK.map((c, i) => {
        const asset = market?.assets.find((a) => a.symbol === c.symbol);
        return (
          <div
            key={c.symbol}
            className="card-in absolute left-[4%] top-[14%] w-[82%]"
            style={{ zIndex: i, "--x": `${c.x}px`, "--y": `${c.y}px`, "--r": `${c.r}deg`, "--d": `${0.15 + i * 0.14}s` } as CSSProperties}
          >
            <div className="float" style={{ "--dur": `${6 + i}s`, "--d": `${i * 0.6}s` } as CSSProperties}>
              <GiftCard
                theme={themeById(c.theme)}
                asset={{
                  name: asset?.name ?? c.name,
                  ticker: asset?.ticker ?? c.symbol,
                  logo: asset?.logo,
                  issuer: c.issuer,
                }}
                value={c.usd}
                shares={asset ? c.usd / asset.price : undefined}
                to={c.to}
                from={c.from}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
