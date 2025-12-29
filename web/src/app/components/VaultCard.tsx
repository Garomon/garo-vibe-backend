"use client";

import { FC, ReactNode } from "react";
import Tilt from "react-parallax-tilt";

interface VaultCardProps {
    tier: number;
    children: ReactNode;
    className?: string;
}

/**
 * VaultCard - 3D Holographic Card Component
 * 
 * TIER 1 (INITIATE): "Heavy Concrete" - Minimal tilt, low glare, matte finish
 * TIER 2 (RESIDENT): "Neon Industrial" - Medium tilt, orange glare, pulsing border
 * TIER 3 (FAMILY): "Holographic Future" - High tilt, rainbow glare, floating animation
 */
const VaultCard: FC<VaultCardProps> = ({ tier, children, className = "" }) => {
    // Tier-specific tilt configurations
    const tiltConfig = {
        1: {
            tiltMaxAngleX: 5,
            tiltMaxAngleY: 5,
            glareMaxOpacity: 0.15,
            glareColor: "rgba(120, 120, 120, 0.5)",
            scale: 1.02,
        },
        2: {
            tiltMaxAngleX: 12,
            tiltMaxAngleY: 12,
            glareMaxOpacity: 0.35,
            glareColor: "rgba(255, 165, 0, 0.6)",
            scale: 1.04,
        },
        3: {
            tiltMaxAngleX: 18,
            tiltMaxAngleY: 18,
            glareMaxOpacity: 0.55,
            glareColor: "rgba(0, 255, 255, 0.6)",
            scale: 1.06,
        },
    };

    const config = tiltConfig[tier as keyof typeof tiltConfig] || tiltConfig[1];

    // Tier-specific wrapper classes
    const tierStyles: Record<number, string> = {
        1: "vault-card-tier1",
        2: "vault-card-tier2 animate-pulse-slow",
        3: "vault-card-tier3 animate-float",
    };

    const tierClass = tierStyles[tier] || "";

    return (
        <Tilt
            tiltMaxAngleX={config.tiltMaxAngleX}
            tiltMaxAngleY={config.tiltMaxAngleY}
            perspective={1000}
            scale={config.scale}
            transitionSpeed={400}
            gyroscope={true}
            glareEnable={true}
            glareMaxOpacity={config.glareMaxOpacity}
            glareColor={config.glareColor}
            glarePosition="all"
            glareBorderRadius="1.5rem"
            className={`vault-card ${tierClass} ${className}`}
        >
            {/* Holographic Overlay for Tier 3 */}
            {tier === 3 && (
                <div className="absolute inset-0 rounded-3xl pointer-events-none holo-overlay z-10" />
            )}

            {/* Card Content */}
            <div className="relative z-20">
                {children}
            </div>
        </Tilt>
    );
};

export default VaultCard;
