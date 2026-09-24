import Link from "next/link";
import { HeroCards } from "@/components/HeroCards";
import { Ticker } from "@/components/Ticker";
import { PreIpoGrid } from "@/components/PreIpoGrid";
import { MarketStatus } from "@/components/MarketStatus";
import { Faq } from "@/components/Faq";
import { Reveal } from "@/components/Reveal";
import { SiteHost } from "@/components/SiteHost";

const STEPS = [
  {
    n: "01",
    title: "Pick a company and wrap it",
    body: "Choose from the S&P 500, big tech, or companies that haven’t gone public yet. Pay with USDC or SOL. One signature buys the shares straight into a brand-new gift wallet.",
  },
  {
    n: "02",
    title: "Send the link, or print it",
    body: "The link is the gift. Its key lives after the # and never reaches a server. Drop it in a chat, or print a card with a QR code for the birthday table.",
  },
  {
    n: "03",
    title: "They open it and it’s theirs",
    body: "They see what’s inside and what it’s worth, then claim it to any Solana wallet. The gift pays its own fees. If it’s never opened, you can take it back.",
  },
];

const PAINS = [
  {
    stat: "1 country",
    body: "Most brokerages only let you send shares to an account in the same country, at the same firm.",
  },
  {
    stat: "Days of forms",
    body: "Custodial accounts for kids mean paperwork, ID checks and waiting before a single share changes hands.",
  },
  {
    stat: "One app",
    body: "Stock gift cards lock the gift inside one company’s app, in one market, with fees on the way out.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="grain relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[640px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(232,73,46,0.16),transparent)]" />
        <div className="pointer-events-none absolute -left-40 bottom-0 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(184,144,63,0.14),transparent)]" />
        <div className="relative z-[2] mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-24">
          <div>
            <Reveal load>
              <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-line-strong bg-card/70 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ribbon" /> Tokenized stocks, gift-wrapped
              </p>
            </Reveal>
            <Reveal load delay={0.08}>
              <h1 className="font-serif mt-6 text-[clamp(3.1rem,8vw,6.4rem)] leading-[0.92] tracking-[-0.02em]">
                Give someone <em className="text-ribbon">a piece</em> of the future.
              </h1>
            </Reveal>
            <Reveal load delay={0.16}>
              <p className="mt-7 max-w-xl text-[1.15rem] leading-relaxed text-ink-2">
                Wrap real shares of NVIDIA, the S&amp;P 500, or Anthropic before its IPO in a card, and send it anywhere in the
                world as a link. They open it, tap claim, and it’s theirs. No brokerage account, no paperwork, no borders.
              </p>
            </Reveal>
            <Reveal load delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/create" className="btn btn-ribbon h-14! px-7! text-[1.02rem]!">
                  Send a gift
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link href="/g#demo" className="btn btn-ghost h-14! px-6!">
                  Open a sample gift
                </Link>
              </div>
            </Reveal>
            <Reveal load delay={0.32}>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[0.88rem] text-muted">
                <li className="flex items-center gap-2"><Check /> Nothing to sign up for</li>
                <li className="flex items-center gap-2"><Check /> Claimed in seconds, 24/7</li>
                <li className="flex items-center gap-2"><Check /> Unopened gifts come back to you</li>
              </ul>
            </Reveal>
          </div>
          <HeroCards />
        </div>
      </section>

      <Ticker />

      {/* Problem */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
        <Reveal>
          <p className="eyebrow">The problem</p>
          <h2 className="font-serif mt-4 max-w-4xl text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] tracking-tight">
            Everyone wants to give a stake in the future. Giving a stock is still stuck in the past.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {PAINS.map((p, i) => (
            <Reveal key={p.stat} delay={i * 0.08}>
              <div className="h-full rounded-[28px] border border-line bg-card p-7">
                <p className="font-serif text-[2.4rem] leading-none">{p.stat}</p>
                <p className="mt-5 leading-relaxed text-ink-2">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mt-12 max-w-2xl text-[1.15rem] leading-relaxed">
            Tokenized stocks on Solana make the share itself something you can hand over. Keepsake adds the card, the link
            and the unwrapping, so it feels like a gift and not a wire transfer.
          </p>
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-t border-line bg-paper-2/50">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="font-serif mt-4 text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] tracking-tight">Three steps, one signature.</h2>
          </Reveal>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="group relative h-full overflow-hidden rounded-[28px] border border-line bg-card p-8">
                  <p className="font-serif text-[5rem] leading-none text-ribbon/90">{s.n}</p>
                  <h3 className="mt-8 text-[1.3rem] font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-3 leading-relaxed text-ink-2">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-IPO */}
      <section id="pre-ipo" className="scroll-mt-16 bg-night text-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
          <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
            <Reveal>
              <p className="eyebrow text-white/50!">Before the bell · powered by PreStocks</p>
              <h2 className="font-serif mt-4 text-[clamp(2.4rem,5.5vw,4.6rem)] leading-[1] tracking-tight">
                Give them a piece of the companies <em className="text-[#ff9a82]">everyone</em> is talking about, before they list.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-[1.08rem] leading-relaxed text-white/65">
                Anthropic, OpenAI, Anduril and Neuralink are some of the most valuable companies in the world, and none of them can
                be bought on a stock exchange. PreStocks tokens track them on Solana, so now they can go in a gift.
              </p>
            </Reveal>
          </div>
          <div className="mt-14">
            <PreIpoGrid />
          </div>
          <p className="mt-6 text-[0.8rem] text-white/40">
            Valuations are PreStocks’ implied figures, derived from the live token price. Pre-IPO tokens can be thinly traded
            and move sharply.
          </p>
        </div>
      </section>

      {/* Why Solana */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <p className="eyebrow">Why this only works on Solana</p>
            <h2 className="font-serif mt-4 text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.02] tracking-tight">
              A gift shouldn’t wait for the market to open.
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-ink-2">
              Birthdays land on Sundays. Babies arrive at 3am. Keepsake settles the moment you send, at any hour, for a fraction
              of a cent, in any country with an internet connection.
            </p>
            <div className="mt-8 rounded-3xl border border-line bg-card p-5">
              <MarketStatus />
              <p className="mt-4 border-t border-line pt-4 text-[0.78rem] text-muted">Live market hours from Pyth Network</p>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["~1 second", "from signature to a wrapped gift"],
              ["< $0.01", "in Solana network fees per gift"],
              ["24 / 7", "gifts go out and get claimed on weekends and holidays"],
              ["0 accounts", "needed to receive. Any wallet works, even an empty one"],
            ].map(([big, small], i) => (
              <Reveal key={big} delay={i * 0.07}>
                <div className="flex h-full flex-col justify-between rounded-[28px] border border-line bg-card p-7">
                  <p className="font-serif text-[3.2rem] leading-none tracking-tight">{big}</p>
                  <p className="mt-10 text-ink-2">{small}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="border-y border-line bg-paper-2/50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 md:py-28 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <p className="eyebrow">Non-custodial by design</p>
            <h2 className="font-serif mt-4 text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.02] tracking-tight">The link is the key.</h2>
            <p className="mt-6 max-w-lg leading-relaxed text-ink-2">
              Every gift is its own Solana wallet. Its key is written after the <span className="font-mono">#</span> in the link,
              and browsers never send that part to a server. Keepsake has no database of gifts and can’t touch yours. The card’s
              message is encrypted on-chain with the same key, so only someone holding the link can read it.
            </p>
            <p className="mt-4 max-w-lg leading-relaxed text-ink-2">
              Your gift keys are derived from one signature from your wallet, so you can rebuild every link you’ve made on any
              device, and reclaim anything left unopened.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-[28px] border border-line bg-card p-6 sm:p-8">
              <p className="eyebrow">Anatomy of a gift link</p>
              <div className="mt-6 overflow-x-auto rounded-2xl bg-night p-5 font-mono text-[0.85rem] leading-relaxed text-white/80 sm:text-[0.95rem]">
                <span className="text-white/50">https://</span><SiteHost />/g
                <span className="text-[#ff9a82]">#4Yx7…Qm2P</span>
              </div>
              <dl className="mt-6 grid gap-4 text-[0.95rem] sm:grid-cols-2">
                <div className="rounded-2xl border border-line p-4">
                  <dt className="font-medium">Before the #</dt>
                  <dd className="mt-1 text-ink-2">Loads the Keepsake app. Public.</dd>
                </div>
                <div className="rounded-2xl border border-ribbon/30 bg-ribbon/5 p-4">
                  <dt className="font-medium text-ribbon-deep">After the #</dt>
                  <dd className="mt-1 text-ink-2">The gift wallet’s key. Stays in the browser.</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-24 sm:px-6 md:py-32">
        <Reveal>
          <p className="eyebrow">Questions</p>
          <h2 className="font-serif mt-4 mb-10 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] tracking-tight">Good to know</h2>
        </Reveal>
        <Faq />
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grain relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-ribbon px-6 py-16 text-center text-white sm:px-12 md:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.25),transparent)]" />
          <div className="relative z-[2]">
            <h2 className="font-serif mx-auto max-w-3xl text-[clamp(2.4rem,6vw,5rem)] leading-[0.98] tracking-tight">
              The best time to give them a stake was years ago. The next best is today.
            </h2>
            <Link href="/create" className="btn mt-10 h-14! bg-white px-8! text-[1.02rem]! text-ink hover:bg-paper">
              Wrap your first gift
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="text-up">
      <circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
