import type { User } from "@supabase/supabase-js";

export interface AuthUserSummary {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export function toAuthUserSummary(user: User | null): AuthUserSummary | null {
  if (!user) return null;

  const meta = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? null,
    name:
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      null,
    avatarUrl:
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null,
  };
}
