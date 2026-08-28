export type IllustrationId =
  | "empty-stash"
  | "no-notifications"
  | "popcorn"
  | "five-media";

export type IllustrationSize = "sm" | "md" | "lg";

export const ILLUSTRATIONS: Record<
  IllustrationId,
  {
    src: string;
    width: number;
    height: number;
    sizes: Record<IllustrationSize, string>;
  }
> = {
  "empty-stash": {
    src: "/illustrations/emptyStash.png",
    width: 535,
    height: 466,
    sizes: {
      sm: "max-w-[140px] sm:max-w-[160px]",
      md: "max-w-[200px] sm:max-w-[240px]",
      lg: "max-w-[240px] sm:max-w-[280px]",
    },
  },
  "no-notifications": {
    src: "/illustrations/noNotifications.png",
    width: 535,
    height: 466,
    sizes: {
      sm: "max-w-[130px] sm:max-w-[150px]",
      md: "max-w-[190px] sm:max-w-[230px]",
      lg: "max-w-[220px] sm:max-w-[260px]",
    },
  },
  popcorn: {
    src: "/illustrations/popcornIcon.png",
    width: 535,
    height: 466,
    sizes: {
      sm: "max-w-[150px] sm:max-w-[170px]",
      md: "max-w-[190px] sm:max-w-[230px]",
      lg: "max-w-[220px] sm:max-w-[280px]",
    },
  },
  "five-media": {
    src: "/illustrations/5mediaIcon.png",
    width: 535,
    height: 466,
    sizes: {
      sm: "max-w-[200px] sm:max-w-[240px]",
      md: "max-w-[240px] sm:max-w-[300px]",
      lg: "max-w-[300px] sm:max-w-[380px]",
    },
  },
};
