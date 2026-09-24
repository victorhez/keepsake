"use client";

import { QRCodeSVG } from "qrcode.react";
import { motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import confetti from "canvas-confetti";
import type { Asset } from "@/lib/client";
import type { GiftNote } from "@/lib/gift";
import { themeById } from "@/lib/themes";
import { GiftCard } from "./GiftCard";

interface Props {
  link: string;
  note: GiftNote;
  asset: Asset;
  shares: number;
  signature?: string;
  onAnother?: () => void;
  celebrate?: boolean;
  /** A dry run: nothing was bought and the link opens a sample gift. */
  preview?: boolean;
}

export function ShareGift({ link, note, asset, shares, signature, onAnother, celebrate = true, preview = false }: Props) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );
  const theme = themeById(note.theme);

  useEffect(() => {
    if (!celebrate) return;
    const colors = ["#e8492e", "#b8903f", "#17140f", "#f5f0e7"];
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.35 }, colors, disableForReducedMotion: true });
  }, [celebrate]);

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({
        title: note.to ? `A gift for ${note.to}` : "A gift for you",
        text: `${note.from ? `${note.from} sent you` : "You’ve been sent"} a piece of ${asset.name}. Open it here:`,
        url: link,
      });
    } catch {
      // The person closed the share sheet.
    }
  }

  const card = (
    <GiftCard
      theme={theme}
      asset={{ name: asset.name, ticker: asset.ticker, logo: asset.logo, issuer: asset.issuer }}
      value={note.usd}
      shares={shares}
      to={note.to || undefined}
      from={note.from || undefined}
    />
  );

  return (
    <>
      {preview && (
        <div className="no-print mx-auto mt-8 max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-gold/40 bg-gold/10 px-5 py-3.5 text-[0.9rem]">
            <span className="font-semibold">Preview.</span> Nothing was bought or sent. This link opens a sample of what your
            recipient will see, priced live.
          </div>
        </div>
      )}
      <div className="no-print mx-auto grid max-w-6xl items-start gap-12 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <motion.div initial={{ opacity: 0, scale: 0.94, rotate: -3 }} animate={{ opacity: 1, scale: 1, rotate: -1.5 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
          {card}
        </motion.div>

        <div>
          <p className="eyebrow text-up!">{preview ? "Preview ready" : "Wrapped and ready"}</p>
          <h1 className="font-serif mt-3 text-[clamp(2.4rem,5vw,3.6rem)] leading-[1] tracking-tight">
            Now send it {note.to ? <>to {note.to}</> : <>their way</>}.
          </h1>
          <p className="mt-4 leading-relaxed text-ink-2">
            {preview
              ? "When you wrap a real gift, this link is the gift itself. Open it now to see exactly what they’ll see."
              : "This link is the gift. Whoever opens it first can claim it, so send it straight to them. You can always find it again under My gifts, and take it back if it isn’t opened."}
          </p>

          <div className="mt-7 rounded-2xl border border-line bg-card p-2 pl-4">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-mono text-[0.82rem] text-ink-2">{link}</p>
              <button onClick={copy} className="btn btn-primary h-10! shrink-0 px-4! text-[0.88rem]!">
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {canShare && (
              <button onClick={share} className="btn btn-ghost h-11!">
                Share…
              </button>
            )}
            <a
              className="btn btn-ghost h-11!"
              href={`https://wa.me/?text=${encodeURIComponent(`A little something for you 🎁 ${link}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
            <button onClick={() => window.print()} className="btn btn-ghost h-11!">
              Print a card
            </button>
          </div>

          <div className="mt-8 flex items-center gap-5 rounded-2xl border border-line bg-card p-5">
            <div className="rounded-xl bg-white p-2.5 ring-1 ring-line">
              <QRCodeSVG value={link} size={112} level="M" fgColor="#17140f" />
            </div>
            <p className="text-[0.9rem] leading-relaxed text-ink-2">
              Handing it over in person? Let them scan this with their phone camera, or print the card and slip it in an
              envelope.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.88rem]">
            {onAnother && (
              <button onClick={onAnother} className="font-medium text-ribbon hover:underline">
                Wrap another gift
              </button>
            )}
            <a href={link} target="_blank" rel="noreferrer" className="text-ink-2 hover:text-ink">
              Open it as the recipient ↗
            </a>
            {!preview && (
              <a href="/gifts" className="text-ink-2 hover:text-ink">
                My gifts
              </a>
            )}
            {signature && (
              <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer" className="text-ink-2 hover:text-ink">
                View transaction ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Printable card */}
      <div className="hidden print:block">
        <div className="mx-auto max-w-[640px] px-8 pt-10 text-center font-sans text-ink">
          <div className="mx-auto w-[520px]">{card}</div>
          {note.message && <p className="font-serif mx-auto mt-10 max-w-md text-[1.6rem] italic leading-snug">“{note.message}”</p>}
          <div className="mt-10 flex flex-col items-center gap-4">
            <QRCodeSVG value={link} size={176} level="M" fgColor="#17140f" />
            <p className="text-[0.95rem]">Scan with your phone camera to open your gift.</p>
            <p className="max-w-sm text-[0.75rem] text-muted">
              Keep this card safe until you’ve claimed it. Anyone who scans the code can open the gift.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
