"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABEL, PAY_TOKENS, SOL_MINT, USDC_MINT, type Category, type PayToken } from "@/lib/catalog";
import { useMarket, type Asset } from "@/lib/client";
import { pct, shares as fmtShares, usd } from "@/lib/format";
import {
  GIFT_CUSHION_LAMPORTS,
  buildBuyGiftTx,
  demoLink,
  giftLink,
  keypairFromSeed,
  readGift,
  waitForSignature,
  writeNote,
  type GiftNote,
} from "@/lib/gift";
import { nextGiftSlot, rememberLooseSeed, saveHint, unlockVault } from "@/lib/vault";
import { THEMES, themeById } from "@/lib/themes";
import { GiftCard } from "@/components/GiftCard";
import { AssetLogo } from "@/components/AssetLogo";
import { ShareGift } from "@/components/ShareGift";

const PRESETS = [10, 25, 50, 100, 250];
const FILTERS: ("all" | Category)[] = ["all", "pre-ipo", "index", "tech", "crypto", "classic"];
const MESSAGE_MAX = 160;
/** SOL the sender needs beyond the gift itself: gift account deposit, cushion and fees. */
const SOL_OVERHEAD = 0.0025 + GIFT_CUSHION_LAMPORTS / 1e9 + 0.0006;

type Stage = "compose" | "unlocking" | "signing" | "confirming" | "sealing" | "done";

interface Quote {
  outAmount: string;
  priceImpactPct: string;
  [k: string]: unknown;
}

interface Done {
  link: string;
  note: GiftNote;
  shares: number;
  signature?: string;
  preview?: boolean;
}

/** Input amount in the pay token's base units. */
function inputUnits(usdAmount: number, pay: PayToken, solPrice: number | undefined): bigint | null {
  if (!usdAmount || usdAmount <= 0) return null;
  if (pay.mint === USDC_MINT) return BigInt(Math.round(usdAmount * 1e6));
  if (!solPrice) return null;
  return BigInt(Math.round((usdAmount / solPrice) * 1e9));
}

function stampNote(fields: Omit<GiftNote, "at">): GiftNote {
  return { ...fields, at: Date.now() };
}

