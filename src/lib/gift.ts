import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type ConfirmedSignatureInfo,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createHarvestWithheldTokensToMintInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getTransferFeeAmount,
  unpackAccount,
} from "@solana/spl-token";
import bs58 from "bs58";

/* ────────────────────────────────────────────────────────────────────────────
 * A Keepsake gift is an ordinary Solana wallet whose private key travels
 * inside the gift link's URL fragment. The fragment is never sent to a
 * server, so only whoever holds the link can move what is inside.
 *
 * Gift keys are derived from a single wallet signature, which lets the sender
 * rebuild every link they ever made and reclaim anything left unopened.
 * ──────────────────────────────────────────────────────────────────────────── */

export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * SOL placed in each gift wallet. It pays for the recipient's token account
 * and network fee when they claim; whatever remains lands in their wallet so
 * they can move or sell the gift straight away.
 */
export const GIFT_CUSHION_LAMPORTS = 3_500_000;

const CLAIM_CU_LIMIT = 120_000;
const CLAIM_CU_PRICE = 50_000; // micro-lamports per CU
const CLAIM_FEE_LAMPORTS = 5_000 + Math.ceil((CLAIM_CU_LIMIT * CLAIM_CU_PRICE) / 1_000_000);
const MEMO_PREFIX = "ks1:";
const RENT_EXEMPT_RESERVE = 890_880;

export interface GiftNote {
  to: string;
  from: string;
  message: string;
  theme: string;
  /** USD value when the gift was wrapped. */
  usd: number;
  /** Unix ms when the gift was wrapped. */
  at: number;
  mint: string;
}

export interface GiftHolding {
  mint: PublicKey;
  ata: PublicKey;
  programId: PublicKey;
  raw: bigint;
  decimals: number;
}

export type GiftStatus = "ready" | "claimed" | "empty";

export interface GiftState {
  address: PublicKey;
  lamports: number;
  holdings: GiftHolding[];
  status: GiftStatus;
  note: GiftNote | null;
  createdAt: number | null;
  lastActivity: number | null;
}

/* ── encoding ───────────────────────────────────────────────────────────── */

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(str: string): Uint8Array {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function sha256(...parts: Uint8Array[]): Promise<Uint8Array> {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    buf.set(p, o);
    o += p.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
}

/* ── keys & links ───────────────────────────────────────────────────────── */

export function vaultMessage(owner: string): string {
  return [
    "Keepsake gift vault",
    "",
    "Sign to unlock the gift links you create from this wallet.",
    "This is free, sends nothing, and lets you recover or reclaim any gift later.",
    "",
    `Wallet: ${owner}`,
  ].join("\n");
}

export async function vaultSeedFromSignature(signature: Uint8Array): Promise<Uint8Array> {
  return sha256(enc.encode("keepsake/vault/v1"), signature);
}

export async function giftSeedAt(vaultSeed: Uint8Array, index: number): Promise<Uint8Array> {
  const i = new Uint8Array(4);
  new DataView(i.buffer).setUint32(0, index);
  return sha256(vaultSeed, enc.encode("gift"), i);
}

export function keypairFromSeed(seed: Uint8Array): Keypair {
  return Keypair.fromSeed(seed);
}

export function encodeNote(note: GiftNote): string {
  return toB64Url(enc.encode(JSON.stringify(note)));
}

export function decodeNote(part: string): GiftNote | null {
  try {
    return JSON.parse(dec.decode(fromB64Url(part)));
  } catch {
    return null;
  }
}

export function giftLink(origin: string, seed: Uint8Array, note?: GiftNote): string {
  const base = `${origin}/g#${bs58.encode(seed)}`;
  return note ? `${base}.${encodeNote(note)}` : base;
}

/** A sample gift that renders the full recipient experience without touching the chain. */
export function demoLink(origin: string, note: GiftNote): string {
  return `${origin}/g#demo.${encodeNote(note)}`;
}

export function parseGiftFragment(hash: string): { seed: Uint8Array; note: GiftNote | null } | null {
  const raw = hash.replace(/^#/, "");
  if (!raw) return null;
  const [seedPart, notePart] = raw.split(".");
  try {
    const seed = bs58.decode(seedPart);
    if (seed.length !== 32) return null;
    return { seed, note: notePart ? decodeNote(notePart) : null };
  } catch {
    return null;
  }
}

/* ── private note, stored on-chain as an encrypted memo ────────────────── */

async function noteKey(seed: Uint8Array): Promise<CryptoKey> {
  const material = await sha256(enc.encode("keepsake/note/v1"), seed);
  return crypto.subtle.importKey("raw", material as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealNote(seed: Uint8Array, note: GiftNote): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await noteKey(seed);
  const body = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(note))),
  );
  const out = new Uint8Array(iv.length + body.length);
  out.set(iv);
  out.set(body, iv.length);
  return MEMO_PREFIX + toB64Url(out);
}

