import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-white">Profile not found</h1>
      <p className="text-sm text-zinc-400">
        That username doesn&apos;t exist or hasn&apos;t claimed a public stash
        yet.
      </p>
      <Link
        href="/"
        className="rounded-md bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500"
      >
        Back home
      </Link>
    </div>
  );
}
