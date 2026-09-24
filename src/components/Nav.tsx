"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Wordmark } from "./Logo";
import { WalletPill } from "./WalletPill";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#pre-ipo", label: "Pre-IPO" },
  { href: "/gifts", label: "My gifts" },
];

export function Nav() {
  const path = usePathname();
  const onClaim = path?.startsWith("/g");

  return (
    <header className="no-print sticky top-0 z-40 border-b border-transparent bg-paper/75 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Keepsake home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "rounded-full px-3.5 py-2 text-[0.92rem] text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink",
                path === l.href && "bg-ink/5 text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!onClaim && <WalletPill className="max-sm:hidden!" />}
          {path !== "/create" && (
            <Link href="/create" className="btn btn-primary h-10! px-4! text-[0.9rem]!">
              Send a gift
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
