import { jupHeaders, jupUrl } from "@/lib/market";

export async function POST(req: Request) {
  const { quoteResponse, userPublicKey, destinationTokenAccount } = await req.json();
  if (!quoteResponse || !userPublicKey || !destinationTokenAccount) {
    return Response.json({ error: "Missing swap parameters" }, { status: 400 });
  }

  const res = await fetch(jupUrl("/swap/v1/swap-instructions"), {
    method: "POST",
    headers: { "content-type": "application/json", ...jupHeaders() },
    cache: "no-store",
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      destinationTokenAccount,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: { priorityLevel: "high", maxLamports: 400_000 },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) return Response.json({ error: data?.error ?? "Could not build the swap." }, { status: 422 });
  return Response.json(data);
}