export async function openNote(seed: Uint8Array, memo: string): Promise<GiftNote | null> {
  const start = memo.indexOf(MEMO_PREFIX);
  if (start < 0) return null;
  const payload = memo.slice(start + MEMO_PREFIX.length).split(/[;\s]/)[0];
  try {
    const bytes = fromB64Url(payload);
    const key = await noteKey(seed);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
    return JSON.parse(dec.decode(plain));
  } catch {
    return null;
  }
}

/* ── chain reads ────────────────────────────────────────────────────────── */

export async function tokenProgramFor(conn: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await conn.getAccountInfo(mint);
  if (!info) throw new Error("Token not found on-chain");
  return info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

/**
 * Reads the gift wallet's token accounts for the given mints. Deriving the
 * addresses keeps this to a single getMultipleAccounts call that any RPC serves.
 */
async function holdingsOf(conn: Connection, owner: PublicKey, mints: string[]): Promise<GiftHolding[]> {
  const candidates = [...new Set(mints)].flatMap((m) => {
    const mint = new PublicKey(m);
    return [TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID].map((programId) => ({
      mint,
      programId,
      ata: getAssociatedTokenAddressSync(mint, owner, false, programId),
    }));
  });
  const out: GiftHolding[] = [];
  for (let i = 0; i < candidates.length; i += 100) {
    const batch = candidates.slice(i, i + 100);
    const infos = await conn.getMultipleAccountsInfo(batch.map((c) => c.ata));
    const decimals = new Map<string, number>();
    for (let j = 0; j < batch.length; j++) {
      const info = infos[j];
      const c = batch[j];
      if (!info || !info.owner.equals(c.programId)) continue;
      const account = unpackAccount(c.ata, info, c.programId);
      const key = c.mint.toBase58();
      if (!decimals.has(key)) decimals.set(key, await mintDecimals(conn, c.mint));
      out.push({ mint: c.mint, ata: c.ata, programId: c.programId, raw: account.amount, decimals: decimals.get(key)! });
    }
  }
  return out;
}

async function mintDecimals(conn: Connection, mint: PublicKey): Promise<number> {
  const info = await conn.getAccountInfo(mint);
  // Byte 44 of every SPL mint (classic or Token-2022) holds its decimals.
  return info ? info.data[44] : 0;
}

/**
 * @param mints Tokens the gift may hold. The mint recorded in the card is
 * always checked; pass the catalogue to cover links that lost their card.
 */
export async function readGift(conn: Connection, seed: Uint8Array, mints: string[]): Promise<GiftState> {
  const address = keypairFromSeed(seed).publicKey;
  const [lamports, signatures] = await Promise.all([
    conn.getBalance(address),
    conn.getSignaturesForAddress(address, { limit: 25 }),
  ]);

  let note: GiftNote | null = null;
  for (const s of signatures) {
    if (s.memo?.includes(MEMO_PREFIX)) {
      note = await openNote(seed, s.memo);
      if (note) break;
    }
  }

  const holdings = await holdingsOf(conn, address, note ? [note.mint, ...mints] : mints);
  const funded = holdings.filter((h) => h.raw > BigInt(0));
  const times = signatures.map((s: ConfirmedSignatureInfo) => s.blockTime ?? 0).filter(Boolean);
  const status: GiftStatus = funded.length > 0 ? "ready" : signatures.length > 0 ? "claimed" : "empty";

  return {
    address,
    lamports,
    holdings: funded,
    status,
    note,
    createdAt: times.length ? Math.min(...times) * 1000 : null,
    lastActivity: times.length ? Math.max(...times) * 1000 : null,
  };
}

export async function isUnused(conn: Connection, address: PublicKey): Promise<boolean> {
  const sigs = await conn.getSignaturesForAddress(address, { limit: 1 });
  return sigs.length === 0;
}

/* ── transactions ───────────────────────────────────────────────────────── */

export async function waitForSignature(conn: Connection, signature: string, timeoutMs = 90_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { value } = await conn.getSignatureStatuses([signature]);
    const status = value[0];
    if (status?.err) throw new Error("The transaction failed on-chain.");
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error("Timed out waiting for confirmation. Check your wallet activity before retrying.");
}

interface JupInstruction {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
}

interface JupSwapInstructions {
  computeBudgetInstructions: JupInstruction[];
  setupInstructions: JupInstruction[];
  swapInstruction: JupInstruction;
  cleanupInstruction?: JupInstruction | null;
  otherInstructions?: JupInstruction[];
  addressLookupTableAddresses: string[];
}

function toIx(ix: JupInstruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((a) => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })),
    data: Buffer.from(ix.data, "base64"),
  });
}

