"use client";

import { FC, ReactNode, useMemo, useState, useEffect } from "react";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletContextProviderProps {
    children: ReactNode;
}

// Inner component that wraps children with wallet context
const WalletContextInner: FC<WalletContextProviderProps> = ({ children }) => {
    const endpoint = useMemo(() =>
        process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet"),
        []
    );

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

// Main provider that handles SSR/hydration
export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Always render the wallet context, but the inner components will handle mounting
    return (
        <WalletContextInner>
            {children}
        </WalletContextInner>
    );
};
