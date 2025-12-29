"use client";

import { FC, useEffect, useState } from "react";
import { motion } from "framer-motion";

const AdminDashboard: FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        tier1: 0,
        tier2: 0,
        tier3: 0,
    });

    useEffect(() => {
        // Fetch basic stats
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch stats:", e);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Welcome */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1 className="text-3xl font-bold mb-2">
                    Welcome, <span className="lambda-glow">GΛRO</span>
                </h1>
                <p className="text-garo-muted">Command Center Active</p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-4 mb-8"
            >
                <div className="glass p-6 text-center">
                    <div className="text-4xl font-bold text-garo-neon">{stats.totalUsers}</div>
                    <div className="text-sm text-garo-muted">Total Users</div>
                </div>
                <div className="glass p-6 text-center">
                    <div className="text-4xl font-bold text-green-400">{stats.tier3}</div>
                    <div className="text-sm text-garo-muted">FAMILY</div>
                </div>
                <div className="glass p-6 text-center">
                    <div className="text-4xl font-bold text-orange-400">{stats.tier2}</div>
                    <div className="text-sm text-garo-muted">RESIDENT</div>
                </div>
                <div className="glass p-6 text-center">
                    <div className="text-4xl font-bold text-gray-400">{stats.tier1}</div>
                    <div className="text-sm text-garo-muted">INITIATE</div>
                </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
            >
                <h2 className="text-lg font-bold text-garo-silver mb-4">Quick Actions</h2>

                <a href="/admin/content" className="block">
                    <div className="glass p-6 flex items-center gap-4 hover:border-garo-neon/50 transition-all active:scale-[0.98]">
                        <span className="text-4xl">🗄️</span>
                        <div>
                            <div className="font-bold text-lg">Vault CMS</div>
                            <div className="text-sm text-garo-muted">Manage videos, music, and content</div>
                        </div>
                    </div>
                </a>

                <a href="/admin/airdrop" className="block">
                    <div className="glass p-6 flex items-center gap-4 hover:border-garo-neon/50 transition-all active:scale-[0.98]">
                        <span className="text-4xl">🎁</span>
                        <div>
                            <div className="font-bold text-lg">Airdrop NFT</div>
                            <div className="text-sm text-garo-muted">Invite friends to the rave</div>
                        </div>
                    </div>
                </a>

                <a href="/admin/scan" className="block">
                    <div className="glass p-6 flex items-center gap-4 hover:border-garo-neon/50 transition-all active:scale-[0.98]">
                        <span className="text-4xl">📷</span>
                        <div>
                            <div className="font-bold text-lg">Bouncer Mode</div>
                            <div className="text-sm text-garo-muted">Scan QR codes at the door</div>
                        </div>
                    </div>
                </a>

                <a href="/admin/events/create" className="block">
                    <div className="glass p-6 flex items-center gap-4 hover:border-garo-neon/50 transition-all active:scale-[0.98]">
                        <span className="text-4xl">📅</span>
                        <div>
                            <div className="font-bold text-lg">Create Event</div>
                            <div className="text-sm text-garo-muted">Set up the next rave</div>
                        </div>
                    </div>
                </a>

                <a href="/admin/roster" className="block">
                    <div className="glass p-6 flex items-center gap-4 hover:border-garo-neon/50 transition-all active:scale-[0.98]">
                        <span className="text-4xl">📋</span>
                        <div>
                            <div className="font-bold text-lg">The Roster</div>
                            <div className="text-sm text-garo-muted">View, ban, and manage members</div>
                        </div>
                    </div>
                </a>
            </motion.div>
        </div>
    );
};

export default AdminDashboard;
