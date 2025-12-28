import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3AuthProvider } from "./providers/Web3AuthProvider";

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
  openGraph: {
    title: "GΛRO VIBE",
    description: "Proof of Rave Protocol",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased noise-overlay`}
        suppressHydrationWarning
      >
        <Web3AuthProvider>
          {children}
        </Web3AuthProvider>
      </body>
    </html>
  );
}
