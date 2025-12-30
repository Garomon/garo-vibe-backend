"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeb3Auth } from "../../providers/Web3AuthProvider";

interface SetAliasModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (nickname: string) => void;
}

export const SetAliasModal: React.FC<SetAliasModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { publicKey } = useWeb3Auth();
    const [nickname, setNickname] = useState("");
    const [currentNickname, setCurrentNickname] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && publicKey) {
            fetch(`/api/user/nickname?wallet_address=${publicKey.toBase58()}`)
                .then(res => res.json())
                .then(data => {
                    setCurrentNickname(data.nickname);
                    if (data.hasCustomNickname) {
                        setNickname(data.nickname);
                    }
                });
        }
    }, [isOpen, publicKey]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey || !nickname.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/user/nickname', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_address: publicKey.toBase58(),
                    nickname: nickname.trim()
                })
            });
            const data = await res.json();

            if (data.success) {
                setSuccess(true);
                setCurrentNickname(data.nickname);
                onSuccess?.(data.nickname);
                setTimeout(() => {
                    setSuccess(false);
                    onClose();
                }, 1500);
            } else {
                setError(data.error || "Failed to set alias");
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-gray-900 border border-garo-neon/30 rounded-2xl p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold text-white mb-2">Set Your Alias</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            This is how you'll appear on the leaderboard.
                        </p>

                        {currentNickname && (
                            <div className="text-xs text-gray-500 mb-4">
                                Current: <span className="text-garo-neon">{currentNickname}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value.slice(0, 12))}
                                placeholder="Enter alias..."
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-garo-neon focus:outline-none mb-2"
                                maxLength={12}
                            />
                            <div className="text-xs text-gray-500 mb-4">
                                {nickname.length}/12 characters • Letters, numbers, underscores only
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm mb-4">{error}</div>
                            )}

                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-green-400 text-sm mb-4 flex items-center gap-2"
                                >
                                    ✓ Alias saved!
                                </motion.div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 border border-white/20 text-gray-400 rounded-lg hover:bg-white/5 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || nickname.trim().length < 3}
                                    className="flex-1 px-4 py-3 bg-garo-neon text-black font-bold rounded-lg hover:bg-garo-neon-dim transition disabled:opacity-50"
                                >
                                    {loading ? '...' : 'Save Alias'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
