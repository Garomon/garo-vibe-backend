"use client";

import { FC, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";
import { useRouter } from "next/navigation";
import { WalletButton } from "../components/WalletButton";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage, LanguageToggle } from "../../context/LanguageProvider";
import VaultCard from "../components/VaultCard";
import InfoModal from "../components/ui/InfoModal";
import RecoveryModal from "../components/ui/RecoveryModal";
import PassportCard from "../components/PassportCard";
import { VibeBalance } from "../components/ui/VibeBalance";

const VaultPage: FC = () => {
    const { loggedIn, publicKey, isLoading, userInfo } = useWeb3Auth();
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
            // Include email from userInfo to ensure it's saved
            const email = userInfo?.email || "";
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: publicKey.toBase58(),
                    email,
                    userInfo
                })
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

    // DYNAMIC VAULT CONTENT
    const [vaultItems, setVaultItems] = useState<any[]>([]);
    // Help Modal State
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const { supabase } = await import("../../lib/supabaseClient");
                const { data, error } = await supabase
                    .from("vault_content")
                    .select("*")
                    .eq('active', true)
                    .order("created_at", { ascending: false });

                if (error) {
                    console.error("Vault content fetch error:", error);
                    return;
                }

                console.log("Vault content fetched:", data);
                if (data) {
                    setVaultItems(data);
                }
            } catch (e) {
                console.error("Vault content fetch exception:", e);
            }
        };
        fetchContent();
    }, []);


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
    const [ticketEvent, setTicketEvent] = useState<{
        id: string;
        name: string;
        date: string;
        time: string;
        location: string;
        expiresAt?: string;
    } | null>(null);

    useEffect(() => {
        const checkPendingTicket = async () => {
            if (!userData?.email) return;
            try {
                const res = await fetch(`/api/user/ticket-status?email=${encodeURIComponent(userData.email)}`);
                const data = await res.json();
                setHasPendingTicket(data.hasPendingTicket && !data.isExpired);
                if (data.event) {
                    setTicketEvent({
                        ...data.event,
                        expiresAt: data.ticket?.expiresAt
                    });
                }
            } catch (e) {
                console.error("Error checking ticket status:", e);
            }
        };
        // Check for ALL users (members and ghosts alike)
        if (userData?.email) {
            checkPendingTicket();
        }
    }, [userData]);

    // POAPs (Event Attendance Collection)
    type POAP = {
        id: string;
        checkedInAt: string;
        event: {
            id: string;
            name: string;
            date: string;
            time: string;
            location: string;
        } | null;
    };
    const [poaps, setPoaps] = useState<POAP[]>([]);

    useEffect(() => {
        const fetchPoaps = async () => {
            if (!userData?.email) return;
            try {
                const res = await fetch(`/api/user/poaps?email=${encodeURIComponent(userData.email)}`);
                const data = await res.json();
                if (data.poaps) {
                    setPoaps(data.poaps);
                }
            } catch (e) {
                console.error("Error fetching POAPs:", e);
            }
        };
        if (userData?.email && userData?.last_mint_address) {
            fetchPoaps();
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
                        // Re-check ticket status with full event data
                        fetch(`/api/user/ticket-status?email=${encodeURIComponent(userData.email)}`)
                            .then(res => res.json())
                            .then(data => {
                                const hadTicket = hasPendingTicket;
                                setHasPendingTicket(data.hasPendingTicket && !data.isExpired);
                                if (data.event) {
                                    setTicketEvent({
                                        ...data.event,
                                        expiresAt: data.ticket?.expiresAt
                                    });
                                }
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

                        // Clear pending ticket and ticketEvent (it was used)
                        setHasPendingTicket(false);
                        setTicketEvent(null);

                        // Refresh POAPs since user was just scanned
                        if (userData?.email) {
                            console.log('🔄 Refreshing POAPs after scan...');
                            fetch(`/api/user/poaps?email=${encodeURIComponent(userData.email)}`)
                                .then(res => res.json())
                                .then(data => {
                                    if (data.poaps) {
                                        setPoaps(data.poaps);
                                        console.log('🏆 POAPs refreshed:', data.poaps.length);
                                    }
                                });
                        }
                    }
                )
                .subscribe();

            // Channel for event_attendance changes (POAPs - after check-in)
            const attendanceChannel = supabase
                .channel('event-attendance-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'event_attendance'
                    },
                    (payload) => {
                        console.log('📡 Realtime: event_attendance INSERT detected', payload);
                        // Re-fetch POAPs to get the new one
                        if (userData?.email) {
                            fetch(`/api/user/poaps?email=${encodeURIComponent(userData.email)}`)
                                .then(res => res.json())
                                .then(data => {
                                    if (data.poaps) {
                                        setPoaps(data.poaps);
                                        console.log('🏆 POAPs refreshed:', data.poaps.length);
                                    }
                                });
                        }
                    }
                )
                .subscribe();

            // Cleanup function
            return () => {
                console.log("🔌 Cleaning up Realtime subscriptions");
                supabase.removeChannel(invitesChannel);
                supabase.removeChannel(usersChannel);
                supabase.removeChannel(attendanceChannel);
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
            <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
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

                    <button
                        onClick={() => setShowRecoveryModal(true)}
                        className="mt-6 text-xs text-garo-muted hover:text-garo-neon transition-colors underline decoration-garo-neon/30 hover:decoration-garo-neon"
                    >
                        {language === 'es' ? '¿Problemas de Acceso? / Trouble Logging In?' : 'Trouble Logging In?'}
                    </button>
                </motion.div>
                <RecoveryModal isOpen={showRecoveryModal} onClose={() => setShowRecoveryModal(false)} />
            </div>
        );
    }

    // ============== LOADING ==============
    if (currentState === "LOADING") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
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
            <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <InfoModal
                    isOpen={showHelpModal}
                    onClose={() => setShowHelpModal(false)}
                    t={t}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md z-10"
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

                    <div className="glass p-4 rounded-xl mb-8 text-left text-sm border-l-4 border-l-garo-neon/50">
                        <p className="text-garo-muted mb-2 text-xs uppercase tracking-widest">
                            {language === 'es' ? 'Identidad Detectada' : 'Identity Detected'}
                        </p>
                        <p className="font-mono text-garo-silver break-all flex items-center gap-2">
                            <span className="text-garo-neon">
                                {userData?.email ? '📧' : '💳'}
                            </span>
                            {userData?.email || publicKey?.toBase58()}
                        </p>
                    </div>

                    <WalletButton />

                    <button
                        onClick={() => setShowRecoveryModal(true)}
                        className="mt-4 text-xs text-garo-muted hover:text-garo-neon transition-colors underline decoration-garo-neon/30 hover:decoration-garo-neon"
                    >
                        {language === 'es' ? '¿Problemas de Acceso? / Trouble Logging In?' : 'Trouble Logging In?'}
                    </button>
                    <RecoveryModal isOpen={showRecoveryModal} onClose={() => setShowRecoveryModal(false)} />

                    {/* Help Trigger */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        onClick={() => setShowHelpModal(true)}
                        className="mt-8 mx-auto flex items-center gap-2 px-6 py-2 rounded-full border border-garo-neon/30 text-garo-neon text-sm tracking-widest hover:bg-garo-neon/10 hover:border-garo-neon transition-all group"
                    >
                        <span className="group-hover:animate-pulse">ℹ️</span>
                        <span>{t.howItWorksTitle}</span>
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    // ============== TICKET PENDING STATE ==============
    if (currentState === "GHOST" && hasPendingTicket) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
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

                    {/* Event Details */}
                    {ticketEvent && (
                        <div className="glass p-4 rounded-xl mb-6 text-left">
                            <h2 className="text-2xl font-bold text-white mb-2">{ticketEvent.name}</h2>
                            <div className="text-garo-silver text-sm space-y-1">
                                <p>📅 {new Date(ticketEvent.date + 'T00:00:00').toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {ticketEvent.time && `• ${ticketEvent.time.slice(0, 5)}`}</p>
                                {ticketEvent.location && <p>📍 {ticketEvent.location}</p>}
                            </div>
                            {/* Expiration Timer */}
                            {ticketEvent.expiresAt && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                    <p className="text-xs text-garo-muted flex items-center gap-2">
                                        <span>⏳</span>
                                        <span>
                                            {(() => {
                                                const now = new Date().getTime();
                                                const expires = new Date(ticketEvent.expiresAt).getTime();
                                                const diff = expires - now;
                                                if (diff <= 0) return language === 'es' ? 'Ticket expirado' : 'Ticket expired';
                                                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                if (days > 0) return `${language === 'es' ? 'Expira en' : 'Expires in'} ${days}d ${hours}h`;
                                                return `${language === 'es' ? 'Expira en' : 'Expires in'} ${hours}h`;
                                            })()}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

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
        <div className="min-h-screen relative">
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
                        <VibeBalance />
                        <WalletButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">

                {/* 🎫 PENDING EVENT TICKET BANNER (for members with upcoming events) */}
                {ticketEvent && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-garo-neon/20 to-cyan-500/20 border border-garo-neon/50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">🎫</div>
                            <div className="flex-1">
                                <div className="text-xs text-garo-neon font-bold mb-1">
                                    {language === "es" ? "PRÓXIMO EVENTO" : "UPCOMING EVENT"}
                                </div>
                                <h2 className="text-2xl font-bold text-white">{ticketEvent.name}</h2>
                                <p className="text-garo-silver text-sm">
                                    📅 {new Date(ticketEvent.date + 'T00:00:00').toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    {ticketEvent.time && ` • ${ticketEvent.time.slice(0, 5)}`}
                                    {ticketEvent.location && ` • 📍 ${ticketEvent.location}`}
                                </p>
                                {/* Expiration Timer */}
                                {ticketEvent.expiresAt && (
                                    <p className="text-xs text-garo-muted mt-1">
                                        ⏳ {(() => {
                                            const now = new Date().getTime();
                                            const expires = new Date(ticketEvent.expiresAt).getTime();
                                            const diff = expires - now;
                                            if (diff <= 0) return language === 'es' ? 'Ticket expirado' : 'Ticket expired';
                                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                            if (days > 0) return `${language === 'es' ? 'Expira en' : 'Expires in'} ${days}d ${hours}h`;
                                            return `${language === 'es' ? 'Expira en' : 'Expires in'} ${hours}h`;
                                        })()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

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

                        {/* PASSPORT FLIP CARD */}
                        <PassportCard
                            tier={userTier >= 3 ? 3 : userTier >= 2 ? 2 : 1}
                            walletAddress={publicKey?.toBase58() || ""}
                            email={userData?.email}
                            createdAt={userData?.created_at}
                            attendanceCount={attendanceCount}
                        />

                        <p className="text-xs text-garo-muted mt-4">{language === "es" ? "Toca la tarjeta para ver tu ID" : "Tap the card to see your ID"}</p>
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
                            <div className="text-sm text-garo-muted">{language === "es" ? "Eventos" : "Events"}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">Tier {userTier}</div>
                            <div className="text-sm text-garo-muted">{language === "es" ? "Tu Nivel" : "Your Level"}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-garo-silver">
                                {vaultItems.filter(i => isUnlocked(i.min_tier)).length}/{vaultItems.length}
                            </div>
                            <div className="text-sm text-garo-muted">{language === "es" ? "Desbloqueados" : "Unlocked"}</div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center gap-4 flex-wrap">
                        <button onClick={handleSimulateCheckin} className="text-xs border border-garo-muted text-garo-muted px-4 py-2 rounded hover:bg-white/10 transition">
                            {t.simulateEvent}
                        </button>
                        <button onClick={() => router.push('/rave')} className="text-xs bg-garo-neon text-black font-bold px-6 py-2 rounded hover:scale-105 transition flex items-center gap-2">
                            ⚡ RAVE
                        </button>
                        <button onClick={() => router.push('/shop')} className="text-xs bg-purple-600 text-white font-bold px-6 py-2 rounded hover:scale-105 transition flex items-center gap-2">
                            🛒 SHOP
                        </button>
                        <button onClick={() => router.push('/leaderboard')} className="text-xs bg-yellow-600 text-black font-bold px-6 py-2 rounded hover:scale-105 transition flex items-center gap-2">
                            🏆 RANKS
                        </button>
                    </div>
                </motion.section>

                {/* Vault Items Grid */}
                <section className="mt-16">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">
                        🎵 Exclusive Content ({vaultItems.length} items)
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {vaultItems.map((item, index) => {
                            const unlocked = isUnlocked(item.min_tier);
                            // Translate tier names if possible, fallback to strings
                            const tierName = item.min_tier === 3 ? (t.tier3 || "Family") :
                                item.min_tier === 2 ? (t.tier2 || "Resident") :
                                    (t.tier1 || "Initiate");

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <VaultCard
                                        tier={item.min_tier}
                                        mediaType={item.type as 'image' | 'video' | 'audio' | 'gallery'}
                                        mediaUrl={unlocked ? item.url : undefined}
                                        galleryUrls={unlocked && item.gallery_urls ? item.gallery_urls : undefined}
                                    >
                                        <div className={`relative p-6 h-full flex flex-col justify-between min-h-[220px] ${!unlocked ? 'blur-sm select-none grayscale' : ''}`}>

                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                                                    <span className="text-2xl">
                                                        {item.type === 'audio' ? '🎧' : item.type === 'video' ? '📺' : item.type === 'gallery' ? '🖼️' : '📸'}
                                                    </span>
                                                </div>
                                                <span className={`text-xs font-bold uppercase px-2 py-1 rounded border ${item.min_tier >= 3 ? 'border-green-500 text-green-400' :
                                                    item.min_tier === 2 ? 'border-orange-500 text-orange-400' :
                                                        'border-gray-500 text-gray-400'
                                                    }`}>
                                                    {tierName.toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Content Info */}
                                            <div>
                                                <h3 className="text-2xl font-bold text-white mb-1 leading-tight">{item.title}</h3>
                                                <p className="text-sm text-garo-silver uppercase tracking-wider mb-4 opacity-80">
                                                    {item.type} • {new Date(item.created_at).toLocaleDateString()}
                                                </p>
                                            </div>

                                            {/* Actions / Locked State */}
                                            <div className="mt-auto">
                                                {unlocked ? (
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-garo-neon transition group-hover:translate-x-1 duration-300"
                                                    >
                                                        <span>ACCESS ASSET</span>
                                                        <span>→</span>
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-red-500 font-bold">
                                                        <span>🔒</span>
                                                        <span>LOCKED</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Lock Overlay for Locked Items (on top of blur) */}
                                        {!unlocked && (
                                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-6xl mb-2 drop-shadow-lg">🔒</span>
                                                <div className="bg-black/80 px-4 py-2 rounded-full border border-red-500/50 backdrop-blur-xl">
                                                    <span className="text-red-500 font-bold text-sm tracking-widest">
                                                        REQUIRES TIER {item.min_tier}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </VaultCard>
                                </motion.div>
                            );
                        })}

                        {vaultItems.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                                <p>Loading Vault content...</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* � Events Gallery - Events You've Attended */}
                {poaps.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-16"
                    >
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span>�</span>
                            <span>{language === "es" ? "Mis Eventos" : "My Events"}</span>
                            <span className="text-sm font-normal text-garo-muted">({poaps.length})</span>
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {poaps.map((poap) => (
                                <motion.div
                                    key={poap.id}
                                    whileHover={{ scale: 1.05 }}
                                    className="glass p-4 rounded-xl text-center"
                                >
                                    <div className="text-4xl mb-2">🎫</div>
                                    <h3 className="font-bold text-white text-sm truncate">
                                        {poap.event?.name || "GΛRO Event"}
                                    </h3>
                                    <p className="text-xs text-garo-muted mt-1">
                                        {poap.event?.date
                                            ? new Date(poap.event.date + 'T00:00:00').toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                            : new Date(poap.checkedInAt).toLocaleDateString()
                                        }
                                    </p>
                                    {poap.event?.location && (
                                        <p className="text-xs text-garo-silver mt-1">📍 {poap.event.location}</p>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                )}
            </main>
        </div>
    );
};

export default VaultPage;

