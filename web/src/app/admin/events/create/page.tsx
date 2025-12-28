"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const CreateEventPage: FC = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        date: "",
        time: "",
        location: "",
        description: "",
        capacity: 100
    });
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.date) {
            setMessage("Name and Date are required");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch("/api/admin/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("success");
                setMessage("Event created successfully!");
                setTimeout(() => router.push("/admin"), 1500);
            } else {
                setStatus("error");
                setMessage(data.error || "Failed to create event");
            }
        } catch (e) {
            setStatus("error");
            setMessage("Network error");
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1 className="text-3xl font-bold mb-2">📅 Create Event</h1>
                <p className="text-garo-muted">Set up your next rave</p>
            </motion.div>

            <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                onSubmit={handleSubmit}
                className="space-y-5"
            >
                {/* Event Name */}
                <div>
                    <label className="block text-sm text-garo-muted mb-2">Event Name *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="GΛRO ROOF 001"
                        className="w-full bg-black border-2 border-white/20 rounded-xl px-4 py-4 text-lg focus:border-garo-neon outline-none transition"
                    />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm text-garo-muted mb-2">Date *</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full bg-black border-2 border-white/20 rounded-xl px-4 py-4 focus:border-garo-neon outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-garo-muted mb-2">Time</label>
                        <input
                            type="time"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className="w-full bg-black border-2 border-white/20 rounded-xl px-4 py-4 focus:border-garo-neon outline-none transition"
                        />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-sm text-garo-muted mb-2">Location</label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="The Sanctuary"
                        className="w-full bg-black border-2 border-white/20 rounded-xl px-4 py-4 focus:border-garo-neon outline-none transition"
                    />
                </div>

                {/* Capacity */}
                <div>
                    <label className="block text-sm text-garo-muted mb-2">Capacity</label>
                    <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 100 })}
                        className="w-full bg-black border-2 border-white/20 rounded-xl px-4 py-4 focus:border-garo-neon outline-none transition"
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={status === "loading"}
                    className={`w-full py-5 rounded-xl text-xl font-bold transition-all active:scale-[0.98] ${status === "loading"
                            ? "bg-gray-600 cursor-wait"
                            : status === "success"
                                ? "bg-green-600"
                                : status === "error"
                                    ? "bg-red-500"
                                    : "bg-garo-neon text-black hover:bg-garo-neon-dim"
                        }`}
                >
                    {status === "loading" ? "Creating..." : status === "success" ? "✅ Created!" : "🚀 CREATE EVENT"}
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
            </motion.form>
        </div>
    );
};

export default CreateEventPage;
