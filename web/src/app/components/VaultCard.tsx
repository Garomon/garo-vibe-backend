"use client";

import { FC, ReactNode } from "react";
import Tilt from "react-parallax-tilt";

interface VaultCardProps {
    tier: number;
    children?: ReactNode;
    className?: string;
    mediaType?: 'image' | 'video' | 'audio';
    mediaUrl?: string;
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
            tiltMaxAngleX: 10,
            tiltMaxAngleY: 10,
            glareMaxOpacity: 0.3,
            glareColor: "rgba(180, 180, 180, 0.8)",
            scale: 1.02,
        },
        2: {
            tiltMaxAngleX: 15,
            tiltMaxAngleY: 15,
            glareMaxOpacity: 0.5,
            glareColor: "rgba(255, 165, 0, 0.9)",
            scale: 1.03,
        },
        3: {
            tiltMaxAngleX: 20,
            tiltMaxAngleY: 20,
            glareMaxOpacity: 0.7,
            glareColor: "rgba(0, 255, 255, 0.9)",
            scale: 1.05,
        },
    };

    const config = tiltConfig[tier as keyof typeof tiltConfig] || tiltConfig[1];

    // Tier-specific wrapper classes
    const tierStyles: Record<number, string> = {
        1: "vault-card-tier1",
        2: "vault-card-tier2 animate-pulse-slow",
        3: "vault-card-tier3",
    };

    const tierClass = tierStyles[tier] || "";

    const cardContent = (
        <Tilt
            tiltMaxAngleX={config.tiltMaxAngleX}
            tiltMaxAngleY={config.tiltMaxAngleY}
            perspective={1000}
            scale={config.scale}
            transitionSpeed={300}
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
            <div className="relative z-20 w-full h-full flex flex-col">
                {children}
            </div>
        </Tilt>
    );

    // Tier 3: Wrap in floating container
    if (tier === 3) {
        return (
            <div className="animate-float">
                {cardContent}
            </div>
        );
    }

    return cardContent;
};

export default VaultCard;

