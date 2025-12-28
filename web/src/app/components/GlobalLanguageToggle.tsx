"use client";

import { usePathname } from "next/navigation";
import { LanguageToggle } from "../../context/LanguageProvider";

export function GlobalLanguageToggle() {
    const pathname = usePathname();

    // Hide on admin routes
    if (pathname?.startsWith("/admin")) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[999]">
            <LanguageToggle />
        </div>
    );
}