async function lookupTables(conn: Connection, addresses: string[]): Promise<AddressLookupTableAccount[]> {
  if (addresses.length === 0) return [];
  const infos = await conn.getMultipleAccountsInfo(addresses.map((a) => new PublicKey(a)));
  return infos.flatMap((info, i) =>
    info
      ? [new AddressLookupTableAccount({ key: new PublicKey(addresses[i]), state: AddressLookupTableAccount.deserialize(info.data) })]
      : [],
  );
}

/** Raises Jupiter's simulated compute limit to cover the gift-wallet setup. */
function withHeadroom(ixs: JupInstruction[], extraUnits: number): TransactionInstruction[] {
  return ixs.map((ix) => {
    const data = Buffer.from(ix.data, "base64");
    if (data[0] === 2 && data.length >= 5) {
      return ComputeBudgetProgram.setComputeUnitLimit({ units: Math.min(1_400_000, data.readUInt32LE(1) + extraUnits) });
    }
    return toIx(ix);
  });
}

/**
 * One signature: open the gift wallet, fund its claim cushion, and swap the
 * sender's USDC or SOL straight into it.
 */
export async function buildBuyGiftTx(opts: {
  conn: Connection;
  sender: PublicKey;
  gift: PublicKey;
  mint: PublicKey;
  quote: unknown;
}): Promise<VersionedTransaction> {
  const { conn, sender, gift, mint, quote } = opts;
  const programId = await tokenProgramFor(conn, mint);
  const giftAta = getAssociatedTokenAddressSync(mint, gift, false, programId);

  const res = await fetch("/api/swap/instructions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey: sender.toBase58(), destinationTokenAccount: giftAta.toBase58() }),
  });
  const data = (await res.json()) as JupSwapInstructions & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not prepare the purchase.");

  const instructions: TransactionInstruction[] = [
    ...withHeadroom(data.computeBudgetInstructions, 60_000),
    createAssociatedTokenAccountIdempotentInstruction(sender, giftAta, gift, mint, programId),
    SystemProgram.transfer({ fromPubkey: sender, toPubkey: gift, lamports: GIFT_CUSHION_LAMPORTS }),
    ...data.setupInstructions.map(toIx),
    toIx(data.swapInstruction),
    ...(data.cleanupInstruction ? [toIx(data.cleanupInstruction)] : []),
    ...(data.otherInstructions ?? []).map(toIx),
  ];

  const [alts, { blockhash }] = await Promise.all([
    lookupTables(conn, data.addressLookupTableAddresses),
    conn.getLatestBlockhash("confirmed"),
  ]);
  const message = new TransactionMessage({ payerKey: sender, recentBlockhash: blockhash, instructions }).compileToV0Message(alts);
  return new VersionedTransaction(message);
}

/** Gift tokens the sender already holds. */
export async function buildTransferGiftTx(opts: {
  conn: Connection;
  sender: PublicKey;
  gift: PublicKey;
  mint: PublicKey;
  raw: bigint;
  decimals: number;
}): Promise<VersionedTransaction> {
  const { conn, sender, gift, mint, raw, decimals } = opts;
  const programId = await tokenProgramFor(conn, mint);
  const from = getAssociatedTokenAddressSync(mint, sender, true, programId);
  const giftAta = getAssociatedTokenAddressSync(mint, gift, false, programId);

  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 90_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    createAssociatedTokenAccountIdempotentInstruction(sender, giftAta, gift, mint, programId),
    SystemProgram.transfer({ fromPubkey: sender, toPubkey: gift, lamports: GIFT_CUSHION_LAMPORTS }),
    createTransferCheckedInstruction(from, mint, giftAta, sender, raw, decimals, [], programId),
  ];
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  return new VersionedTransaction(
    new TransactionMessage({ payerKey: sender, recentBlockhash: blockhash, instructions }).compileToV0Message(),
  );
}

