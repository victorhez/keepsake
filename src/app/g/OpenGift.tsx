"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { XSTOCKS } from "@/lib/catalog";
import { findAsset, useMarket, type MarketSnapshot } from "@/lib/client";
import { longDate, pct, relativeTime, shares as fmtShares, shortAddress, usd } from "@/lib/format";
import { claimGift, decodeNote, parseGiftFragment, readGift, type GiftNote, type GiftState } from "@/lib/gift";
import { themeById } from "@/lib/themes";
import { GiftCard } from "@/components/GiftCard";
import { AssetLogo } from "@/components/AssetLogo";

type Phase = "loading" | "invalid" | "wrapped" | "open" | "claiming" | "claimed" | "opened-before" | "empty";

const DEMO_NOTE: GiftNote = {
  to: "Ada",
  from: "Mum",
  message: "Happy 18th! Your first piece of the companies building the future. This one grows with you.",
  theme: "congrats",
  usd: 46,
  at: Date.now() - 1000 * 60 * 60 * 24 * 41,
  mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
};

const CONFETTI = ["#e8492e", "#b8903f", "#17140f", "#ffffff"];

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** Demo gifts are built locally from live prices; nothing is read from or sent to the chain. */
function demoState(market: MarketSnapshot, note: GiftNote): GiftState {
  const asset = findAsset(market, note.mint) ?? market.assets[0];
  // The built-in sample shows a gift that has grown; a sender's preview shows today's value.
  const growth = note === DEMO_NOTE ? 1.08 : 1;
  const units = (note.usd * growth) / asset.rawPrice;
  return {
    address: PublicKey.default,
    lamports: 0,
    holdings: [
      {
        mint: new PublicKey(asset.mint),
        ata: PublicKey.default,
        programId: PublicKey.default,
        raw: BigInt(Math.round(units * 10 ** asset.decimals)),
        decimals: asset.decimals,
      },
    ],
    status: "ready",
    note: null,
    createdAt: note.at,
    lastActivity: note.at,
  };
}

