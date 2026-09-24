export function usd(n: number, opts: { compact?: boolean; cents?: boolean } = {}): string {
  if (!Number.isFinite(n)) return "—";
  if (opts.compact) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: n >= 1e12 ? 2 : 1 }).format(n);
  }
  const cents = opts.cents ?? true;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
}

export function pct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(digits)}%`;
}

export function shares(n: number): string {
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumSignificantDigits: 4 });
}

export function shortAddress(a: string, n = 4): string {
  return a.length > n * 2 + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a;
}

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, size] of units) {
    if (abs >= size) return rtf.format(-Math.round(diff / size), unit);
  }
  return "just now";
}

export function longDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function countdown(toUnixSeconds: number): string {
  const s = Math.max(0, toUnixSeconds - Math.floor(Date.now() / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
