"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import clsx from "clsx";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { XSTOCKS } from "@/lib/catalog";
import { findAsset, useMarket } from "@/lib/client";
import { longDate, usd } from "@/lib/format";
import { claimGift, giftLink, readGift, type GiftState } from "@/lib/gift";
import { isUnlocked, looseSeeds, scanVault, unlockVault } from "@/lib/vault";
import { themeById } from "@/lib/themes";
import { AssetLogo } from "@/components/AssetLogo";

interface Row {
  key: string;
  seed: Uint8Array;
  state: GiftState;
}

export function MyGifts() {
  const { connection } = useConnection();
  const { publicKey, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const { market } = useMarket();

  const [vault, setVault] = useState<{ owner: string; rows: Row[]; scanned: boolean } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const mints = useMemo(
    () => [...XSTOCKS.map((x) => x.mint), ...(market?.assets.filter((a) => a.issuer === "PreStocks").map((a) => a.mint) ?? [])],
    [market],
  );

  const owner = publicKey?.toBase58() ?? null;
  const mine = vault && vault.owner === owner ? vault : null;
  const rows = mine?.rows ?? [];
  const scanned = mine?.scanned ?? false;
  const setRows = (update: (rows: Row[]) => Row[]) =>
    setVault((v) => (v && v.owner === owner ? { ...v, rows: update(v.rows) } : v));

  useEffect(() => () => abort.current?.abort(), [owner]);

  async function scan() {
    if (!publicKey || !market) return;
    setError(null);
    setScanning(true);
    const scanOwner = publicKey.toBase58();
    setVault({ owner: scanOwner, rows: [], scanned: false });
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;

    const add = async (seed: Uint8Array, key: string) => {
      const state = await readGift(connection, seed, mints);
      if (state.status === "empty" || ctrl.signal.aborted) return;
      setVault((v) =>
        v && v.owner === scanOwner
          ? {
              ...v,
              rows: [...v.rows.filter((x) => x.key !== key), { key, seed, state }].sort(
                (a, b) => (b.state.createdAt ?? 0) - (a.state.createdAt ?? 0),
              ),
            }
          : v,
      );
    };

    try {
      const pending: Promise<void>[] = [];
      if (signMessage) {
        const vaultSeed = await unlockVault(publicKey, signMessage);
        await scanVault(connection, vaultSeed, ({ index, seed }) => pending.push(add(seed, `v${index}`)), { signal: ctrl.signal });
      }
      looseSeeds(publicKey).forEach((seed, i) => pending.push(add(seed, `l${i}`)));
      await Promise.all(pending);
      setVault((v) => (v && v.owner === scanOwner ? { ...v, scanned: true } : v));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|denied|cancel/i.test(msg) ? "Signature cancelled. Your gifts stay locked." : "Couldn’t load your gifts. Try again.");
    } finally {
      setScanning(false);
    }
  }

  async function reclaim(row: Row) {
    if (!publicKey) return;
    setBusy(row.key);
    setError(null);
    try {
      await claimGift(connection, row.seed, publicKey, mints);
      const state = await readGift(connection, row.seed, mints);
      setRows((r) => r.map((x) => (x.key === row.key ? { ...x, state } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reclaim failed.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(row: Row) {
    await navigator.clipboard.writeText(giftLink(window.location.origin, row.seed, row.state.note ?? undefined));
    setCopied(row.key);
    setTimeout(() => setCopied(null), 1800);
  }

  const wrapped = rows.filter((r) => r.state.status === "ready");
  const totalGiven = rows.reduce((n, r) => n + (r.state.note?.usd ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 lg:pt-16">
      <p className="eyebrow">My gifts</p>
      <h1 className="font-serif mt-3 text-[clamp(2.4rem,5vw,3.8rem)] leading-[1] tracking-tight">Everything you’ve wrapped.</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">
        Keepsake rebuilds your gift links from one signature, on any device. Copy a link again, see what’s been opened, or take
        back a gift that’s still wrapped.
      </p>

      {!publicKey ? (
        <div className="mt-10 rounded-[28px] border border-line bg-card p-8 text-center">
          <p className="text-ink-2">Connect the wallet you sent your gifts from.</p>
          <button onClick={() => setVisible(true)} className="btn btn-primary mt-5">Connect a wallet</button>
        </div>
      ) : !scanned && !scanning ? (
        <div className="mt-10 rounded-[28px] border border-line bg-card p-8 text-center">
          <p className="text-ink-2">Sign a free message to unlock your gift vault. Nothing is sent and nothing is spent.</p>
          <button onClick={scan} disabled={!market} className="btn btn-primary mt-5">
            {isUnlocked(publicKey) ? "Show my gifts" : "Unlock my gifts"}
          </button>
          {error && <p className="mt-4 text-[0.88rem] text-down">{error}</p>}
        </div>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-3 gap-3">
            <Stat label="Gifts sent" value={String(rows.length)} />
            <Stat label="Value given" value={usd(totalGiven, { cents: false })} />
            <Stat label="Still wrapped" value={String(wrapped.length)} />
          </div>

          {error && <p className="mt-6 rounded-xl bg-down/8 px-4 py-3 text-[0.88rem] text-down">{error}</p>}

          <ul className="mt-8 space-y-3">
            {rows.map((row, i) => {
              const note = row.state.note;
              const holding = row.state.holdings[0];
              const asset = findAsset(market, holding?.mint.toBase58() ?? note?.mint);
              const now = holding && asset ? (Number(holding.raw) / 10 ** holding.decimals) * asset.rawPrice : null;
              const open = row.state.status === "ready";
              return (
                <motion.li
                  key={row.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                  className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:p-5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="card-noise relative block h-14 w-[88px] shrink-0 overflow-hidden rounded-xl" style={{ background: themeById(note?.theme).background }}>
                      {asset && <AssetLogo src={asset.logo} name={asset.name} size={26} className="absolute bottom-2 left-2 z-[3]" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {asset?.name ?? "Gift"} {note?.to && <span className="text-ink-2">for {note.to}</span>}
                      </p>
                      <p className="truncate text-[0.84rem] text-muted">
                        {row.state.createdAt ? longDate(row.state.createdAt) : "—"}
                        {note?.usd ? ` · wrapped at ${usd(note.usd)}` : ""}
                        {open && now != null ? ` · worth ${usd(now)} now` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "rounded-full px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider",
                        open ? "bg-gold/15 text-[#7a5d22]" : "bg-up/10 text-up",
                      )}
                    >
                      {open ? "Wrapped" : "Opened"}
                    </span>
                    {open && (
                      <>
                        <button onClick={() => copy(row)} className="btn btn-ghost h-10! px-4! text-[0.85rem]!">
                          {copied === row.key ? "Copied" : "Copy link"}
                        </button>
                        <button onClick={() => reclaim(row)} disabled={busy === row.key} className="btn btn-primary h-10! px-4! text-[0.85rem]!">
                          {busy === row.key ? "Reclaiming…" : "Reclaim"}
                        </button>
                      </>
                    )}
                  </div>
                </motion.li>
              );
            })}
            {scanning && <li className="skeleton h-[88px] rounded-3xl" />}
          </ul>

          {scanned && rows.length === 0 && (
            <div className="mt-6 rounded-[28px] border border-dashed border-line-strong p-10 text-center">
              <p className="font-serif text-3xl">No gifts yet.</p>
              <p className="mt-2 text-ink-2">The first one is always the best one.</p>
              <Link href="/create" className="btn btn-ribbon mt-6">Wrap a gift</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-5">
      <p className="text-[0.8rem] text-muted">{label}</p>
      <p className="font-serif mt-1 text-[2.2rem] leading-none tabular">{value}</p>
    </div>
  );
}