export function CreateGift() {
  const params = useSearchParams();
  const { market, error: marketError } = useMarket();
  const { connection } = useConnection();
  const { publicKey, signMessage, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [picked, setMint] = useState<string | undefined>(params.get("asset") ?? undefined);
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState("");
  const [pay, setPay] = useState<PayToken>(PAY_TOKENS[0]);
  const [themeId, setThemeId] = useState(params.get("theme") ?? "birthday");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [ack, setAck] = useState(false);

  const [quoteResult, setQuoteResult] = useState<{ key: string; quote?: Quote; error?: string } | null>(null);
  const [walletBalances, setBalances] = useState<{ owner: string; sol: number; usdc: number } | null>(null);

  const [stage, setStage] = useState<Stage>("compose");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  const assets = useMemo(() => market?.assets ?? [], [market]);
  const mint = picked ?? (assets.find((a) => a.symbol === "NVDA") ?? assets[0])?.mint;
  const asset = assets.find((a) => a.mint === mint);
  const theme = themeById(themeId);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter(
      (a) =>
        (filter === "all" || a.category === filter) &&
        (!q || a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q)),
    );
  }, [assets, filter, query]);

  // Wallet balances for the pay-with selector.
  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    (async () => {
      const usdcAta = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), publicKey);
      const [lamports, usdc] = await Promise.all([
        connection.getBalance(publicKey),
        connection
          .getTokenAccountBalance(usdcAta)
          .then((r) => Number(r.value.uiAmount ?? 0))
          .catch(() => 0),
      ]);
      if (!cancelled) setBalances({ owner: publicKey.toBase58(), sol: lamports / 1e9, usdc });
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection, stage]);

  const balances = walletBalances && publicKey && walletBalances.owner === publicKey.toBase58() ? walletBalances : null;
  const inputAmount = inputUnits(amount, pay, market?.solPrice);

  // Debounced live quote, keyed by request so stale answers are ignored.
  const quoteKey = asset && inputAmount ? `${pay.mint}/${asset.mint}/${inputAmount}` : null;
  useEffect(() => {
    if (!quoteKey) return;
    const [inputMint, outputMint, units] = quoteKey.split("/");
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/swap/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${units}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No route for this amount right now.");
        setQuoteResult({ key: quoteKey, quote: data });
      } catch (e) {
        if (!ctrl.signal.aborted) {
          setQuoteResult({ key: quoteKey, error: e instanceof Error ? e.message : "No route for this amount right now." });
        }
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [quoteKey]);
  const current = quoteResult && quoteResult.key === quoteKey ? quoteResult : null;
  const quote = current?.quote ?? null;
  const quoteError = current?.error ?? null;
  const quoting = !!quoteKey && !current;

  const outShares = quote && asset ? (Number(quote.outAmount) / 10 ** asset.decimals) * asset.multiplier : null;
  const outValue = quote && asset ? (Number(quote.outAmount) / 10 ** asset.decimals) * asset.rawPrice : null;
  const impact = quote ? Math.abs(Number(quote.priceImpactPct)) * 100 : 0;

  const neededSol = SOL_OVERHEAD + (pay.mint === SOL_MINT && market?.solPrice ? amount / market.solPrice : 0);
  const shortSol = balances ? balances.sol < neededSol : false;
  const shortUsdc = balances && pay.mint === USDC_MINT ? balances.usdc < amount : false;

  const busy = stage !== "compose" && stage !== "done";
  const canWrap = !!asset && !!quote && amount >= 1 && ack && !busy && !shortSol && !shortUsdc;

  async function wrap() {
    if (!asset || !quote) return;
    if (!publicKey || !sendTransaction) {
      setVisible(true);
      return;
    }
    setError(null);

    try {
      // 1. Pick the gift wallet.
      let seed: Uint8Array;
      let index: number | null = null;
      if (signMessage) {
        setStage("unlocking");
        const vault = await unlockVault(publicKey, signMessage);
        const slot = await nextGiftSlot(connection, publicKey, vault);
        seed = slot.seed;
        index = slot.index;
      } else {
        seed = crypto.getRandomValues(new Uint8Array(32));
        rememberLooseSeed(publicKey, seed);
      }
      const gift = keypairFromSeed(seed).publicKey;

      // 2. Fresh quote, then one transaction: open the gift wallet and buy straight into it.
      setStage("signing");
      const fresh = await fetch(`/api/swap/quote?inputMint=${pay.mint}&outputMint=${asset.mint}&amount=${inputAmount}`).then((r) => r.json());
      if (!fresh?.outAmount) throw new Error(fresh?.error ?? "The price moved. Try again.");
      const tx = await buildBuyGiftTx({ conn: connection, sender: publicKey, gift, mint: new PublicKey(asset.mint), quote: fresh });
      const signature = await sendTransaction(tx, connection, { maxRetries: 5 });

      setStage("confirming");
      await waitForSignature(connection, signature);
      if (index != null) saveHint(publicKey, index + 1);

      // 3. Seal the card on-chain, encrypted to the gift key.
      setStage("sealing");
      const state = await readGift(connection, seed, [asset.mint]).catch(() => null);
      const held = state?.holdings.find((h) => h.mint.toBase58() === asset.mint);
      const units = held ? Number(held.raw) / 10 ** held.decimals : Number(fresh.outAmount) / 10 ** asset.decimals;
      const note = stampNote({
        to: to.trim(),
        from: from.trim(),
        message: message.trim(),
        theme: theme.id,
        usd: Math.round(units * asset.rawPrice * 100) / 100,
        mint: asset.mint,
      });
      try {
        const memoSig = await writeNote(connection, seed, note);
        await waitForSignature(connection, memoSig, 30_000).catch(() => undefined);
      } catch {
        // The card also travels in the link below, so a failed memo is not fatal.
      }

      setDone({
        link: giftLink(window.location.origin, seed, note),
        note,
        shares: units * asset.multiplier,
        signature,
      });
      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setStage("compose");
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|denied|cancel/i.test(msg) ? "You cancelled in your wallet. Nothing was sent." : msg || "Something went wrong.");
    }
  }

  function preview() {
    if (!asset) return;
    const note = stampNote({
      to: to.trim(),
      from: from.trim(),
      message: message.trim(),
      theme: theme.id,
      usd: Math.round((outValue ?? amount) * 100) / 100,
      mint: asset.mint,
    });
    setDone({
      link: demoLink(window.location.origin, note),
      note,
      shares: outShares ?? (outValue ?? amount) / asset.price,
      preview: true,
    });
    setStage("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (stage === "done" && done && asset) {
    return (
      <ShareGift
        link={done.link}
        note={done.note}
        asset={asset}
        shares={done.shares}
        signature={done.signature}
        preview={done.preview}
        onAnother={() => {
          setDone(null);
          setStage("compose");
          setAck(false);
          setTo("");
          setMessage("");
        }}
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-14 lg:px-8 lg:pt-14">
      {/* Live preview */}
      <aside className="lg:order-2">
        <div className="lg:sticky lg:top-24">
          <GiftCard
            theme={theme}
            asset={asset ? { name: asset.name, ticker: asset.ticker, logo: asset.logo, issuer: asset.issuer } : undefined}
            value={outValue ?? amount}
            shares={outShares ?? undefined}
            to={to || "Someone special"}
            from={from || undefined}
          />
          <div className="mt-5 min-h-[3rem] rounded-2xl border border-line bg-card/70 px-5 py-4 text-[0.95rem] leading-relaxed text-ink-2">
            {message ? (
              <p className="font-serif text-[1.25rem] italic leading-snug text-ink">“{message}”</p>
            ) : (
              <p className="text-muted">Your note appears inside the gift, sealed so only they can read it.</p>
            )}
          </div>
          {asset && (
            <button
              type="button"
              onClick={() =>
                window.open(
                  demoLink("", stampNote({ to: to.trim(), from: from.trim(), message: message.trim(), theme: theme.id, usd: amount, mint: asset.mint })),
                  "_blank",
                  "noopener",
                )
              }
              className="mt-3 inline-flex items-center gap-1.5 px-1 text-[0.88rem] font-medium text-ink-2 hover:text-ribbon"
            >
              Preview what they’ll see ↗
            </button>
          )}
          {asset && <AssetFacts asset={asset} />}
        </div>
      </aside>

      {/* Composer */}
      <div className="lg:order-1">
        <p className="eyebrow">New gift</p>
        <h1 className="font-serif mt-3 text-[clamp(2.4rem,5vw,3.6rem)] leading-[1] tracking-tight">Wrap a piece of something great.</h1>

        {/* 1. Stock */}
        <Section n={1} title="What’s inside?">
          <div className="flex flex-col gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies"
              className="field"
              aria-label="Search companies"
            />
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    "shrink-0 rounded-full px-3.5 py-2 text-[0.85rem] transition-colors",
                    filter === f ? "bg-ink text-paper" : "bg-card text-ink-2 ring-1 ring-line hover:bg-paper-2",
                  )}
                >
                  {f === "all" ? "All" : CATEGORY_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {!market &&
              Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-[68px] rounded-2xl" />)}
            {marketError && !market && <p className="text-sm text-down">Prices are unavailable right now. Try again shortly.</p>}
            {visible.map((a) => (
              <button
                key={a.mint}
                onClick={() => setMint(a.mint)}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl p-3 text-left transition-all",
                  a.mint === mint ? "bg-ink text-paper shadow-lg" : "bg-card ring-1 ring-line hover:ring-line-strong",
                )}
              >
                <AssetLogo src={a.logo} name={a.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{a.name}</span>
                  <span className={clsx("block truncate text-[0.8rem]", a.mint === mint ? "text-paper/60" : "text-muted")}>
                    {a.issuer === "PreStocks" ? `Pre-IPO · ${usd(a.prestocks?.impliedValuation ?? 0, { compact: true })}` : a.ticker}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-[0.85rem] tabular">{usd(a.price)}</span>
                  <span
                    className={clsx(
                      "block font-mono text-[0.72rem] tabular",
                      a.mint === mint ? "text-paper/60" : (a.change24h ?? 0) >= 0 ? "text-up" : "text-down",
                    )}
                  >
                    {pct(a.change24h)}
                  </span>
                </span>
              </button>
            ))}
            {market && visible.length === 0 && <p className="py-6 text-center text-sm text-muted sm:col-span-2">No matches.</p>}
          </div>
        </Section>

        {/* 2. Amount */}
        <Section n={2} title="How much?">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
                className={clsx(
                  "h-12 rounded-2xl px-5 font-mono text-[0.95rem] tabular transition-colors",
                  amount === p && !custom ? "bg-ink text-paper" : "bg-card ring-1 ring-line hover:ring-line-strong",
                )}
              >
                ${p}
              </button>
            ))}
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-muted">$</span>
              <input
                inputMode="decimal"
                placeholder="Other"
                value={custom}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setCustom(v);
                  setAmount(Number(v) || 0);
                }}
                className="field h-12! w-32 pl-8! font-mono"
                aria-label="Custom amount in US dollars"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-[0.9rem] text-muted">Pay with</span>
            <div className="inline-flex rounded-full bg-card p-1 ring-1 ring-line">
              {PAY_TOKENS.map((t) => (
                <button
                  key={t.mint}
                  onClick={() => setPay(t)}
                  className={clsx(
                    "rounded-full px-4 py-1.5 text-[0.88rem] font-medium transition-colors",
                    pay.mint === t.mint ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
            {balances && (
              <span className="font-mono text-[0.8rem] text-muted tabular">
                balance {pay.mint === USDC_MINT ? `${balances.usdc.toFixed(2)} USDC` : `${balances.sol.toFixed(4)} SOL`}
              </span>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-paper-2/70 px-5 py-4 text-[0.92rem]">
            {quoting && !quote ? (
              <p className="text-muted">Finding the best price…</p>
            ) : quote && asset && outShares != null ? (
              <p>
                They’ll receive about <strong className="font-semibold">{fmtShares(outShares)} {asset.ticker}</strong>
                <span className="text-muted">, routed by Jupiter{impact > 0.5 ? `, ${impact.toFixed(2)}% price impact` : ""}.</span>
              </p>
            ) : (
              <p className="text-down">{quoteError ?? "Enter an amount of at least $1."}</p>
            )}
            {asset?.issuer === "PreStocks" && (
              <p className="mt-2 text-[0.82rem] text-muted">PreStocks charges a 1% issuer fee when the gift moves to their wallet.</p>
            )}
            {impact > 2 && <p className="mt-2 text-[0.82rem] text-down">Liquidity is thin for this size. Consider a smaller gift.</p>}
          </div>
        </Section>

        {/* 3. Card */}
        <Section n={3} title="Make it theirs">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className={clsx(
                  "group flex flex-col items-center gap-2 rounded-2xl p-2 transition-all",
                  themeId === t.id ? "bg-card ring-2 ring-ink" : "hover:bg-card",
                )}
                aria-pressed={themeId === t.id}
              >
                <span className="card-noise relative block aspect-[1.586/1] w-full overflow-hidden rounded-lg shadow-sm" style={{ background: t.background }} />
                <span className="text-[0.75rem] text-ink-2">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] text-muted">For</span>
              <input className="field" value={to} maxLength={32} onChange={(e) => setTo(e.target.value)} placeholder="Their name" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.85rem] text-muted">From</span>
              <input className="field" value={from} maxLength={32} onChange={(e) => setFrom(e.target.value)} placeholder="Your name" />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 flex justify-between text-[0.85rem] text-muted">
              <span>A note</span>
              <span className="font-mono tabular">{message.length}/{MESSAGE_MAX}</span>
            </span>
            <textarea
              className="field min-h-[104px] resize-none"
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Happy 18th. This one grows with you."
            />
          </label>
        </Section>

        {/* 4. Review */}
        <Section n={4} title="Wrap it">
          <dl className="divide-y divide-line rounded-2xl border border-line bg-card text-[0.93rem]">
            <Row label="Gift" value={asset ? `${usd(amount)} of ${asset.name}` : "—"} />
            <Row label="Rides along in the gift" value="≈ 0.005 SOL" hint="Pays for their account and claim fee. What’s left lands in their wallet." />
            <Row label="Keepsake fee" value="Free" />
          </dl>

          <label className="mt-4 flex cursor-pointer items-start gap-3 text-[0.88rem] leading-relaxed text-ink-2">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--ribbon)]" />
            <span>
              I’ve checked that {asset?.issuer ?? "this issuer"} tokens are available where they live, and I understand that anyone
              holding the link can open the gift.
            </span>
          </label>

          {connected && (shortSol || shortUsdc) && (
            <p className="mt-4 rounded-xl bg-down/8 px-4 py-3 text-[0.88rem] text-down">
              {shortUsdc ? `You need ${usd(amount)} USDC. ` : ""}
              {shortSol ? `Keep at least ${neededSol.toFixed(4)} SOL for the gift’s deposit and fees.` : ""}
            </p>
          )}
          {error && <p className="mt-4 rounded-xl bg-down/8 px-4 py-3 text-[0.88rem] text-down">{error}</p>}

          <button
            onClick={wrap}
            disabled={connected ? !canWrap : busy}
            className="btn btn-ribbon mt-6 h-14! w-full text-[1.02rem]!"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={connected ? stage : "connect"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                {busy && <Spinner />}
                {!connected
                  ? "Connect a wallet to wrap"
                  : stage === "unlocking"
                    ? "Sign to unlock your gift vault…"
                    : stage === "signing"
                      ? "Approve the gift in your wallet…"
                      : stage === "confirming"
                        ? "Wrapping on Solana…"
                        : stage === "sealing"
                          ? "Sealing your note…"
                          : `Wrap ${usd(amount, { cents: amount % 1 !== 0 })} gift`}
              </motion.span>
            </AnimatePresence>
          </button>
          <button
            type="button"
            onClick={preview}
            disabled={!asset || busy}
            className="mt-3 w-full text-center text-[0.9rem] font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink disabled:opacity-40"
          >
            Or try the whole flow without paying
          </button>
          {stage === "unlocking" && (
            <p className="mt-3 text-center text-[0.82rem] text-muted">
              This free signature lets you find and reclaim your gifts later, on any device.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="mb-5 flex items-center gap-3 text-[1.15rem] font-semibold tracking-tight">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink font-mono text-[0.75rem] text-paper">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-3.5">
      <dt className="text-ink-2">
        {label}
        {hint && <span className="mt-0.5 block text-[0.78rem] text-muted">{hint}</span>}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function AssetFacts({ asset }: { asset: Asset }) {
  return (
    <div className="mt-5 rounded-2xl border border-line bg-card/70 p-5 text-[0.88rem]">
      <div className="flex items-center gap-3">
        <AssetLogo src={asset.logo} name={asset.name} size={32} />
        <div className="min-w-0">
          <p className="font-medium">{asset.name}</p>
          <p className="truncate text-[0.78rem] text-muted">
            {asset.issuer === "PreStocks" ? "Pre-IPO exposure via PreStocks" : "Backed 1:1 by the real share via xStocks"}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact label="Token price" value={usd(asset.price)} />
        <Fact label="24h" value={pct(asset.change24h)} tone={(asset.change24h ?? 0) >= 0 ? "up" : "down"} />
        {asset.prestocks ? (
          <>
            <Fact label="Implied valuation" value={usd(asset.prestocks.impliedValuation, { compact: true })} />
            <Fact
              label="vs. PreStocks mark"
              value={`${asset.prestocks.premium >= 0 ? "+" : "−"}${Math.abs(asset.prestocks.premium * 100).toFixed(1)}%`}
            />
          </>
        ) : (
          <>
            {asset.underlying ? (
              <Fact label="Listed share · Pyth" value={usd(asset.underlying.price)} />
            ) : (
              <Fact label="Trades" value="24/7 on Solana" />
            )}
            <Fact label="On-chain liquidity" value={asset.liquidity ? usd(asset.liquidity, { compact: true }) : "—"} />
          </>
        )}
      </dl>
      {asset.prestocks && <p className="mt-4 leading-relaxed text-ink-2">{asset.prestocks.description}</p>}
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <dt className="text-[0.75rem] text-muted">{label}</dt>
      <dd className={clsx("font-mono tabular", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</dd>
    </div>
  );
}
