export const RATING_STEPS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
] as const;

export type RatingStep = (typeof RATING_STEPS)[number];

export interface RatingDistributionBucket {
  score: RatingStep;
  count: number;
}

export interface UserRatingStats {
  totalRatings: number;
  averageRating: number;
  distribution: RatingDistributionBucket[];
}

export type RatingActionResult =
  | { ok: true; rating: number; message: string }
  | { ok: false; message: string };
