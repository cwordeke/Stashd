import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Stashd",
    template: "%s · Stashd",
  },
  description: "Omni-media tracking — movies, TV, games, books, and music",
  openGraph: {
    title: "Stashd",
    description: "Omni-media tracking — movies, TV, games, books, and music",
    url: siteUrl,
    siteName: "Stashd",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen overflow-x-hidden antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
