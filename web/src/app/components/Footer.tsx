"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname();

    // Hide footer on admin pages to keep them clean/functional
    if (pathname.startsWith("/admin")) return null;

    return (
        <footer className="w-full py-6 mt-12 z-40 relative">
            <div className="flex justify-center items-center gap-6 text-[10px] tracking-[0.2em] text-white/20 font-mono">
                <Link href="/legal" className="hover:text-garo-neon hover:opacity-100 transition-all uppercase">
                    [ LEGAL ]
                </Link>
                <a
                    href="https://instagram.com/garomon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-garo-neon hover:opacity-100 transition-all uppercase"
                >
                    [ GΛRO ]
                </a>
            </div>
        </footer>
    );
}
