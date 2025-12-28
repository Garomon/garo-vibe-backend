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
            <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-xl transition-all opacity-50">
                🌐
            </button>
        );
    }

    return (
        <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 hover:border-garo-neon/50 hover:bg-black/70 flex items-center justify-center text-xl transition-all hover:scale-110"
            title={language === "es" ? "Switch to English" : "Cambiar a Español"}
        >
            {language === "es" ? "🇲🇽" : "🇺🇸"}
        </button>
    );
}
