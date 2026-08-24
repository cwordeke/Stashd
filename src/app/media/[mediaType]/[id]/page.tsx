import { notFound } from "next/navigation";
import MediaDetailView from "@/components/MediaDetailView";
import { getRecentReviewsForMedia, hasUserLoggedMedia } from "@/app/actions/diary";
import { getUserMediaLog } from "@/app/actions/media-logs";
import { getUserRating } from "@/app/actions/ratings";
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

  const [initialRating, initialLog, hasLoggedBefore, reviews] = await Promise.all([
    user ? getUserRating(details.id, details.mediaType) : Promise.resolve(null),
    user
      ? getUserMediaLog(details.id, details.mediaType)
      : Promise.resolve(EMPTY_MEDIA_LOG),
    user
      ? hasUserLoggedMedia(details.id, details.mediaType)
      : Promise.resolve(false),
    getRecentReviewsForMedia(details.id, details.mediaType),
  ]);

  return (
    <MediaDetailView
      details={details}
      initialRating={initialRating}
      initialLog={initialLog}
      hasLoggedBefore={hasLoggedBefore}
      isAuthenticated={Boolean(user)}
      reviews={reviews}
    />
  );
}
