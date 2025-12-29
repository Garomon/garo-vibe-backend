"use client";

import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";

export const WalletButton: FC = () => {
    const { loggedIn, login, logout, publicKey } = useWeb3Auth();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (publicKey) {
            navigator.clipboard.writeText(publicKey.toBase58());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loggedIn) {
        return (
            <div className="relative">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="cursor-pointer group relative z-50"
                >
                    <div className={`tier-badge tier-10 flex items-center gap-2 transition-all ${isOpen ? 'ring-2 ring-garo-neon shadow-[0_0_15px_rgba(34,211,238,0.3)]' : ''}`}>
                        <span className="w-2 h-2 rounded-full bg-garo-neon animate-pulse"></span>
                        VIBE VERIFIED
                    </div>
                </motion.div>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop to close on click outside */}
                            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full mt-3 right-0 w-64 bg-black/95 border border-garo-neon/30 rounded-xl p-4 shadow-2xl z-50 backdrop-blur-xl"
                            >
                                <div className="mb-4 pb-4 border-b border-white/10">
                                    <p className="text-garo-silver text-xs uppercase mb-1 tracking-widest">Connected as</p>
                                    <div className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                        <span className="font-mono text-xs text-garo-neon truncate">
                                            {publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-6)}
                                        </span>
                                        <button
                                            onClick={handleCopy}
                                            className="text-xs text-garo-muted hover:text-white transition-colors"
                                            title="Copy Address"
                                        >
                                            {copied ? "✓" : "📋"}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { logout(); setIsOpen(false); }}
                                    className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 hover:border-red-500 text-red-400 text-xs font-bold tracking-widest rounded-lg transition-all uppercase flex items-center justify-center gap-2"
                                >
                                    <span>Disconnect</span>
                                    <span>⏻</span>
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
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
