// app/layout.tsx  — purely a Server Component (no hooks)
import "./globals.css";               // Tailwind & base styles
import { Lato, Teko } from "next/font/google";
import type { Metadata } from "next";
import SupabaseProvider from "./components/SupabaseProvider";

/* ─────────── fonts ─────────── */
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"] });
const teko = Teko({ subsets: ["latin"], weight: ["400", "700"] });

/* ─────────── SEO / head meta ─────────── */
export const metadata: Metadata = {
  title:       " Pulse KPI™",
  description: "Internal dashboard for gym operations",
  icons: "/assets/1.png",  // 👈 path is relative to /public
};

/* ─────────── root layout ─────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={lato.className}>
      {/* teko for headings, overall light-gray background */}
      <body className={`${teko.className} bg-gray-50`}>
        {/* Everything client-side (auth, roles, etc.) lives under here */}
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
