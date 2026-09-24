"use client";

import clsx from "clsx";
import { useRef, type CSSProperties, type PointerEvent } from "react";
import type { CardTheme } from "@/lib/themes";
import { shares as fmtShares, usd } from "@/lib/format";
import { AssetLogo } from "./AssetLogo";
import { LogoMark } from "./Logo";

export interface GiftCardAsset {
  name: string;
  ticker: string;
  logo?: string;
  issuer: string;
}

interface Props {
  theme: CardTheme;
  asset?: GiftCardAsset;
  value?: number;
  shares?: number;
  to?: string;
  from?: string;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Deterministic pseudo-random in [0, 1), identical on server and client. */
function seeded(i: number) {
  return (((i + 1) * 2654435761) % 4294967296) / 4294967296;
}

function Pattern({ kind, color }: { kind: CardTheme["pattern"]; color: string }) {
  const common = "pointer-events-none absolute inset-0 h-full w-full";
  switch (kind) {
    case "confetti":
      return (
        <svg className={common} viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 34 }).map((_, i) => {
            const x = seeded(i) * 320;
            const y = seeded(i + 99) * 200;
            const r = seeded(i + 7) * 180;
            return i % 3 === 0 ? (
              <circle key={i} cx={x} cy={y} r={1.6 + seeded(i + 3) * 1.8} fill={color} opacity={0.35} />
            ) : (
              <rect key={i} x={x} y={y} width={7} height={2.6} rx={1.3} fill={color} opacity={0.3} transform={`rotate(${r} ${x} ${y})`} />
            );
          })}
        </svg>
      );
    case "rings":
      return (
        <svg className={common} viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <circle key={i} cx={300} cy={-10} r={40 + i * 22} fill="none" stroke={color} strokeWidth={0.8} opacity={0.28 - i * 0.02} />
          ))}
        </svg>
      );
    case "stars":
      return (
        <svg className={common} viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 22 }).map((_, i) => {
            const x = seeded(i + 5) * 320;
            const y = seeded(i + 55) * 200;
            const s = 2 + seeded(i + 11) * 4;
            return (
              <path
                key={i}
                d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`}
                fill={color}
                opacity={0.55}
              />
            );
          })}
        </svg>
      );
    case "waves":
      return (
        <svg className={common} viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <path
              key={i}
              d={`M-10 ${120 + i * 11} C 60 ${100 + i * 11}, 120 ${150 + i * 11}, 200 ${125 + i * 11} S 300 ${105 + i * 11}, 340 ${120 + i * 11}`}
              fill="none"
              stroke={color}
              strokeWidth={0.8}
              opacity={0.3}
            />
          ))}
        </svg>
      );
    case "sprigs":
      return (
        <svg className={common} viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => {
            const x = seeded(i + 21) * 320;
            const y = seeded(i + 71) * 200;
            const r = seeded(i + 31) * 360;
            return (
              <g key={i} transform={`rotate(${r} ${x} ${y})`} opacity={0.3}>
                <path d={`M${x} ${y}l0 14`} stroke={color} strokeWidth={0.9} />
                <ellipse cx={x - 3} cy={y + 5} rx={3} ry={1.4} fill={color} />
                <ellipse cx={x + 3} cy={y + 9} rx={3} ry={1.4} fill={color} />
                <circle cx={x} cy={y} r={1.6} fill={color} />
              </g>
            );
          })}
        </svg>
      );
    case "grid":
      return (
        <svg className={common} viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <pattern id="ks-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M16 0H0V16" fill="none" stroke={color} strokeWidth={0.5} opacity={0.22} />
            </pattern>
          </defs>
          <rect width="320" height="200" fill="url(#ks-grid)" />
        </svg>
      );
  }
}

export function GiftCard({ theme, asset, value, shares, to, from, interactive = true, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || !ref.current || e.pointerType === "touch") return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ref.current.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
    ref.current.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
    ref.current.style.setProperty("--mx", `${px * 100}%`);
    ref.current.style.setProperty("--my", `${py * 100}%`);
  }

  function onLeave() {
    if (!ref.current) return;
    ref.current.style.setProperty("--rx", "0deg");
    ref.current.style.setProperty("--ry", "0deg");
  }

  return (
    <div className={clsx("[perspective:1400px]", className)} style={style}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="card-noise relative aspect-[1.586/1] w-full overflow-hidden rounded-[clamp(18px,4.5cqw,30px)] [container-type:inline-size] shadow-[0_40px_80px_-30px_rgba(23,20,15,0.55),0_2px_0_rgba(255,255,255,0.25)_inset] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
        style={{
          background: theme.background,
          color: theme.ink,
          transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
        }}
      >
        <Pattern kind={theme.pattern} color={theme.accent} />
        <div className="foil pointer-events-none absolute inset-0 z-[3]" />

        <div className="relative z-[4] flex h-full flex-col justify-between p-[6.5cqw]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-[1.6cqw]" style={{ color: theme.ink }}>
              <LogoMark size={22} className="h-[6.5cqw] w-[6.5cqw]" />
              <span className="font-serif text-[5.4cqw] leading-none">Keepsake</span>
            </div>
            {asset && (
              <span
                className="rounded-full px-[2.6cqw] py-[1cqw] font-mono text-[2.5cqw] uppercase tracking-[0.12em]"
                style={{ background: "rgba(255,255,255,0.18)", boxShadow: `inset 0 0 0 1px ${theme.soft}` }}
              >
                {asset.issuer === "PreStocks" ? "Pre-IPO" : asset.issuer}
              </span>
            )}
          </div>

          <div>
            <p className="font-serif text-[8.4cqw] leading-[0.98] tracking-tight">{theme.greeting}</p>
            <p className="mt-[1.4cqw] text-[3.4cqw] font-medium" style={{ color: theme.soft }}>
              {asset ? <>a piece of {asset.name}</> : <>a piece of something great</>}
            </p>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-[2.6cqw]">
              {asset ? (
                <AssetLogo src={asset.logo} name={asset.name} size={48} className="h-[11cqw]! w-[11cqw]! ring-2 ring-white/30" />
              ) : (
                <span className="h-[11cqw] w-[11cqw] rounded-full bg-white/25" />
              )}
              <div>
                <p className="font-serif text-[9cqw] leading-none tabular">{value != null ? usd(value) : "$—"}</p>
                <p className="mt-[1cqw] font-mono text-[2.6cqw] tracking-wide" style={{ color: theme.soft }}>
                  {shares != null && asset ? `${fmtShares(shares)} ${asset.ticker}` : asset?.ticker ?? "Choose a stock"}
                </p>
              </div>
            </div>
            <div className="max-w-[42%] text-right text-[3.1cqw] leading-snug">
              {to && (
                <p className="truncate">
                  <span style={{ color: theme.soft }}>for </span>
                  <span className="font-semibold">{to}</span>
                </p>
              )}
              {from && (
                <p className="truncate">
                  <span style={{ color: theme.soft }}>from </span>
                  <span className="font-semibold">{from}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
