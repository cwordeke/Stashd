import { notFound } from "next/navigation";
import MediaDetailView from "@/components/MediaDetailView";
import { getUserMediaLog } from "@/app/actions/media-logs";
import { getUserRating } from "@/app/actions/ratings";
import { isMediaInUserStash } from "@/app/actions/stash";
import { EMPTY_MEDIA_LOG } from "@/lib/media-status";
import { getMediaDetails } from "@/lib/providers/details";
import { isMediaType } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

interface MediaDetailPageProps {
  params: Promise<{ mediaType: string; id: string }>;
}

export async function generateMetadata({ params }: MediaDetailPageProps) {
  const { mediaType, id } = await params;

  if (!isMediaType(mediaType)) {
    return { title: "Not found · Stashd" };
  }

  try {
    const details = await getMediaDetails(mediaType, id);
    return {
      title: `${details.title} · Stashd`,
      description:
        details.description?.slice(0, 160) ??
        `${details.title} on Stashd`,
    };
  } catch {
    return { title: "Not found · Stashd" };
  }
}

export default async function MediaDetailPage({
  params,
}: MediaDetailPageProps) {
  const { mediaType, id } = await params;

  if (!isMediaType(mediaType)) {
    notFound();
  }

  const [details, supabase] = await Promise.all([
    getMediaDetails(mediaType, id).catch(() => null),
    createClient(),
  ]);

  if (!details) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [initialRating, initialLog, initialInStash] = user
    ? await Promise.all([
        getUserRating(details.id, details.mediaType),
        getUserMediaLog(details.id, details.mediaType),
        isMediaInUserStash(details.id, details.mediaType),
      ])
    : [null, EMPTY_MEDIA_LOG, false];

  return (
    <MediaDetailView
      details={details}
      initialRating={initialRating}
      initialLog={initialLog}
      initialInStash={initialInStash}
      isAuthenticated={Boolean(user)}
    />
  );
}
