"use client";

import { FC } from "react";

/**
 * AmbientBackground - Atmospheric "Haze" Effect
 * 
 * TEST VERSION: Bright solid colors to verify rendering
 */
const AmbientBackground: FC = () => {
    return (
        <div
            className="fixed inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 0 }}
        >
            {/* Orb 1: BRIGHT PURPLE - should be very visible */}
            <div
                className="absolute animate-drift-1"
                style={{
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    background: "rgba(139, 92, 246, 0.6)",
                    filter: "blur(60px)",
                    top: "0",
                    left: "0",
                }}
            />

            {/* Orb 2: BRIGHT TEAL */}
            <div
                className="absolute animate-drift-2"
                style={{
                    width: "500px",
                    height: "500px",
                    borderRadius: "50%",
                    background: "rgba(20, 184, 166, 0.5)",
                    filter: "blur(60px)",
                    bottom: "0",
                    right: "0",
                }}
            />

            {/* Orb 3: BRIGHT NEON GREEN */}
            <div
                className="absolute animate-drift-3"
                style={{
                    width: "400px",
                    height: "400px",
                    borderRadius: "50%",
                    background: "rgba(0, 255, 136, 0.5)",
                    filter: "blur(50px)",
                    top: "40%",
                    left: "40%",
                }}
            />
        </div>
    );
};

export default AmbientBackground;
