"use client";

import Link from "next/link";
import clsx from "clsx";
import { useMarket } from "@/lib/client";
import { pct, usd } from "@/lib/format";
import { AssetLogo } from "./AssetLogo";

export function PreIpoGrid() {
  const { market } = useMarket();
  const pre = market?.assets.filter((a) => a.issuer === "PreStocks") ?? [];

  if (pre.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[172px] animate-pulse rounded-3xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {pre.map((a) => (
        <Link
          key={a.mint}
          href={`/create?asset=${a.mint}`}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.08]"
        >
          <div className="flex items-start justify-between">
            <AssetLogo src={a.logo} name={a.name} size={44} className="ring-white/10" />
            <span className={clsx("font-mono text-[0.78rem] tabular", (a.change24h ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300")}>
              {pct(a.change24h)}
            </span>
          </div>
          <div className="mt-8">
            <p className="text-[1.05rem] font-medium text-white">{a.name}</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <p className="text-[0.85rem] text-white/55">
                valued at <span className="text-white/85 tabular">{usd(a.prestocks?.impliedValuation ?? 0, { compact: true })}</span>
              </p>
              <span className="translate-x-1 text-[0.85rem] font-medium text-[#ffb4a3] opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 max-md:translate-x-0 max-md:opacity-100">
                Gift →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
