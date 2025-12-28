"use client";

import { LanguageToggle } from "../../context/LanguageProvider";

export function GlobalLanguageToggle() {
    return (
        <div className="fixed top-4 right-4 z-50">
            <LanguageToggle />
        </div>
    );
}
