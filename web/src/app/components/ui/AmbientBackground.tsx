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
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
            {/* Base Layer */}
            <div className="absolute inset-0 bg-black" />

            {/* Orb 1: Dark Violet / Deep Indigo - MORE VISIBLE */}
            <div
                className="absolute w-[800px] h-[800px] rounded-full animate-drift-1"
                style={{
                    background: "radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, rgba(139, 92, 246, 0) 60%)",
                    filter: "blur(80px)",
                    top: "-20%",
                    left: "-20%",
                }}
            />

            {/* Orb 2: Teal / Emerald - MORE VISIBLE */}
            <div
                className="absolute w-[700px] h-[700px] rounded-full animate-drift-2"
                style={{
                    background: "radial-gradient(circle, rgba(20, 184, 166, 0.4) 0%, rgba(20, 184, 166, 0) 60%)",
                    filter: "blur(80px)",
                    bottom: "-20%",
                    right: "-20%",
                }}
            />

            {/* Orb 3: GΛRO Neon Green - accent */}
            <div
                className="absolute w-[500px] h-[500px] rounded-full animate-drift-3"
                style={{
                    background: "radial-gradient(circle, rgba(0, 255, 136, 0.25) 0%, rgba(0, 255, 136, 0) 60%)",
                    filter: "blur(60px)",
                    top: "30%",
                    left: "50%",
                    transform: "translateX(-50%)",
                }}
            />

            {/* Orb 4: Hot Pink accent */}
            <div
                className="absolute w-[400px] h-[400px] rounded-full animate-drift-2"
                style={{
                    background: "radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, rgba(236, 72, 153, 0) 60%)",
                    filter: "blur(70px)",
                    top: "60%",
                    left: "10%",
                }}
            />
        </div>
    );
};

export default AmbientBackground;
