"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { SolanaPrivateKeyProvider, SolanaWallet } from "@web3auth/solana-provider";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Client ID from Web3Auth Dashboard (Placeholder)
const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "BPi5PB_UiJZ-CPTCpMm9vTqKhaTZZ9q_gG_K0p1_8_H0_0_0"; // Replace with actaul ID

const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.SOLANA,
    chainId: "0x3", // Solana Devnet
    rpcTarget: "https://api.devnet.solana.com",
    displayName: "Solana Devnet",
    blockExplorerUrl: "https://explorer.solana.com",
    ticker: "SOL",
    tickerName: "Solana Token",
};

interface Web3AuthContextType {
    provider: IProvider | null;
    loggedIn: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    userInfo: any;
    publicKey: PublicKey | null;
    balance: number | null;
    isLoading: boolean;
}

const Web3AuthContext = createContext<Web3AuthContextType | null>(null);

export const useWeb3Auth = () => {
    const context = useContext(Web3AuthContext);
    if (!context) {
        throw new Error("useWeb3Auth must be used within a Web3AuthProvider");
    }
    return context;
};

export const Web3AuthProvider = ({ children }: { children: ReactNode }) => {
    const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
    const [provider, setProvider] = useState<IProvider | null>(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [balance, setBalance] = useState<number | null>(null);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const privateKeyProvider = new SolanaPrivateKeyProvider({ config: { chainConfig } });

                const web3auth = new Web3Auth({
                    clientId,
                    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
                    // @ts-ignore
                    privateKeyProvider,
                });

                setWeb3auth(web3auth);

                // @ts-ignore
                await web3auth.initModal();
                setProvider(web3auth.provider);

                if (web3auth.connected) {
                    setLoggedIn(true);
                    const user = await web3auth.getUserInfo();
                    setUserInfo(user);
                    if (web3auth.provider) {
                        const solanaWallet = new SolanaWallet(web3auth.provider);
                        const accounts = await solanaWallet.requestAccounts();
                        if (accounts.length > 0) {
                            const pubKey = new PublicKey(accounts[0]);
                            setPublicKey(pubKey);
                            // Fetch balance
                            const connection = new Connection(chainConfig.rpcTarget);
                            const bal = await connection.getBalance(pubKey);
                            setBalance(bal / LAMPORTS_PER_SOL);
                        }
                    }
                }
            } catch (error) {
                console.error("Error initializing Web3Auth:", error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);


    useEffect(() => {
        if (loggedIn && userInfo && publicKey) {
            syncUser(publicKey.toBase58(), userInfo);
        }
    }, [loggedIn, userInfo, publicKey]);

    const syncUser = async (walletAddress: string, userInfo: any) => {
        try {
            const email = userInfo?.email || "";
            console.log("Syncing user:", { walletAddress, email });

            await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress, email, userInfo })
            });
        } catch (e) {
            console.error("Sync failed", e);
        }
    };

    const login = async () => {

        if (!web3auth) {
            console.error("Web3Auth not initialized");
            return;
        }
        try {
            const web3authProvider = await web3auth.connect();
            setProvider(web3authProvider);
            setLoggedIn(true);
            const user = await web3auth.getUserInfo();
            setUserInfo(user);
            if (web3authProvider) {
                const solanaWallet = new SolanaWallet(web3authProvider);
                const accounts = await solanaWallet.requestAccounts();
                if (accounts.length > 0) {
                    const pubKey = new PublicKey(accounts[0]);
                    setPublicKey(pubKey);
                    // Fetch balance
                    const connection = new Connection(chainConfig.rpcTarget);
                    const bal = await connection.getBalance(pubKey);
                    setBalance(bal / LAMPORTS_PER_SOL);
                }
            }
        } catch (error) {
            console.error("Error logging in:", error);
        }
    };

    const logout = async () => {
        if (!web3auth) {
            console.error("Web3Auth not initialized");
            return;
        }
        try {
            await web3auth.logout();
            setProvider(null);
            setLoggedIn(false);
            setUserInfo(null);
            setPublicKey(null);
            setBalance(null);
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <Web3AuthContext.Provider value={{ provider, loggedIn, login, logout, userInfo, publicKey, balance, isLoading }}>
            {children}
        </Web3AuthContext.Provider>
    );
};
