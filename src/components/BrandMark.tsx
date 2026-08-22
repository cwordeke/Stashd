import Image from "next/image";
import { cn } from "@/lib/cn";

export default function BrandMark({
  className,
  size = 32,
  priority = false,
  stacked = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
  stacked?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex",
        stacked
          ? "flex-col items-center gap-3"
          : "items-center gap-2.5",
        className
      )}
    >
      <Image
        src="/stashd-logo.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0"
        priority={priority}
      />
      Stashd
    </span>
  );
}
