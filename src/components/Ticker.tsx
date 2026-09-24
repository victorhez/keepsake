"use client";

import Link from "next/link";
import clsx from "clsx";
import { useMarket } from "@/lib/client";
import { pct, usd } from "@/lib/format";
import { AssetLogo } from "./AssetLogo";

export function Ticker() {
  const { market } = useMarket();
  const assets = market?.assets ?? [];

  if (assets.length === 0) {
    return <div className="h-[55px] border-y border-line" aria-hidden />;
  }

  const row = [...assets, ...assets];
  return (
    <div className="relative overflow-hidden border-y border-line bg-card/50 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="marquee flex w-max items-center py-3.5">
        {row.map((a, i) => (
          <Link
            key={`${a.mint}-${i}`}
            href={`/create?asset=${a.mint}`}
            className="group flex items-center gap-2.5 px-6 text-[0.9rem]"
            aria-hidden={i >= assets.length}
            tabIndex={i >= assets.length ? -1 : 0}
          >
            <AssetLogo src={a.logo} name={a.name} size={26} />
            <span className="font-medium group-hover:text-ribbon">{a.name}</span>
            <span className="font-mono text-[0.82rem] text-ink-2 tabular">{usd(a.price)}</span>
            <span className={clsx("font-mono text-[0.78rem] tabular", (a.change24h ?? 0) >= 0 ? "text-up" : "text-down")}>
              {pct(a.change24h)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
