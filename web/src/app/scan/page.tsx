"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";
import { useVibe } from "../../context/VibeContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AmbientBackground from "../components/ui/AmbientBackground";

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
    const [hasCamera, setHasCamera] = useState(true);
    const [pendingEventId, setPendingEventId] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

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

    // Start camera
    useEffect(() => {
        if (scanState !== 'scanning') return;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch {
                setHasCamera(false);
            }
        };

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [scanState]);

    // QR Detection loop
    useEffect(() => {
        if (scanState !== 'scanning' || !hasCamera) return;

        const detectQR = async () => {
            if (!videoRef.current || !canvasRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            try {
                // Use BarcodeDetector API if available
                if ('BarcodeDetector' in window) {
                    const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (img: HTMLCanvasElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ['qr_code'] });
                    const barcodes = await detector.detect(canvas);

                    if (barcodes.length > 0) {
                        const qrData = barcodes[0].rawValue;
                        handleQRDetected(qrData);
                    }
                }
            } catch {
                // QR detection failed, continue scanning
            }
        };

        const interval = setInterval(detectQR, 500);
        return () => clearInterval(interval);
    }, [scanState, hasCamera]);

    const handleQRDetected = (data: string) => {
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

                    {hasCamera ? (
                        <div className="relative rounded-3xl overflow-hidden border-4 border-garo-neon/50">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full aspect-square object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Scan overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                                <motion.div
                                    animate={{ y: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute left-0 right-0 h-1 bg-garo-neon shadow-[0_0_20px_rgba(0,255,136,0.8)]"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-3xl p-12 text-center">
                            <div className="text-6xl mb-4">📷</div>
                            <p className="text-gray-400">Camera not available</p>
                            <p className="text-sm text-gray-500 mt-2">Please allow camera access</p>
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
                <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading...</div>}>
                    <ScanContent />
                </Suspense>
            </main>
        </div>
    );
}
