import { Suspense } from "react";
import SearchResults from "@/components/SearchResults";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="text-sm text-zinc-400">Loading search…</p>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
