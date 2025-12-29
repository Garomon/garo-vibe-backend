"use client";

import { FC, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface PassportCardProps {
    tier: number;
    walletAddress: string;
    email?: string | null;
    createdAt?: string;
    attendanceCount?: number;
}

const PassportCard: FC<PassportCardProps> = ({
    tier,
    walletAddress,
    email,
    createdAt,
    attendanceCount = 0
}) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [copied, setCopied] = useState(false);

    const tierNames: Record<number, string> = {
        1: "RESIDENTE",
        2: "FAMILIA",
        3: "OG"
    };

    const tierColors: Record<number, string> = {
        1: "from-gray-600 to-gray-800",
        2: "from-orange-600 to-amber-800",
        3: "from-cyan-500 to-teal-700"
    };

    const formattedDate = createdAt
        ? new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'N/A';

    // Screen brightness control when showing QR
    useEffect(() => {
        if (isFlipped) {
            // Try to maximize brightness and prevent sleep
            try {
                // Wake Lock API to prevent screen sleep
                if ('wakeLock' in navigator) {
                    (navigator as any).wakeLock.request('screen').catch(() => { });
                }
            } catch (e) {
                console.log('Wake lock not supported');
            }
        }
    }, [isFlipped]);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const copyWallet = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent flip
        navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className="relative w-full max-w-sm mx-auto cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={handleFlip}
        >
            <motion.div
                className="relative w-full"
                style={{
                    transformStyle: 'preserve-3d',
                }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
            >
                {/* FRONT - Membership Card */}
                <div
                    className="relative w-full"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-garo-neon to-garo-neon-dim rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                        <img
                            src={`/assets/cards/tier-${tier >= 3 ? 3 : tier === 2 ? 2 : 1}.png`}
                            alt={`Tier ${tier} Membership Card`}
                            className="relative w-full rounded-xl shadow-2xl"
                        />
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                            <span className="font-mono text-xs text-white/50">{walletAddress.slice(0, 6)}...</span>
                            <span className="tier-badge text-xs bg-black/50 backdrop-blur-md border border-white/10 px-2 py-1 rounded">
                                {tierNames[tier] || `TIER ${tier}`}
                            </span>
                        </div>

                        {/* Flip hint */}
                        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/70 flex items-center gap-1">
                            🔄 TAP
                        </div>
                    </div>
                </div>

                {/* BACK - Passport ID */}
                <div
                    className="absolute inset-0 w-full"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                    }}
                >
                    <div className={`bg-gradient-to-br ${tierColors[tier] || tierColors[1]} rounded-xl p-5 shadow-2xl border-2 border-white/30 min-h-[320px] flex flex-col`}>
                        {/* Header with LIVE indicator */}
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-white/60">Property of</div>
                                <div className="text-base font-bold tracking-wide">
                                    G<span className="text-garo-neon">Λ</span>RO VIBE
                                </div>
                            </div>
                            {/* LIVE Indicator - Moved here */}
                            <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full" title="Live verification - not a screenshot">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] uppercase tracking-widest text-green-400 font-bold">LIVE</span>
                            </div>
                        </div>

                        {/* QR Code - Enlarged for easier scanning */}
                        <div className="flex justify-center my-3">
                            <div className="bg-white p-2 rounded-lg shadow-lg">
                                <QRCodeSVG
                                    value={walletAddress}
                                    size={140}
                                    bgColor="#FFFFFF"
                                    fgColor="#000000"
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        </div>

                        {/* Member Data */}
                        <div className="space-y-1.5 text-sm flex-grow">
                            <div className="flex justify-between items-center">
                                <span className="text-white/60 text-xs">TIER</span>
                                <span className="font-bold text-white">{tierNames[tier] || tier}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/60 text-xs">SINCE</span>
                                <span className="font-mono text-white text-sm">{formattedDate}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/60 text-xs">EVENTS</span>
                                <span className="font-bold text-white">{attendanceCount}</span>
                            </div>
                        </div>

                        {/* Wallet Address - Full & Copyable */}
                        <div className="mt-3 pt-2 border-t border-white/20">
                            <button
                                onClick={copyWallet}
                                className="w-full text-center bg-black/30 hover:bg-black/50 transition py-2 px-3 rounded-lg group"
                            >
                                <span className="text-[10px] text-white/50 block mb-1">WALLET ADDRESS</span>
                                <span className="text-xs text-white font-mono break-all leading-tight block">
                                    {walletAddress}
                                </span>
                                <span className={`text-[10px] mt-1 block transition ${copied ? 'text-green-400' : 'text-white/40 group-hover:text-white/70'}`}>
                                    {copied ? '✓ Copied!' : '📋 Tap to copy'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PassportCard;
