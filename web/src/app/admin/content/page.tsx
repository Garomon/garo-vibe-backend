"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWeb3Auth } from "../../providers/Web3AuthProvider";
import { useRouter } from "next/navigation";

interface VaultContent {
    id: string;
    title: string;
    type: "audio" | "video" | "image" | "gallery";
    url: string;
    gallery_urls?: string[];
    min_tier: number;
    active: boolean;
    created_at: string;
}

export default function VaultContentManager() {
    const { provider, loggedIn } = useWeb3Auth();
    const router = useRouter();

    // State
    const [contentList, setContentList] = useState<VaultContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        type: "audio",
        url: "",
        gallery_urls: "", // Comma-separated URLs for galleries
        min_tier: 1
    });

    // Check Auth
    useEffect(() => {
        if (!loading && !loggedIn) {
            router.push("/api/auth/login");
        }
    }, [loggedIn, loading, router]);

    // Fetch Content
    const fetchContent = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/content");
            const data = await res.json();

            if (data.content) {
                setContentList(data.content);
            }
        } catch (error) {
            console.error("Error fetching content:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContent();
    }, []);

    // Handle Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Prepare body based on type
            const submitBody: any = {
                title: formData.title,
                type: formData.type,
                min_tier: formData.min_tier
            };

            if (formData.type === 'gallery') {
                // Parse comma-separated URLs into array
                submitBody.gallery_urls = formData.gallery_urls
                    .split(',')
                    .map(url => url.trim())
                    .filter(url => url.length > 0);
                submitBody.url = submitBody.gallery_urls[0] || ''; // First image as thumbnail
            } else {
                submitBody.url = formData.url;
            }

            const res = await fetch("/api/admin/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitBody)
            });

            if (res.ok) {
                // Reset form
                setFormData({
                    title: "",
                    type: "audio",
                    url: "",
                    gallery_urls: "",
                    min_tier: 1
                });
                // Refresh list
                fetchContent();
                alert("Asset created successfully!");
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error("Error creating content:", error);
            alert("Failed to create content");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Edit (Pre-fill form)
    const handleEdit = (item: VaultContent) => {
        setEditingId(item.id);
        setFormData({
            title: item.title,
            type: item.type,
            url: item.url || '',
            gallery_urls: item.gallery_urls ? item.gallery_urls.join(',') : '',
            min_tier: item.min_tier
        });
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle Update (PUT)
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        setSubmitting(true);

        try {
            const submitBody: any = {
                title: formData.title,
                type: formData.type,
                min_tier: formData.min_tier
            };

            if (formData.type === 'gallery') {
                submitBody.gallery_urls = formData.gallery_urls
                    .split(',')
                    .map(url => url.trim())
                    .filter(url => url.length > 0);
                submitBody.url = submitBody.gallery_urls[0] || '';
            } else {
                submitBody.url = formData.url;
            }

            const res = await fetch(`/api/admin/content/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitBody)
            });

            if (res.ok) {
                setEditingId(null);
                setFormData({ title: '', type: 'audio', url: '', gallery_urls: '', min_tier: 1 });
                fetchContent();
                alert('Asset updated successfully!');
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            console.error('Error updating content:', error);
            alert('Failed to update content');
        } finally {
            setSubmitting(false);
        }
    };

    // Cancel Edit
    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ title: '', type: 'audio', url: '', gallery_urls: '', min_tier: 1 });
    };

    // Handle Delete
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this asset?")) return;

        try {
            const res = await fetch(`/api/admin/content/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                fetchContent(); // Refresh list
            } else {
                alert("Failed to delete asset");
            }
        } catch (error) {
            console.error("Error deleting content:", error);
        }
    };

    return (
        <div className="min-h-screen bg-black/50 text-white p-6 md:p-12 font-sans relative z-10">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                            Vault Content Manager
                        </h1>
                        <p className="text-gray-400">Manage exclusive assets, music sets, and videos.</p>
                    </div>
                    <button
                        onClick={() => router.push("/admin")}
                        className="px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition"
                    >
                        Back to Dashboard
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* CREATE FORM */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sticky top-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {editingId ? 'Edit Asset' : 'Add New Asset'}
                            </h2>

                            {editingId && (
                                <button
                                    onClick={cancelEdit}
                                    className="mb-4 text-sm text-gray-400 hover:text-white transition"
                                >
                                    ← Cancel Edit
                                </button>
                            )}

                            <form onSubmit={editingId ? handleUpdate : handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-purple-500 outline-none transition"
                                        placeholder="e.g. Warm Up Set 001"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-purple-500 outline-none transition"
                                    >
                                        <option value="audio">Audio (Set)</option>
                                        <option value="video">Video</option>
                                        <option value="image">Image/Asset</option>
                                        <option value="gallery">📸 Gallery (Event Photos)</option>
                                    </select>
                                </div>

                                {/* Show different input based on type */}
                                {formData.type === 'gallery' ? (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Gallery URLs (comma-separated)</label>
                                        <textarea
                                            value={formData.gallery_urls}
                                            onChange={(e) => setFormData({ ...formData, gallery_urls: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-purple-500 outline-none transition min-h-[120px] font-mono text-sm"
                                            placeholder="https://example.com/photo1.jpg,
https://example.com/photo2.jpg,
https://example.com/photo3.jpg"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Paste multiple image URLs, one per line or comma-separated.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Asset URL</label>
                                        <input
                                            type="url"
                                            value={formData.url}
                                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-purple-500 outline-none transition"
                                            placeholder="https://soundcloud.com/..."
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Minimum Tier</label>
                                    <select
                                        value={formData.min_tier}
                                        onChange={(e) => setFormData({ ...formData, min_tier: Number(e.target.value) })}
                                        className="w-full bg-black/40 border border-white/10 rounded p-3 text-white focus:border-purple-500 outline-none transition"
                                    >
                                        <option value={1}>Tier 1 (Initiate)</option>
                                        <option value={2}>Tier 2 (Resident)</option>
                                        <option value={3}>Tier 3 (Family)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Users with this tier or higher can access.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Asset' : 'Create Asset')}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ASSET LIST */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Existing Assets ({contentList.length})
                            </h2>

                            {loading ? (
                                <div className="text-center py-10 text-gray-500 animate-pulse">Loading assets...</div>
                            ) : contentList.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 bg-white/5 rounded">
                                    No assets found. Create some!
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {contentList.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/20 transition group"
                                        >
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${item.type === 'audio' ? 'bg-orange-500/20 text-orange-400' :
                                                        item.type === 'video' ? 'bg-blue-500/20 text-blue-400' :
                                                            item.type === 'gallery' ? 'bg-purple-500/20 text-purple-400' :
                                                                'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {item.type}
                                                    </span>
                                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${item.min_tier === 1 ? 'border-gray-500 text-gray-400' :
                                                        item.min_tier === 2 ? 'border-orange-500 text-orange-400' :
                                                            'border-cyan-500 text-cyan-400'
                                                        }`}>
                                                        Tier {item.min_tier}+
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-lg text-white truncate">{item.title}</h3>
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-gray-500 hover:text-white truncate block w-full overflow-hidden text-ellipsis transition"
                                                    title={item.url}
                                                >
                                                    {item.url}
                                                </a>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 transition text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
}
