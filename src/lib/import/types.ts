export const IMPORT_BATCH_SIZE = 15;
export const IMPORT_BATCH_MAX = 20;

export type ImportBatchItem = {
  title: string;
  year: string;
  rating?: number;
  /** Letterboxd diary.csv `Watched Date` (YYYY-MM-DD). */
  watchedDate?: string;
  /** Letterboxd diary.csv `Rewatch` (Yes). */
  rewatch?: boolean;
};

export type ImportItemResult =
  | { ok: true; title: string; year: string; mediaId: string }
  | { ok: false; title: string; year: string; message: string };

export type ProcessImportBatchResult =
  | { ok: true; results: ImportItemResult[] }
  | { ok: false; message: string };
