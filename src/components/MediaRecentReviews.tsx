import Link from "next/link";
import DisplayStars from "@/components/DisplayStars";
import type { MediaReview } from "@/app/actions/diary";

interface MediaRecentReviewsProps {
  reviews: MediaReview[];
}

export default function MediaRecentReviews({
  reviews,
}: MediaRecentReviewsProps) {
  return (
    <section className="mt-14 space-y-4 border-t border-white/[0.06] pt-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Recent Reviews
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No reviews yet. Log this title and write the first one.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="border border-white/10 bg-zinc-950/50 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <ReviewerAvatar
                  username={review.username}
                  avatarUrl={review.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href={`/u/${review.username}`}
                      className="text-sm font-medium text-emerald-400/90 transition hover:text-emerald-300"
                    >
                      @{review.username}
                    </Link>
                    {review.rating != null ? (
                      <DisplayStars rating={review.rating} size="sm" />
                    ) : null}
                    {review.loggedOn ? (
                      <time
                        className="text-xs text-zinc-600"
                        dateTime={review.loggedOn}
                      >
                        {formatReviewDate(review.loggedOn)}
                      </time>
                    ) : null}
                  </div>
                  <p className="mt-2.5 whitespace-pre-wrap break-words border-l-2 border-emerald-500/35 bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-zinc-400">
                    {review.reviewText}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewerAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  return (
    <Link
      href={`/u/${username}`}
      className="mt-0.5 shrink-0"
      aria-label={`${username}'s profile`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-cover"
        />
      ) : (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
          aria-hidden
        >
          {username.charAt(0).toUpperCase()}
        </span>
      )}
    </Link>
  );
}

function formatReviewDate(value: string): string {
  const dateOnly = value.slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
