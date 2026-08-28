import Image from "next/image";
import {
  ILLUSTRATIONS,
  type IllustrationId,
  type IllustrationSize,
} from "@/lib/illustrations";
import { cn } from "@/lib/cn";

interface BrandIllustrationProps {
  id: IllustrationId;
  size?: IllustrationSize;
  className?: string;
  priority?: boolean;
}

export default function BrandIllustration({
  id,
  size = "md",
  className,
  priority = false,
}: BrandIllustrationProps) {
  const art = ILLUSTRATIONS[id];

  return (
    <Image
      src={art.src}
      alt=""
      width={art.width}
      height={art.height}
      priority={priority}
      className={cn(
        "h-auto w-full object-contain",
        art.sizes[size],
        className
      )}
    />
  );
}
