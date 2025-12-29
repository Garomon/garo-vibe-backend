"use client";

import { FC, useState } from "react";
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

    return (
        <div
            className="relative w-full max-w-sm mx-auto cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped(!isFlipped)}
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
                    <div className={`bg-gradient-to-br ${tierColors[tier] || tierColors[1]} rounded-xl p-6 shadow-2xl border border-white/20 h-full min-h-[300px]`}>
                        {/* Header */}
                        <div className="text-center mb-4">
                            <div className="text-xs uppercase tracking-widest text-white/60 mb-1">Property of</div>
                            <div className="text-lg font-bold tracking-wide">
                                G<span className="text-garo-neon">Λ</span>RO VIBE
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="flex justify-center mb-4">
                            <div className="bg-white p-2 rounded-lg">
                                <QRCodeSVG
                                    value={walletAddress}
                                    size={120}
                                    bgColor="#FFFFFF"
                                    fgColor="#000000"
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        </div>

                        {/* Member Data */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-white/60">TIER</span>
                                <span className="font-bold text-white">{tierNames[tier] || tier}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/60">SINCE</span>
                                <span className="font-mono text-white">{formattedDate}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/60">EVENTS</span>
                                <span className="font-bold text-white">{attendanceCount}</span>
                            </div>
                        </div>

                        {/* LIVE Indicator */}
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-xs uppercase tracking-widest text-green-400 font-bold">LIVE</span>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-3 border-t border-white/10 text-center">
                            <span className="text-xs text-white/40 font-mono">{walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PassportCard;
