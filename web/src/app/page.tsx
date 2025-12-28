"use client";

import { motion } from "framer-motion";
import { WalletButton } from "./components/WalletButton";
import { useWeb3Auth } from "./providers/Web3AuthProvider";
import { useLanguage } from "../context/LanguageProvider";

export default function Home() {
  const { loggedIn } = useWeb3Auth();
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-garo-void via-black to-garo-dark" />

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Neon Glow Orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-garo-neon/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">

        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <span className="text-garo-silver text-sm tracking-[0.3em] uppercase font-mono">
            {t.proofOfRave} Protocol
          </span>
        </motion.div>

        {/* Lambda Symbol */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[120px] md:text-[180px] font-bold leading-none mb-4"
        >
          <span className="lambda-glow">Λ</span>
        </motion.h1>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
        >
          <span className="text-white">G</span>
          <span className="lambda-subtle">Λ</span>
          <span className="text-white">RO</span>
          <span className="text-garo-muted ml-4">VIBE</span>
        </motion.h2>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg md:text-xl text-garo-silver max-w-lg mb-12"
        >
          {t.tagline}
          <span className="text-garo-neon"> {t.taglineHighlight}</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <WalletButton />

          {loggedIn && (
            <motion.a
              href="/vault"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="btn-secondary text-lg"
            >
              {t.enterVault}
            </motion.a>
          )}
        </motion.div>

        {/* Tier Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 flex flex-wrap justify-center gap-4"
        >
          <div className="px-4 py-2 rounded-full bg-gray-600 text-gray-200 font-bold text-sm">
            🌱 {t.tier1.toUpperCase()}
          </div>
          <div className="px-4 py-2 rounded-full bg-orange-600 text-white font-bold text-sm">
            🏠 {t.tier2.toUpperCase()}
          </div>
          <div className="px-4 py-2 rounded-full bg-green-600 text-white font-bold text-sm">
            👑 {t.tier3.toUpperCase()}
          </div>
        </motion.div>

      </main>

      {/* Footer Hint */}
      <footer className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-garo-muted text-sm font-mono">
          {t.poweredBy} <span className="text-garo-neon">Solana</span>
        </p>
      </footer>
    </div>
  );
}
