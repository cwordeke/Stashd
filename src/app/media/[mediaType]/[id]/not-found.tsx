import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-white">Title not found</h1>
      <p className="text-sm text-zinc-400">
        We couldn&apos;t load details for this item. It may have been removed or
        the id is invalid.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
      >
        Back home
      </Link>
    </div>
  );
}
