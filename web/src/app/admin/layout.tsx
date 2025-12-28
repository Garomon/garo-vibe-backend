"use client";

import { useWeb3Auth } from "../providers/Web3AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { loggedIn, publicKey, isLoading } = useWeb3Auth();
    const router = useRouter();

    const isAdmin = publicKey?.toBase58() === ADMIN_WALLET;

    useEffect(() => {
        // Wait for loading to complete
        if (isLoading) return;

        // Redirect if not logged in or not admin
        if (!loggedIn || !isAdmin) {
            router.replace("/404");
        }
    }, [loggedIn, isAdmin, isLoading, router]);

    // Show nothing while loading
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-garo-neon animate-pulse text-2xl">Loading...</div>
            </div>
        );
    }

    // Block access if not admin
    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Admin Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-garo-neon/20 px-4 py-3">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <a href="/admin" className="text-xl font-bold">
                        <span className="lambda-glow">Λ</span> GOD MODE
                    </a>
                    <span className="text-xs text-garo-neon px-2 py-1 border border-garo-neon rounded-full">
                        ADMIN
                    </span>
                </div>
            </header>

            {/* Main Content with padding for fixed header */}
            <main className="pt-16 pb-24">
                {children}
            </main>

            {/* Bottom Navigation for Mobile */}
            <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/10 px-4 py-2 safe-area-inset-bottom">
                <div className="flex justify-around max-w-md mx-auto">
                    <a href="/admin" className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition">
                        <span className="text-2xl">📊</span>
                        <span className="text-xs text-garo-muted">Dashboard</span>
                    </a>
                    <a href="/admin/airdrop" className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition">
                        <span className="text-2xl">🎁</span>
                        <span className="text-xs text-garo-muted">Airdrop</span>
                    </a>
                    <a href="/admin/scan" className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition">
                        <span className="text-2xl">📷</span>
                        <span className="text-xs text-garo-muted">Scan</span>
                    </a>
                </div>
            </nav>
        </div>
    );
}
