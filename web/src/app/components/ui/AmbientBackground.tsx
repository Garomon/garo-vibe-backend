"use client";

import { FC } from "react";

/**
 * AmbientBackground - Atmospheric "Haze" Effect
 * 
 * Creates slow-moving blurred gradient orbs for a "Dark Club" / "Deep Space" vibe.
 * Subtle but visible - like smoke or lights through fog.
 */
const AmbientBackground: FC = () => {
    return (
        <div
            className="fixed inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 0 }}
        >
            {/* Orb 1: Deep Violet / Indigo */}
            <div
                className="absolute animate-drift-1"
                style={{
                    width: "700px",
                    height: "700px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(88, 28, 135, 0.35) 0%, rgba(88, 28, 135, 0) 70%)",
                    filter: "blur(80px)",
                    top: "-10%",
                    left: "-15%",
                }}
            />

            {/* Orb 2: Teal / Emerald */}
            <div
                className="absolute animate-drift-2"
                style={{
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(20, 184, 166, 0) 70%)",
                    filter: "blur(90px)",
                    bottom: "-15%",
                    right: "-10%",
                }}
            />

            {/* Orb 3: GΛRO Neon Green accent */}
            <div
                className="absolute animate-drift-3"
                style={{
                    width: "400px",
                    height: "400px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(0, 255, 136, 0.15) 0%, rgba(0, 255, 136, 0) 70%)",
                    filter: "blur(60px)",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                }}
            />

            {/* Orb 4: Hot Pink accent - subtle */}
            <div
                className="absolute animate-drift-2"
                style={{
                    width: "350px",
                    height: "350px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0) 70%)",
                    filter: "blur(70px)",
                    top: "70%",
                    left: "20%",
                    animationDelay: "-10s",
                }}
            />
        </div>
    );
};

export default AmbientBackground;
