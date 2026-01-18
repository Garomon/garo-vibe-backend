"use client";

import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../../context/LanguageProvider";

interface VibeHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
}

interface Transaction {
    id: string;
    amount: number;
    balance_after: number;
    type: string;
    description: string;
    created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
    CHECKIN: "🎫",
    FIRST_EVENT: "🎉",
    REFERRAL: "🎁",
    REFERRAL_TIER_UP: "🚀",
    STREAK: "🔥",
    BIRTHDAY: "🎂",
    PROFILE_COMPLETE: "✅",
    DAILY_LOGIN: "📱",
    BADGE_EARNED: "🏆",
    ADMIN_BONUS: "👑",
    PURCHASE: "🛒",
    REDEEM: "🎟️",
    SKIP_LINE: "⚡",
    PLUS_ONE: "👥",
    DECAY: "💀"
};

const TYPE_LABELS: Record<string, { en: string; es: string }> = {
    CHECKIN: { en: "Event Check-in", es: "Check-in" },
    FIRST_EVENT: { en: "First Event Bonus", es: "Bonus Primer Evento" },
    REFERRAL: { en: "Referral Bonus", es: "Bonus Referido" },
    REFERRAL_TIER_UP: { en: "Referral Tier Up", es: "Referido Subio Tier" },
    STREAK: { en: "Streak Bonus", es: "Bonus Racha" },
    BIRTHDAY: { en: "Birthday Bonus", es: "Bonus Cumple" },
    PROFILE_COMPLETE: { en: "Profile Complete", es: "Perfil Completo" },
    DAILY_LOGIN: { en: "Daily Login", es: "Login Diario" },
    BADGE_EARNED: { en: "Badge Earned", es: "Badge Obtenido" },
    ADMIN_BONUS: { en: "Admin Bonus", es: "Bonus Admin" },
    PURCHASE: { en: "Shop Purchase", es: "Compra en Shop" },
    REDEEM: { en: "Reward Redeemed", es: "Reward Canjeado" },
    SKIP_LINE: { en: "Skip the Line", es: "Saltar Fila" },
    PLUS_ONE: { en: "Extra Invite", es: "Invitacion Extra" },
    DECAY: { en: "Inactivity Decay", es: "Decaimiento" }
};

const VibeHistoryModal: FC<VibeHistoryModalProps> = ({ isOpen, onClose, walletAddress }) => {
    const { language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({
        currentBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        transactionCount: 0
    });
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (isOpen && walletAddress) {
            fetchHistory(0, true);
        }
    }, [isOpen, walletAddress]);

    const fetchHistory = async (newOffset: number, reset: boolean = false) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/vibe/history?wallet=${walletAddress}&limit=15&offset=${newOffset}`);
            const data = await res.json();

            if (data.success) {
                if (reset) {
                    setTransactions(data.transactions);
                } else {
                    setTransactions(prev => [...prev, ...data.transactions]);
                }
                setStats({
                    currentBalance: data.currentBalance,
                    totalEarned: data.totalEarned,
                    totalSpent: data.totalSpent,
                    transactionCount: data.transactionCount
                });
                setHasMore(data.pagination.hasMore);
                setOffset(newOffset + data.transactions.length);
            }
        } catch (e) {
            console.error("Error fetching VIBE history:", e);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchHistory(offset, false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(language === "es" ? "es-MX" : "en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative bg-gradient-to-b from-gray-900 to-black border border-garo-neon/30 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition z-10"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3">⚡</div>
                        <h2 className="text-2xl font-bold text-white">
                            {language === "es" ? "Historial VIBE" : "VIBE History"}
                        </h2>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="glass p-3 rounded-xl text-center">
                            <div className="text-2xl font-bold text-garo-neon">{stats.currentBalance}</div>
                            <div className="text-xs text-garo-muted">
                                {language === "es" ? "Balance" : "Balance"}
                            </div>
                        </div>
                        <div className="glass p-3 rounded-xl text-center">
                            <div className="text-2xl font-bold text-green-400">+{stats.totalEarned}</div>
                            <div className="text-xs text-garo-muted">
                                {language === "es" ? "Ganado" : "Earned"}
                            </div>
                        </div>
                        <div className="glass p-3 rounded-xl text-center">
                            <div className="text-2xl font-bold text-red-400">-{stats.totalSpent}</div>
                            <div className="text-xs text-garo-muted">
                                {language === "es" ? "Gastado" : "Spent"}
                            </div>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {loading && transactions.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-2 border-garo-neon border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-garo-muted">
                                    {language === "es" ? "Cargando..." : "Loading..."}
                                </p>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-8 text-garo-muted">
                                <div className="text-4xl mb-2">📭</div>
                                <p>{language === "es" ? "No hay transacciones aun" : "No transactions yet"}</p>
                            </div>
                        ) : (
                            <>
                                {transactions.map((tx) => (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-gray-800 hover:border-gray-700 transition"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-2xl">{TYPE_ICONS[tx.type] || "💫"}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {TYPE_LABELS[tx.type]?.[language === "es" ? "es" : "en"] || tx.type}
                                                </p>
                                                <p className="text-xs text-garo-muted truncate">
                                                    {tx.description || formatDate(tx.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`font-bold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                                                {tx.amount > 0 ? "+" : ""}{tx.amount}
                                            </p>
                                            <p className="text-xs text-garo-muted">
                                                {formatDate(tx.created_at)}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}

                                {hasMore && (
                                    <button
                                        onClick={loadMore}
                                        disabled={loading}
                                        className="w-full py-3 text-sm text-garo-neon hover:text-white transition disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-garo-neon border-t-transparent rounded-full animate-spin mx-auto" />
                                        ) : (
                                            language === "es" ? "Cargar mas..." : "Load more..."
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-gray-800 text-center">
                        <p className="text-xs text-garo-muted">
                            {stats.transactionCount} {language === "es" ? "transacciones totales" : "total transactions"}
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VibeHistoryModal;
