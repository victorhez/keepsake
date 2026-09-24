"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useRef, useState } from "react";
import { shortAddress } from "@/lib/format";

export function WalletPill({ className }: { className?: string }) {
  const { publicKey, wallet, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!publicKey) {
    return (
      <button onClick={() => setVisible(true)} className={`btn btn-ghost h-10! px-4! text-[0.9rem]! ${className ?? ""}`}>
        {connecting ? "Connecting…" : "Connect"}
      </button>
    );
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost h-10! gap-2! px-3! text-[0.9rem]!">
        {wallet?.adapter.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wallet.adapter.icon} alt="" width={18} height={18} className="rounded-[5px]" />
        )}
        <span className="font-mono text-[0.82rem]">{shortAddress(publicKey.toBase58())}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-[0_20px_50px_-20px_rgba(23,20,15,0.4)]">
          <button
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-paper-2"
            onClick={() => {
              navigator.clipboard.writeText(publicKey.toBase58());
              setOpen(false);
            }}
          >
            Copy address
          </button>
          <a href="/gifts" className="block w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-paper-2">
            My gifts
          </a>
          <button
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-down hover:bg-paper-2"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
