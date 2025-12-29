"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function EventsAdminPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await fetch("/api/admin/events");
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            }
        } catch (e) {
            console.error("Failed to fetch events", e);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'UPCOMING' : 'ACTIVE';
        try {
            const res = await fetch(`/api/admin/events/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                // Refresh list to see updates (esp. if we enforced single active)
                fetchEvents();
            } else {
                alert("Failed to update status");
            }
        } catch (e) {
            console.error("Update failed", e);
        }
    };

    const deleteEvent = async (id: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/admin/events/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setEvents(events.filter(e => e.id !== id));
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto min-h-screen text-white">
            <header className="flex justifying-between items-center mb-12">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Event Command Center</h1>
                    <p className="text-gray-400">Control the Rave. Manage the Vibe.</p>
                </div>
                <div className="flex gap-4 ml-auto">
                    <Link href="/admin" className="px-6 py-2 border border-white/20 rounded-full hover:bg-white/10 transition">
                        Back to Dashboard
                    </Link>
                    <Link href="/admin/events/create" className="px-6 py-2 bg-garo-neon text-black font-bold rounded-full hover:bg-garo-neon-dim transition shadow-[0_0_20px_rgba(57,255,20,0.4)]">
                        + Create Event
                    </Link>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-gray-500 animate-pulse">Scanning Frequency...</div>
            ) : (
                <div className="grid gap-6">
                    {events.length === 0 && (
                        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 text-gray-400">
                            No events found. Start by creating one.
                        </div>
                    )}

                    {events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`relative p-6 rounded-2xl border ${event.status === 'ACTIVE'
                                    ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                } transition-all`}
                        >
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                {/* Status Indicator */}
                                <div className="flex-shrink-0">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl ${event.status === 'ACTIVE'
                                            ? 'bg-red-500 text-black animate-pulse'
                                            : 'bg-gray-800 text-gray-500'
                                        }`}>
                                        {event.status === 'ACTIVE' ? 'ON' : 'OFF'}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-grow">
                                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                                        {event.name}
                                        {event.status === 'ACTIVE' && (
                                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-mono animate-pulse">LIVE SIGNAL ACTIVE</span>
                                        )}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 font-mono">
                                        <span className="flex items-center gap-2">📅 {new Date(event.date).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-2">📍 {event.location || 'TBA'}</span>
                                        <span className="flex items-center gap-2">👥 {event.capacity || '?'} Cap</span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-4 mt-4 md:mt-0">
                                    <button
                                        onClick={() => toggleStatus(event.id, event.status)}
                                        className={`px-6 py-3 rounded-full font-bold transition-all ${event.status === 'ACTIVE'
                                                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                : 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                            }`}
                                    >
                                        {event.status === 'ACTIVE' ? 'STOP EVENT' : 'Go LIVE 🚀'}
                                    </button>

                                    <button
                                        onClick={() => deleteEvent(event.id)}
                                        className="p-3 text-gray-500 hover:text-red-500 transition"
                                        title="Delete Event"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
