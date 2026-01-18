"use client";

import { FC, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVibe } from "../../../context/VibeContext";

interface VibeBalanceProps {
    onClick?: () => void;
}

export const VibeBalance: FC<VibeBalanceProps> = ({ onClick }) => {
    const { balance } = useVibe();
    const [displayBalance, setDisplayBalance] = useState(0);
    const [isIncreased, setIsIncreased] = useState(false);

    // Previous balance ref to detect increase
    const prevBalance = useRef(balance);

    useEffect(() => {
        if (balance > prevBalance.current) {
            setIsIncreased(true);
            setTimeout(() => setIsIncreased(false), 2000);
        }
        prevBalance.current = balance;

        // Count up effect
        let start = displayBalance;
        const end = balance;
        if (start === end) return;

        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);

            const nextVal = Math.floor(start + (end - start) * ease);
            setDisplayBalance(nextVal);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);

    }, [balance]);

    // Initial load
    useEffect(() => {
        setDisplayBalance(balance);
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: 1,
                    scale: isIncreased ? [1, 1.2, 1] : 1,
                    borderColor: isIncreased ? "rgba(34, 197, 94, 0.8)" : "rgba(168, 85, 247, 0.5)"
                }}
                transition={{ duration: 0.3 }}
                onClick={onClick}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full border bg-black/40 backdrop-blur-md select-none
                    ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''}
                    ${isIncreased ? 'shadow-[0_0_15px_rgba(34,197,94,0.5)] border-green-500/50' : 'shadow-[0_0_10px_rgba(168,85,247,0.3)] border-purple-500/50'}
                `}
            >
                <motion.span
                    animate={{ rotate: isIncreased ? [0, 20, -20, 0] : 0 }}
                    className="text-lg"
                >
                    💎
                </motion.span>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-garo-silver uppercase font-mono tracking-widest leading-none mb-0.5">
                        $VIBE
                    </span>
                    <span className={`text-sm font-bold font-mono ${isIncreased ? 'text-green-400' : 'text-white'}`}>
                        {displayBalance.toLocaleString()}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
