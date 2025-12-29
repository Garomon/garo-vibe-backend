"use client";

import { FC } from "react";

/**
 * AmbientBackground - Atmospheric "Haze" Effect
 * 
 * Creates slow-moving blurred gradient orbs for a "Dark Club" / "Deep Space" vibe.
 * Uses pure CSS animations for battery efficiency.
 */
const AmbientBackground: FC = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
            {/* Base Layer */}
            <div className="absolute inset-0 bg-black" />

            {/* Orb 1: Dark Violet / Deep Indigo */}
            <div
                className="absolute w-[600px] h-[600px] rounded-full animate-drift-1"
                style={{
                    background: "radial-gradient(circle, rgba(88, 28, 135, 0.35) 0%, rgba(88, 28, 135, 0) 70%)",
                    filter: "blur(100px)",
                    top: "-10%",
                    left: "-10%",
                }}
            />

            {/* Orb 2: Teal / Emerald - subtle */}
            <div
                className="absolute w-[500px] h-[500px] rounded-full animate-drift-2"
                style={{
                    background: "radial-gradient(circle, rgba(0, 128, 128, 0.2) 0%, rgba(0, 128, 128, 0) 70%)",
                    filter: "blur(120px)",
                    bottom: "-15%",
                    right: "-10%",
                }}
            />

            {/* Orb 3: GΛRO Neon Green - very subtle accent */}
            <div
                className="absolute w-[400px] h-[400px] rounded-full animate-drift-3"
                style={{
                    background: "radial-gradient(circle, rgba(0, 255, 136, 0.08) 0%, rgba(0, 255, 136, 0) 70%)",
                    filter: "blur(80px)",
                    top: "40%",
                    right: "20%",
                }}
            />

            {/* Subtle noise overlay for texture */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
};

export default AmbientBackground;
