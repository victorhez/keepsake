"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useMemo, type ReactNode } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => (typeof window === "undefined" ? "https://api.mainnet-beta.solana.com" : `${window.location.origin}/api/rpc`),
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      {/* Wallets that implement the Wallet Standard (Phantom, Solflare, Backpack…) register themselves. */}
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
