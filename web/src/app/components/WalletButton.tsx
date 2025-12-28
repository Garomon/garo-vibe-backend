"use client";

import { FC } from "react";
import { motion } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";

export const WalletButton: FC = () => {
    const { loggedIn, login, logout, userInfo } = useWeb3Auth();

    if (loggedIn) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={logout}
                className="cursor-pointer group relative"
            >
                <div className="tier-badge tier-10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-garo-neon animate-pulse"></span>
                    VIBE VERIFIED
                </div>
                <div className="absolute top-full mt-2 right-0 hidden group-hover:block text-xs text-garo-muted bg-black/90 p-2 rounded border border-garo-border">
                    DISCONNECT
                </div>
            </motion.div>
        );
    }

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={login}
            className="btn-primary flex items-center gap-2"
        >
            <span className="text-lg">⚡</span>
            LINK IDENTITY
        </motion.button>
    );
};
