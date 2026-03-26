import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAM3S.GG Deals — Best Game Deals Today",
  description: "The best game deals across all stores, updated daily.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
