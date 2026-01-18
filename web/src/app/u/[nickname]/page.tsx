"use client";

import { FC, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ProfileData {
    nickname: string;
    tier: number;
    tierName: string;
    vibeBalance: number;
    eventsAttended: number;
    avatarUrl: string | null;
    instagram: string | null;
    isOG: boolean;
    memberSince: string;
    daysSinceMember: number;
    leaderboardPosition: number | null;
    referrals: number;
}

interface EventData {
    id: string;
    checkedInAt: string;
    nftMint: string | null;
    event: {
        id: string;
        name: string;
        date: string;
        location: string;
    };
}

interface BadgeData {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    awardedAt: string;
}

const RARITY_COLORS: Record<string, string> = {
    common: "border-gray-500",
    rare: "border-blue-500",
    epic: "border-purple-500",
    legendary: "border-yellow-500"
};

const TIER_COLORS: Record<number, string> = {
    0: "text-gray-400",
    1: "text-gray-300",
    2: "text-orange-400",
    3: "text-green-400"
};

const TIER_BG: Record<number, string> = {
    0: "bg-gray-800",
    1: "bg-gray-700",
    2: "bg-orange-900/50",
    3: "bg-green-900/50"
};

const ProfilePage: FC = () => {
    const params = useParams();
    const nickname = params.nickname as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [events, setEvents] = useState<EventData[]>([]);
    const [badges, setBadges] = useState<BadgeData[]>([]);

    useEffect(() => {
        if (nickname) {
            fetchProfile();
        }
    }, [nickname]);

    const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/profile/${nickname}`);
            const data = await res.json();

            if (data.success) {
                setProfile(data.profile);
                setEvents(data.events || []);
                setBadges(data.badges || []);
            } else {
                setError(data.error || "Profile not found");
            }
        } catch (e) {
            console.error("Error fetching profile:", e);
            setError("Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="text-6xl mb-4 animate-pulse">Λ</div>
                    <p className="text-gray-400">Loading profile...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <div className="text-6xl mb-4">👻</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
                    <p className="text-gray-400 mb-6">{error || "This user doesn't exist"}</p>
                    <Link
                        href="/"
                        className="px-6 py-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition"
                    >
                        Go Home
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass-dark">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold">
                        <span className="text-cyan-400">Λ</span>
                    </Link>
                    <Link
                        href="/vault"
                        className="text-sm text-gray-400 hover:text-white transition"
                    >
                        Open Vault
                    </Link>
                </div>
            </header>

            {/* Profile Content */}
            <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
                {/* Profile Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    {/* Avatar */}
                    <div className="relative inline-block mb-6">
                        <div className={`w-32 h-32 rounded-full ${TIER_BG[profile.tier]} border-4 border-white/20 flex items-center justify-center overflow-hidden`}>
                            {profile.avatarUrl ? (
                                <img
                                    src={profile.avatarUrl}
                                    alt={profile.nickname}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-5xl">
                                    {profile.tier >= 3 ? "👑" : profile.tier >= 2 ? "🏠" : profile.tier >= 1 ? "🌱" : "👻"}
                                </span>
                            )}
                        </div>
                        {profile.isOG && (
                            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                                OG
                            </div>
                        )}
                    </div>

                    {/* Name & Tier */}
                    <h1 className="text-4xl font-bold text-white mb-2">
                        @{profile.nickname}
                    </h1>
                    <div className={`inline-block px-4 py-1 rounded-full ${TIER_BG[profile.tier]} ${TIER_COLORS[profile.tier]} font-bold text-sm mb-4`}>
                        {profile.tierName}
                    </div>

                    {/* Instagram */}
                    {profile.instagram && (
                        <a
                            href={`https://instagram.com/${profile.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-pink-400 hover:text-pink-300 transition text-sm"
                        >
                            @{profile.instagram}
                        </a>
                    )}
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
                >
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-cyan-400">{profile.eventsAttended}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Events</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-purple-400">{profile.vibeBalance}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">VIBE</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-green-400">
                            {profile.leaderboardPosition ? `#${profile.leaderboardPosition}` : "-"}
                        </div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Rank</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-yellow-400">{profile.referrals}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Referrals</div>
                    </div>
                </motion.div>

                {/* Badges */}
                {badges.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-12"
                    >
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>🏆</span>
                            <span>Badges</span>
                            <span className="text-sm font-normal text-gray-400">({badges.length})</span>
                        </h2>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {badges.map((badge, index) => (
                                <motion.div
                                    key={badge.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 + index * 0.05 }}
                                    className={`bg-white/5 border-2 ${RARITY_COLORS[badge.rarity] || 'border-gray-500'} rounded-xl p-4 text-center min-w-[100px] hover:scale-105 transition-transform`}
                                    title={badge.description}
                                >
                                    <div className="text-3xl mb-1">{badge.icon}</div>
                                    <div className="text-sm font-bold text-white truncate">{badge.name}</div>
                                    <div className="text-xs text-gray-500 capitalize">{badge.rarity}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Member Since */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-12 bg-white/5 border border-white/10 rounded-xl p-6"
                >
                    <p className="text-gray-400 text-sm mb-1">Member Since</p>
                    <p className="text-2xl font-bold text-white">{formatDate(profile.memberSince)}</p>
                    <p className="text-gray-500 text-sm">{profile.daysSinceMember} days in the family</p>
                </motion.div>

                {/* Event History */}
                {events.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span>🎫</span>
                            <span>Event History</span>
                            <span className="text-sm font-normal text-gray-400">({events.length})</span>
                        </h2>

                        <div className="space-y-3">
                            {events.map((event, index) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + index * 0.05 }}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl">🎫</div>
                                        <div>
                                            <h3 className="font-bold text-white">{event.event.name}</h3>
                                            <p className="text-sm text-gray-400">
                                                {formatDate(event.event.date)}
                                                {event.event.location && ` • ${event.event.location}`}
                                            </p>
                                        </div>
                                    </div>
                                    {event.nftMint && (
                                        <a
                                            href={`https://explorer.solana.com/address/${event.nftMint}?cluster=devnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-400 hover:text-cyan-300 text-xs"
                                        >
                                            View NFT
                                        </a>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* No Events Message */}
                {events.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center py-12 text-gray-400"
                    >
                        <div className="text-4xl mb-2">📭</div>
                        <p>No events attended yet</p>
                    </motion.div>
                )}
            </main>

            {/* Footer */}
            <footer className="text-center py-8 text-gray-500 text-sm">
                <Link href="/" className="hover:text-white transition">
                    <span className="text-cyan-400">Λ</span> GΛRO VIBE
                </Link>
            </footer>
        </div>
    );
};

export default ProfilePage;
