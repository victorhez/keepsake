const ITEMS: { q: string; a: string }[] = [
  {
    q: "What exactly does the person receive?",
    a: "A tokenized stock in their own Solana wallet. xStocks are backed 1:1 by the real share, held with a regulated custodian. PreStocks track pre-IPO companies through SPV exposure. They can hold it, sell it for dollars at any hour, or pass it on.",
  },
  {
    q: "Do they need a wallet or an account?",
    a: "They need a Solana wallet to claim, and any wallet works, even one made a minute earlier. There’s no sign-up, no brokerage account and no ID check with Keepsake. The gift pays its own network fees, so an empty wallet is fine.",
  },
  {
    q: "Is the link safe to send?",
    a: "The link is the key to the gift, so treat it like cash in an envelope. The secret sits after the # in the URL. Browsers never send that part to a server, so Keepsake never sees it. Whoever opens the link first can claim the gift, which is why you can take back an unopened gift at any time from My gifts.",
  },
  {
    q: "What if they never open it?",
    a: "Open My gifts with the wallet you sent from. Keepsake rebuilds every gift link you’ve made from one signature, shows which are still wrapped, and lets you reclaim any of them in one tap.",
  },
  {
    q: "What does it cost?",
    a: "Keepsake charges no fee. You pay the stock price through Jupiter’s best route, plus about 0.005 SOL that rides along inside the gift. That SOL pays their claim fees, and whatever is left lands in their wallet, so they can move or sell the gift right away. PreStocks tokens carry a 1% issuer transfer fee each time they move.",
  },
  {
    q: "Who can receive tokenized stocks?",
    a: "It depends on the issuer and on where the recipient lives. For example, xStocks aren’t offered to US persons. Check the issuer’s terms for the recipient’s country before you send.",
  },
];

export function Faq() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {ITEMS.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.08rem] font-medium [&::-webkit-details-marker]:hidden">
            {item.q}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong transition-transform duration-300 group-open:rotate-45">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <p className="max-w-3xl pb-6 text-[0.98rem] leading-relaxed text-ink-2">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
