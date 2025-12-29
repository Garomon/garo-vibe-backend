"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeb3Auth } from "../providers/Web3AuthProvider";
import { useVibe } from "../../context/VibeContext";
import { VibeBalance } from "../components/ui/VibeBalance";
import Link from "next/link";
import AmbientBackground from "../components/ui/AmbientBackground";

interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    image_url: string;
    stock: number;
    type: string;
}

interface InventoryItem {
    id: string;
    purchased_at: string;
    redeemed: boolean;
    shop_items: ShopItem;
}

export default function ShopPage() {
    const { loggedIn, publicKey } = useWeb3Auth();
    const { balance, refreshBalance } = useVibe();

    const [activeTab, setActiveTab] = useState<'store' | 'inventory'>('store');
    const [items, setItems] = useState<ShopItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
    const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; message: string; itemName?: string } | null>(null);

    // Fetch shop items
    useEffect(() => {
        fetch('/api/shop')
            .then(res => res.json())
            .then(data => {
                setItems(data.items || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Fetch inventory when tab changes or after purchase
    useEffect(() => {
        if (activeTab === 'inventory' && loggedIn && publicKey) {
            fetch(`/api/shop/inventory?wallet_address=${publicKey.toBase58()}`)
                .then(res => res.json())
                .then(data => setInventory(data.inventory || []));
        }
    }, [activeTab, loggedIn, publicKey, purchaseResult]);

    const handleBuy = async (item: ShopItem) => {
        if (!loggedIn || !publicKey) return;

        setBuyingItemId(item.id);
        setPurchaseResult(null);

        try {
            const res = await fetch('/api/shop/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_id: item.id,
                    wallet_address: publicKey.toBase58()
                })
            });
            const data = await res.json();

            if (data.success) {
                setPurchaseResult({ success: true, message: data.message, itemName: item.name });
                refreshBalance();
            } else {
                setPurchaseResult({ success: false, message: data.error || "Purchase failed" });
            }
        } catch {
            setPurchaseResult({ success: false, message: "Network error" });
        } finally {
            setBuyingItemId(null);
        }
    };

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
                        VIBE <span className="text-garo-neon">STORE</span>
                    </h1>
                    {loggedIn && <VibeBalance />}
                </div>
            </header>

            {/* Tabs */}
            <div className="pt-24 px-6 max-w-6xl mx-auto">
                <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
                    <button
                        onClick={() => setActiveTab('store')}
                        className={`px-6 py-2 rounded-full font-bold transition ${activeTab === 'store'
                                ? 'bg-garo-neon text-black'
                                : 'border border-white/20 text-gray-400 hover:text-white'
                            }`}
                    >
                        🛒 STORE
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-6 py-2 rounded-full font-bold transition ${activeTab === 'inventory'
                                ? 'bg-garo-neon text-black'
                                : 'border border-white/20 text-gray-400 hover:text-white'
                            }`}
                    >
                        🎒 MY ITEMS
                    </button>
                </div>

                {/* Purchase Result Toast */}
                <AnimatePresence>
                    {purchaseResult && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl backdrop-blur-md border ${purchaseResult.success
                                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                    : 'bg-red-500/20 border-red-500/50 text-red-400'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{purchaseResult.success ? '🎉' : '❌'}</span>
                                <div>
                                    <div className="font-bold">{purchaseResult.success ? 'ACQUIRED!' : 'FAILED'}</div>
                                    <div className="text-sm opacity-80">{purchaseResult.message}</div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Store Tab */}
                {activeTab === 'store' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
                        {loading ? (
                            <div className="col-span-full text-center text-gray-500 py-12">Loading...</div>
                        ) : items.length === 0 ? (
                            <div className="col-span-full text-center text-gray-500 py-12">No items available</div>
                        ) : (
                            items.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-garo-neon/50 transition-all"
                                >
                                    {/* Image */}
                                    <div className="h-48 bg-gradient-to-br from-purple-900/50 to-cyan-900/50 flex items-center justify-center">
                                        <span className="text-6xl">
                                            {item.type === 'digital' ? '📦' : '📮'}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold mb-2">{item.name}</h3>
                                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{item.description}</p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">💎</span>
                                                <span className="text-xl font-bold text-garo-neon">{item.cost}</span>
                                            </div>

                                            <motion.button
                                                onClick={() => handleBuy(item)}
                                                disabled={buyingItemId === item.id || balance < item.cost}
                                                whileTap={{ scale: 0.95 }}
                                                animate={buyingItemId !== item.id && balance < item.cost ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                                                className={`px-6 py-2 rounded-full font-bold transition ${buyingItemId === item.id
                                                        ? 'bg-gray-600 cursor-wait'
                                                        : balance >= item.cost
                                                            ? 'bg-garo-neon text-black hover:bg-garo-neon-dim'
                                                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                    }`}
                                            >
                                                {buyingItemId === item.id ? '...' : balance >= item.cost ? 'BUY' : 'LOCKED'}
                                            </motion.button>
                                        </div>

                                        {/* Stock indicator */}
                                        {item.stock !== -1 && (
                                            <div className="mt-3 text-xs text-gray-500">
                                                {item.stock > 0 ? `${item.stock} left` : 'SOLD OUT'}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                    <div className="pb-16">
                        {!loggedIn ? (
                            <div className="text-center text-gray-500 py-12">Connect wallet to view your items</div>
                        ) : inventory.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">
                                <span className="text-4xl mb-4 block">🎒</span>
                                Your inventory is empty. Visit the store!
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {inventory.map((inv) => (
                                    <motion.div
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden"
                                    >
                                        <div className="h-32 bg-gradient-to-br from-green-900/50 to-cyan-900/50 flex items-center justify-center">
                                            <span className="text-4xl">✅</span>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold">{inv.shop_items.name}</h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Acquired {new Date(inv.purchased_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
