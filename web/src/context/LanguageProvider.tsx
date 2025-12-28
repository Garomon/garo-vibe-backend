"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { content, Language } from "./translations";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: typeof content.es;
}

// Default context value for SSR
const defaultContextValue: LanguageContextType = {
    language: "es",
    setLanguage: () => { },
    t: content.es
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

const STORAGE_KEY = "garo-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>("es"); // Spanish default
    const [mounted, setMounted] = useState(false);

    // Load saved preference from localStorage (client-side only)
    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
            if (saved && (saved === "es" || saved === "en")) {
                setLanguageState(saved);
            }
        } catch {
            // localStorage not available (SSR or error)
        }
    }, []);

    // Save preference to localStorage
    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // localStorage not available
        }
    };

    // Get translations for current language
    const t = content[language];

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}

// Language toggle component
export function LanguageToggle() {
    const { language, setLanguage } = useLanguage();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <button className="px-3 py-1 rounded-full text-sm font-bold border border-garo-muted/50 transition-colors opacity-50">
                🌐
            </button>
        );
    }

    return (
        <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className="px-3 py-1 rounded-full text-sm font-bold border border-garo-muted/50 hover:border-garo-neon/50 transition-colors"
        >
            {language === "es" ? "🇲🇽 ES" : "🇺🇸 EN"}
        </button>
    );
}
