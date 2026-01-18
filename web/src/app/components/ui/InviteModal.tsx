"use client";

import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../../context/LanguageProvider";

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
    userTier: number;
}

interface InviteData {
    id: string;
    invitee_email: string;
    status: string;
    created_at: string;
    event_id: string | null;
}

const InviteModal: FC<InviteModalProps> = ({ isOpen, onClose, walletAddress, userTier }) => {
    const { language } = useLanguage();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Invite data
    const [remaining, setRemaining] = useState(0);
    const [maxPerMonth, setMaxPerMonth] = useState(0);
    const [invites, setInvites] = useState<InviteData[]>([]);
    const [totalReferrals, setTotalReferrals] = useState(0);
    const [loadingData, setLoadingData] = useState(true);

    // Fetch invite data on open
    useEffect(() => {
        if (isOpen && walletAddress) {
            fetchInviteData();
        }
    }, [isOpen, walletAddress]);

    const fetchInviteData = async () => {
        setLoadingData(true);
        try {
            const res = await fetch(`/api/invite?wallet=${walletAddress}`);
            const data = await res.json();
            if (data.success) {
                setRemaining(data.remaining);
                setMaxPerMonth(data.maxPerMonth);
                setInvites(data.invites || []);
                setTotalReferrals(data.totalReferrals || 0);
            }
        } catch (e) {
            console.error("Error fetching invite data:", e);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inviterWallet: walletAddress,
                    inviteeEmail: email.trim()
                })
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(language === "es"
                    ? `Invitacion enviada a ${email}`
                    : `Invitation sent to ${email}`
                );
                setEmail("");
                setRemaining(data.remaining);
                // Refresh invite list
                fetchInviteData();
            } else {
                setError(data.error || (language === "es" ? "Error al enviar" : "Failed to send"));
            }
        } catch (e) {
            setError(language === "es" ? "Error de conexion" : "Connection error");
        } finally {
            setLoading(false);
        }
    };

    const tierNames: Record<number, string> = {
        1: "INITIATE",
        2: "RESIDENT",
        3: "FAMILY"
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
                    className="relative bg-gradient-to-b from-gray-900 to-black border border-garo-neon/30 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3">💌</div>
                        <h2 className="text-2xl font-bold text-white">
                            {language === "es" ? "Invita a un Amigo" : "Invite a Friend"}
                        </h2>
                        <p className="text-garo-muted text-sm mt-1">
                            {language === "es"
                                ? "Comparte el acceso a GARO VIBE"
                                : "Share access to GARO VIBE"
                            }
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="glass p-3 rounded-xl text-center">
                            <div className="text-2xl font-bold text-garo-neon">{remaining}</div>
                            <div className="text-xs text-garo-muted">
                                {language === "es" ? "Disponibles" : "Available"}
                            </div>
                        </div>
                        <div className="glass p-3 rounded-xl text-center">
                            <div className="text-2xl font-bold text-white">{maxPerMonth}</div>
                            <div className="text-xs text-garo-muted">
                                {language === "es" ? "Por Mes" : "Per Month"}
                            </div>
                        </div>
                        <div className="glass p-3 rounded-xl text-center">
                            <div className="text-2xl font-bold text-green-400">{totalReferrals}</div>
                            <div className="text-xs text-garo-muted">
                                {language === "es" ? "Referidos" : "Referrals"}
                            </div>
                        </div>
                    </div>

                    {/* Tier info */}
                    <div className="text-center mb-6 text-sm text-garo-silver">
                        <span className="text-garo-muted">
                            {language === "es" ? "Tu tier" : "Your tier"}:
                        </span>{" "}
                        <span className={`font-bold ${
                            userTier >= 3 ? "text-green-400" :
                            userTier >= 2 ? "text-orange-400" :
                            "text-gray-400"
                        }`}>
                            {tierNames[userTier] || "INITIATE"}
                        </span>
                        <span className="text-garo-muted">
                            {" "}= {maxPerMonth} {language === "es" ? "invitaciones/mes" : "invites/month"}
                        </span>
                    </div>

                    {/* Form */}
                    {remaining > 0 ? (
                        <form onSubmit={handleSendInvite} className="mb-6">
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={language === "es" ? "Email de tu amigo" : "Friend's email"}
                                    className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-garo-neon focus:outline-none transition"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm mt-2">{error}</p>
                            )}
                            {success && (
                                <p className="text-green-400 text-sm mt-2">{success}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !email.trim()}
                                className="w-full mt-4 bg-garo-neon text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        {language === "es" ? "Enviando..." : "Sending..."}
                                    </>
                                ) : (
                                    <>
                                        <span>📨</span>
                                        {language === "es" ? "Enviar Invitacion" : "Send Invitation"}
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="mb-6 text-center p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-xl">
                            <p className="text-yellow-400 font-bold">
                                {language === "es"
                                    ? "No tienes invitaciones disponibles este mes"
                                    : "No invites available this month"
                                }
                            </p>
                            <p className="text-yellow-400/70 text-sm mt-1">
                                {language === "es"
                                    ? "Se renuevan el 1ro del mes"
                                    : "They renew on the 1st of the month"
                                }
                            </p>
                        </div>
                    )}

                    {/* Reward info */}
                    <div className="text-center text-sm text-garo-muted mb-6 p-3 bg-garo-neon/10 rounded-xl border border-garo-neon/20">
                        <span className="text-garo-neon font-bold">+50 VIBE</span>
                        {" "}
                        {language === "es"
                            ? "cuando tu invitado asista a su primer evento"
                            : "when your invitee attends their first event"
                        }
                    </div>

                    {/* Recent invites */}
                    {invites.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-garo-muted mb-3 uppercase tracking-wider">
                                {language === "es" ? "Invitaciones Recientes" : "Recent Invites"}
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {invites.slice(0, 5).map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-gray-800"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-lg">
                                                {invite.status === "CLAIMED" ? "✅" :
                                                 invite.status === "EXPIRED" ? "⏰" : "📩"}
                                            </span>
                                            <span className="text-sm text-white truncate">
                                                {invite.invitee_email}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                                            invite.status === "CLAIMED"
                                                ? "bg-green-900/50 text-green-400"
                                                : invite.status === "EXPIRED"
                                                ? "bg-gray-900/50 text-gray-400"
                                                : "bg-yellow-900/50 text-yellow-400"
                                        }`}>
                                            {invite.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InviteModal;
