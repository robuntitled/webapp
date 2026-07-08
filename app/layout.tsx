import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner"; // <-- 1. IMPORTA IL TOASTER

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NomadLink",
  description: "Trova e crea viaggi di gruppo unici.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <Toaster richColors position="top-right" /> {/* <-- 2. AGGIUNGI IL TOASTER QUI */}
        </SessionProvider>
      </body>
    </html>
  );
}