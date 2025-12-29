"use client";

import { useLanguage } from "../../context/LanguageProvider";
import { legalContent } from "../../content/legal";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LegalPage() {
    const { language } = useLanguage();
    const content = legalContent[language];

    return (
        <div className="min-h-screen bg-black text-white/70 font-mono p-8 md:p-12 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-12">

                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-b border-white/20 pb-8"
                >
                    <Link href="/vault" className="text-xs text-garo-neon hover:underline mb-4 block opacity-50 hover:opacity-100 transition-opacity">
                        &lt; RETURN TO VAULT
                    </Link>
                    <h1 className="text-2xl md:text-4xl font-bold tracking-tighter text-white mb-2">
                        {content.title}
                    </h1>
                    <p className="text-xs text-white/40 uppercase tracking-widest">
                        {content.lastUpdated}
                    </p>
                </motion.header>

                {/* Sections */}
                <div className="space-y-12">
                    {content.sections.map((section, index) => (
                        <motion.section
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            className="space-y-4"
                        >
                            <h2 className="text-sm md:text-base font-bold text-white/90 uppercase tracking-wider border-l-2 border-garo-neon/50 pl-3">
                                {section.heading}
                            </h2>
                            <p className="text-sm leading-relaxed text-white/60">
                                {section.content}
                            </p>
                        </motion.section>
                    ))}
                </div>

                {/* Footer Signature */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="pt-12 border-t border-white/10 text-center text-xs text-white/20"
                >
                    {content.footer}
                </motion.div>

            </div>
        </div>
    );
}