export function OpenGift() {
  const { connection } = useConnection();
  const { market } = useMarket();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
  const demo = !!hash?.startsWith("#demo");
  const parsed = useMemo(() => (hash && !demo ? parseGiftFragment(hash) : null), [hash, demo]);
  const seed = parsed?.seed ?? null;
  const linkNote = useMemo(
    () => (demo ? decodeNote(hash?.split(".")[1] ?? "") ?? DEMO_NOTE : parsed?.note ?? null),
    [demo, hash, parsed],
  );

  const [chain, setChain] = useState<{ hash: string; state: GiftState } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [opened, setOpened] = useState(false);
  const [action, setAction] = useState<"idle" | "claiming" | "claimed">("idle");
  const [manual, setManual] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimSig, setClaimSig] = useState<string | null>(null);
  const [claimedTo, setClaimedTo] = useState<string | null>(null);

  const mints = useMemo(
    () => [...XSTOCKS.map((x) => x.mint), ...(market?.assets.filter((a) => a.issuer === "PreStocks").map((a) => a.mint) ?? [])],
    [market],
  );

  useEffect(() => {
    if (!seed || !market || !hash) return;
    let cancelled = false;
    readGift(connection, seed, mints).then(
      (state) => !cancelled && setChain({ hash, state }),
      () => !cancelled && setError("We couldn’t reach Solana just now. Refresh to try again."),
    );
    return () => {
      cancelled = true;
    };
  }, [seed, market, connection, mints, hash, refresh]);

  const demoGift = useMemo(() => (demo && market && linkNote ? demoState(market, linkNote) : null), [demo, market, linkNote]);
  const state = demo ? demoGift : chain && chain.hash === hash ? chain.state : null;

  const phase: Phase =
    hash === null
      ? "loading"
      : !demo && !parsed
        ? "invalid"
        : action === "claimed"
          ? "claimed"
          : !state
            ? "loading"
            : state.status === "ready"
              ? action === "claiming"
                ? "claiming"
                : opened
                  ? "open"
                  : "wrapped"
              : state.status === "claimed"
                ? "opened-before"
                : "empty";

  const note = state?.note ?? linkNote;
  const theme = themeById(note?.theme);
  const holding = state?.holdings[0];
  const asset = findAsset(market, holding?.mint.toBase58() ?? note?.mint);
  const units = holding ? Number(holding.raw) / 10 ** holding.decimals : 0;
  const valueNow = asset ? units * asset.rawPrice : undefined;
  const sharesNow = asset ? units * asset.multiplier : undefined;
  const change = note?.usd && valueNow ? ((valueNow - note.usd) / note.usd) * 100 : null;

  const recipient = useMemo(() => {
    if (useManual) {
      try {
        return new PublicKey(manual.trim());
      } catch {
        return null;
      }
    }
    return publicKey ?? null;
  }, [useManual, manual, publicKey]);

  async function claim() {
    if (!recipient || (!demo && !seed)) return;
    setError(null);
    setAction("claiming");
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 1400));
      } else {
        setClaimSig(await claimGift(connection, seed!, recipient, mints));
      }
      setClaimedTo(recipient.toBase58());
      setAction("claimed");
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.3 }, colors: CONFETTI, disableForReducedMotion: true });
    } catch (e) {
      setAction("idle");
      setError(e instanceof Error ? e.message : "The claim didn’t go through. Please try again.");
    }
  }

  function unwrap() {
    setOpened(true);
    confetti({ particleCount: 70, spread: 60, startVelocity: 35, origin: { y: 0.45 }, colors: ["#e8492e", "#b8903f", "#ffffff"], disableForReducedMotion: true });
  }

  if (phase === "invalid") {
    return (
      <Centered>
        <p className="eyebrow">Hmm</p>
        <h1 className="font-serif mt-3 text-5xl leading-none">This link looks incomplete.</h1>
        <p className="mt-5 max-w-md leading-relaxed text-ink-2">
          A gift link ends with a long code after a # sign. Some apps cut it off. Ask the sender to copy it again, or open it
          straight from their message.
        </p>
        <Link href="/" className="btn btn-primary mt-8">What is Keepsake?</Link>
      </Centered>
    );
  }

  if (phase === "loading" || !state) {
    return (
      <Centered>
        <div className="skeleton aspect-[1.586/1] w-full max-w-[520px] rounded-[28px]" />
        <p className="mt-6 text-muted">{error ?? "Finding your gift…"}</p>
      </Centered>
    );
  }

  if (phase === "empty") {
    return (
      <Centered>
        <p className="eyebrow">Almost there</p>
        <h1 className="font-serif mt-3 text-5xl leading-none">This gift is still being wrapped.</h1>
        <p className="mt-5 max-w-md leading-relaxed text-ink-2">
          Nothing has arrived in it yet. If it was just sent, give it a few seconds. Otherwise the sender may still need to finish
          wrapping it.
        </p>
        <button onClick={() => setRefresh((n) => n + 1)} className="btn btn-primary mt-8">Check again</button>
      </Centered>
    );
  }

  if (phase === "opened-before") {
    return (
      <Centered>
        <div className="w-full max-w-[520px] opacity-60 grayscale-[35%]">
          <GiftCard
            theme={theme}
            asset={asset ? { name: asset.name, ticker: asset.ticker, logo: asset.logo, issuer: asset.issuer } : undefined}
            value={note?.usd}
            to={note?.to || undefined}
            from={note?.from || undefined}
            interactive={false}
          />
        </div>
        <p className="eyebrow mt-10">Already opened</p>
        <h1 className="font-serif mt-3 text-5xl leading-none">This gift has been claimed.</h1>
        <p className="mt-5 max-w-md leading-relaxed text-ink-2">
          {state.lastActivity ? `It was claimed ${relativeTime(state.lastActivity)}. ` : ""}
          If that wasn’t you, the sender can tell you more. Keepsake never holds gifts, so it can’t move them.
        </p>
        <Link href="/create" className="btn btn-ribbon mt-8">Send a gift of your own</Link>
      </Centered>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:pt-14">
      {demo && (
        <div className="mb-8 flex flex-col items-start justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-3.5 text-[0.9rem] sm:flex-row sm:items-center">
          <p>
            <span className="font-semibold">Preview.</span> This is a sample gift showing what your recipient sees. Nothing here
            moves real funds.
          </p>
          <Link href="/create" className="shrink-0 font-medium text-ribbon hover:underline">
            Wrap a real one →
          </Link>
        </div>
      )}
      <AnimatePresence mode="wait">
        {phase === "wrapped" ? (
          <motion.div
            key="wrapped"
            exit={{ opacity: 0, y: -30, scale: 0.97 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center"
          >
            <p className="eyebrow">A Keepsake gift</p>
            <h1 className="font-serif mt-4 max-w-3xl text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.96] tracking-tight">
              {note?.to ? `${note.to}, ` : ""}
              {note?.from ? note.from : note?.to ? "someone" : "Someone"} wrapped a gift for you.
            </h1>
            <Envelope accent={theme.background} onOpen={unwrap} />
            <p className="mt-24 text-[0.88rem] text-muted">Opening it doesn’t claim it. You’ll choose where it goes next.</p>
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid items-start gap-12 lg:grid-cols-[1.1fr_1fr]"
          >
            <div>
              <motion.div
                initial={{ y: 80, rotate: -6, scale: 0.9, opacity: 0 }}
                animate={{ y: 0, rotate: -1.5, scale: 1, opacity: 1 }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <GiftCard
                  theme={theme}
                  asset={asset ? { name: asset.name, ticker: asset.ticker, logo: asset.logo, issuer: asset.issuer } : undefined}
                  value={valueNow ?? note?.usd}
                  shares={sharesNow}
                  to={note?.to || undefined}
                  from={note?.from || undefined}
                />
              </motion.div>
              {note?.message && (
                <motion.blockquote
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="font-serif mt-10 text-[clamp(1.6rem,3vw,2.2rem)] italic leading-snug"
                >
                  “{note.message}”
                  {note.from && <footer className="mt-3 font-sans text-[0.95rem] not-italic text-muted">— {note.from}</footer>}
                </motion.blockquote>
              )}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8 }}>
              {phase === "claimed" ? (
                <div className="rounded-[28px] border border-line bg-card p-7">
                  <p className="eyebrow text-up!">It’s yours</p>
                  <h2 className="font-serif mt-3 text-[2.6rem] leading-[1]">
                    {asset ? <>You now own a piece of {asset.name}.</> : <>Your gift is in your wallet.</>}
                  </h2>
                  <p className="mt-4 leading-relaxed text-ink-2">
                    It’s in {claimedTo ? <span className="font-mono">{shortAddress(claimedTo)}</span> : "your wallet"}, along with a little
                    SOL for fees. Hold it, sell it at any hour, or send it on.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {asset && (
                      <a className="btn btn-primary" href={`https://jup.ag/swap/${asset.mint}-USDC`} target="_blank" rel="noreferrer">
                        Trade on Jupiter
                      </a>
                    )}
                    {claimSig && (
                      <a className="btn btn-ghost" href={`https://solscan.io/tx/${claimSig}`} target="_blank" rel="noreferrer">
                        View receipt ↗
                      </a>
                    )}
                  </div>
                  <div className="mt-8 border-t border-line pt-6">
                    <p className="text-[0.95rem] text-ink-2">Know someone who’d love one?</p>
                    <Link href="/create" className="mt-2 inline-block font-medium text-ribbon hover:underline">
                      Send a gift of your own →
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {asset && (
                    <div className="rounded-[28px] border border-line bg-card p-7">
                      <div className="flex items-center gap-3">
                        <AssetLogo src={asset.logo} name={asset.name} size={44} />
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-[0.82rem] text-muted">
                            {asset.issuer === "PreStocks" ? "Pre-IPO · PreStocks" : `${asset.ticker} · xStocks`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[0.8rem] text-muted">Worth today</p>
                          <p className="font-serif text-[2.4rem] leading-none tabular">{valueNow != null ? usd(valueNow) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[0.8rem] text-muted">Since it was wrapped</p>
                          <p className={clsx("font-serif text-[2.4rem] leading-none tabular", change == null ? "" : change >= 0 ? "text-up" : "text-down")}>
                            {change == null ? "—" : pct(change, 1)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-5 text-[0.9rem] leading-relaxed text-ink-2">
                        {sharesNow != null && <>{fmtShares(sharesNow)} {asset.ticker}. </>}
                        {asset.issuer === "PreStocks"
                          ? "A token that tracks this private company’s shares ahead of any IPO."
                          : "A token backed 1:1 by the real share, which you can sell for dollars any time, even when Wall Street is closed."}
                        {note?.at && <> Wrapped {longDate(note.at)}.</>}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 rounded-[28px] border border-line bg-card p-7">
                    <h2 className="text-[1.2rem] font-semibold tracking-tight">Claim it to your wallet</h2>
                    <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-2">
                      Any Solana wallet works, even a new, empty one. The gift covers the network fees.
                    </p>

                    {!useManual ? (
                      publicKey ? (
                        <button onClick={claim} disabled={phase === "claiming"} className="btn btn-ribbon mt-5 h-14! w-full text-[1.02rem]!">
                          {phase === "claiming" ? "Claiming…" : `Claim to ${shortAddress(publicKey.toBase58())}`}
                        </button>
                      ) : (
                        <button onClick={() => setVisible(true)} className="btn btn-ribbon mt-5 h-14! w-full text-[1.02rem]!">
                          Connect a wallet
                        </button>
                      )
                    ) : (
                      <div className="mt-5">
                        <input
                          className="field font-mono text-[0.9rem]!"
                          placeholder="Paste a Solana wallet address"
                          value={manual}
                          onChange={(e) => setManual(e.target.value)}
                          spellCheck={false}
                          autoComplete="off"
                        />
                        {manual && !recipient && <p className="mt-2 text-[0.82rem] text-down">That doesn’t look like a Solana address.</p>}
                        <button onClick={claim} disabled={!recipient || phase === "claiming"} className="btn btn-ribbon mt-3 h-14! w-full text-[1.02rem]!">
                          {phase === "claiming" ? "Claiming…" : "Claim to this address"}
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setUseManual((m) => !m)}
                      className="mt-4 text-[0.88rem] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink"
                    >
                      {useManual ? "Use a connected wallet instead" : "Paste an address instead"}
                    </button>

                    {error && <p className="mt-4 rounded-xl bg-down/8 px-4 py-3 text-[0.88rem] text-down">{error}</p>}

                    <div className="mt-6 border-t border-line pt-5 text-[0.88rem] leading-relaxed text-ink-2">
                      <p className="font-medium text-ink">No wallet yet?</p>
                      <p className="mt-1">
                        Install{" "}
                        <a href="https://phantom.com/download" target="_blank" rel="noreferrer" className="text-ribbon hover:underline">
                          Phantom
                        </a>{" "}
                        or{" "}
                        <a href="https://solflare.com/download" target="_blank" rel="noreferrer" className="text-ribbon hover:underline">
                          Solflare
                        </a>
                        , then come back to this link. On your phone,{" "}
                        <PhantomDeepLink className="text-ribbon hover:underline">open this gift inside Phantom</PhantomDeepLink>.
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 px-2 text-[0.78rem] leading-relaxed text-muted">
                    Tokenized stocks aren’t available in every country. By claiming, you confirm {asset?.issuer ?? "the issuer"} tokens
                    are available to you where you live.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhantomDeepLink({ children, className }: { children: React.ReactNode; className?: string }) {
  const here = useSyncExternalStore(subscribeHash, () => window.location.href, () => null);
  const href = here
    ? `https://phantom.app/ul/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(new URL(here).origin)}`
    : "https://phantom.com/download";
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">{children}</div>;
}

/** The wrapped state: a sealed envelope with a ribbon, opened with one tap. */
function Envelope({ accent, onOpen }: { accent: string; onOpen: () => void }) {
  return (
    <motion.button
      onClick={onOpen}
      className="group relative mt-12 aspect-[1.5/1] w-full max-w-[520px] cursor-pointer"
      initial={{ opacity: 0, y: 30, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: -2 }}
      whileHover={{ rotate: 0, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Open your gift"
    >
      <div className="card-noise absolute inset-0 overflow-hidden rounded-[26px] shadow-[0_40px_80px_-30px_rgba(23,20,15,0.55)]" style={{ background: accent }}>
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.25),transparent_45%)]" />
        {/* flap */}
        <svg className="absolute inset-x-0 top-0 h-[58%] w-full" viewBox="0 0 100 58" preserveAspectRatio="none" aria-hidden>
          <path d="M0 0 L50 50 L100 0 Z" fill="rgba(0,0,0,0.12)" />
          <path d="M0 0 L50 46 L100 0" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
        </svg>
        {/* ribbon */}
        <div className="absolute inset-y-0 left-1/2 w-[9%] -translate-x-1/2 bg-ribbon shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
        <div className="absolute inset-x-0 top-1/2 h-[12%] -translate-y-1/2 bg-ribbon shadow-[0_0_0_1px_rgba(0,0,0,0.06)]" />
      </div>
      {/* bow */}
      <motion.svg
        className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-[62%] drop-shadow-lg"
        viewBox="0 0 100 70"
        animate={{ rotate: [0, -4, 4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
        aria-hidden
      >
        <path d="M50 38C38 10 8 2 4 20c-3 15 26 22 46 18Z" fill="#e8492e" />
        <path d="M50 38C62 10 92 2 96 20c3 15-26 22-46 18Z" fill="#e8492e" />
        <path d="M50 38C40 20 18 14 14 22c-3 7 18 16 36 16Z" fill="#c13a22" opacity="0.55" />
        <path d="M50 38C60 20 82 14 86 22c3 7-18 16-36 16Z" fill="#c13a22" opacity="0.55" />
        <path d="M46 40 34 68 44 64 50 70 50 40Z" fill="#c13a22" />
        <path d="M54 40 66 68 56 64 50 70 50 40Z" fill="#c13a22" />
        <circle cx="50" cy="38" r="8" fill="#c13a22" />
      </motion.svg>
      <span className="absolute inset-x-0 -bottom-16 mx-auto w-fit rounded-full bg-ink px-6 py-3 text-[0.98rem] font-medium text-paper shadow-lg transition-transform group-hover:-translate-y-0.5">
        Open your gift
      </span>
    </motion.button>
  );
}
