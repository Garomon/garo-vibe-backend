"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";
import { VibeBalance } from "../components/ui/VibeBalance";
import { SetAliasModal } from "../components/ui/SetAliasModal";
import Link from "next/link";
import AmbientBackground from "../components/ui/AmbientBackground";

interface LeaderboardEntry {
    rank: number;
    nickname: string;
    xp: number;
    isCurrentUser: boolean;
}

interface CurrentUser {
    rank: number;
    nickname: string;
    xp: number;
}

interface NextRankUser {
    nickname: string;
    xp: number;
    xpToPass: number;
}

export default function LeaderboardPage() {
    const { loggedIn, publicKey } = useWeb3Auth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [nextRankUser, setNextRankUser] = useState<NextRankUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAliasModal, setShowAliasModal] = useState(false);

    useEffect(() => {
        const walletParam = loggedIn && publicKey ? `?wallet_address=${publicKey.toBase58()}` : '';
        fetch(`/api/leaderboard${walletParam}`)
            .then(res => res.json())
            .then(data => {
                setLeaderboard(data.leaderboard || []);
                setCurrentUser(data.currentUser);
                setNextRankUser(data.nextRankUser);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [loggedIn, publicKey]);

    // Podium colors (Cyberpunk style)
    const podiumStyles = [
        { bg: 'from-yellow-400/30 to-amber-600/20', border: 'border-yellow-400', glow: 'shadow-[0_0_30px_rgba(250,204,21,0.5)]', icon: '👑', label: 'NEON GOLD' },
        { bg: 'from-slate-300/30 to-gray-500/20', border: 'border-slate-400', glow: 'shadow-[0_0_20px_rgba(148,163,184,0.4)]', icon: '🥈', label: 'CHROME' },
        { bg: 'from-orange-700/30 to-amber-900/20', border: 'border-orange-700', glow: 'shadow-[0_0_20px_rgba(194,65,12,0.4)]', icon: '🥉', label: 'RUSTY BRONZE' }
    ];

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden pb-24">
            <AmbientBackground />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass-dark">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/vault" className="text-garo-neon hover:text-white transition">
                        ← VAULT
                    </Link>
                    <h1 className="text-xl font-bold tracking-widest">
                        HALL OF <span className="text-garo-neon">FAME</span>
                    </h1>
                    {loggedIn && <VibeBalance />}
                </div>
            </header>

            {/* Content */}
            <main className="pt-24 px-6 max-w-4xl mx-auto">

                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading rankings...</div>
                ) : (
                    <>
                        {/* Podium - Top 3 */}
                        <section className="mb-12">
                            <h2 className="text-center text-sm text-garo-neon uppercase tracking-widest mb-8">
                                ⚡ THE ELITE ⚡
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                {[1, 0, 2].map((orderIndex) => {
                                    const user = top3[orderIndex];
                                    if (!user) return <div key={orderIndex} />;
                                    const style = podiumStyles[orderIndex];
                                    const isFirst = orderIndex === 0;

                                    return (
                                        <motion.div
                                            key={user.rank}
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: orderIndex * 0.15 }}
                                            className={`
                                                relative flex flex-col items-center p-6 rounded-2xl border-2
                                                bg-gradient-to-b ${style.bg} ${style.border} ${style.glow}
                                                ${isFirst ? 'scale-110 -mt-4' : ''}
                                                ${user.isCurrentUser ? 'ring-2 ring-garo-neon ring-offset-2 ring-offset-black' : ''}
                                            `}
                                        >
                                            {/* Shine effect */}
                                            <div className="absolute inset-0 overflow-hidden rounded-2xl">
                                                <motion.div
                                                    animate={{ x: ['-100%', '200%'] }}
                                                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                                                    className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                                                />
                                            </div>

                                            <span className="text-4xl mb-2">{style.icon}</span>
                                            <div className="text-xs text-gray-400 mb-1">{style.label}</div>
                                            <div className="font-bold text-lg truncate max-w-full">{user.nickname}</div>
                                            <div className="flex items-center gap-1 mt-2">
                                                <span>💎</span>
                                                <span className="text-xl font-mono font-bold text-garo-neon">{user.xp.toLocaleString()}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Rest of leaderboard */}
                        <section>
                            <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-4">
                                Ranks 4-50
                            </h2>
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
                                {rest.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No more rankings</div>
                                ) : (
                                    rest.map((user, index) => (
                                        <motion.div
                                            key={user.rank}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            className={`
                                                flex items-center justify-between px-6 py-4 border-b border-white/5
                                                ${index % 2 === 0 ? 'bg-white/[0.02]' : ''}
                                                ${user.isCurrentUser ? 'bg-garo-neon/10 border-l-4 border-l-garo-neon' : ''}
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-gray-500 font-mono w-8">#{user.rank}</span>
                                                <span className="font-medium">{user.nickname}</span>
                                                {user.isCurrentUser && <span className="text-xs text-garo-neon">(YOU)</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">💎</span>
                                                <span className="font-mono font-bold">{user.xp.toLocaleString()}</span>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </section>
                    </>
                )}
            </main>

            {/* Sticky "You" Bar - FOMO inducing */}
            {currentUser && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-garo-neon/30"
                >
                    <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-12 h-12 rounded-full bg-garo-neon/20 border-2 border-garo-neon flex items-center justify-center font-bold text-garo-neon"
                            >
                                #{currentUser.rank}
                            </motion.div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{currentUser.nickname}</span>
                                    <button
                                        onClick={() => setShowAliasModal(true)}
                                        className="text-xs text-garo-neon hover:text-white transition"
                                    >
                                        ✏️
                                    </button>
                                </div>
                                <div className="text-sm text-gray-400">💎 {currentUser.xp.toLocaleString()} $VIBE</div>
                            </div>
                        </div>

                        {nextRankUser && (
                            <div className="text-right">
                                <div className="text-xs text-gray-500 uppercase">To beat {nextRankUser.nickname}</div>
                                <div className="text-garo-neon font-bold">
                                    Earn <span className="text-lg">{nextRankUser.xpToPass}</span> $VIBE
                                </div>
                            </div>
                        )}

                        {!nextRankUser && currentUser.rank === 1 && (
                            <div className="text-right">
                                <div className="text-2xl">👑</div>
                                <div className="text-xs text-yellow-400 uppercase">You're #1!</div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Set Alias Modal */}
            <SetAliasModal
                isOpen={showAliasModal}
                onClose={() => setShowAliasModal(false)}
                onSuccess={(newNickname) => {
                    if (currentUser) {
                        setCurrentUser({ ...currentUser, nickname: newNickname });
                    }
                }}
            />
        </div>
    );
}
