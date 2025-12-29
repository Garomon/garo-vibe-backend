import { motion, AnimatePresence } from "framer-motion";
import { FC } from "react";
import { TranslationKey } from "@/context/translations";

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: any; // Using any for simplicity as t is already typed in parent, but could use proper type
}

const InfoModal: FC<InfoModalProps> = ({ isOpen, onClose, t }) => {
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

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg bg-black/90 border border-garo-neon/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
                    >
                        {/* Decorative "System" Elements */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-garo-neon to-transparent opacity-50" />
                        <div className="absolute top-4 right-4 text-[10px] font-mono text-garo-neon opacity-50 tracking-widest">
                            SYS.INFO.V1
                        </div>

                        {/* Header */}
                        <h2 className="text-2xl font-bold text-white mb-8 border-b border-white/10 pb-4 flex items-center gap-3">
                            <span className="text-garo-neon animate-pulse">ℹ️</span>
                            {t.howItWorksTitle}
                        </h2>

                        {/* Steps */}
                        <div className="space-y-6 font-mono">
                            <div className="group">
                                <h3 className="text-garo-neon font-bold text-lg mb-1 group-hover:translate-x-1 transition-transform">
                                    {t.step1Title}
                                </h3>
                                <p className="text-garo-silver text-sm leading-relaxed pl-4 border-l-2 border-white/10 group-hover:border-garo-neon/50 transition-colors">
                                    {t.step1Desc}
                                </p>
                            </div>

                            <div className="group">
                                <h3 className="text-garo-neon font-bold text-lg mb-1 group-hover:translate-x-1 transition-transform">
                                    {t.step2Title}
                                </h3>
                                <p className="text-garo-silver text-sm leading-relaxed pl-4 border-l-2 border-white/10 group-hover:border-garo-neon/50 transition-colors">
                                    {t.step2Desc}
                                </p>
                            </div>

                            <div className="group">
                                <h3 className="text-garo-neon font-bold text-lg mb-1 group-hover:translate-x-1 transition-transform">
                                    {t.step3Title}
                                </h3>
                                <p className="text-garo-silver text-sm leading-relaxed pl-4 border-l-2 border-white/10 group-hover:border-garo-neon/50 transition-colors">
                                    {t.step3Desc}
                                </p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="mt-8 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-garo-neon/50 text-white rounded-xl transition-all font-bold tracking-widest text-sm uppercase"
                        >
                            {t.close}
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default InfoModal;
