import { jupHeaders, jupUrl } from "@/lib/market";

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inputMint = searchParams.get("inputMint") ?? "";
  const outputMint = searchParams.get("outputMint") ?? "";
  const amount = searchParams.get("amount") ?? "";

  if (!MINT.test(inputMint) || !MINT.test(outputMint) || !/^\d{1,20}$/.test(amount)) {
    return Response.json({ error: "Invalid quote request" }, { status: 400 });
  }

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: "150",
    restrictIntermediateTokens: "true",
    // Leaves room in the transaction for the gift wallet setup instructions.
    maxAccounts: "44",
  });

  const res = await fetch(jupUrl(`/swap/v1/quote?${params}`), { headers: jupHeaders(), cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    return Response.json({ error: data?.error ?? "No route found for this gift size." }, { status: 422 });
  }
  return Response.json(data);
}
