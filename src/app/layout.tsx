import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
