"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useWeb3Auth } from "../app/providers/Web3AuthProvider";
import { supabase } from "../lib/supabaseClient";

interface VibeContextType {
    balance: number;
    refreshBalance: () => Promise<void>;
}

const VibeContext = createContext<VibeContextType | undefined>(undefined);

export const VibeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { loggedIn, publicKey } = useWeb3Auth();
    const [balance, setBalance] = useState(0);

    const refreshBalance = async () => {
        if (!loggedIn || !publicKey) return;

        try {
            // Using standard fetch to our own API or Supabase client directly?
            // Let's use Supabase client directly for speed if possible, or an API route.
            // Direct DB access via client is fine if RLS allows reading own user.
            // Direct DB access using shared client

            // Assuming wallet_address is the lookup key
            const { data, error } = await supabase
                .from("garo_users")
                .select("xp")
                .eq("wallet_address", publicKey.toBase58())
                .single();

            if (data && !error) {
                setBalance(data.xp || 0);
            }
        } catch (error) {
            console.error("Failed to fetch vibe balance:", error);
        }
    };

    useEffect(() => {
        if (loggedIn) {
            refreshBalance();
        } else {
            setBalance(0);
        }
    }, [loggedIn, publicKey]);

    return (
        <VibeContext.Provider value={{ balance, refreshBalance }}>
            {children}
        </VibeContext.Provider>
    );
};

export const useVibe = () => {
    const context = useContext(VibeContext);
    if (!context) {
        throw new Error("useVibe must be used within a VibeProvider");
    }
    return context;
};
