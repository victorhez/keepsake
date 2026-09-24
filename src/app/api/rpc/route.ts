/**
 * Thin JSON-RPC relay so the browser never needs a private RPC key.
 * Only the read and submit methods Keepsake uses are forwarded. Requests fall
 * through a list of upstreams, so a rate-limited public node doesn't take the
 * app down.
 */

function parseUrl(value: string | undefined): URL | null {
  const cleaned = value?.trim().replace(/^["']|["']$/g, "");
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Accepts a full RPC URL, or a bare Helius API key. */
function configuredUpstream(value: string | undefined): URL | null {
  const url = parseUrl(value);
  if (url) return url;
  const key = value?.trim().replace(/^["']|["']$/g, "");
  if (key && /^[A-Za-z0-9_-]{16,}$/.test(key)) {
    return new URL(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`);
  }
  if (value) console.error("SOLANA_RPC_URL is neither a URL nor an API key; using public RPC nodes.");
  return null;
}

const configured = configuredUpstream(process.env.SOLANA_RPC_URL);

const UPSTREAMS: URL[] = [
  configured,
  parseUrl("https://api.mainnet-beta.solana.com"),
  parseUrl("https://solana-rpc.publicnode.com"),
].filter((u): u is URL => !!u);

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
        return new Response(text, {
          headers: { "content-type": "application/json", "cache-control": "no-store", "x-rpc-upstream": upstream.host },
        });
      }
      lastError = `${upstream.host} answered ${res.status}`;
    } catch (err) {
      lastError = `${upstream.host}: ${err instanceof Error ? err.message : "request failed"}`;
    }
  }

  console.error("rpc relay exhausted upstreams:", lastError);
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Solana RPC is busy. Please try again in a moment." } },
    { status: 502 },
  );
}
