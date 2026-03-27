import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Best Gaming Deals | GAM3S.GG",
  description: "The best game deals across all stores, updated daily.",
  openGraph: {
    title: "Best Gaming Deals | GAM3S.GG",
    description: "The best game deals across all stores, updated daily.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
