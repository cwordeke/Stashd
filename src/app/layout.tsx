import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stashd",
  description: "Omni-media tracking — movies, TV, games, books, and music",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
