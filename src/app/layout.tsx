import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { getUserStash } from "@/app/actions/stash";
import { toAuthUserSummary } from "@/lib/auth";
import { mediaKey } from "@/lib/types";
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

  const stashItems = user ? await getUserStash() : [];
  const initialStashKeys = stashItems.map((item) => mediaKey(item));

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <AppShell
          user={toAuthUserSummary(user)}
          initialStashKeys={initialStashKeys}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
