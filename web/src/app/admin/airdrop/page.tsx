"use client";

import { FC, useState, useEffect } from "react";
import { motion } from "framer-motion";

type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
};

const AirdropPage: FC = () => {
    const [email, setEmail] = useState("");
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    // Fetch events on mount
    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await fetch("/api/admin/events");
            const data = await res.json();
            if (data.events) {
                setEvents(data.events.filter((e: Event) => e.date >= new Date().toISOString().split("T")[0]));
                // Auto-select first event if available
                if (data.events.length > 0) {
                    setSelectedEvent(data.events[0].id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch events:", e);
        }
    };

    const handleAirdrop = async () => {
        if (!email.trim()) {
            setMessage("Please enter an email");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch("/api/admin/airdrop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    eventId: selectedEvent || null
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("success");
                setMessage(data.message || `Entry Ticket sent to ${email}!`);
                setEmail("");
            } else {
                setStatus("error");
                setMessage(data.error || "Failed to send invite");
            }
        } catch (e) {
            setStatus("error");
            setMessage("Network error");
        }

        // Reset status after 5 seconds
        setTimeout(() => {
            setStatus("idle");
            setMessage("");
        }, 5000);
    };

    const selectedEventData = events.find(e => e.id === selectedEvent);

    return (
        <div className="p-6 max-w-md mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1 className="text-4xl mb-2">🎫</h1>
                <h2 className="text-3xl font-bold mb-2">Entry Ticket</h2>
                <p className="text-garo-muted">Send access to the next event</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
            >
                {/* Event Selector */}
                {events.length > 0 ? (
                    <div>
                        <label className="block text-sm text-garo-muted mb-2">Select Event</label>
                        <select
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                            className="w-full bg-black border-2 border-white/20 rounded-xl px-4 py-4 text-lg focus:border-garo-neon outline-none transition appearance-none"
                        >
                            {events.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.name} - {new Date(event.date).toLocaleDateString()}
                                </option>
                            ))}
                        </select>

                        {/* Selected Event Preview */}
                        {selectedEventData && (
                            <div className="mt-3 glass p-4 rounded-xl text-sm">
                                <div className="font-bold text-garo-neon">{selectedEventData.name}</div>
                                <div className="text-garo-muted">
                                    📍 {selectedEventData.location || "TBA"} · 📅 {new Date(selectedEventData.date).toLocaleDateString()}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="glass p-4 rounded-xl text-center">
                        <p className="text-yellow-400 text-sm">⚠️ No upcoming events</p>
                        <a href="/admin/events/create" className="text-garo-neon text-sm underline mt-2 block">
                            Create an event first
                        </a>
                    </div>
                )}

                {/* Email Input */}
                <div>
                    <label className="block text-sm text-garo-muted mb-2">Friend's Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="friend@email.com"
                        className="w-full bg-black border-2 border-white/20 rounded-xl px-4 py-5 text-xl focus:border-garo-neon outline-none transition"
                    />
                </div>

                {/* Info Box */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-200">
                    <p className="font-bold mb-1">📍 What happens next:</p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-yellow-200/80">
                        <li>Your friend receives an Entry Ticket</li>
                        <li>They show their QR at the door</li>
                        <li>Scanner validates → They become a Member</li>
                    </ul>
                </div>

                {/* Send Button */}
                <button
                    onClick={handleAirdrop}
                    disabled={status === "loading" || events.length === 0}
                    className={`w-full py-6 rounded-xl text-2xl font-bold transition-all active:scale-[0.98] ${status === "loading"
                        ? "bg-gray-600 cursor-wait"
                        : status === "success"
                            ? "bg-green-600"
                            : status === "error"
                                ? "bg-red-500"
                                : events.length === 0
                                    ? "bg-gray-700 cursor-not-allowed"
                                    : "bg-garo-neon text-black hover:bg-garo-neon-dim"
                        }`}
                >
                    {status === "loading" ? "⏳ Sending..." : status === "success" ? "✅ Sent!" : "🚀 SEND TICKET"}
                </button>

                {/* Status Message */}
                {message && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-center text-sm ${status === "success" ? "text-green-400" : "text-red-400"
                            }`}
                    >
                        {message}
                    </motion.p>
                )}

                {/* Divider */}
                <div className="border-t border-gray-700 my-6" />

                {/* Bulk Airdrop Section */}
                <div className="text-center">
                    <p className="text-sm text-garo-muted mb-4">Or send tickets to all members at once:</p>
                    <button
                        onClick={async () => {
                            if (!selectedEvent) {
                                setStatus("error");
                                setMessage("Select an event first!");
                                return;
                            }
                            setStatus("loading");
                            setMessage("Sending to all members...");
                            try {
                                const res = await fetch("/api/admin/airdrop/bulk", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ eventId: selectedEvent }),
                                });
                                const data = await res.json();
                                if (res.ok) {
                                    setStatus("success");
                                    setMessage(data.message);
                                } else {
                                    setStatus("error");
                                    setMessage(data.error || "Bulk airdrop failed");
                                }
                            } catch (e) {
                                setStatus("error");
                                setMessage("Network error");
                            }
                            setTimeout(() => { setStatus("idle"); setMessage(""); }, 5000);
                        }}
                        disabled={status === "loading" || !selectedEvent}
                        className="w-full py-4 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:bg-gray-700 disabled:cursor-not-allowed"
                    >
                        📢 SEND TO ALL MEMBERS
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AirdropPage;
