"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-garo-black">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-garo-carbon flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-garo-muted" />
        </div>

        <h1 className="text-3xl font-bold text-white">
          Sin Conexión
        </h1>

        <p className="text-garo-silver max-w-sm">
          Parece que no tienes conexión a internet.
          Conectate para acceder a tu vault.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-garo-neon text-black font-semibold rounded-lg
                     hover:bg-garo-neon/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
