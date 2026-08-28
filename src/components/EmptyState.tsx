import type { ReactNode } from "react";
import BrandIllustration from "@/components/BrandIllustration";
import type { IllustrationId, IllustrationSize } from "@/lib/illustrations";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  illustration: IllustrationId;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  size?: IllustrationSize;
  bordered?: boolean;
}

export default function EmptyState({
  illustration,
  title,
  description,
  children,
  className,
  size = "md",
  bordered = true,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "px-4 py-8 text-center sm:px-6 sm:py-12",
        bordered && "border border-white/[0.06]",
        className
      )}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <BrandIllustration id={illustration} size={size} />
        <p className="mt-4 text-sm font-medium text-zinc-200 sm:mt-5">
          {title}
        </p>
        {description ? (
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-500">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </div>
  );
}
