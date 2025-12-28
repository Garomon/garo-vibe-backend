"use client";

import { FC, useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { motion, AnimatePresence } from "framer-motion";

type Event = {
    id: string;
    name: string;
    date: string;
    time: string;
    location: string;
};

type ScanResult = {
    status: "idle" | "success" | "levelup" | "transmutation" | "error" | "cooldown" | "denied" | "wrong_event";
    message: string;
    tier?: number;
    details?: string;
};

const AdminScanPage: FC = () => {
    const [result, setResult] = useState<ScanResult>({ status: "idle", message: "" });
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [manualInput, setManualInput] = useState("");

    // 🛡️ Event-Aware Scanner State
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [loadingEvents, setLoadingEvents] = useState(true);

    // Fetch active events on mount
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch("/api/admin/events?active=true");
                const data = await res.json();
                if (data.events && data.events.length > 0) {
                    setEvents(data.events);
                    // Auto-select the most recent upcoming event
                    setSelectedEventId(data.events[0].id);
                }
            } catch (e) {
                console.error("Failed to fetch events:", e);
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchEvents();
    }, []);

    const selectedEvent = events.find(e => e.id === selectedEventId);

    const handleScan = async (data: string) => {
        // Prevent double-scans
        if (isProcessing || data === lastScanned) return;

        // 🛡️ Require event selection
        if (!selectedEventId) {
            setResult({
                status: "error",
                message: "⚠️ NO EVENT SELECTED",
                details: "Selecciona un evento primero"
            });
            return;
        }

        setIsProcessing(true);
        setLastScanned(data);
        setResult({ status: "idle", message: "Processing..." });

        try {
            const res = await fetch("/api/attendance/checkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: data,
                    location: selectedEvent?.location || "GΛRO Venue",
                    eventId: selectedEventId  // 🛡️ Pass selected event for validation
                }),
            });

            const json = await res.json();

            if (res.status === 429) {
                setResult({ status: "cooldown", message: json.error || "Already Checked In" });
            } else if (res.status === 404) {
                setResult({ status: "error", message: "Usuario No Encontrado" });
            } else if (res.status === 403) {
                // Check for WRONG EVENT vs NO TICKET
                if (json.status === "WRONG_EVENT") {
                    setResult({
                        status: "wrong_event",
                        message: "🎫 EVENTO INCORRECTO",
                        details: json.details || "Ticket para otro evento"
                    });
                } else {
                    setResult({
                        status: "denied",
                        message: "❌ SIN TICKET",
                        details: "Necesita invitación"
                    });
                }
            } else if (json.success) {
                if (json.status === "TRANSMUTATION") {
                    setResult({
                        status: "transmutation",
                        message: "🎉 ¡BIENVENIDO!",
                        tier: json.newTier,
                    });
                } else if (json.upgraded || json.status === "LEVEL_UP") {
                    setResult({
                        status: "levelup",
                        message: "🚀 ¡SUBISTE DE NIVEL!",
                        tier: json.newTier,
                    });
                } else {
                    setResult({
                        status: "success",
                        message: "✅ ACCESO PERMITIDO",
                        tier: json.newTier,
                    });
                }
            } else {
                setResult({ status: "error", message: json.error || "Error Desconocido" });
            }
        } catch (e) {
            console.error(e);
            setResult({ status: "error", message: "Error de Red" });
        }

        // Reset after a few seconds
        setTimeout(() => {
            setResult({ status: "idle", message: "" });
            setLastScanned(null);
            setIsProcessing(false);
        }, 4000);
    };

    const statusStyles = {
        idle: "border-garo-silver",
        success: "border-green-500 bg-green-500/20",
        transmutation: "border-purple-500 bg-purple-500/20 animate-pulse",
        levelup: "border-yellow-500 bg-yellow-500/20 animate-pulse",
        error: "border-red-500 bg-red-500/20",
        denied: "border-red-600 bg-red-600/30",
        wrong_event: "border-orange-500 bg-orange-500/30",
        cooldown: "border-orange-500 bg-orange-500/20",
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
            {/* Header */}
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold mb-4"
            >
                <span className="lambda-glow">Λ</span> SCANNER
            </motion.h1>

            {/* 🛡️ Event Selector */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-sm mb-6"
            >
                <label className="block text-xs text-garo-neon mb-2 font-bold">
                    🎫 EVENTO ACTIVO
                </label>
                {loadingEvents ? (
                    <div className="bg-black border border-garo-muted rounded-lg px-4 py-3 text-garo-muted">
                        Cargando eventos...
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg px-4 py-3 text-red-400">
                        ⚠️ No hay eventos activos
                    </div>
                ) : (
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full bg-black border-2 border-garo-neon rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:ring-2 focus:ring-garo-neon"
                    >
                        {events.map((event) => (
                            <option key={event.id} value={event.id}>
                                {event.name} - {new Date(event.date + 'T00:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                            </option>
                        ))}
                    </select>
                )}
                {selectedEvent && (
                    <p className="text-xs text-garo-silver mt-2">
                        📍 {selectedEvent.location} • {selectedEvent.time?.slice(0, 5)}
                    </p>
                )}
            </motion.div>

            {/* Scanner Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-300 ${statusStyles[result.status]}`}
            >
                <Scanner
                    onScan={(detectedCodes) => {
                        if (detectedCodes.length > 0) {
                            handleScan(detectedCodes[0].rawValue);
                        }
                    }}
                    formats={["qr_code"]}
                    allowMultiple={false}
                    styles={{
                        container: { width: "100%", height: "100%" },
                    }}
                />

                {/* Status Overlay */}
                <AnimatePresence>
                    {result.status !== "idle" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
                        >
                            <div className={`text-7xl mb-4 ${result.status === "levelup" || result.status === "transmutation" ? "animate-bounce" : ""}`}>
                                {result.status === "success" && "✅"}
                                {result.status === "transmutation" && "🎉"}
                                {result.status === "levelup" && "🚀"}
                                {result.status === "error" && "❌"}
                                {result.status === "denied" && "🚫"}
                                {result.status === "wrong_event" && "🎫"}
                                {result.status === "cooldown" && "⏳"}
                            </div>
                            <p className="text-3xl font-bold text-white text-center px-4">{result.message}</p>
                            {result.details && (
                                <p className="text-lg text-garo-silver mt-2 text-center px-4">{result.details}</p>
                            )}
                            {result.tier && (
                                <div className={`mt-4 px-6 py-3 rounded-xl text-2xl font-bold ${result.tier === 3 ? "bg-green-600 text-white" :
                                    result.tier === 2 ? "bg-orange-500 text-white" :
                                        "bg-gray-600 text-white"
                                    }`}>
                                    {result.tier === 3 ? "👑 FAMILY" :
                                        result.tier === 2 ? "🏠 RESIDENT" :
                                            "🌱 INITIATE"}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <p className="mt-8 text-sm text-garo-muted">Apunta la cámara al QR del usuario</p>

            {/* DEV: Manual Input */}
            <div className="mt-6 w-full max-w-sm">
                <p className="text-xs text-garo-muted mb-2 text-center">[DEV] Check-in Manual:</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Pegar wallet address..."
                        className="flex-1 bg-black border border-garo-muted rounded px-3 py-2 text-sm text-white placeholder-garo-muted/50 focus:border-garo-neon outline-none"
                    />
                    <button
                        onClick={() => {
                            if (manualInput.trim()) {
                                handleScan(manualInput.trim());
                                setManualInput("");
                            }
                        }}
                        className="px-4 py-2 bg-garo-neon/20 border border-garo-neon text-garo-neon rounded text-sm hover:bg-garo-neon/30 transition"
                    >
                        CHECK IN
                    </button>
                </div>
            </div>

            {/* Back Link */}
            <a href="/" className="mt-8 text-garo-neon hover:underline text-sm">
                ← Volver al Inicio
            </a>
        </div>
    );
};

export default AdminScanPage;
