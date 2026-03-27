import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Best Gaming Deals | GAMES.GG",
  description: "The best game deals across Steam, GOG, PlayStation and more — updated weekly.",
  openGraph: {
    title: "Best Gaming Deals | GAMES.GG",
    description: "The best game deals across Steam, GOG, PlayStation and more — updated weekly.",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Gaming Deals | GAMES.GG",
    description: "The best game deals across Steam, GOG, PlayStation and more — updated weekly.",
    images: ["/api/og"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
