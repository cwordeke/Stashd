"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";

interface ListPosterCollageProps {
  thumbnails: (string | null)[];
  className?: string;
}

/** Letterboxd-style multi-poster strip preview for a list. */
export default function ListPosterCollage({
  thumbnails,
  className,
}: ListPosterCollageProps) {
  const slots = Array.from({ length: 5 }, (_, i) => thumbnails[i] ?? null);

  return (
    <div
      className={cn(
        "relative flex h-[4.5rem] w-[9.5rem] shrink-0 overflow-hidden rounded-md bg-zinc-900 sm:h-20 sm:w-44",
        className
      )}
      aria-hidden
    >
      {slots.map((src, i) => (
        <div
          key={i}
          className={cn(
            "relative h-full overflow-hidden border-r border-zinc-950/80 last:border-r-0",
            i === 0 ? "w-[34%]" : "w-[16.5%]"
          )}
        >
          {src ? (
            <Image
              src={src}
              alt=""
              fill
              sizes={i === 0 ? "60px" : "30px"}
              className="object-cover object-center"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-zinc-800 to-zinc-900" />
          )}
        </div>
      ))}
    </div>
  );
}
