"use client";

import { FC, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";
import { useRouter } from "next/navigation";
import { WalletButton } from "../components/WalletButton";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage, LanguageToggle } from "../../context/LanguageProvider";

const VaultPage: FC = () => {
    const { loggedIn, publicKey, isLoading } = useWeb3Auth();
    const { t, language } = useLanguage();
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Redirect logic removed in favor of conditional rendering (Access Gate)
    useEffect(() => {
        if (publicKey) {
            fetchUserData();
        }
    }, [publicKey]);

    const fetchUserData = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            // Re-use logic or fetch directly (could create /api/user endpoint, for now using simulated data stored in state or re-login sync response)
            // Ideally we fetch from DB. Let's do a quick client-side fetch via a new endpoint or reusing login.
            // For simplicity, I'll assume we can hit the login endpoint again to get fresh user data
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress: publicKey.toBase58() })
            });
            const data = await res.json();
            if (data.user) {
                setUserData(data.user);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSimulateCheckin = async () => {
        if (!publicKey) return;
        try {
            const res = await fetch("/api/attendance/checkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: publicKey.toBase58(),
                    location: "SIMULATE"
                })
            });
            const data = await res.json();
            if (data.success) {
                // Refresh data
                fetchUserData();
                if (data.upgraded) {
                    alert(`LEVEL UP! You are now Tier ${data.newTier}`);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const userTier = userData?.tier || 1;
    const attendanceCount = userData?.attendance_count || 0;

    const getVaultItems = () => [
        {
            id: 1,
            title: t.visualMemoryTitle,
            subtitle: t.visualMemorySub,
            description: t.visualMemoryDesc,
            icon: "📸",
            requiredTier: 1,
            tierName: t.tier1.toUpperCase(),
            actionLabel: t.viewGallery,
            actionUrl: "https://photos.google.com",
            borderColor: "border-gray-500",
            glowColor: "from-gray-500/20 to-transparent",
        },
        {
            id: 2,
            title: t.audioSourceTitle,
            subtitle: t.audioSourceSub,
            description: t.audioSourceDesc,
            icon: "🎧",
            requiredTier: 2,
            tierName: t.tier2.toUpperCase(),
            actionLabel: t.downloadSet,
            actionUrl: "https://dropbox.com",
            borderColor: "border-orange-500",
            glowColor: "from-orange-500/20 to-transparent",
        },
        {
            id: 3,
            title: t.theSignalTitle,
            subtitle: t.theSignalSub,
            description: t.theSignalDesc,
            icon: "👁️",
            requiredTier: 3,
            tierName: t.tier3.toUpperCase(),
            actionLabel: t.liveFeed,
            actionUrl: "#",
            borderColor: "border-green-500",
            glowColor: "from-green-500/20 to-transparent",
        },
    ];

    const vaultItems = getVaultItems();


    const isUnlocked = (requiredTier: number) => userTier >= requiredTier;

    // OXIDATION / STREAK LOGIC
    const [riskLevel, setRiskLevel] = useState(0); // 0 to 1 (1 = Decayed)
    const [timeUntilDecay, setTimeUntilDecay] = useState("");

    useEffect(() => {
        if (!userData?.last_attendance) return;

        const interval = setInterval(() => {
            const lastTime = new Date(userData.last_attendance).getTime();
            const now = new Date().getTime();

            // PROD: 30 Days decay cycle
            const CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

            const elapsed = now - lastTime;
            const progress = Math.min(elapsed / CYCLE_MS, 1);
            setRiskLevel(progress);

            const remaining = Math.max(0, CYCLE_MS - elapsed);
            const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
            const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

            if (days > 0) {
                setTimeUntilDecay(`${days}d ${hours}h`);
            } else {
                const minutes = Math.floor((remaining / 1000 / 60));
                const seconds = Math.floor((remaining / 1000) % 60);
                setTimeUntilDecay(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [userData]);

    // Determine user state
    type UserState = "LOADING" | "NOT_LOGGED_IN" | "GHOST" | "TICKET_PENDING" | "MEMBER";

    const getUserState = (): UserState => {
        if (isLoading || loading) return "LOADING";
        if (!loggedIn) return "NOT_LOGGED_IN";
        if (!userData) return "LOADING";

        // Has Proof of Rave NFT = Member
        if (userData.last_mint_address) return "MEMBER";

        // No NFT but might have pending ticket - we'll check via API
        return "GHOST";
    };

    const currentState = getUserState();

    // Check for pending ticket
    const [hasPendingTicket, setHasPendingTicket] = useState(false);

    useEffect(() => {
        const checkPendingTicket = async () => {
            if (!userData?.email) return;
            try {
                const res = await fetch(`/api/user/ticket-status?email=${encodeURIComponent(userData.email)}`);
                const data = await res.json();
                setHasPendingTicket(data.hasPendingTicket);
            } catch (e) {
                console.error("Error checking ticket status:", e);
            }
        };
        if (userData?.email && !userData?.last_mint_address) {
            checkPendingTicket();
        }
    }, [userData]);

    // ============== REALTIME STATE SYNC ==============
    // Listen for changes to automatically update UI without refresh
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (!userData?.email) return;

        // Dynamic import of Supabase client
        const setupRealtimeSubscription = async () => {
            const { supabase } = await import("../../lib/supabaseClient");

            console.log("🔌 Setting up Realtime subscriptions for:", userData.email);

            // Channel for pending_invites changes (Ghost → Ticket)
            const invitesChannel = supabase
                .channel('pending-invites-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'pending_invites',
                        filter: `email=eq.${userData.email.toLowerCase()}`
                    },
                    (payload) => {
                        console.log('📡 Realtime: pending_invites change detected', payload);
                        // Re-check ticket status
                        fetch(`/api/user/ticket-status?email=${encodeURIComponent(userData.email)}`)
                            .then(res => res.json())
                            .then(data => {
                                const hadTicket = hasPendingTicket;
                                setHasPendingTicket(data.hasPendingTicket);
                                // If we just got a ticket, show celebration
                                if (!hadTicket && data.hasPendingTicket) {
                                    console.log('🎫 TICKET RECEIVED! Showing celebration...');
                                }
                            });
                    }
                )
                .subscribe();

            // Channel for garo_users changes (Ticket → Member via tier change)
            const usersChannel = supabase
                .channel('garo-users-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'garo_users',
                        filter: `email=eq.${userData.email.toLowerCase()}`
                    },
                    (payload) => {
                        console.log('📡 Realtime: garo_users UPDATE detected', payload);
                        const newData = payload.new as any;

                        // Check if user just became a member (last_mint_address set)
                        const wasGhost = !userData.last_mint_address;
                        const isNowMember = newData.last_mint_address;

                        if (wasGhost && isNowMember) {
                            console.log('🎉 TRANSMUTATION COMPLETE! User is now a member!');
                            setShowConfetti(true);
                            setTimeout(() => setShowConfetti(false), 5000);
                        }

                        // Update user data with new values
                        setUserData((prev: any) => ({ ...prev, ...newData }));
                        setHasPendingTicket(false); // Ticket was burned
                    }
                )
                .subscribe();

            // Cleanup function
            return () => {
                console.log("🔌 Cleaning up Realtime subscriptions");
                supabase.removeChannel(invitesChannel);
                supabase.removeChannel(usersChannel);
            };
        };

        const cleanup = setupRealtimeSubscription();

        return () => {
            cleanup.then(fn => fn && fn());
        };
    }, [userData?.email]);

    // ============== NOT LOGGED IN ==============
    if (!loggedIn) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <h1 className="text-4xl font-bold mb-4">
                        <span className="lambda-glow">Λ</span> {t.vaultTitle}
                    </h1>
                    <p className="text-garo-silver mb-8">{t.connectToAccess}</p>
                    <WalletButton />
                </motion.div>
            </div>
        );
    }

    // ============== LOADING ==============
    if (currentState === "LOADING") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="text-6xl mb-4 animate-pulse">Λ</div>
                    <p className="text-garo-silver">{t.loading}</p>
                </motion.div>
            </div>
        );
    }

    // ============== GHOST STATE (No NFT) ==============
    if (currentState === "GHOST" && !hasPendingTicket) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    {/* Glitch Lock Effect */}
                    <div className="relative mb-8">
                        <div className="text-8xl opacity-20 blur-sm absolute inset-0 flex items-center justify-center animate-pulse">
                            🔒
                        </div>
                        <div className="text-8xl relative z-10">🔒</div>
                    </div>

                    <h1 className="text-3xl font-bold mb-4 text-red-500">
                        {t.signalLost}
                    </h1>

                    <p className="text-garo-silver mb-8 text-lg">
                        {t.signalLostSub}<br />
                        <span className="text-garo-muted">{t.signalLostAction}</span>
                    </p>

                    <div className="glass p-4 rounded-xl mb-8 text-left text-sm">
                        <p className="text-garo-muted mb-2">Tu wallet:</p>
                        <p className="font-mono text-xs text-garo-silver break-all">
                            {publicKey?.toBase58()}
                        </p>
                    </div>

                    <WalletButton />
                </motion.div>
            </div>
        );
    }

    // ============== TICKET PENDING STATE ==============
    if (currentState === "GHOST" && hasPendingTicket) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md"
                >
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-8xl mb-6"
                    >
                        🎫
                    </motion.div>

                    <h1 className="text-3xl font-bold mb-4 text-garo-neon">
                        {t.ticketReceived}
                    </h1>

                    <p className="text-garo-silver mb-8 text-lg">
                        {t.ticketReceivedSub}<br />
                        <span className="text-garo-muted">{t.ticketReceivedAction}</span>
                    </p>

                    {/* QR Code for scanning */}
                    <div className="glass p-6 rounded-2xl mb-8">
                        <div className="bg-white p-4 rounded-xl inline-block mb-4">
                            <QRCodeSVG
                                value={publicKey?.toBase58() || ""}
                                size={200}
                                level="H"
                                bgColor="#ffffff"
                                fgColor="#000000"
                            />
                        </div>
                        <p className="text-garo-muted text-sm">
                            {t.scanAtDoor}
                        </p>
                    </div>

                    <p className="text-yellow-400 text-sm mb-6">
                        ⚡ {t.ticketBurnsTo} <strong>{t.proofOfRave}</strong>
                    </p>

                    <WalletButton />
                </motion.div>
            </div>
        );
    }

    // ============== MEMBER STATE (Has Proof of Rave) ==============

    return (
        <div className="min-h-screen bg-black">
            {/* Confetti Celebration Overlay */}
            {showConfetti && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
                >
                    {/* Confetti particles */}
                    {[...Array(50)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                opacity: 1,
                                y: -100,
                                x: Math.random() * window.innerWidth - window.innerWidth / 2,
                                rotate: 0,
                                scale: 1
                            }}
                            animate={{
                                opacity: 0,
                                y: window.innerHeight + 100,
                                x: Math.random() * 400 - 200,
                                rotate: Math.random() * 720,
                                scale: 0.5
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                delay: Math.random() * 0.5,
                                ease: "easeOut"
                            }}
                            className="absolute text-2xl"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: 0
                            }}
                        >
                            {['🎉', '✨', '🔥', '💎', '⭐', '🎊'][Math.floor(Math.random() * 6)]}
                        </motion.div>
                    ))}

                    {/* Central celebration text */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", delay: 0.3 }}
                        className="text-center z-10"
                    >
                        <h2 className="text-4xl md:text-6xl font-bold text-garo-neon mb-4">
                            🔥 {t.transmutationComplete} 🔥
                        </h2>
                        <p className="text-xl text-white">{t.welcomeFamily}</p>
                    </motion.div>
                </motion.div>
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass-dark">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="/" className="text-2xl font-bold">
                        <span className="lambda-subtle">Λ</span>
                    </a>

                    <div className="flex items-center gap-6">
                        <div className={`px-4 py-2 rounded-full font-bold text-sm ${userTier >= 3 ? "bg-green-600 text-white" :
                            userTier >= 2 ? "bg-orange-600 text-white" :
                                userTier >= 1 ? "bg-gray-600 text-gray-200" :
                                    "bg-red-600 text-white"
                            }`}>
                            {userTier >= 3 ? `👑 ${t.tier3.toUpperCase()}` :
                                userTier >= 2 ? `🏠 ${t.tier2.toUpperCase()}` :
                                    userTier >= 1 ? `🌱 ${t.tier1.toUpperCase()}` :
                                        `👻 ${t.ghost.toUpperCase()}`}
                        </div>
                        <WalletButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
                {/* Hero */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-5xl md:text-7xl font-bold mb-4">
                        The <span className="lambda-glow">Vault</span>
                    </h1>

                    {/* Membership Card Visual */}
                    <div className="my-8 flex flex-col items-center justify-center perspective-1000">

                        {/* DECAY WARNING */}
                        {riskLevel > 0.8 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-4 bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md"
                            >
                                <span className="animate-pulse">⚠️</span>
                                <span className="text-sm font-bold">
                                    {language === "es" ? "RIESGO DE DECAIMIENTO:" : "RISK OF DECAY:"} {timeUntilDecay}
                                </span>
                            </motion.div>
                        )}

                        <div className={`relative group perspective-1000 transition duration-1000 ${riskLevel > 0.8 ? 'grayscale sepia contrast-125' : ''}`}>
                            <div className="absolute -inset-1 bg-gradient-to-r from-garo-neon to-garo-neon-dim rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            <img
                                src={`/assets/cards/tier-${userTier >= 3 ? 3 : userTier === 2 ? 2 : 1}.png`}
                                alt={`Tier ${userTier} Membership Card`}
                                className="relative w-full max-w-sm rounded-xl shadow-2xl transform transition-transform duration-500 hover:scale-105 hover:rotate-y-12"
                            />
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                <span className="font-mono text-xs text-white/50">{publicKey?.toBase58().slice(0, 6)}...</span>
                                <span className="tier-badge text-xs bg-black/50 backdrop-blur-md border border-white/10">
                                    {userTier >= 3 ? t.tier3.toUpperCase() : userTier === 2 ? t.tier2.toUpperCase() : t.tier1.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className="text-xl text-garo-silver max-w-2xl mx-auto">
                        {language === "es"
                            ? "Contenido exclusivo para holders. Tu nivel de acceso depende de tu tier."
                            : "Exclusive content for holders. Your access level depends on your tier."}
                    </p>

                    {/* Stats */}
                    <div className="flex justify-center gap-8 mt-8">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-garo-neon">{attendanceCount}</div>
                            <div className="text-sm text-garo-muted">Eventos</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">Tier {userTier}</div>
                            <div className="text-sm text-garo-muted">Tu Nivel</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-garo-silver">
                                {vaultItems.filter(i => isUnlocked(i.requiredTier)).length}/{vaultItems.length}
                            </div>
                            <div className="text-sm text-garo-muted">Desbloqueados</div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button onClick={handleSimulateCheckin} className="text-xs border border-garo-muted text-garo-muted px-4 py-2 rounded hover:bg-white/10 transition">
                            {t.simulateEvent}
                        </button>
                    </div>

                    {/* ACCESS PASS - QR CODE */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-12 flex flex-col items-center"
                    >
                        <h3 className="text-lg font-bold text-garo-silver mb-4">{t.accessPass}</h3>
                        <div className="relative group">
                            {/* Holographic Glow */}
                            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                            <div className="relative p-4 bg-black rounded-xl border border-white/20">
                                <QRCodeSVG
                                    value={publicKey?.toBase58() || ""}
                                    size={180}
                                    bgColor="#000000"
                                    fgColor="#FFFFFF"
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-garo-muted font-mono">{t.showToBouncer}</p>

                        {/* Copy Address Button */}
                        <button
                            onClick={() => {
                                if (publicKey) {
                                    navigator.clipboard.writeText(publicKey.toBase58());
                                    alert(t.addressCopied);
                                }
                            }}
                            className="mt-3 px-4 py-2 text-xs border border-garo-neon/50 text-garo-neon rounded-full hover:bg-garo-neon/10 transition flex items-center gap-2"
                        >
                            📋 {t.copyAddress}
                        </button>
                    </motion.div>
                </motion.section>

                {/* Vault Items Grid */}
                <section className="grid md:grid-cols-2 gap-6">
                    {vaultItems.map((item, index) => {
                        const unlocked = isUnlocked(item.requiredTier);

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.15 }}
                                className={`
                                    relative overflow-hidden rounded-2xl
                                    bg-gradient-to-br from-gray-900 to-black
                                    border-2 ${unlocked ? item.borderColor : "border-gray-800"}
                                    ${unlocked ? "hover:scale-[1.02] cursor-pointer" : ""}
                                    transition-all duration-300
                                `}
                            >
                                {/* Subtle Glow Effect */}
                                {unlocked && (
                                    <div className={`absolute inset-0 bg-gradient-to-br ${item.glowColor} opacity-30`}></div>
                                )}

                                {/* Card Content */}
                                <div className="relative p-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl">{item.icon}</span>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                                                <p className="text-sm text-garo-muted">{item.subtitle}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.requiredTier === 1 ? "bg-gray-600 text-gray-200" :
                                            item.requiredTier === 2 ? "bg-orange-600 text-white" :
                                                "bg-green-600 text-white"
                                            }`}>
                                            {item.tierName}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-garo-silver text-sm mb-6">{item.description}</p>

                                    {/* Action Button or Lock */}
                                    {unlocked ? (
                                        <a
                                            href={item.actionUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`
                                                inline-flex items-center gap-2 px-6 py-3 rounded-xl
                                                font-bold text-sm transition-all
                                                ${item.requiredTier === 1 ? "bg-gray-600 hover:bg-gray-500 text-white" :
                                                    item.requiredTier === 2 ? "bg-orange-600 hover:bg-orange-500 text-white" :
                                                        "bg-green-600 hover:bg-green-500 text-white"}
                                            `}
                                        >
                                            {item.actionLabel} →
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">🔒</span>
                                            <div>
                                                <p className="text-red-400 font-bold text-sm">{t.locked}</p>
                                                <p className="text-garo-muted text-xs">{t.requires} {item.tierName} {t.status}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Full Lock Overlay for locked items */}
                                {!unlocked && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                                )}
                            </motion.div>
                        );
                    })}
                </section>

                {/* Upgrade CTA */}
                {userTier < 10 && (
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-16 text-center glass p-8"
                    >
                        <h2 className="text-2xl font-bold mb-2">
                            {t.wantMore}
                        </h2>
                        <p className="text-garo-silver mb-6">
                            {t.attendMore}
                        </p>
                        <a href="/#events" className="btn-primary">
                            {t.seeEvents}
                        </a>
                    </motion.section>
                )}
            </main>
        </div>
    );
};

export default VaultPage;
