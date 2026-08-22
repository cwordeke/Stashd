import Image from "next/image";
import { cn } from "@/lib/cn";

export default function BrandMark({
  className,
  size = 32,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/stashd-logo.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full"
        priority={priority}
      />
      Stashd
    </span>
  );
}
