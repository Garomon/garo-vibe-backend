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

// Helper to extract YouTube video ID from various URL formats
const getYouTubeId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

// Helper to check if SoundCloud URL
const isSoundCloud = (url: string): boolean => {
    return url.includes('soundcloud.com');
};

const VaultCard: FC<VaultCardProps> = ({ tier, children, className = "", mediaType, mediaUrl }) => {
    const tiltConfig = {
        1: { tiltMaxAngleX: 10, tiltMaxAngleY: 10, glareMaxOpacity: 0.3, glareColor: "rgba(180, 180, 180, 0.8)", scale: 1.02 },
        2: { tiltMaxAngleX: 15, tiltMaxAngleY: 15, glareMaxOpacity: 0.5, glareColor: "rgba(255, 165, 0, 0.9)", scale: 1.03 },
        3: { tiltMaxAngleX: 20, tiltMaxAngleY: 20, glareMaxOpacity: 0.7, glareColor: "rgba(0, 255, 255, 0.9)", scale: 1.05 },
    };

    const config = tiltConfig[tier as keyof typeof tiltConfig] || tiltConfig[1];

    const tierStyles: Record<number, string> = {
        1: "vault-card-tier1",
        2: "vault-card-tier2 animate-pulse-slow",
        3: "vault-card-tier3",
    };

    const tierClass = tierStyles[tier] || "";

    // Render media based on type
    const renderMedia = () => {
        if (!mediaUrl) return null;

        // VIDEO: YouTube embed
        if (mediaType === 'video') {
            const youtubeId = getYouTubeId(mediaUrl);
            if (youtubeId) {
                return (
                    <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 bg-black/50">
                        <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full border-0"
                        />
                    </div>
                );
            }
            // Fallback for direct video URLs
            return (
                <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 bg-black/50">
                    <video controls className="w-full h-full" src={mediaUrl}>
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        }

        // AUDIO: SoundCloud embed or HTML5 audio
        if (mediaType === 'audio') {
            if (isSoundCloud(mediaUrl)) {
                return (
                    <div className="w-full h-[166px] rounded-xl overflow-hidden mb-4">
                        <iframe
                            width="100%"
                            height="166"
                            scrolling="no"
                            frameBorder="no"
                            allow="autoplay"
                            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(mediaUrl)}&color=%2300ffff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                            className="border-0"
                        />
                    </div>
                );
            }
            // Fallback for direct audio URLs
            return (
                <div className="w-full mb-4">
                    <audio controls className="w-full" src={mediaUrl}>
                        Your browser does not support the audio element.
                    </audio>
                </div>
            );
        }

        // IMAGE: Display as img with hover zoom
        if (mediaType === 'image') {
            return (
                <div className="w-full aspect-video rounded-xl overflow-hidden mb-4">
                    <img
                        src={mediaUrl}
                        alt="Vault content"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                </div>
            );
        }

        return null;
    };

    const cardContent = (
        <Tilt
            tiltMaxAngleX={config.tiltMaxAngleX}
            tiltMaxAngleY={config.tiltMaxAngleY}
            perspective={1000}
            scale={config.scale}
            transitionSpeed={300}
            gyroscope={false}
            glareEnable={true}
            glareMaxOpacity={config.glareMaxOpacity}
            glareColor={config.glareColor}
            glarePosition="all"
            glareBorderRadius="1.5rem"
            className={`vault-card ${tierClass} ${className}`}
        >
            {tier === 3 && (
                <div className="absolute inset-0 rounded-3xl pointer-events-none holo-overlay z-10" />
            )}

            <div className="relative z-20 w-full h-full flex flex-col">
                {renderMedia()}
                {children}
            </div>
        </Tilt>
    );

    if (tier === 3) {
        return <div className="animate-float">{cardContent}</div>;
    }

    return cardContent;
};

export default VaultCard;
