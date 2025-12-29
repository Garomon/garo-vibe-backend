"use client";

import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, CheckCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "../../../context/LanguageProvider";

interface RecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RecoveryModal: FC<RecoveryModalProps> = ({ isOpen, onClose }) => {
    const { language } = useLanguage();
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "not_found">("idle");
    const [result, setResult] = useState<{ tier?: number; status?: string } | null>(null);

    const handleCheck = async () => {
        if (!email) return;
        setStatus("loading");
        try {
            const res = await fetch(`/api/user/status?email=${encodeURIComponent(email)}`);
            const data = await res.json();

            if (data.exists) {
                setResult(data);
                setStatus("success");
            } else {
                setStatus("not_found");
            }
        } catch (e) {
            console.error(e);
            setStatus("error");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-black/90 border border-garo-neon/30 rounded-2xl overflow-hidden shadow-2xl z-10 font-mono"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-2 text-garo-neon">
                                <Search size={18} />
                                <span className="font-bold tracking-wider">
                                    {language === "es" ? "RECUPERACIÓN DE CUENTA" : "ACCOUNT RECOVERY"}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/50 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <p className="text-garo-silver mb-6 text-sm">
                                {language === "es"
                                    ? "Introduce tu correo electrónico para verificar si tienes una cuenta activa en el sistema GΛRO."
                                    : "Enter your email address to check if you have an active account in the GΛRO system."}
                            </p>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={language === "es" ? "ejemplo@correo.com" : "example@email.com"}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-garo-neon transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                                />
                                <button
                                    onClick={handleCheck}
                                    disabled={status === "loading" || !email}
                                    className="bg-garo-neon/20 hover:bg-garo-neon/30 border border-garo-neon/50 text-garo-neon px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {status === "loading" ? (
                                        <div className="w-5 h-5 border-2 border-garo-neon/50 border-t-garo-neon rounded-full animate-spin" />
                                    ) : (
                                        language === "es" ? "BUSCAR" : "CHECK"
                                    )}
                                </button>
                            </div>

                            {/* Results */}
                            <AnimatePresence mode="wait">
                                {status === "success" && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3"
                                    >
                                        <CheckCircle className="text-green-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-green-400 mb-1">
                                                {language === "es" ? "Usuario Encontrado" : "User Found"}
                                            </h4>
                                            <p className="text-sm text-green-200/80">
                                                {language === "es"
                                                    ? `Tu cuenta está activa (Tier ${result?.tier}). Por favor inicia sesión con Google usando este correo.`
                                                    : `Your account is active (Tier ${result?.tier}). Please login with Google using this email.`}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {status === "not_found" && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
                                    >
                                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-red-400 mb-1">
                                                {language === "es" ? "No Encontrado" : "Not Found"}
                                            </h4>
                                            <p className="text-sm text-red-200/80">
                                                {language === "es"
                                                    ? "Este correo no está registrado en nuestra base de datos."
                                                    : "This email is not registered in our database."}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RecoveryModal;
