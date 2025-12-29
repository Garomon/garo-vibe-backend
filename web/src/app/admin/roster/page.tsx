"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeb3Auth } from "../../providers/Web3AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
    id: string;
    email: string | null;
    wallet_address: string;
    tier: number;
    active: boolean;
    attendance_count: number;
    created_at: string;
}

export default function AdminRosterPage() {
    const { loggedIn } = useWeb3Auth();
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Edit Modal
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editTier, setEditTier] = useState(1);
    const [editActive, setEditActive] = useState(true);
    const [saving, setSaving] = useState(false);

    // Auth check
    useEffect(() => {
        if (!loading && !loggedIn) {
            router.push("/api/auth/login");
        }
    }, [loggedIn, loading, router]);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "25",
                ...(search && { search })
            });

            const res = await fetch(`/api/admin/users?${params}`);
            const data = await res.json();

            if (data.users) {
                setUsers(data.users);
                setTotalPages(data.totalPages || 1);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Open edit modal
    const handleEdit = (user: User) => {
        setEditingUser(user);
        setEditTier(user.tier);
        setEditActive(user.active ?? true);
    };

    // Save user changes
    const handleSave = async () => {
        if (!editingUser) return;
        setSaving(true);

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tier: editTier, active: editActive })
            });

            if (res.ok) {
                setEditingUser(null);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Failed to update user");
        } finally {
            setSaving(false);
        }
    };

    // Quick ban/unban
    const toggleBan = async (user: User) => {
        const action = user.active ? "ban" : "unban";
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !user.active })
            });

            if (res.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error("Error toggling ban:", error);
        }
    };

    const tierColors: Record<number, string> = {
        1: "bg-gray-500/20 text-gray-400 border-gray-500",
        2: "bg-orange-500/20 text-orange-400 border-orange-500",
        3: "bg-cyan-500/20 text-cyan-400 border-cyan-500"
    };

    const tierNames: Record<number, string> = {
        1: "RESIDENTE",
        2: "FAMILIA",
        3: "OG"
    };

    return (
        <div className="min-h-screen bg-black/50 text-white p-6 md:p-12 font-sans relative z-10">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <Link href="/admin" className="text-garo-neon hover:underline text-sm mb-2 inline-block">
                            ← Back to Admin
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">
                            <span className="text-garo-neon">📋</span> The Roster
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {total} members registered
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search by email or wallet..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-80 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-garo-neon/50"
                    />
                </div>

                {/* User Table */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500 animate-pulse">Loading members...</div>
                    ) : users.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No members found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10 text-left text-xs uppercase text-gray-500">
                                        <th className="px-4 py-3">Email / Wallet</th>
                                        <th className="px-4 py-3">Tier</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Check-ins</th>
                                        <th className="px-4 py-3">Since</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className={`border-b border-white/5 hover:bg-white/5 transition ${!user.active ? 'bg-red-500/5' : ''}`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="text-white font-medium">
                                                    {user.email || <span className="text-gray-500 italic">No email</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono">{user.wallet_address}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${tierColors[user.tier] || tierColors[1]}`}>
                                                    {tierNames[user.tier] || `TIER ${user.tier}`}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {user.active !== false ? (
                                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-red-400 flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                                        Banned
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {user.attendance_count || 0}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-sm">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => toggleBan(user)}
                                                        className={`px-2 py-1 text-xs border rounded transition ${user.active !== false
                                                                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                                                : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                                            }`}
                                                    >
                                                        {user.active !== false ? 'Ban' : 'Unban'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 p-4 border-t border-white/10">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ←
                            </button>
                            <span className="text-sm text-gray-400">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                →
                            </button>
                        </div>
                    )}
                </div>

                {/* Edit Modal */}
                <AnimatePresence>
                    {editingUser && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setEditingUser(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-garo-carbon border border-white/10 rounded-2xl p-6 w-full max-w-md"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 className="text-xl font-bold mb-4">Edit Member</h2>
                                <p className="text-gray-400 text-sm mb-6 font-mono">{editingUser.wallet_address}</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Tier</label>
                                        <select
                                            value={editTier}
                                            onChange={(e) => setEditTier(parseInt(e.target.value))}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
                                        >
                                            <option value={1}>Tier 1 - RESIDENTE</option>
                                            <option value={2}>Tier 2 - FAMILIA</option>
                                            <option value={3}>Tier 3 - OG</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Status</label>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setEditActive(true)}
                                                className={`flex-1 py-2 rounded-lg border transition ${editActive
                                                        ? 'bg-green-500/20 border-green-500 text-green-400'
                                                        : 'bg-black/30 border-white/10 text-gray-400'
                                                    }`}
                                            >
                                                ✓ Active
                                            </button>
                                            <button
                                                onClick={() => setEditActive(false)}
                                                className={`flex-1 py-2 rounded-lg border transition ${!editActive
                                                        ? 'bg-red-500/20 border-red-500 text-red-400'
                                                        : 'bg-black/30 border-white/10 text-gray-400'
                                                    }`}
                                            >
                                                ✕ Banned
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 py-2 bg-garo-neon/20 text-garo-neon border border-garo-neon/30 rounded-lg hover:bg-garo-neon/30 transition disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
