"use client";

import { cn } from "@/lib/cn";

interface DisplayStarsProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Read-only half-star display (0.5–5). */
export default function DisplayStars({
  rating,
  size = "sm",
  className,
}: DisplayStarsProps) {
  const starSize =
    size === "lg" ? "h-7 w-7" : size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  const gap = size === "lg" ? "gap-1" : "gap-0.5";

  return (
    <div
      className={cn("flex items-center", gap, className)}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill =
          rating >= star ? 1 : rating >= star - 0.5 ? 0.5 : 0;
        return (
          <StarIcon
            key={star}
            starId={star}
            fill={fill}
            className={starSize}
          />
        );
      })}
    </div>
  );
}

function StarIcon({
  starId,
  fill,
  className,
}: {
  starId: number;
  fill: number;
  className?: string;
}) {
  const gradId = `display-star-${starId}-${fill}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {fill === 0.5 ? (
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#3f3f46" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M12 2.5l2.9 6.1 6.7.6-5.1 4.5 1.5 6.6L12 16.9 5.9 20.3l1.5-6.6L2.4 9.2l6.7-.6L12 2.5z"
        fill={
          fill === 0 ? "#3f3f46" : fill === 1 ? "#10b981" : `url(#${gradId})`
        }
        stroke="#27272a"
        strokeWidth="0.75"
      />
    </svg>
  );
}
