import Link from "next/link";
import { Wordmark } from "./Logo";

export function Footer() {
  return (
    <footer className="no-print mt-auto border-t border-line bg-paper-2/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Wordmark />
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-2">
            Gift real shares of real companies in a link. Built on Solana with tokenized stocks from xStocks and PreStocks.
          </p>
        </div>
        <div>
          <p className="eyebrow">Product</p>
          <ul className="mt-4 space-y-2.5 text-[0.95rem]">
            <li><Link href="/create" className="hover:text-ribbon">Send a gift</Link></li>
            <li><Link href="/gifts" className="hover:text-ribbon">My gifts</Link></li>
            <li><Link href="/#how" className="hover:text-ribbon">How it works</Link></li>
            <li><Link href="/#faq" className="hover:text-ribbon">Questions</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Powered by</p>
          <ul className="mt-4 space-y-2.5 text-[0.95rem]">
            <li><a href="https://xstocks.fi" target="_blank" rel="noreferrer" className="hover:text-ribbon">xStocks</a></li>
            <li><a href="https://prestocks.com" target="_blank" rel="noreferrer" className="hover:text-ribbon">PreStocks</a></li>
            <li><a href="https://pyth.network" target="_blank" rel="noreferrer" className="hover:text-ribbon">Pyth Network</a></li>
            <li><a href="https://jup.ag" target="_blank" rel="noreferrer" className="hover:text-ribbon">Jupiter</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-6 text-[0.78rem] leading-relaxed text-muted sm:px-6 lg:px-8">
          Keepsake is non-custodial software. It never holds your funds or your gift keys. Tokenized stocks are issued by
          third parties and aren’t available to residents of every country, including US persons for xStocks. Prices move,
          and a gift can be worth less than you paid. Nothing here is investment advice.
        </p>
      </div>
    </footer>
  );
}
