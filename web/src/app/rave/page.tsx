"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AmbientBackground from "../components/ui/AmbientBackground";

export default function RavePage() {
    const { loggedIn, publicKey } = useWeb3Auth();
    const router = useRouter();

    // Game States: 'idle' | 'active' | 'success' | 'fail'
    const [gameState, setGameState] = useState<'idle' | 'active' | 'success' | 'fail'>('idle');
    const [energy, setEnergy] = useState(0); // 0-100
    const [timeLeft, setTimeLeft] = useState(60);
    const [hasPermission, setHasPermission] = useState(false);
    const [avgEnergy, setAvgEnergy] = useState(0);

    // Refs for animation loop
    const energyRef = useRef(0);
    const accelRef = useRef(0);
    const energyHistoryRef = useRef<number[]>([]);

    useEffect(() => {
        if (!loggedIn) {
            // Optional: Redirect or show login prompt. 
            // For now we allow viewing but claiming requires auth.
        }
    }, [loggedIn]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameState === 'active' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && gameState === 'active') {
            finishSession();
        }
        return () => clearInterval(interval);
    }, [gameState, timeLeft]);

    const finishSession = async () => {
        // Calculate average energy
        const history = energyHistoryRef.current;
        const avg = history.length > 0
            ? history.reduce((a, b) => a + b, 0) / history.length
            : 0;

        setAvgEnergy(avg);

        if (avg >= 70) { // Threshold for success (can tune)
            setGameState('success');
            await claimReward();
        } else {
            setGameState('fail');
        }
    };

    const claimReward = async () => {
        if (!publicKey) return;

        try {
            const res = await fetch("/api/rave/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wallet_address: publicKey.toBase58(),
                    energy_score: Math.round(avgEnergy) || 80 // Fallback
                })
            });
            const data = await res.json();
            if (!res.ok) console.error(data.error);
        } catch (e) {
            console.error("Claim failed", e);
        }
    };

    // Motion Handler
    const handleMotion = (event: DeviceMotionEvent) => {
        const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
        // Simple energy calculation: Magnitude of acceleration vector
        // We subtract gravity (~9.8) roughly or just look for deltas.
        // Better for "dancing": look for high variance or raw magnitude spikes.
        // Let's use raw magnitude sum for simplicity & responsiveness.
        const magnitude = (Math.abs(x || 0) + Math.abs(y || 0) + Math.abs(z || 0));

        // Normalize (gravity is ~9.8 per axis usually, so idle is ~10-20. Dancing is > 30-50).
        // Let's cap at 100.
        // A "shake" is usually > 20.

        // To make it fun: we need smoothing.
        accelRef.current = magnitude;
    };

    // Request Permission (iOS 13+)
    const requestPermission = async () => {
        if (typeof (DeviceMotionEvent) !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const permissionState = await (DeviceMotionEvent as any).requestPermission();
                if (permissionState === 'granted') {
                    setHasPermission(true);
                    startSession();
                } else {
                    alert("Permission denied. Enable sensors to rave.");
                }
            } catch (error) {
                console.error(error);
            }
        } else {
            // Non-iOS or older devices usually allow implicitly
            setHasPermission(true);
            startSession();
        }
    };

    const startSession = () => {
        energyHistoryRef.current = [];
        setTimeLeft(60);
        setGameState('active');
        window.addEventListener('devicemotion', handleMotion);

        // Start Wake Lock if possible
        try {
            if ('wakeLock' in navigator) {
                (navigator as any).wakeLock.request('screen').catch(() => { });
            }
        } catch (e) { }
    };

    // Animation Loop (60fps smoothing)
    useEffect(() => {
        let frameId: number;

        const updateEnergy = () => {
            if (gameState === 'active') {
                // Decay logic
                // If not moving, energy drops.
                // If moving, energy goes up towards target.

                const target = Math.min(Math.max((accelRef.current - 10) * 8, 0), 100);
                // (accel - 10) remove gravity bias somewhat. * 8 to scale up.

                // Smooth approach
                energyRef.current = energyRef.current * 0.9 + target * 0.1;

                setEnergy(Math.round(energyRef.current));
                energyHistoryRef.current.push(energyRef.current);
            }
            frameId = requestAnimationFrame(updateEnergy);
        };

        frameId = requestAnimationFrame(updateEnergy);
        return () => cancelAnimationFrame(frameId);
    }, [gameState]);

    // Cleanup
    useEffect(() => {
        return () => {
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, []);

    // Color interpolation for energy bar
    const getEnergyColor = () => {
        if (energy > 80) return "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]";
        if (energy > 50) return "bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]";
        return "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]";
    };

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans select-none">
            <AmbientBackground />

            {/* Header */}
            <header className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
                <Link href="/vault" className="text-garo-neon hover:text-white transition">
                    ← EXIT
                </Link>
                <div className="text-xs font-mono border border-white/20 px-3 py-1 rounded-full bg-black/50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    TRAINING MODE
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex flex-col items-center justify-center h-screen w-full px-6">

                <AnimatePresence mode="wait">

                    {/* STATE: IDLE */}
                    {gameState === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="text-center"
                        >
                            <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tighter">
                                PROOF OF <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-garo-neon to-purple-500">
                                    SWEAT
                                </span>
                            </h1>
                            <p className="text-gray-400 mb-12 text-lg max-w-md mx-auto">
                                Training Mode Active. <br />
                                Earn <span className="text-yellow-400 font-bold">10 $VIBE</span> per session.
                            </p>

                            <button
                                onClick={requestPermission}
                                className="group relative px-8 py-4 bg-white text-black font-bold text-xl rounded-full hover:scale-105 transition-all active:scale-95"
                            >
                                <span className="absolute inset-0 rounded-full bg-garo-neon blur-md opacity-50 group-hover:opacity-100 transition duration-500"></span>
                                <span className="relative flex items-center gap-3">
                                    ⚡ INITIATE PROTOCOL
                                </span>
                            </button>
                            <p className="mt-4 text-xs text-gray-600">Requires accelerometer access</p>
                        </motion.div>
                    )}

                    {/* STATE: ACTIVE */}
                    {gameState === 'active' && (
                        <motion.div
                            key="active"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full h-full flex flex-col items-center justify-center"
                        >
                            {/* Vertical Energy Bar */}
                            <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-30">
                                <span className="text-[20vw] font-bold text-white/5">{energy}%</span>
                            </div>

                            <div className="w-24 h-[60vh] bg-gray-900 rounded-full border border-white/10 relative overflow-hidden backdrop-blur-sm">
                                {/* Fill */}
                                <motion.div
                                    className={`absolute bottom-0 w-full rounded-b-full transition-all duration-100 ease-linear ${getEnergyColor()}`}
                                    style={{ height: `${energy}%` }}
                                >
                                    {/* Particles/Bubbles could go here */}
                                    <div className="absolute top-0 left-0 w-full h-2 bg-white/50 blur-[2px]"></div>
                                </motion.div>

                                {/* Threshold Line */}
                                <div className="absolute bottom-[70%] w-full h-0.5 bg-red-500/50 border-t border-dashed border-red-500 flex items-center justify-end pr-2">
                                    <span className="text-[10px] text-red-500 font-mono">MIN 70%</span>
                                </div>
                            </div>

                            {/* Timer */}
                            <div className="mt-12 text-center pointer-events-none">
                                <div className="text-6xl font-black font-mono tracking-widest tabular-nums">
                                    {timeLeft}
                                </div>
                                <div className="text-sm text-garo-neon uppercase tracking-widest mt-2 animate-pulse">
                                    Keeping Vibe Alive...
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE: SUCCESS */}
                    {gameState === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <div className="text-8xl mb-6">💃</div>
                            <h2 className="text-4xl font-bold text-garo-neon mb-2">VIBE CHECK PASSED</h2>
                            <p className="text-xl text-white mb-8">
                                +10 <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">$VIBE</span>
                            </p>
                            <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest">Training Session Complete</p>

                            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 mb-8 max-w-xs mx-auto">
                                <div className="text-sm text-gray-400">Avg Energy</div>
                                <div className="text-2xl font-bold">{Math.round(avgEnergy)}%</div>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => router.push('/vault')}
                                    className="px-6 py-3 border border-white/20 rounded-full hover:bg-white/10 transition"
                                >
                                    Back to Vault
                                </button>
                                <button
                                    onClick={() => {
                                        setGameState('idle');
                                        setEnergy(0);
                                    }}
                                    className="px-6 py-3 bg-garo-neon text-black font-bold rounded-full hover:bg-garo-neon-dim transition"
                                >
                                    Rave Again
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE: FAIL */}
                    {gameState === 'fail' && (
                        <motion.div
                            key="fail"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <div className="text-8xl mb-6 text-red-500">⚠️</div>
                            <h2 className="text-4xl font-bold text-red-500 mb-2">SIGNAL WEAK</h2>
                            <p className="text-xl text-gray-400 mb-8">
                                You need to move more. <br />
                                Keep the energy above 70%.
                            </p>
                            <div className="bg-red-500/10 backdrop-blur-md p-6 rounded-2xl border border-red-500/20 mb-8 max-w-xs mx-auto">
                                <div className="text-sm text-gray-400">Avg Energy</div>
                                <div className="text-2xl font-bold text-red-400">{Math.round(avgEnergy)}%</div>
                            </div>

                            <button
                                onClick={() => {
                                    setGameState('idle');
                                    setEnergy(0);
                                }}
                                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition"
                            >
                                TRY HARDER
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>
        </div>
    );
}
