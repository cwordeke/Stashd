import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { toAuthUserSummary } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stashd",
  description: "Omni-media tracking — movies, TV, games, books, and music",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <AppShell user={toAuthUserSummary(user)}>{children}</AppShell>
      </body>
    </html>
  );
}
