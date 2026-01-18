import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3AuthProvider } from "./providers/Web3AuthProvider";
import { LanguageProvider } from "../context/LanguageProvider";
import { GlobalLanguageToggle } from "./components/GlobalLanguageToggle";
import AmbientBackground from "./components/ui/AmbientBackground";
import Footer from "./components/Footer";
import { VibeProvider } from "../context/VibeContext";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GΛRO VIBE | Proof of Rave",
  description: "Tu acceso exclusivo al universo GΛRO. Club Privado. Blockchain. Underground.",
  keywords: ["GARO", "DJ", "NFT", "Solana", "Proof of Rave", "Club Privado"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GΛRO VIBE",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "GΛRO VIBE",
    description: "Proof of Rave Protocol",
    type: "website",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#00ff88",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AmbientBackground />
        <LanguageProvider>
          <Web3AuthProvider>
            <VibeProvider>
              <GlobalLanguageToggle />
              {children}
            </VibeProvider>
            <Footer />
          </Web3AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