/** Writes the encrypted card to the gift wallet's history. Paid from the cushion. */
export async function writeNote(conn: Connection, seed: Uint8Array, note: GiftNote): Promise<string> {
  const gift = keypairFromSeed(seed);
  const memo = await sealNote(seed, note);
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: gift.publicKey,
      recentBlockhash: blockhash,
      instructions: [new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [], data: Buffer.from(memo, "utf8") })],
    }).compileToV0Message(),
  );
  tx.sign([gift]);
  return conn.sendRawTransaction(tx.serialize(), { maxRetries: 5 });
}

/**
 * Moves everything in the gift wallet to `recipient` and closes it. The gift
 * key pays every fee, so the recipient can claim into a brand-new, empty
 * wallet. Any SOL left over is swept to the recipient as well.
 */
export async function buildClaimTx(
  conn: Connection,
  seed: Uint8Array,
  recipient: PublicKey,
  mints: string[],
  /** Lamports left behind in the gift wallet. Zero closes it out exactly. */
  reserve = 0,
): Promise<VersionedTransaction> {
  const gift = keypairFromSeed(seed);
  const state = await readGift(conn, seed, mints);
  if (state.status !== "ready") throw new Error("This gift has already been opened.");

  const instructions: TransactionInstruction[] = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: CLAIM_CU_LIMIT }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CLAIM_CU_PRICE }),
  ];

  let rentOut = 0;
  let rentBack = 0;

  for (const h of state.holdings) {
    const destination = getAssociatedTokenAddressSync(h.mint, recipient, true, h.programId);
    const [sourceInfo, destInfo] = await conn.getMultipleAccountsInfo([h.ata, destination]);
    if (!sourceInfo) continue;

    if (!destInfo) rentOut += await conn.getMinimumBalanceForRentExemption(sourceInfo.data.length);
    rentBack += sourceInfo.lamports;

    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(gift.publicKey, destination, recipient, h.mint, h.programId),
      createTransferCheckedInstruction(h.ata, h.mint, destination, gift.publicKey, h.raw, h.decimals, [], h.programId),
    );

    // Token-2022 fees withheld on the gift account must be swept to the mint before it can close.
    if (h.programId.equals(TOKEN_2022_PROGRAM_ID)) {
      const account = unpackAccount(h.ata, sourceInfo, h.programId);
      if (getTransferFeeAmount(account)) {
        instructions.push(createHarvestWithheldTokensToMintInstruction(h.mint, [h.ata], h.programId));
      }
    }
    instructions.push(createCloseAccountInstruction(h.ata, gift.publicKey, gift.publicKey, [], h.programId));
  }

  const sweep = state.lamports - CLAIM_FEE_LAMPORTS - rentOut + rentBack - reserve;
  if (state.lamports < CLAIM_FEE_LAMPORTS + rentOut) {
    throw new Error("This gift is missing the SOL it needs to cover network fees.");
  }
  if (sweep > 0 && !recipient.equals(gift.publicKey)) {
    instructions.push(SystemProgram.transfer({ fromPubkey: gift.publicKey, toPubkey: recipient, lamports: sweep }));
  }

  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(
    new TransactionMessage({ payerKey: gift.publicKey, recentBlockhash: blockhash, instructions }).compileToV0Message(),
  );
  tx.sign([gift]);
  return tx;
}

export async function claimGift(conn: Connection, seed: Uint8Array, recipient: PublicKey, mints: string[]): Promise<string> {
  let tx = await buildClaimTx(conn, seed, recipient, mints);
  const sim = await conn.simulateTransaction(tx, { sigVerify: false });
  if (sim.value.err) {
    // If the exact close-out misjudged rent, leave a rent-exempt reserve behind instead.
    tx = await buildClaimTx(conn, seed, recipient, mints, RENT_EXEMPT_RESERVE);
  }
  const signature = await conn.sendRawTransaction(tx.serialize(), { maxRetries: 5 });
  await waitForSignature(conn, signature);
  return signature;
}
