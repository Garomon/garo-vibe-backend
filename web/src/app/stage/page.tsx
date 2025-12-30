"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface LeaderboardEntry {
    rank: number;
    nickname: string;
    xp: number;
}

export default function StagePage() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Auto-refresh leaderboard every 5 seconds
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/leaderboard');
                const data = await res.json();
                setLeaderboard((data.leaderboard || []).slice(0, 5));
                setLastUpdate(new Date());
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            }
        };

        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 5000);
        return () => clearInterval(interval);
    }, []);

    const appUrl = "https://garovibe.com";
    const king = leaderboard[0];
    const runners = leaderboard.slice(1, 5);

    return (
        <div className="min-h-screen bg-[#000000] text-white overflow-hidden flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* Main Content - 3 Zone Layout */}
            <div className="flex-1 flex">

                {/* ZONE A: The Magnet (Left 30%) */}
                <div className="w-[30%] flex flex-col items-center justify-center p-8 border-r border-white/10">
                    <motion.div
                        animate={{
                            boxShadow: [
                                '0 0 40px rgba(0,255,136,0.3)',
                                '0 0 80px rgba(0,255,136,0.6)',
                                '0 0 40px rgba(0,255,136,0.3)'
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="bg-white p-6 rounded-3xl"
                    >
                        <QRCodeSVG
                            value={appUrl}
                            size={280}
                            level="H"
                            bgColor="#FFFFFF"
                            fgColor="#000000"
                        />
                    </motion.div>

                    <div className="mt-8 text-center">
                        <p className="text-3xl font-black uppercase tracking-wider text-garo-neon">
                            SCAN TO JOIN
                        </p>
                        <p className="text-2xl font-bold uppercase tracking-wider text-white/70 mt-2">
                            ESCANEA PARA ENTRAR
                        </p>
                    </div>

                    <div className="mt-6 text-lg text-white/40">
                        {appUrl}
                    </div>
                </div>

                {/* ZONE B: The Arena (Right 70%) */}
                <div className="w-[70%] flex flex-col p-8">
                    <h2 className="text-4xl font-black uppercase tracking-widest text-center mb-8 text-white/60">
                        ⚡ LIVE LEADERBOARD ⚡
                    </h2>

                    {/* THE KING - #1 */}
                    {king && (
                        <motion.div
                            animate={{
                                boxShadow: [
                                    '0 0 30px rgba(250,204,21,0.4)',
                                    '0 0 60px rgba(250,204,21,0.8)',
                                    '0 0 30px rgba(250,204,21,0.4)'
                                ]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="bg-gradient-to-r from-yellow-900/40 to-amber-800/30 border-4 border-yellow-400 rounded-3xl p-8 mb-8"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <span className="text-8xl">👑</span>
                                    <div>
                                        <div className="text-2xl text-yellow-400 uppercase tracking-widest font-bold">
                                            #1 THE KING
                                        </div>
                                        <div className="text-7xl font-black uppercase tracking-wide mt-2" style={{ textShadow: '0 0 30px rgba(250,204,21,0.5)' }}>
                                            {king.nickname}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-6xl font-black text-yellow-400">
                                        💎 {king.xp.toLocaleString()}
                                    </div>
                                    <div className="text-xl text-yellow-400/60 uppercase">$VIBE</div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Runners Up #2-#5 */}
                    <div className="flex-1 space-y-4">
                        {runners.map((user, index) => {
                            const rank = index + 2;
                            const colors = [
                                { border: 'border-slate-400', text: 'text-slate-300', bg: 'bg-slate-800/30' },
                                { border: 'border-orange-700', text: 'text-orange-400', bg: 'bg-orange-900/20' },
                                { border: 'border-gray-600', text: 'text-gray-400', bg: 'bg-gray-800/20' },
                                { border: 'border-gray-700', text: 'text-gray-500', bg: 'bg-gray-900/20' }
                            ];
                            const style = colors[index] || colors[3];

                            return (
                                <motion.div
                                    key={user.rank}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`${style.bg} ${style.border} border-2 rounded-2xl p-6 flex items-center justify-between`}
                                >
                                    <div className="flex items-center gap-6">
                                        <span className={`text-5xl font-black ${style.text}`}>#{rank}</span>
                                        <span className="text-4xl font-bold uppercase">{user.nickname}</span>
                                    </div>
                                    <div className={`text-4xl font-black ${style.text}`}>
                                        💎 {user.xp.toLocaleString()}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Last Update */}
                    <div className="text-center text-sm text-white/30 mt-4">
                        Last update: {lastUpdate.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* ZONE C: The Hype Ticker (Bottom) */}
            <div className="h-16 bg-black border-t border-garo-neon/30 overflow-hidden relative">
                <motion.div
                    animate={{ x: ['100%', '-100%'] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute whitespace-nowrap flex items-center h-full"
                    style={{
                        textShadow: '0 0 10px rgba(0,255,136,0.8), 0 0 20px rgba(0,255,136,0.5), 0 0 30px rgba(0,255,136,0.3)'
                    }}
                >
                    <span className="text-2xl font-bold uppercase tracking-widest text-garo-neon">
                        ⚡ WELCOME TO GΛRO VIBE ⚡ /// CURRENT MOOD: LEGENDARY /// EARN $VIBE BY DANCING /// TOP RAVERS GET REWARDS /// SCAN THE QR TO JOIN THE GAME /// ⚡ WELCOME TO GΛRO VIBE ⚡ /// CURRENT MOOD: LEGENDARY /// EARN $VIBE BY DANCING /// TOP RAVERS GET REWARDS /// SCAN THE QR TO JOIN THE GAME ///
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
