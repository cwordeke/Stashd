import type { User } from "@supabase/supabase-js";
import { parsePreferredCategories } from "@/lib/media-order";
import type { MediaType } from "@/lib/types";

export interface AuthUserSummary {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  username: string | null;
  preferredCategories: MediaType[];
}

export function toAuthUserSummary(
  user: User | null,
  username: string | null = null,
  preferredCategories: MediaType[] | null = null,
  profileAvatarUrl: string | null = null
): AuthUserSummary | null {
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const fromMeta = parsePreferredCategories(meta.preferred_categories);
  const oauthAvatar =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    name:
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      null,
    avatarUrl: profileAvatarUrl ?? oauthAvatar,
    username,
    preferredCategories: preferredCategories ?? fromMeta,
  };
}

export function profilePath(username: string | null | undefined): string {
  if (username) return `/u/${username}`;
  return "/onboarding";
}
