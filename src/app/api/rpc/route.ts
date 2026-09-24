/**
 * Thin JSON-RPC relay so the browser never needs a private RPC key.
 * Only the read and submit methods Keepsake uses are forwarded. Requests fall
 * through a list of upstreams, so a rate-limited public node doesn't take the
 * app down.
 */

const UPSTREAMS = [
  process.env.SOLANA_RPC_URL,
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
].filter((u): u is string => !!u);

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

/** Upstream answers that mean "try the next node", not "the call failed". */
const RETRYABLE = /Too many requests|rate limit|Indexed requests require|not available on free plan/i;

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

  const payload = JSON.stringify(body);
  let lastError = "No upstream available";

  for (const upstream of UPSTREAMS) {
    try {
      const res = await fetch(upstream, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      const text = await res.text();
      if (res.ok && !RETRYABLE.test(text)) {
        return new Response(text, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
      }
      lastError = `${new URL(upstream).host} answered ${res.status}`;
    } catch (err) {
      lastError = `${new URL(upstream).host}: ${err instanceof Error ? err.message : "request failed"}`;
    }
  }

  console.error("rpc relay exhausted upstreams:", lastError);
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Solana RPC is busy. Please try again in a moment." } },
    { status: 502 },
  );
}
