import type { Metadata, Viewport } from "next";
import { IframeHeightReporter } from "@/components/IframeHeightReporter";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
      <body>
        <IframeHeightReporter />
        {children}
      </body>
    </html>
  );
}
