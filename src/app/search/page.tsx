import { Suspense } from "react";
import { SearchPageSkeleton } from "@/components/LoadingSkeleton";
import SearchResults from "@/components/SearchResults";

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchResults />
    </Suspense>
  );
}
