/**
 * Thin JSON-RPC relay so the browser never needs a private RPC key.
 * Only the read and submit methods Keepsake uses are forwarded.
 */

const UPSTREAM = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

const ALLOWED = new Set([
  "getAccountInfo",
  "getBalance",
  "getBlockHeight",
  "getFeeForMessage",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTransaction",
  "isBlockhashValid",
  "sendTransaction",
  "simulateTransaction",
]);

type RpcCall = { method?: string };

export async function POST(req: Request) {
  let body: RpcCall | RpcCall[];
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > 25 || calls.some((c) => !c.method || !ALLOWED.has(c.method))) {
    return Response.json({ error: "Method not allowed" }, { status: 403 });
  }

  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
