"use client";

import type { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { giftSeedAt, isUnused, keypairFromSeed, vaultMessage, vaultSeedFromSignature } from "./gift";

/*
 * The vault is the sender's view of their gifts. Gift i's key is
 * SHA-256(vaultSeed ‖ "gift" ‖ i), and vaultSeed comes from one wallet
 * signature, so nothing needs to be stored anywhere to find them again.
 * The vault seed is kept in memory for the tab's lifetime only.
 */

type SignMessage = (message: Uint8Array) => Promise<Uint8Array>;

const unlocked = new Map<string, Uint8Array>();
const HINT_KEY = (owner: string) => `keepsake:next:${owner}`;
const LOOSE_KEY = (owner: string) => `keepsake:loose:${owner}`;

export function isUnlocked(owner: PublicKey): boolean {
  return unlocked.has(owner.toBase58());
}

export async function unlockVault(owner: PublicKey, signMessage: SignMessage): Promise<Uint8Array> {
  const key = owner.toBase58();
  const existing = unlocked.get(key);
  if (existing) return existing;
  const signature = await signMessage(new TextEncoder().encode(vaultMessage(key)));
  const seed = await vaultSeedFromSignature(signature);
  unlocked.set(key, seed);
  return seed;
}

function readHint(owner: string): number {
  try {
    return Math.max(0, Number(localStorage.getItem(HINT_KEY(owner)) ?? 0) || 0);
  } catch {
    return 0;
  }
}

export function saveHint(owner: PublicKey, index: number) {
  try {
    localStorage.setItem(HINT_KEY(owner.toBase58()), String(index));
  } catch {
    // Storage can be unavailable (private mode); the scan still works without it.
  }
}

/** First gift slot with no on-chain history. */
export async function nextGiftSlot(conn: Connection, owner: PublicKey, vaultSeed: Uint8Array) {
  let i = readHint(owner.toBase58());
  for (;;) {
    const batch = await Promise.all(
      Array.from({ length: 4 }, async (_, k) => {
        const seed = await giftSeedAt(vaultSeed, i + k);
        return { index: i + k, seed, unused: await isUnused(conn, keypairFromSeed(seed).publicKey) };
      }),
    );
    const free = batch.find((b) => b.unused);
    if (free) return free;
    i += batch.length;
  }
}

export interface VaultEntry {
  index: number;
  seed: Uint8Array;
}

/**
 * Walks gift slots from 0 until it meets a run of untouched ones, calling
 * `onFound` for each slot that has on-chain history.
 */
export async function scanVault(
  conn: Connection,
  vaultSeed: Uint8Array,
  onFound: (entry: VaultEntry) => void,
  opts: { gap?: number; signal?: AbortSignal } = {},
): Promise<number> {
  const gap = opts.gap ?? 4;
  let i = 0;
  let emptyRun = 0;
  let found = 0;
  while (emptyRun < gap && !opts.signal?.aborted) {
    const batch = await Promise.all(
      Array.from({ length: gap }, async (_, k) => {
        const seed = await giftSeedAt(vaultSeed, i + k);
        return { index: i + k, seed, unused: await isUnused(conn, keypairFromSeed(seed).publicKey) };
      }),
    );
    for (const b of batch) {
      if (b.unused) {
        emptyRun++;
      } else {
        emptyRun = 0;
        found++;
        onFound({ index: b.index, seed: b.seed });
      }
    }
    i += gap;
  }
  return found;
}

/* Wallets that can't sign messages get random gift keys, remembered on this device. */

export function looseSeeds(owner: PublicKey): Uint8Array[] {
  try {
    const list = JSON.parse(localStorage.getItem(LOOSE_KEY(owner.toBase58())) ?? "[]") as string[];
    return list.map((s) => bs58.decode(s));
  } catch {
    return [];
  }
}

export function rememberLooseSeed(owner: PublicKey, seed: Uint8Array) {
  try {
    const key = LOOSE_KEY(owner.toBase58());
    const list = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
    list.push(bs58.encode(seed));
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Without storage the link itself is the only copy; the UI says so.
  }
}
