"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";
import { useVibe } from "../../context/VibeContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AmbientBackground from "../components/ui/AmbientBackground";

// Dynamic import for QR Scanner (client-only)
const Scanner = dynamic(
    () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
    { ssr: false }
);

type ScanState = 'scanning' | 'processing' | 'success' | 'error' | 'already_checked';

interface CheckinResult {
    success: boolean;
    message: string;
    reward?: number;
    event_name?: string;
    error?: string;
    already_checked_in?: boolean;
}

function ScanContent() {
    const { loggedIn, publicKey, login } = useWeb3Auth();
    const { refreshBalance } = useVibe();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [result, setResult] = useState<CheckinResult | null>(null);
    const [pendingEventId, setPendingEventId] = useState<string | null>(null);
    const [scannerError, setScannerError] = useState<string | null>(null);

    // Check for pending event_id from Ghost Flow
    useEffect(() => {
        const eventId = searchParams.get('event_id');
        if (eventId) {
            setPendingEventId(eventId);
            // If logged in and has pending event, auto check-in
            if (loggedIn && publicKey) {
                handleCheckin(eventId);
            }
        }
    }, [searchParams, loggedIn, publicKey]);

    const handleQRDetected = (data: string) => {
        if (scanState !== 'scanning') return; // Prevent duplicate scans

        try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'GARO_EVENT' && parsed.event_id) {
                if (!loggedIn) {
                    // Ghost Flow: Redirect to login with event_id
                    router.push(`/?login=true&redirect=/scan&event_id=${parsed.event_id}`);
                    return;
                }
                handleCheckin(parsed.event_id);
            } else {
                setScanState('error');
                setResult({ success: false, message: 'Invalid QR code format', error: 'Not a GARO event QR' });
            }
        } catch {
            setScanState('error');
            setResult({ success: false, message: 'Invalid QR code', error: 'Could not parse QR data' });
        }
    };

    const handleCheckin = async (eventId: string) => {
        if (!publicKey) return;

        setScanState('processing');

        try {
            const res = await fetch('/api/event/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_address: publicKey.toBase58(),
                    event_id: eventId
                })
            });
            const data = await res.json();

            if (data.success) {
                setScanState('success');
                setResult(data);
                refreshBalance();
            } else if (data.already_checked_in) {
                setScanState('already_checked');
                setResult(data);
            } else {
                setScanState('error');
                setResult(data);
            }
        } catch {
            setScanState('error');
            setResult({ success: false, message: 'Network error', error: 'Failed to connect' });
        }
    };

    const handleLoginClick = async () => {
        if (pendingEventId) {
            localStorage.setItem('pending_checkin_event', pendingEventId);
        }
        await login();
    };

    const resetScanner = () => {
        setScanState('scanning');
        setResult(null);
        setScannerError(null);
    };

    return (
        <>
            {/* Not logged in */}
            {!loggedIn && (
                <div className="text-center py-20">
                    <div className="text-6xl mb-6">🔐</div>
                    <h2 className="text-2xl font-bold mb-4">Login Required</h2>
                    <p className="text-gray-400 mb-8">Connect your wallet to check in to events</p>
                    <button
                        onClick={handleLoginClick}
                        className="bg-garo-neon text-black font-bold px-8 py-4 rounded-full text-lg hover:scale-105 transition"
                    >
                        CONNECT WALLET
                    </button>
                </div>
            )}

            {/* Scanner */}
            {loggedIn && scanState === 'scanning' && (
                <div className="text-center">
                    <p className="text-gray-400 mb-6">Point your camera at the Event QR code</p>

                    <div className="relative rounded-3xl overflow-hidden border-4 border-garo-neon/50">
                        <Scanner
                            onScan={(result) => {
                                if (result && result.length > 0) {
                                    handleQRDetected(result[0].rawValue);
                                }
                            }}
                            onError={(error) => {
                                console.error('Scanner error:', error);
                                setScannerError(error?.message || 'Camera access denied');
                            }}
                            constraints={{ facingMode: 'environment' }}
                            styles={{
                                container: { width: '100%', aspectRatio: '1' },
                                video: { width: '100%', height: '100%', objectFit: 'cover' }
                            }}
                        />

                        {/* Scan overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <motion.div
                                animate={{ y: ['0%', '100%', '0%'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute left-0 right-0 h-1 bg-garo-neon shadow-[0_0_20px_rgba(0,255,136,0.8)]"
                            />
                        </div>
                    </div>

                    {scannerError && (
                        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                            <p className="text-red-400">{scannerError}</p>
                            <p className="text-sm text-gray-400 mt-2">Please allow camera access</p>
                        </div>
                    )}
                </div>
            )}

            {/* Processing */}
            {scanState === 'processing' && (
                <div className="text-center py-20">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="text-6xl mb-6"
                    >
                        ⚡
                    </motion.div>
                    <h2 className="text-2xl font-bold">Verifying...</h2>
                </div>
            )}

            {/* Success */}
            <AnimatePresence>
                {scanState === 'success' && result && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center py-12"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5, repeat: 3 }}
                            className="text-8xl mb-6"
                        >
                            🎉
                        </motion.div>
                        <h2 className="text-4xl font-black text-garo-neon mb-4">
                            ACCESS GRANTED!
                        </h2>
                        <p className="text-xl text-white mb-2">{result.event_name}</p>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-bold text-yellow-400 mt-6"
                        >
                            +{result.reward} $VIBE 💎
                        </motion.div>
                        <button
                            onClick={() => router.push('/vault')}
                            className="mt-8 bg-garo-neon text-black font-bold px-8 py-4 rounded-full text-lg"
                        >
                            BACK TO VAULT
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Already Checked In */}
            {scanState === 'already_checked' && (
                <div className="text-center py-20">
                    <div className="text-8xl mb-6">✅</div>
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4">Already Checked In!</h2>
                    <p className="text-gray-400">You've already claimed your reward for this event</p>
                    <button
                        onClick={() => router.push('/vault')}
                        className="mt-8 bg-white/10 text-white font-bold px-8 py-4 rounded-full"
                    >
                        BACK TO VAULT
                    </button>
                </div>
            )}

            {/* Error */}
            {scanState === 'error' && (
                <div className="text-center py-20">
                    <div className="text-8xl mb-6">❌</div>
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Check-in Failed</h2>
                    <p className="text-gray-400">{result?.error || 'Unknown error'}</p>
                    <button
                        onClick={resetScanner}
                        className="mt-8 bg-white/10 text-white font-bold px-8 py-4 rounded-full"
                    >
                        TRY AGAIN
                    </button>
                </div>
            )}
        </>
    );
}

export default function ScanPage() {
    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <AmbientBackground />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass-dark">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/vault" className="text-garo-neon hover:text-white transition">
                        ← VAULT
                    </Link>
                    <h1 className="text-xl font-bold tracking-widest">
                        📷 <span className="text-garo-neon">CHECK-IN</span>
                    </h1>
                    <div className="w-16" />
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 px-6 max-w-lg mx-auto">
                <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading scanner...</div>}>
                    <ScanContent />
                </Suspense>
            </main>
        </div>
    );
}
